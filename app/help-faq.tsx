import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { spacing, radius, type, HIT_SLOP } from '@/constants/theme';

type FAQItem = {
  question: string;
  answer: string;
};

export default function HelpFAQScreen() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const faqItems: FAQItem[] = [
    {
      question: "How do I start a workout?",
      answer: "Pick a program in the Programs tab. Home then shows the next workout in that program with a Start button. You can also open the program and start any day directly."
    },
    {
      question: "How do I log a set?",
      answer: "Type the weight in kg and the reps, then tap the set number to tick it off. The rest timer starts automatically; change its length in Settings."
    },
    {
      question: "What does the 'Previous' column show?",
      answer: "The weight and reps you logged for that exercise the last time you did it. It shows a dash until you have logged the exercise once."
    },
    {
      question: "Can I change the exercises in a program?",
      answer: "Yes. During a workout, tap Add exercise to pick from the library, use the bin icon to remove one, and + / − to change the number of sets. Changes are saved to your copy of the program."
    },
    {
      question: "How is my streak counted?",
      answer: "Consecutive calendar days with at least one finished workout, ending today or yesterday. Miss a full day and it starts again from zero."
    },
    {
      question: "Where can I see past workouts?",
      answer: "The Programs tab lists your history, and the calendar (tap the calendar icon on Home) marks every day you trained. Progress shows totals and charts."
    },
    {
      question: "Can I export my data?",
      answer: "Settings → Export to CSV writes one row per set (date, workout, exercise, weight, reps) and opens the share sheet so you can save or send it."
    },
    {
      question: "Does it work without signal?",
      answer: "You need a connection to log in and to save a finished workout. If saving fails, the app keeps the workout and lets you retry once you are back online."
    },
    {
      question: "Can I use pounds?",
      answer: "Not yet — NextSet is kilograms only."
    },
    {
      question: "How do I reset my password?",
      answer: "On the login screen tap Forgot password and enter your email. You will get a link to set a new one."
    },
    {
      question: "How do I delete my account?",
      answer: "Settings → Delete account opens a page with the steps. Deletion removes your account and every workout within 30 days."
    },
    {
      question: "How do I get help?",
      answer: "Email support.nextset@gmail.com or use Send feedback in Settings."
    }
  ];

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Back">
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Help</Text>
          <Text style={styles.introSubtitle}>
            Common questions about NextSet. If yours isn't here, email support.nextset@gmail.com.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Questions</Text>
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

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: { width: spacing.xxxl, height: spacing.xxxl, justifyContent: 'center' },
  headerTitle: { ...type.section, color: Colors.light.text },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  introSection: { paddingVertical: spacing.xl },
  introTitle: { ...type.title, color: Colors.light.text, marginBottom: spacing.sm },
  introSubtitle: { ...type.body, color: Colors.light.textSecondary },
  sectionTitle: { ...type.eyebrow, color: Colors.light.textTertiary, marginBottom: spacing.sm, marginLeft: spacing.xs },
  faqContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    overflow: 'hidden',
    marginBottom: spacing.xxxl,
  },
  faqItemContainer: {},
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
  },
  faqQuestion: { ...type.bodyMedium, flex: 1, color: Colors.light.text, marginRight: spacing.md },
  faqAnswer: { paddingBottom: spacing.base, paddingHorizontal: spacing.base },
  faqAnswerText: { ...type.body, color: Colors.light.textSecondary },
  faqDivider: { height: 1, backgroundColor: Colors.light.border, marginHorizontal: spacing.base },
});
