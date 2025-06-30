import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Target, Zap, Users, TrendingUp, Smartphone, Brain } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';

export default function AboutUsScreen() {
  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Zap size={48} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.appName}>Momentum</Text>
          <Text style={styles.tagline}>Empowering Your Fitness Journey</Text>
        </View>

        {/* Our Vision Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={24} color={Colors.light.primary} />
            <Text style={styles.sectionTitle}>Our Vision</Text>
          </View>
          <Text style={styles.sectionContent}>
            At Momentum, we believe that every individual deserves the tools and insights to take complete control of their fitness journey. 
            Our mission is to empower you through data-driven insights, personalized workout experiences, and a supportive community that 
            celebrates every milestone along the way.
          </Text>
          <Text style={styles.sectionContent}>
            We understand that consistency is the cornerstone of transformation. That's why we've built an intelligent platform that adapts 
            to your unique needs, tracks your progress with precision, and motivates you to achieve peak performance through smart technology 
            and thoughtful design.
          </Text>
        </View>

        {/* Our Roadmap Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={24} color={Colors.light.primary} />
            <Text style={styles.sectionTitle}>Our Roadmap</Text>
          </View>
          <Text style={styles.roadmapIntro}>
            We're constantly evolving to bring you the most advanced fitness experience. Here's what's coming next:
          </Text>
          
          <View style={styles.roadmapList}>
            <View style={styles.roadmapItem}>
              <View style={styles.roadmapIcon}>
                <Brain size={20} color={Colors.light.primary} />
              </View>
              <View style={styles.roadmapContent}>
                <Text style={styles.roadmapTitle}>Advanced AI-Driven Workout Recommendations</Text>
                <Text style={styles.roadmapDescription}>
                  Intelligent algorithms that learn from your performance and automatically adjust your training program for optimal results.
                </Text>
              </View>
            </View>

            <View style={styles.roadmapItem}>
              <View style={styles.roadmapIcon}>
                <Users size={20} color={Colors.light.primary} />
              </View>
              <View style={styles.roadmapContent}>
                <Text style={styles.roadmapTitle}>Real-Time Community Challenges</Text>
                <Text style={styles.roadmapDescription}>
                  Connect with like-minded fitness enthusiasts, participate in global challenges, and celebrate achievements together.
                </Text>
              </View>
            </View>

            <View style={styles.roadmapItem}>
              <View style={styles.roadmapIcon}>
                <Smartphone size={20} color={Colors.light.primary} />
              </View>
              <View style={styles.roadmapContent}>
                <Text style={styles.roadmapTitle}>Deeper Integration with Wearable Technology</Text>
                <Text style={styles.roadmapDescription}>
                  Seamless connectivity with Apple Watch, Fitbit, and other devices for comprehensive health and performance tracking.
                </Text>
              </View>
            </View>

            <View style={styles.roadmapItem}>
              <View style={styles.roadmapIcon}>
                <Target size={20} color={Colors.light.primary} />
              </View>
              <View style={styles.roadmapContent}>
                <Text style={styles.roadmapTitle}>Personalized Nutrition Guidance</Text>
                <Text style={styles.roadmapDescription}>
                  AI-powered meal planning and nutrition tracking that complements your workout routine for holistic wellness.
                </Text>
              </View>
            </View>

            <View style={styles.roadmapItem}>
              <View style={styles.roadmapIcon}>
                <Zap size={20} color={Colors.light.primary} />
              </View>
              <View style={styles.roadmapContent}>
                <Text style={styles.roadmapTitle}>Advanced Recovery Analytics</Text>
                <Text style={styles.roadmapDescription}>
                  Comprehensive recovery tracking using heart rate variability, sleep data, and stress indicators to optimize your training schedule.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Values Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={24} color={Colors.light.primary} />
            <Text style={styles.sectionTitle}>Our Values</Text>
          </View>
          
          <View style={styles.valuesList}>
            <View style={styles.valueItem}>
              <Text style={styles.valueTitle}>Personalization</Text>
              <Text style={styles.valueDescription}>
                Every fitness journey is unique. We tailor our platform to your individual goals, preferences, and progress.
              </Text>
            </View>

            <View style={styles.valueItem}>
              <Text style={styles.valueTitle}>Data-Driven Insights</Text>
              <Text style={styles.valueDescription}>
                We believe in the power of data to drive meaningful change and help you make informed decisions about your health.
              </Text>
            </View>

            <View style={styles.valueItem}>
              <Text style={styles.valueTitle}>Community Support</Text>
              <Text style={styles.valueDescription}>
                Fitness is better together. We foster a supportive community that celebrates every victory, big or small.
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Join Our Journey</Text>
          <Text style={styles.contactDescription}>
            Ready to transform your fitness experience? Download Momentum today and become part of a community 
            that's redefining what it means to achieve peak performance.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: Colors.light.card,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginLeft: 12,
  },
  sectionContent: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  roadmapIntro: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  roadmapList: {
    gap: 20,
  },
  roadmapItem: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  roadmapIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  roadmapContent: {
    flex: 1,
  },
  roadmapTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  roadmapDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    lineHeight: 20,
  },
  valuesList: {
    gap: 16,
  },
  valueItem: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  valueTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  valueDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 40,
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 20,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
});