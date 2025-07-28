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
import Svg, { Line } from 'react-native-svg';
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
 const [pressedWedge, setPressedWedge] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
     setPressedWedge(null);
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
   const angleInRadians = (angle - 90) * (Math.PI / 180);
    const radius = WHEEL_SIZE / 2 - 60; // Distance from center for text
    
    const x = Math.cos(angleInRadians) * radius;
    const y = Math.sin(angleInRadians) * radius;

   const isPressed = pressedWedge === muscleGroup;

    return (
      <TouchableOpacity
        key={muscleGroup}
        style={[
          styles.wedge,
          {
            transform: [
              { translateX: x },
              { translateY: y },
            ],
          }
        ]}
        onPressIn={() => setPressedWedge(muscleGroup)}
        onPressOut={() => setPressedWedge(null)}
        onPress={() => {
          setPressedWedge(null);
          onMuscleGroupSelect(muscleGroup);
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={[
          styles.wedgeContent,
          isPressed && styles.wedgeContentPressed
        ]}>
          <Text style={[
            styles.wedgeText,
            isPressed && styles.wedgeTextPressed
          ]}>
            {muscleGroup}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  const renderRadialLines = () => {
    const lines = [];
    for (let i = 0; i < muscleGroups.length; i++) {
      const angle = (360 / muscleGroups.length) * i;
      const angleInRadians = (angle - 90) * (Math.PI / 180);
      
      const innerRadius = CENTER_BUTTON_SIZE / 2 + 10;
      const outerRadius = WHEEL_SIZE / 2 - 10;
      
      const x1 = (WHEEL_SIZE / 2) + Math.cos(angleInRadians) * innerRadius;
      const y1 = (WHEEL_SIZE / 2) + Math.sin(angleInRadians) * innerRadius;
      const x2 = (WHEEL_SIZE / 2) + Math.cos(angleInRadians) * outerRadius;
      const y2 = (WHEEL_SIZE / 2) + Math.sin(angleInRadians) * outerRadius;
      
      lines.push(
        <Line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="rgba(156, 163, 175, 0.3)"
          strokeWidth="1"
        />
      );
    }
    return lines;
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
            
           {/* Radial separator lines */}
           <Svg 
             width={WHEEL_SIZE} 
             height={WHEEL_SIZE} 
             style={styles.radialLines}
           >
             {renderRadialLines()}
           </Svg>
           
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
 radialLines: {
   position: 'absolute',
   top: 0,
   left: 0,
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
   width: 100,
   height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wedgeContent: {
    backgroundColor: 'rgba(75, 85, 99, 0.9)',
   borderRadius: 12,
   paddingVertical: 12,
   paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.4)',
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.2,
   shadowRadius: 4,
   elevation: 4,
  },
 wedgeContentPressed: {
   backgroundColor: Colors.light.primary,
   borderColor: Colors.light.primary,
   shadowColor: Colors.light.primary,
   shadowOffset: { width: 0, height: 4 },
   shadowOpacity: 0.4,
   shadowRadius: 8,
   elevation: 8,
 },
  wedgeText: {
   fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    textAlign: 'center',
  },
 wedgeTextPressed: {
   color: '#FFFFFF',
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