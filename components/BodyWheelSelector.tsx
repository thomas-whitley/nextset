import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import Colors from '@/constants/Colors';

const { width, height } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(width, height) * 0.7;
const CENTER_BUTTON_SIZE = 80;

interface BodyWheelSelectorProps {
  visible: boolean;
  onClose: () => void;
  onMuscleGroupSelect: (muscleGroup: string) => void;
  onAddCustomExercise: () => void;
}

const muscleGroups = [
  'Abs',
  'Back', 
  'Biceps',
  'Cardio',
  'Chest',
  'Forearms',
  'Glutes',
  'Shoulders',
  'Triceps',
  'Upper Legs',
  'Lower Legs'
];

export default function BodyWheelSelector({ 
  visible, 
  onClose, 
  onMuscleGroupSelect, 
  onAddCustomExercise 
}: BodyWheelSelectorProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleAddCustomExercise = () => {
    onAddCustomExercise();
    router.push('/create-custom-exercise');
  };

  const renderWedge = (muscleGroup: string, index: number) => {
    const angle = (360 / muscleGroups.length) * index;
    const angleInRadians = (angle - 90) * (Math.PI / 180); // -90 to start from top
    const radius = WHEEL_SIZE / 2 - 60; // Distance from center for text
    
    const x = Math.cos(angleInRadians) * radius;
    const y = Math.sin(angleInRadians) * radius;

    const wedgeAngle = 360 / muscleGroups.length;
    const startAngle = angle - wedgeAngle / 2;
    const endAngle = angle + wedgeAngle / 2;

    return (
      <TouchableOpacity
        key={muscleGroup}
        style={[
          styles.wedge,
          {
            transform: [
              { translateX: x },
              { translateY: y },
              { rotate: `${angle}deg` }
            ],
          }
        ]}
        onPress={() => {
          onMuscleGroupSelect(muscleGroup);
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.wedgeContent}>
          <Text style={styles.wedgeText}>{muscleGroup}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <BlurView intensity={20} style={styles.blurContainer}>
          <Animated.View style={[styles.wheelContainer, animatedStyle]}>
            {/* Outer wheel background */}
            <View style={styles.wheelBackground} />
            
            {/* Wedges */}
            <View style={styles.wedgesContainer}>
              {muscleGroups.map((muscleGroup, index) => 
                renderWedge(muscleGroup, index)
              )}
            </View>

            {/* Center button */}
            <TouchableOpacity
              style={styles.centerButton}
              onPress={() => {
                handleAddCustomExercise();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Plus size={24} color={Colors.light.primary} />
              <Text style={styles.centerButtonText}>Add{'\n'}Custom</Text>
            </TouchableOpacity>
          </Animated.View>
        </BlurView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  wheelBackground: {
    position: 'absolute',
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: 'rgba(107, 114, 128, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(156, 163, 175, 0.6)',
  },
  wedgesContainer: {
    position: 'absolute',
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wedge: {
    position: 'absolute',
    width: 80,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wedgeContent: {
    backgroundColor: 'rgba(75, 85, 99, 0.9)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.4)',
  },
  wedgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    textAlign: 'center',
  },
  centerButton: {
    position: 'absolute',
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  centerButtonText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
  },
});