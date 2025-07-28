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
  useAnimatedProps
} from 'react-native-reanimated';
import Svg, { Path, Line, Text as SvgText, G } from 'react-native-svg';
import Colors from '@/constants/Colors';

const { width, height } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(width, height) * 0.7;
const CENTER_BUTTON_SIZE = 80;
const OUTER_RADIUS = WHEEL_SIZE / 2 - 20;
const INNER_RADIUS = CENTER_BUTTON_SIZE / 2 + 20;
const TEXT_RADIUS = (OUTER_RADIUS + INNER_RADIUS) / 2;

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

// Create animated components
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

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

  // Helper function to create SVG path for a wedge
  const getWedgePath = (startAngle: number, endAngle: number) => {
    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);
    
    const centerX = WHEEL_SIZE / 2;
    const centerY = WHEEL_SIZE / 2;
    
    const x1 = centerX + INNER_RADIUS * Math.cos(startAngleRad);
    const y1 = centerY + INNER_RADIUS * Math.sin(startAngleRad);
    const x2 = centerX + OUTER_RADIUS * Math.cos(startAngleRad);
    const y2 = centerY + OUTER_RADIUS * Math.sin(startAngleRad);
    
    const x3 = centerX + OUTER_RADIUS * Math.cos(endAngleRad);
    const y3 = centerY + OUTER_RADIUS * Math.sin(endAngleRad);
    const x4 = centerX + INNER_RADIUS * Math.cos(endAngleRad);
    const y4 = centerY + INNER_RADIUS * Math.sin(endAngleRad);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} L ${x2} ${y2} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArcFlag} 0 ${x1} ${y1} Z`;
  };

  // Helper function to get text position
  const getTextPosition = (angle: number) => {
    const angleInRadians = (angle - 90) * (Math.PI / 180);
    const centerX = WHEEL_SIZE / 2;
    const centerY = WHEEL_SIZE / 2;
    
    const x = centerX + TEXT_RADIUS * Math.cos(angleInRadians);
    const y = centerY + TEXT_RADIUS * Math.sin(angleInRadians);
    
    return { x, y };
  };

  const renderWedge = (muscleGroup: string, index: number) => {
    const anglePerWedge = 360 / muscleGroups.length;
    const startAngle = anglePerWedge * index;
    const endAngle = anglePerWedge * (index + 1);
    const midAngle = startAngle + anglePerWedge / 2;
    
    const isPressed = pressedWedge === muscleGroup;
    const textPosition = getTextPosition(midAngle);
    
    // Animated props for the wedge path
    const animatedPathProps = useAnimatedProps(() => ({
      fill: withTiming(isPressed ? Colors.light.primary : 'rgba(75, 85, 99, 0.9)', { duration: 150 }),
      stroke: withTiming(isPressed ? Colors.light.primary : 'rgba(156, 163, 175, 0.4)', { duration: 150 }),
      strokeWidth: withTiming(isPressed ? 3 : 1, { duration: 150 }),
    }));

    // Animated props for the text
    const animatedTextProps = useAnimatedProps(() => ({
      fill: withTiming(isPressed ? '#FFFFFF' : '#F9FAFB', { duration: 150 }),
    }));

    return (
      <G key={muscleGroup}>
        <AnimatedPath
          d={getWedgePath(startAngle, endAngle)}
          animatedProps={animatedPathProps}
        />
        <AnimatedSvgText
          x={textPosition.x}
          y={textPosition.y}
          fontSize="13"
          fontFamily="Inter-SemiBold"
          textAnchor="middle"
          alignmentBaseline="middle"
          animatedProps={animatedTextProps}
        >
          {muscleGroup}
        </AnimatedSvgText>
      </G>
    );
  };

  const renderRadialLines = () => {
    const lines = [];
    for (let i = 0; i < muscleGroups.length; i++) {
      const angle = (360 / muscleGroups.length) * i;
      const angleInRadians = (angle - 90) * (Math.PI / 180);
      
      const centerX = WHEEL_SIZE / 2;
      const centerY = WHEEL_SIZE / 2;
      
      const x1 = centerX + INNER_RADIUS * Math.cos(angleInRadians);
      const y1 = centerY + INNER_RADIUS * Math.sin(angleInRadians);
      const x2 = centerX + OUTER_RADIUS * Math.cos(angleInRadians);
      const y2 = centerY + OUTER_RADIUS * Math.sin(angleInRadians);
      
      lines.push(
        <Line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="rgba(156, 163, 175, 0.6)"
          strokeWidth="1"
        />
      );
    }
    return lines;
  };

  // Handle touch events on the SVG
  const handleSvgTouch = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const centerX = WHEEL_SIZE / 2;
    const centerY = WHEEL_SIZE / 2;
    
    // Calculate distance from center
    const dx = locationX - centerX;
    const dy = locationY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if touch is within the donut ring
    if (distance >= INNER_RADIUS && distance <= OUTER_RADIUS) {
      // Calculate angle
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      
      // Determine which wedge was touched
      const anglePerWedge = 360 / muscleGroups.length;
      const wedgeIndex = Math.floor(angle / anglePerWedge);
      
      if (wedgeIndex >= 0 && wedgeIndex < muscleGroups.length) {
        const muscleGroup = muscleGroups[wedgeIndex];
        onMuscleGroupSelect(muscleGroup);
        onClose();
      }
    }
  };

  const handleSvgTouchStart = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const centerX = WHEEL_SIZE / 2;
    const centerY = WHEEL_SIZE / 2;
    
    const dx = locationX - centerX;
    const dy = locationY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance >= INNER_RADIUS && distance <= OUTER_RADIUS) {
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      
      const anglePerWedge = 360 / muscleGroups.length;
      const wedgeIndex = Math.floor(angle / anglePerWedge);
      
      if (wedgeIndex >= 0 && wedgeIndex < muscleGroups.length) {
        setPressedWedge(muscleGroups[wedgeIndex]);
      }
    }
  };

  const handleSvgTouchEnd = () => {
    setPressedWedge(null);
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
            {/* SVG Donut Chart */}
            <Svg 
              width={WHEEL_SIZE} 
              height={WHEEL_SIZE}
              onTouchStart={handleSvgTouchStart}
              onTouchEnd={handleSvgTouchEnd}
              onTouchCancel={handleSvgTouchEnd}
              onResponderGrant={handleSvgTouch}
            >
              {/* Render wedges */}
              {muscleGroups.map((muscleGroup, index) => 
                renderWedge(muscleGroup, index)
              )}
              
              {/* Render radial separator lines */}
              {renderRadialLines()}
            </Svg>

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