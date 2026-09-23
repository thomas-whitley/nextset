import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, User, Phone, AtSign, CircleAlert as AlertCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch, HIT_SLOP } from '@/constants/theme';
import { useAuth } from '@/data/AuthContext';
import { supabase } from '@/data/supabase-client';
import { initialsOf } from '@/data/userDisplay';

// Only the columns migration 0005 grants UPDATE on. Email is owned by
// Supabase Auth and is shown read-only below.
interface ProfileData {
  full_name: string;
  username: string;
  phone: string;
}

const EMPTY: ProfileData = { full_name: '', username: '', phone: '' };

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>(EMPTY);
  const [originalData, setOriginalData] = useState<ProfileData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = (Object.keys(profileData) as (keyof ProfileData)[]).some(
    (key) => profileData[key] !== originalData[key]
  );

  const loadProfileData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error: loadError } = await supabase
        .from('profile')
        .select('full_name, username, phone')
        .eq('id', user.id)
        .single();

      if (loadError) {
        console.error('Error loading profile:', loadError);
        setError('Could not load your profile.');
        return;
      }

      const profile: ProfileData = {
        full_name: data.full_name ?? '',
        username: data.username ?? '',
        phone: data.phone ?? '',
      };
      setProfileData(profile);
      setOriginalData(profile);
    } catch (e) {
      console.error('Unexpected error loading profile:', e);
      setError('Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const updateField = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!profileData.full_name.trim()) {
      setError('Name is required.');
      return false;
    }
    if (profileData.username.trim().length < 3) {
      setError('Username needs at least 3 characters.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!user || saving || !validateForm()) return;
    setSaving(true);
    setError(null);

    const fullName = profileData.full_name.trim();
    const username = profileData.username.trim();
    const phone = profileData.phone.trim() || null;

    try {
      const { error: profileError } = await supabase
        .from('profile')
        .update({ full_name: fullName, username, phone, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (profileError) {
        const msg = profileError.message;
        if (msg.includes('duplicate') || msg.includes('unique')) {
          setError('That username is taken.');
        } else {
          console.error('Error updating profile:', profileError);
          setError('Could not save. Check your connection and try again.');
        }
        return;
      }

      // Mirror into auth metadata so displayNameOf/initialsOf update at once.
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name: fullName, username, phone },
      });
      if (metadataError) console.error('Error updating user metadata:', metadataError);

      setOriginalData({ full_name: fullName, username, phone: phone ?? '' });
      await refreshUser();
      router.back();
    } catch (e) {
      console.error('Unexpected error saving profile:', e);
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!hasChanges) {
      router.back();
      return;
    }
    Alert.alert('Discard changes?', 'Your edits have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const canSave = hasChanges && !saving;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior="padding">
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIconButton} onPress={handleClose} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Close">
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit profile</Text>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleSave}
            disabled={!canSave}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Save"
            accessibilityState={{ disabled: !canSave }}
          >
            <Text style={[styles.headerAction, !canSave && styles.headerActionDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.light.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          >
            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user ? initialsOf(user) : ''}</Text>
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer} accessibilityRole="alert">
                <AlertCircle size={16} color={Colors.light.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <View style={styles.inputContainer}>
                  <User size={22} color={Colors.light.textTertiary} />
                  <TextInput
                    style={styles.textInput}
                    value={profileData.full_name}
                    onChangeText={(value) => updateField('full_name', value)}
                    placeholder="Your name"
                    placeholderTextColor={Colors.light.textTertiary}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.inputContainer}>
                  <AtSign size={22} color={Colors.light.textTertiary} />
                  <TextInput
                    style={styles.textInput}
                    value={profileData.username}
                    onChangeText={(value) => updateField('username', value)}
                    placeholder="At least 3 characters"
                    placeholderTextColor={Colors.light.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <View style={styles.inputContainer}>
                  <Phone size={22} color={Colors.light.textTertiary} />
                  <TextInput
                    style={styles.textInput}
                    value={profileData.phone}
                    onChangeText={(value) => updateField('phone', value)}
                    placeholder="Optional"
                    placeholderTextColor={Colors.light.textTertiary}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                  />
                </View>
              </View>
            </View>

            <View style={styles.accountSection}>
              <Text style={styles.sectionTitle}>Account</Text>
              <View style={styles.accountInfoCard}>
                <View style={styles.accountInfoItem}>
                  <Text style={styles.accountInfoLabel}>Email</Text>
                  <Text style={styles.accountInfoValue} numberOfLines={1}>
                    {user?.email ?? '—'}
                  </Text>
                </View>
                <View style={styles.accountInfoDivider} />
                <View style={styles.accountInfoItem}>
                  <Text style={styles.accountInfoLabel}>Verified</Text>
                  <Text
                    style={[
                      styles.accountInfoValue,
                      { color: user?.email_confirmed_at ? Colors.light.success : Colors.light.textTertiary },
                    ]}
                  >
                    {user?.email_confirmed_at ? 'Yes' : 'Pending'}
                  </Text>
                </View>
                <View style={styles.accountInfoDivider} />
                <View style={styles.accountInfoItem}>
                  <Text style={styles.accountInfoLabel}>Member since</Text>
                  <Text style={styles.accountInfoValue}>{formatDate(user?.created_at)}</Text>
                </View>
              </View>
              <Text style={styles.sectionNote}>Email is your login and cannot be changed here.</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
            >
              {saving ? (
                <ActivityIndicator color={Colors.light.card} />
              ) : (
                <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>Save</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  keyboardAvoid: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: { ...type.section, color: Colors.light.text },
  headerIconButton: { minWidth: touch.min, minHeight: touch.min, justifyContent: 'center', alignItems: 'flex-start' },
  headerActionButton: { minHeight: touch.min, justifyContent: 'center', alignItems: 'flex-end' },
  headerAction: { ...type.bodyMedium, color: Colors.light.primary },
  headerActionDisabled: { color: Colors.light.textTertiary },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.xxl },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.primary,
    borderWidth: 4,
    borderColor: Colors.light.rubber,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { ...type.title, color: Colors.light.card },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.error,
    borderRadius: radius.input,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  errorText: { ...type.label, color: Colors.light.error, marginLeft: spacing.sm, flex: 1 },
  formSection: { marginBottom: spacing.xxl },
  inputGroup: { marginBottom: spacing.lg },
  inputLabel: { ...type.eyebrow, color: Colors.light.textTertiary, marginBottom: spacing.sm, marginLeft: spacing.xs },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: radius.input,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  textInput: { ...type.body, flex: 1, paddingVertical: spacing.md + spacing.xs / 2, paddingLeft: spacing.md, color: Colors.light.text },
  accountSection: { marginBottom: spacing.xxl },
  sectionTitle: { ...type.eyebrow, color: Colors.light.textTertiary, marginBottom: spacing.sm, marginLeft: spacing.xs },
  sectionNote: { ...type.label, color: Colors.light.textTertiary, marginTop: spacing.sm, marginLeft: spacing.xs },
  accountInfoCard: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  accountInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md + spacing.xs / 2,
    gap: spacing.md,
  },
  accountInfoDivider: { height: 1, backgroundColor: Colors.light.border },
  accountInfoLabel: { ...type.body, color: Colors.light.textSecondary },
  accountInfoValue: { ...type.bodyMedium, color: Colors.light.text, flexShrink: 1, textAlign: 'right' },
  saveButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: radius.input,
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginBottom: spacing.xxxl,
  },
  saveButtonDisabled: { backgroundColor: Colors.light.border },
  saveButtonText: { ...type.bodyMedium, color: Colors.light.card },
  saveButtonTextDisabled: { color: Colors.light.textTertiary },
});
