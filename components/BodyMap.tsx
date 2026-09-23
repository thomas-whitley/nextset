import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Circle, Rect, Ellipse, Path } from 'react-native-svg';
import Colors from '@/constants/Colors';
import { bodyMap, type, spacing } from '@/constants/theme';
import { highlightFor, worksSentence, type Region } from '@/services/muscleMap';

type Props = { primary: string; secondary?: string[]; width?: number };

/**
 * Front and back figure with the exercise's muscles filled in (spec R13).
 * Deliberately blocky: it reads at arm's length and matches the gym-kit look;
 * an anatomical drawing would be noise at this size.
 */
export default function BodyMap({ primary, secondary = [], width = 320 }: Props) {
  const hi = highlightFor(primary, secondary);
  const regions = Object.keys(hi) as Region[];
  if (regions.length === 0) return null;

  const fill = (r: Region) =>
    hi[r] === 'primary' ? bodyMap.primary : hi[r] === 'helping' ? bodyMap.helping : bodyMap.idle;
  const body = { fill: '#FFFFFF', stroke: bodyMap.outline, strokeWidth: 1.2 };
  const m = (r: Region) => ({ fill: fill(r), stroke: bodyMap.outline, strokeWidth: 1 });

  // The same groups worksSentence names: on the map, deduplicated, not the primary.
  const helping = [...new Set(secondary)].filter((g) => g !== primary && worksSentence(g) !== null);
  const label = `Muscles worked. Main: ${primary.toLowerCase()}.${
    helping.length > 0 ? ` Helping: ${helping.map((g) => g.toLowerCase()).join(', ')}.` : ''
  }`;

  const height = (width / 320) * 290;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.wrap}>
      <Svg width={width} height={height} viewBox="0 0 320 290">
        {/* Front */}
        <G x={20}>
          <Circle cx={70} cy={22} r={14} {...body} />
          <Rect x={64} y={35} width={12} height={9} rx={3} {...m('neck')} />
          <Path d="M52 46 L64 41 L76 41 L88 46 L70 50 Z" {...m('traps')} />
          <Ellipse cx={42} cy={57} rx={12} ry={11} {...m('shoulders')} />
          <Ellipse cx={98} cy={57} rx={12} ry={11} {...m('shoulders')} />
          <Rect x={48} y={48} width={21} height={27} rx={9} {...m('chest')} />
          <Rect x={71} y={48} width={21} height={27} rx={9} {...m('chest')} />
          <Ellipse cx={35} cy={86} rx={8} ry={16} {...m('biceps')} />
          <Ellipse cx={105} cy={86} rx={8} ry={16} {...m('biceps')} />
          <Ellipse cx={29} cy={123} rx={7} ry={18} {...m('forearms')} />
          <Ellipse cx={111} cy={123} rx={7} ry={18} {...m('forearms')} />
          <Circle cx={26} cy={147} r={6} {...body} />
          <Circle cx={114} cy={147} r={6} {...body} />
          {[79, 95, 111].map((y) => (
            <G key={y}>
              <Rect x={54} y={y} width={15} height={14} rx={4} {...m('abs')} />
              <Rect x={71} y={y} width={15} height={14} rx={4} {...m('abs')} />
            </G>
          ))}
          <Path d="M50 128 H90 L86 144 H54 Z" {...body} />
          <Rect x={46} y={146} width={19} height={60} rx={9} {...m('quads')} />
          <Rect x={75} y={146} width={19} height={60} rx={9} {...m('quads')} />
          <Rect x={66} y={148} width={8} height={38} rx={4} {...m('adductors')} />
          <Ellipse cx={56} cy={238} rx={9} ry={24} {...m('calves')} />
          <Ellipse cx={84} cy={238} rx={9} ry={24} {...m('calves')} />
          <Ellipse cx={55} cy={270} rx={9} ry={5} {...body} />
          <Ellipse cx={85} cy={270} rx={9} ry={5} {...body} />
        </G>
        {/* Back */}
        <G x={160}>
          <Circle cx={70} cy={22} r={14} {...body} />
          <Rect x={64} y={35} width={12} height={9} rx={3} {...m('neck')} />
          <Path d="M52 46 L88 46 L80 70 L70 80 L60 70 Z" {...m('traps')} />
          <Ellipse cx={42} cy={57} rx={12} ry={11} {...m('shoulders')} />
          <Ellipse cx={98} cy={57} rx={12} ry={11} {...m('shoulders')} />
          <Path d="M47 64 L58 72 L66 104 L52 104 Q45 86 47 64 Z" {...m('back')} />
          <Path d="M93 64 L82 72 L74 104 L88 104 Q95 86 93 64 Z" {...m('back')} />
          <Rect x={57} y={106} width={26} height={20} rx={6} {...m('lowerBack')} />
          <Ellipse cx={35} cy={86} rx={8} ry={16} {...m('triceps')} />
          <Ellipse cx={105} cy={86} rx={8} ry={16} {...m('triceps')} />
          <Ellipse cx={29} cy={123} rx={7} ry={18} {...m('forearms')} />
          <Ellipse cx={111} cy={123} rx={7} ry={18} {...m('forearms')} />
          <Circle cx={26} cy={147} r={6} {...body} />
          <Circle cx={114} cy={147} r={6} {...body} />
          <Ellipse cx={45} cy={138} rx={4} ry={10} {...m('abductors')} />
          <Ellipse cx={95} cy={138} rx={4} ry={10} {...m('abductors')} />
          <Rect x={48} y={128} width={21} height={24} rx={10} {...m('glutes')} />
          <Rect x={71} y={128} width={21} height={24} rx={10} {...m('glutes')} />
          <Rect x={47} y={156} width={19} height={50} rx={9} {...m('hamstrings')} />
          <Rect x={74} y={156} width={19} height={50} rx={9} {...m('hamstrings')} />
          <Ellipse cx={56} cy={236} rx={10} ry={24} {...m('calves')} />
          <Ellipse cx={84} cy={236} rx={10} ry={24} {...m('calves')} />
          <Ellipse cx={55} cy={270} rx={9} ry={5} {...body} />
          <Ellipse cx={85} cy={270} rx={9} ry={5} {...body} />
        </G>
      </Svg>
      <View style={styles.captions}>
        <Text style={styles.caption}>Front</Text>
        <Text style={styles.caption}>Back</Text>
      </View>
      <View style={styles.key}>
        <View style={styles.keyItem}>
          <View style={[styles.swatch, { backgroundColor: bodyMap.primary }]} />
          <Text style={styles.keyText}>Main muscle</Text>
        </View>
        {helping.length > 0 ? (
          <View style={styles.keyItem}>
            <View style={[styles.swatch, { backgroundColor: bodyMap.helping }]} />
            <Text style={styles.keyText}>Helping</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  captions: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: -spacing.xs },
  caption: { ...type.label, color: Colors.light.textSecondary },
  key: { flexDirection: 'row', gap: spacing.base, marginTop: spacing.sm, alignSelf: 'flex-start' },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  swatch: { width: 14, height: 14, borderRadius: 4 },
  keyText: { ...type.label, color: Colors.light.textSecondary },
});
