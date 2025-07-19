import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';

type FAQItem = {
  question: string;
  answer: string;
};

export default function HelpFAQScreen() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const faqItems: FAQItem[] = [
    {
      question: "How do I create a custom workout?",
      answer: "Navigate to the Programs tab and tap 'Create Your Own Program'. You can add exercises, set rep ranges, and customize your workout schedule."
    },
    {
      question: "How is my weekly streak calculated?",
      answer: "Your weekly streak counts consecutive weeks where you complete at least 2 workouts. The streak resets if you have a week with fewer than 2 workouts."
    },
    {
      question: "How do I reset my password?",
      answer: "On the login screen, tap 'Forgot Password?' and enter your email. You'll receive a reset link to create a new password."
    },
    {
      question: "Can I sync my workouts with other fitness apps?",
      answer: "Currently, you can export your workout schedule as an .ics file from the calendar view. Full integration with other fitness apps is planned for future updates."
    },
    {
      question: "How do I track my progress over time?",
      answer: "Visit the Progress tab to see detailed analytics including volume trends, personal records, and workout frequency charts."
    },
    {
      question: "What's the difference between the rest timer and Master Timer?",
      answer: "The rest timer is a simple countdown between sets. The Master Timer is an advanced tool for interval training, circuits, and complex workout timing."
    },
    {
      question: "How do I change my active workout program?",
      answer: "In the Programs tab, tap 'Change Program' if you have an active program, or select a new program from the available options."
    },
    {
      question: "Can I add custom exercises to my workouts?",
      answer: "Yes! When adding exercises to a workout, you can browse our exercise library or create custom exercises with your own instructions."
    },
    {
      question: "How do I view my workout history?",
      answer: "Your workout history is available in the Programs tab. You can also view a calendar view by tapping the calendar icon on your weekly streak."
    },
    {
      question: "What happens to my data if I delete the app?",
      answer: "Your workout data is safely stored in the cloud. When you reinstall and log back in, all your data will be restored."
    },
    {
      question: "How do I share my workout achievements?",
      answer: "You can export your workout schedule and share progress screenshots from the Progress tab. Social sharing features are coming soon."
    },
    {
      question: "Can I use the app offline?",
      answer: "Basic workout logging works offline, but syncing, exercise browsing, and progress analytics require an internet connection."
    },
    {
      question: "How do I contact support?",
      answer: "Use the 'Provide Feedback' option in settings, or contact us through the Live Chat feature (coming soon) for immediate assistance."
    }
  ];

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Frequently Asked Questions</Text>
          <Text style={styles.introSubtitle}>
            Find answers to common questions about using Momentum. If you can't find what you're looking for, contact our support team.
          </Text>
        </View>

        <View style={styles.faqContainer}>
          {faqItems.map((item, index) => (
            <View key={index} style={styles.faqItemContainer}>
              <TouchableOpacity
                style={styles.faqItem}
                onPress={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                accessibilityRole="button"
                accessibilityLabel={`FAQ: ${item.question}`}
                accessibilityHint={expandedFAQ === index ? "Tap to collapse answer" : "Tap to expand answer"}
                accessibilityState={{ expanded: expandedFAQ === index }}
              >
                <Text style={styles.faqQuestion}>{item.question}</Text>
                {expandedFAQ === index ? (
                  <ChevronUp size={20} color={Colors.light.textTertiary} />
                ) : (
                  <ChevronDown size={20} color={Colors.light.textTertiary} />
                )}
              </TouchableOpacity>
              {expandedFAQ === index && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{item.answer}</Text>
                </View>
              )}
              {index < faqItems.length - 1 && <View style={styles.faqDivider} />}
            </View>
          ))}
        </View>

        {/* Live Chat Section */}
        <View style={styles.liveChatSection}>
          <View style={styles.liveChatCard}>
            <View style={styles.liveChatHeader}>
              <MessageCircle size={24} color={Colors.light.primary} />
              <Text style={styles.liveChatTitle}>Need More Help?</Text>
            </View>
            <Text style={styles.liveChatDescription}>
              Can't find the answer you're looking for? Our live chat support will be available soon to provide instant assistance.
            </Text>
            <TouchableOpacity style={styles.liveChatButton} disabled>
              <MessageCircle size={20} color={Colors.light.textTertiary} />
              <Text style={styles.liveChatButtonText}>Live Chat (Coming Soon)</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 20,
  },
  introSection: {
    paddingVertical: 24,
  },
  introTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    lineHeight: 24,
  },
  faqContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  faqItemContainer: {
    // Container for each FAQ item
  },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginRight: 12,
    lineHeight: 22,
  },
  faqAnswer: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  faqAnswerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  faqDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 20,
  },
  liveChatSection: {
    marginBottom: 40,
  },
  liveChatCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  liveChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveChatTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginLeft: 12,
  },
  liveChatDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  liveChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    opacity: 0.6,
  },
  liveChatButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.textTertiary,
    marginLeft: 8,
  },
});