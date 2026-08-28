import { ReactNode } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/Colors';
import { motion, radius, spacing, type } from '@/constants/theme';

/**
 * Swipe a row sideways to remove it.
 *
 * Replaces a trash icon plus a confirm dialog, which is two taps and a modal
 * in the middle of a set. Removal is optimistic and reversible by the caller
 * via an undo affordance — asking "are you sure?" for something this cheap to
 * undo is the wrong trade mid-workout.
 */

/** Past this fraction of the row width, letting go commits. */
const COMMIT_FRACTION = 0.4;
const COMMIT_VELOCITY = 800;

type Props = {
  children: ReactNode;
  onRemove: () => void;
  /** Read out by screen readers and shown beside the bin icon. */
  label?: string;
  enabled?: boolean;
};

export default function SwipeToRemove({ children, onRemove, label = 'Remove', enabled = true }: Props) {
  const translateX = useSharedValue(0);
  const rowWidth = useSharedValue(0);
  const rowHeight = useSharedValue(0);
  const armed = useSharedValue(false);

  const onLayout = (e: LayoutChangeEvent) => {
    rowWidth.value = e.nativeEvent.layout.width;
    rowHeight.value = e.nativeEvent.layout.height;
  };

  const tick = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const pan = Gesture.Pan()
    .enabled(enabled)
    // Let vertical scrolling win; only claim clearly horizontal movement.
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      // Only leftward. Rubber-band any rightward pull so it feels bounded.
      translateX.value = e.translationX < 0 ? e.translationX : e.translationX * 0.2;

      const past = Math.abs(translateX.value) > rowWidth.value * COMMIT_FRACTION;
      if (past !== armed.value) {
        armed.value = past;
        if (past) runOnJS(tick)();
      }
    })
    .onEnd((e) => {
      const past =
        Math.abs(translateX.value) > rowWidth.value * COMMIT_FRACTION ||
        e.velocityX < -COMMIT_VELOCITY;

      if (past) {
        translateX.value = withTiming(-rowWidth.value, { duration: motion.fast }, (done) => {
          if (done) runOnJS(onRemove)();
        });
      } else {
        translateX.value = withSpring(0, motion.spring);
        armed.value = false;
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, rowWidth.value * COMMIT_FRACTION],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <View onLayout={onLayout} style={styles.container}>
      <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="none">
        <Trash2 size={18} color={Colors.light.onRubber} />
        <Text style={styles.backdropLabel}>{label}</Text>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.card,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.light.error,
    borderRadius: radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: spacing.lg,
    gap: spacing.sm,
  },
  backdropLabel: {
    ...type.eyebrow,
    color: Colors.light.onRubber,
  },
});
