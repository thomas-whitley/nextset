import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
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
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
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
    fontFamily: 'ArchivoNarrow-Bold',
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
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 16,
    fontFamily: 'Archivo-Medium',
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
    fontFamily: 'ArchivoNarrow-SemiBold',
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
    fontFamily: 'Archivo-Medium',
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
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginLeft: 12,
  },
  liveChatDescription: {
    fontSize: 16,
    fontFamily: 'Archivo-Medium',
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
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.textTertiary,
    marginLeft: 8,
  },
});