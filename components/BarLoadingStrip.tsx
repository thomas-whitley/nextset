import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors, { PLATE_COLORS } from '@/constants/Colors';
import { spacing, type } from '@/constants/theme';
import { loadPlates } from '@/services/plateMath';
import { getBarWeightKg, DEFAULT_BAR_WEIGHT_KG } from '@/services/preferences';
import { ExerciseService } from '@/services/exerciseService';

/**
 * The weight you typed, drawn as the plates you would load — the one place
 * the palette stops being decoration and becomes information.
 *
 * Only rendered where loading a bar is literally what you do. A barbell under
 * a Lat Pulldown or a Plank would be a lie, so for the other 704 exercises in
 * the library this returns null and the row collapses.
 */

const BARBELL_EQUIPMENT = ['barbell', 'ez bar'];

/** Height by weight, so the strip reads without labels. */
const PLATE_HEIGHT: Record<number, number> = {
  25: 32,
  20: 29,
  15: 27,
  10: 24,
  5: 19,
  2.5: 15,
  1.25: 12,
};

const PLATE_WIDTH: Record<number, number> = {
  25: 7,
  20: 7,
  15: 6,
  10: 6,
  5: 5,
  2.5: 4,
  1.25: 4,
};

type Props = {
  totalKg: number;
  /** Library id from WorkoutExercise. Equipment is resolved from it. */
  exerciseId?: number;
  /** Overrides the lookup when a caller already has the equipment string. */
  equipment?: string | null;
  /** Set on a rubber slab so the bar rule and label stay legible. */
  onRubber?: boolean;
};

export function isBarbellEquipment(equipment?: string | null): boolean {
  if (!equipment) return false;
  return BARBELL_EQUIPMENT.includes(equipment.trim().toLowerCase());
}

/** WorkoutExercise carries only exerciseId, so equipment comes from the library. */
export function isBarbellExercise(exerciseId?: number, equipment?: string | null): boolean {
  if (equipment != null) return isBarbellEquipment(equipment);
  if (exerciseId == null) return false;
  return isBarbellEquipment(ExerciseService.getById(exerciseId)?.equipment);
}

export default function BarLoadingStrip({ totalKg, exerciseId, equipment, onRubber = false }: Props) {
  const [barKg, setBarKg] = useState(DEFAULT_BAR_WEIGHT_KG);

  useEffect(() => {
    let alive = true;
    getBarWeightKg().then((kg) => {
      if (alive) setBarKg(kg);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!isBarbellExercise(exerciseId, equipment)) return null;
  if (!Number.isFinite(totalKg) || totalKg <= 0) return null;

  const { perSide, remainderKg, barOnly } = loadPlates(totalKg, barKg);

  const sleeveColor = onRubber ? Colors.light.onRubberSecondary : Colors.light.textTertiary;
  const labelColor = onRubber ? Colors.light.onRubberSecondary : Colors.light.textTertiary;

  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel={describe(totalKg, barKg, perSide, barOnly)}>
      <Text style={[styles.label, { color: labelColor }]}>
        {barOnly ? 'bar only' : `bar ${trim(barKg)}`}
      </Text>

      <View style={styles.bar}>
        {/* Left sleeve, plates mirrored so the heaviest sits innermost. */}
        <View style={styles.side}>
          {[...perSide].reverse().map((plate, i) => (
            <Plate key={`l${i}`} kg={plate.kg} />
          ))}
        </View>

        <View style={[styles.shaft, { backgroundColor: sleeveColor }]} />

        <View style={styles.side}>
          {perSide.map((plate, i) => (
            <Plate key={`r${i}`} kg={plate.kg} />
          ))}
        </View>
      </View>

      {remainderKg > 0 ? (
        <Text style={[styles.remainder, { color: labelColor }]}>+{trim(remainderKg)}</Text>
      ) : null}
    </View>
  );
}

function Plate({ kg }: { kg: number }) {
  const color = PLATE_COLORS[kg] ?? Colors.light.textTertiary;
  const isWhitePlate = kg === 5;
  return (
    <View
      style={[
        styles.plate,
        {
          height: PLATE_HEIGHT[kg] ?? 20,
          width: PLATE_WIDTH[kg] ?? 5,
          backgroundColor: color,
        },
        isWhitePlate && styles.whitePlate,
      ]}
    />
  );
}

/** 20 not 20.0, 2.5 not 2.50. */
function trim(kg: number): string {
  return String(Math.round(kg * 100) / 100);
}

function describe(totalKg: number, barKg: number, perSide: { kg: number }[], barOnly: boolean): string {
  if (barOnly) return `${trim(totalKg)} kilograms, bar only`;
  const plates = perSide.map((p) => trim(p.kg)).join(', ');
  return `${trim(totalKg)} kilograms: ${trim(barKg)} kilogram bar plus ${plates} per side`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  label: {
    ...type.eyebrow,
    minWidth: 52,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
  },
  shaft: {
    width: 26,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  plate: {
    borderRadius: 1.5,
  },
  // #F3F3F1 on the #EEF0ED ground is all but invisible, so the 5kg plate is
  // outlined in the tertiary grey rather than the hairline border colour.
  whitePlate: {
    borderWidth: 1,
    borderColor: Colors.light.textTertiary,
  },
  remainder: {
    ...type.eyebrow,
  },
});
