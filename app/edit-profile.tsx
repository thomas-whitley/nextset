import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, User, Mail, Phone, AtSign, Camera, Save, AlertCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useAuth } from '@/data/AuthContext';
import { supabase } from '@/data/supabase-client';

interface ProfileData {
  full_name: string;
  username: string;
  email: string;
  phone: string;
}

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    username: '',
    email: '',
    phone: '',
  });
  const [originalData, setOriginalData] = useState<ProfileData>({
    full_name: '',
    username: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, [user]);

  useEffect(() => {
    // Check if there are any changes
    const changes = Object.keys(profileData).some(
      key => profileData[key as keyof ProfileData] !== originalData[key as keyof ProfileData]
    );
    setHasChanges(changes);
  }, [profileData, originalData]);

  const loadProfileData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile')
        .select('full_name, username, email, phone')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load profile data');
        return;
      }

      const profile = {
        full_name: data.full_name || '',
        username: data.username || '',
        email: data.email || user.email || '',
        phone: data.phone || '',
      };

      setProfileData(profile);
      setOriginalData(profile);
    } catch (error) {
      console.error('Unexpected error loading profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!profileData.full_name.trim()) {
      setError('Full name is required');
      return false;
    }

    if (!profileData.username.trim()) {
      setError('Username is required');
      return false;
    }

    if (profileData.username.trim().length < 3) {
      setError('Username must be at least 3 characters long');
      return false;
    }

    if (!profileData.email.trim()) {
      setError('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      // Check if email is being changed
      const emailChanged = profileData.email !== originalData.email;
      
      if (emailChanged) {
        Alert.alert(
          'Email Change',
          'Changing your email will require verification. You will need to confirm the new email address.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => saveProfile(true) }
          ]
        );
        return;
      }

      await saveProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (emailChanged: boolean) => {
    if (!user) return;

    try {
      // Update profile table
      const { error: profileError } = await supabase
        .from('profile')
        .update({
          full_name: profileData.full_name.trim(),
          username: profileData.username.trim(),
          email: profileData.email.trim(),
          phone: profileData.phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        if (profileError.message.includes('duplicate') || profileError.message.includes('unique')) {
          if (profileError.message.includes('username')) {
            setError('This username is already taken. Please choose a different one.');
          } else if (profileError.message.includes('email')) {
            setError('This email is already in use. Please use a different email address.');
          } else {
            setError('This information is already in use. Please try different values.');
          }
        } else {
          setError('Failed to update profile. Please try again.');
        }
        return;
      }

      // If email changed, update auth user email
      if (emailChanged) {
        const { error: authError } = await supabase.auth.updateUser({
          email: profileData.email.trim(),
        });

        if (authError) {
          console.error('Error updating auth email:', authError);
          setError('Profile updated but email change failed. Please try updating email again.');
          return;
        }
      }

      // Update original data to reflect saved state
      setOriginalData({ ...profileData });
      
      Alert.alert(
        'Profile Updated',
        emailChanged 
          ? 'Your profile has been updated. Please check your email to verify your new email address.'
          : 'Your profile has been updated successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error) {
      console.error('Unexpected error saving profile:', error);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  const handleProfilePicture = () => {
    Alert.alert(
      'Profile Picture',
      'Profile picture upload will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity 
            style={[
              styles.saveButton,
              (!hasChanges || saving) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
          >
            <Save size={20} color={hasChanges && !saving ? Colors.light.primary : Colors.light.textTertiary} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Picture Section */}
          <View style={styles.profilePictureSection}>
            <View style={styles.profilePictureContainer}>
              <View style={styles.profilePicture}>
                <User size={40} color={Colors.light.textTertiary} />
              </View>
              <TouchableOpacity 
                style={styles.cameraButton}
                onPress={handleProfilePicture}
              >
                <Camera size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.profilePictureText}>Profile Picture</Text>
            <Text style={styles.profilePictureSubtext}>Coming soon</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <View style={styles.inputContainer}>
                <User size={20} color={Colors.light.textTertiary} />
                <TextInput
                  style={styles.textInput}
                  value={profileData.full_name}
                  onChangeText={(value) => updateField('full_name', value)}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.light.textTertiary}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username *</Text>
              <View style={styles.inputContainer}>
                <AtSign size={20} color={Colors.light.textTertiary} />
                <TextInput
                  style={styles.textInput}
                  value={profileData.username}
                  onChangeText={(value) => updateField('username', value)}
                  placeholder="Choose a username"
                  placeholderTextColor={Colors.light.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color={Colors.light.textTertiary} />
                <TextInput
                  style={styles.textInput}
                  value={profileData.email}
                  onChangeText={(value) => updateField('email', value)}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.light.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Phone size={20} color={Colors.light.textTertiary} />
                <TextInput
                  style={styles.textInput}
                  value={profileData.phone}
                  onChangeText={(value) => updateField('phone', value)}
                  placeholder="Enter your phone number"
                  placeholderTextColor={Colors.light.textTertiary}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          {/* Account Information */}
          <View style={styles.accountSection}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            
            <View style={styles.accountInfoCard}>
              <View style={styles.accountInfoItem}>
                <Text style={styles.accountInfoLabel}>Account Created</Text>
                <Text style={styles.accountInfoValue}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </Text>
              </View>
              
              <View style={styles.accountInfoDivider} />
              
              <View style={styles.accountInfoItem}>
                <Text style={styles.accountInfoLabel}>Last Sign In</Text>
                <Text style={styles.accountInfoValue}>
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Unknown'}
                </Text>
              </View>
              
              <View style={styles.accountInfoDivider} />
              
              <View style={styles.accountInfoItem}>
                <Text style={styles.accountInfoLabel}>Email Verified</Text>
                <Text style={[
                  styles.accountInfoValue,
                  { color: user?.email_confirmed_at ? Colors.light.success : Colors.light.warning }
                ]}>
                  {user?.email_confirmed_at ? 'Yes' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>

          {/* Save Button (Mobile) */}
          <TouchableOpacity 
            style={[
              styles.mobileeSaveButton,
              (!hasChanges || saving) && styles.mobileSaveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
          >
            <Text style={[
              styles.mobileSaveButtonText,
              (!hasChanges || saving) && styles.mobileSaveButtonTextDisabled
            ]}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.light.border,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.light.background,
  },
  profilePictureText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  profilePictureSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
  formSection: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
  },
  accountSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  accountInfoCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  accountInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  accountInfoDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
  },
  accountInfoLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
  },
  accountInfoValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
  },
  mobileeSaveButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  mobileSaveButtonDisabled: {
    backgroundColor: Colors.light.border,
    shadowOpacity: 0,
  },
  mobileSaveButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  mobileSaveButtonTextDisabled: {
    color: Colors.light.textTertiary,
  },
});