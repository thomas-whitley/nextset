// CSV export of workout history (spec F8). One row per set; kg only.

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { WorkoutHistoryEntry } from './workoutHistoryService';

const HEADER = ['date', 'time', 'workout', 'duration_min', 'exercise', 'set', 'weight_kg', 'reps', 'completed', 'bodyweight_kg', 'notes'];

const cell = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const pad = (n: number) => String(n).padStart(2, '0');

export function historyToCsv(rows: WorkoutHistoryEntry[]): string {
  const lines = [HEADER.join(',')];
  for (const row of rows) {
    const d = new Date(row.completed_at);
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const meta = row.workout_data?.metadata;
    const exercises = row.workout_data?.exercises ?? [];
    if (exercises.length === 0) {
      lines.push([date, time, row.workout_data?.name, row.duration_minutes, '', '', '', '', '', meta?.bodyweight, meta?.notes].map(cell).join(','));
      continue;
    }
    exercises.forEach((exercise) => {
      exercise.sets.forEach((set, i) => {
        lines.push(
          [date, time, row.workout_data?.name, row.duration_minutes, exercise.name, i + 1, set.weight, set.reps, set.isComplete ? 'yes' : 'no', meta?.bodyweight, meta?.notes]
            .map(cell)
            .join(',')
        );
      });
    });
  }
  return lines.join('\r\n') + '\r\n';
}

/** Writes the CSV and opens the share sheet (or triggers a download on web). Returns the filename. */
export async function shareHistoryCsv(rows: WorkoutHistoryEntry[]): Promise<string> {
  const csv = historyToCsv(rows);
  const now = new Date();
  const fileName = `nextset-workouts-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return fileName;
  }

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new Error('No writable directory available');
  const uri = dir + fileName;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export workouts', UTI: 'public.comma-separated-values-text' });
  }
  return fileName;
}
