import { ReactNode, useCallback, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { elevation, motion } from '@/constants/theme';

/**
 * Long-press an item and drag it to reorder.
 *
 * Rows here are not a uniform height — an exercise card grows with its notes
 * field and its number of sets — so slots are derived from measured heights
 * rather than the usual `index * ROW_HEIGHT` shortcut, which would drift the
 * moment two cards differed.
 *
 * Only the visual order is animated; the caller is told once, on drop, so a
 * reorder is one persisted write rather than one per crossed slot.
 */

const ACTIVATE_MS = 200;

type Props<T> = {
  items: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number, isActive: boolean) => ReactNode;
  /** Called once on drop, with the final order of keys. */
  onReorder: (orderedKeys: string[]) => void;
  enabled?: boolean;
  gap?: number;
};

export default function DraggableList<T>({
  items,
  keyExtractor,
  renderItem,
  onReorder,
  enabled = true,
  gap = 0,
}: Props<T>) {
  const heights = useSharedValue<number[]>([]);
  const activeIndex = useSharedValue(-1);
  const targetIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);

  const setHeight = useCallback(
    (index: number, height: number) => {
      const next = [...heights.value];
      next[index] = height;
      heights.value = next;
    },
    [heights]
  );

  const commit = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0) return;
      const keys = items.map((item, i) => keyExtractor(item, i));
      const [moved] = keys.splice(from, 1);
      keys.splice(to, 0, moved);
      onReorder(keys);
    },
    [items, keyExtractor, onReorder]
  );

  return (
    <View>
      {items.map((item, index) => (
        <DraggableItem
          key={keyExtractor(item, index)}
          index={index}
          count={items.length}
          gap={gap}
          enabled={enabled}
          heights={heights}
          activeIndex={activeIndex}
          targetIndex={targetIndex}
          dragY={dragY}
          onMeasure={setHeight}
          onCommit={commit}
        >
          {(isActive) => renderItem(item, index, isActive)}
        </DraggableItem>
      ))}
    </View>
  );
}

type ItemProps = {
  index: number;
  count: number;
  gap: number;
  enabled: boolean;
  heights: SharedValue<number[]>;
  activeIndex: SharedValue<number>;
  targetIndex: SharedValue<number>;
  dragY: SharedValue<number>;
  onMeasure: (index: number, height: number) => void;
  onCommit: (from: number, to: number) => void;
  children: (isActive: boolean) => ReactNode;
};

function DraggableItem({
  index,
  count,
  gap,
  enabled,
  heights,
  activeIndex,
  targetIndex,
  dragY,
  onMeasure,
  onCommit,
  children,
}: ItemProps) {
  // React state, not a shared value: a shared value read during render never
  // triggers a re-render, so the flag handed to renderItem would be stuck at
  // false forever. The worklet flips this through runOnJS instead.
  const [isActive, setIsActive] = useState(false);

  const onLayout = (e: LayoutChangeEvent) => {
    onMeasure(index, e.nativeEvent.layout.height);
  };

  const activateTick = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const slotTick = () => Haptics.selectionAsync();

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activateAfterLongPress(ACTIVATE_MS)
    .onStart(() => {
      activeIndex.value = index;
      targetIndex.value = index;
      dragY.value = 0;
      runOnJS(setIsActive)(true);
      runOnJS(activateTick)();
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;

      // Which slot is the dragged card's centre currently over?
      const hs = heights.value;
      const activeH = hs[index] ?? 0;
      let top = 0;
      for (let i = 0; i < index; i++) top += (hs[i] ?? 0) + gap;
      const centre = top + dragY.value + activeH / 2;

      let slot = 0;
      let cursor = 0;
      for (let i = 0; i < count; i++) {
        const h = (hs[i] ?? 0) + gap;
        if (centre < cursor + h / 2) break;
        cursor += h;
        slot = i + 1;
      }
      slot = Math.max(0, Math.min(count - 1, slot));

      if (slot !== targetIndex.value) {
        targetIndex.value = slot;
        runOnJS(slotTick)();
      }
    })
    .onEnd(() => {
      const from = index;
      const to = targetIndex.value;
      runOnJS(onCommit)(from, to);
      activeIndex.value = -1;
      targetIndex.value = -1;
      dragY.value = 0;
      runOnJS(setIsActive)(false);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const hs = heights.value;
    const active = activeIndex.value;

    if (active === index) {
      return {
        transform: [{ translateY: dragY.value }, { scale: 1.02 }],
        zIndex: 10,
        ...elevation.dragging,
      };
    }

    if (active === -1) {
      return { transform: [{ translateY: withSpring(0, motion.spring) }, { scale: 1 }], zIndex: 0 };
    }

    // Everything between the card's origin and its target shifts by the
    // dragged card's height to open the gap it will drop into.
    const activeH = (hs[active] ?? 0) + gap;
    const target = targetIndex.value;
    let shift = 0;
    if (active < target && index > active && index <= target) shift = -activeH;
    if (active > target && index >= target && index < active) shift = activeH;

    return {
      transform: [{ translateY: withSpring(shift, motion.spring) }, { scale: 1 }],
      zIndex: 0,
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View onLayout={onLayout} style={[styles.item, animatedStyle]}>
        {children(isActive)}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: 'transparent',
  },
});
