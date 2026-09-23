import { ReactNode, useEffect, useState } from 'react';
import { View, StyleSheet, Modal, Pressable, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Colors from '@/constants/Colors';
import { motion, radius, spacing } from '@/constants/theme';

/**
 * A bottom sheet you can throw downwards to close.
 *
 * The backdrop tracks the drag rather than fading on a timer, so the sheet
 * feels attached to your finger instead of merely animated. Cheapest possible
 * "this app feels native" win, and it removes a reach to a small X button.
 */

/** Past this fraction of the sheet height, letting go dismisses. */
const DISMISS_FRACTION = 0.25;
const DISMISS_VELOCITY = 1000;

type Props = {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
  /** Tapping the dimmed area closes the sheet. */
  dismissOnBackdropPress?: boolean;
  /**
   * Rise with the keyboard. For sheets with a text field (rename, finish notes).
   * A KeyboardAvoidingView inside this Modal did nothing on Android edge-to-edge
   * (device run T2-5).
   */
  avoidKeyboard?: boolean;
};

export default function DragDismissSheet({
  visible,
  onDismiss,
  children,
  dismissOnBackdropPress = true,
  avoidKeyboard = false,
}: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const sheetHeight = useSharedValue(screenHeight * 0.5);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (!avoidKeyboard || !visible) return;
    // iOS reports before the animation, Android only after it.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const shown = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hidden = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
      setKeyboardHeight(0);
    };
  }, [avoidKeyboard, visible]);

  const close = () => {
    translateY.value = 0;
    onDismiss();
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onUpdate((e) => {
      // Downward only; resist upward so the sheet cannot be dragged off-screen.
      translateY.value = e.translationY > 0 ? e.translationY : e.translationY * 0.15;
    })
    .onEnd((e) => {
      const past =
        translateY.value > sheetHeight.value * DISMISS_FRACTION || e.velocityY > DISMISS_VELOCITY;

      if (past) {
        translateY.value = withTiming(sheetHeight.value, { duration: motion.fast }, (done) => {
          if (done) runOnJS(close)();
        });
      } else {
        translateY.value = withSpring(0, motion.spring);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(0, translateY.value) }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, sheetHeight.value],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          {dismissOnBackdropPress ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close"
            />
          ) : null}
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            testID="drag-dismiss-sheet"
            style={[
              styles.sheet,
              // Over the keyboard the home-indicator inset is hidden anyway.
              { paddingBottom: keyboardHeight > 0 ? spacing.lg : spacing.xxl + insets.bottom, marginBottom: keyboardHeight },
              sheetStyle,
            ]}
            onLayout={(e) => {
              sheetHeight.value = e.nativeEvent.layout.height;
            }}
          >
            {/* The thing your thumb aims for. */}
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(20, 21, 23, 0.55)',
  },
  sheet: {
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: radius.slab,
    borderTopRightRadius: radius.slab,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.border,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
