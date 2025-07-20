import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Quote } from 'lucide-react-native';
import Colors from '@/constants/Colors';

// List of motivational quotes
const quotes = [
  "The only bad workout is the one that didn't happen.",
  "Strive for progress, not perfection.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Success isn't always about greatness. It's about consistency.",
  "Push yourself, because no one else is going to do it for you.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Believe in yourself and all that you are.",
  "The secret to getting ahead is getting started.",
  "You are stronger than you think.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "It's not about having time. It's about making time.",
  "The body achieves what the mind believes.",
  "A little progress each day adds up to big results.",
  "Don't limit your challenges. Challenge your limits.",
  "The difference between try and triumph is a little 'umph'.",
  "Success starts with self-discipline.",
  "Be stronger than your strongest excuse.",
  "Discipline is the bridge between goals and accomplishment.",
  "Today's actions are tomorrow's results.",
  "No pressure, no diamonds.",
  "You don't have to be extreme, just consistent.",
  "Fall in love with the process.",
  "Become the best version of yourself.",
  "Hustle for that muscle.",
  "Sweat is just fat crying.",
  "Consistency is what transforms average into excellence.",
  "Your only limit is you.",
  "Make today your masterpiece.",
  "Doubt kills more dreams than failure ever will.",
  "One workout at a time.",
  "Focus on your goal. Don't look in any direction but ahead.",
  "The hard part isn't getting your body in shape. The hard part is getting your mind in shape.",
  "Commitment means staying loyal to what you said you were going to do.",
  "Energy and persistence conquer all things.",
  "Small steps every day.",
  "Results are earned, not given.",
  "Create healthy habits, not restrictions.",
  "The goal is to get fit, make it a habit.",
  "You get what you work for.",
  "Train insane or remain the same.",
  "Strength grows in the moments when you think you can't go on.",
  "Let exercise be your stress relief.",
  "Good things come to those who sweat.",
  "Excuses don't burn calories.",
  "Every rep counts.",
  "Be the energy you want to attract.",
  "Build your body, build your character.",
  "Mindset is what separates the best from the rest.",
  "Own your morning. Elevate your life."
];

const MotivationalQuote = () => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const fadeAnim = useState(new Animated.Value(1))[0];

  // Function to get a random quote index
  const getRandomQuoteIndex = () => {
    return Math.floor(Math.random() * quotes.length);
  };

  // Initialize with a random quote on component mount
  useEffect(() => {
    setQuoteIndex(getRandomQuoteIndex());
  }, []);

  // Function to change the quote with a fade animation
  const changeQuote = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();

    // Change the quote after fade out
    setTimeout(() => {
      let newIndex;
      do {
        newIndex = getRandomQuoteIndex();
      } while (newIndex === quoteIndex); // Ensure we get a different quote
      setQuoteIndex(newIndex);
    }, 500);
  };

  // Change quote every 24 hours (or on app restart)
  useEffect(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('lastQuoteDate');
    
    if (savedDate !== today) {
      // New day, change the quote
      changeQuote();
      localStorage.setItem('lastQuoteDate', today);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.quoteIconContainer}>
        <Quote size={16} color={Colors.light.primary} />
      </View>
      <Text style={styles.quoteText}>
        {quotes[quoteIndex]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quoteIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quoteText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
    lineHeight: 20,
  },
});

export default MotivationalQuote;