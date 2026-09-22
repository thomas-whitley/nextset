import { historyToCsv } from '../csvExport';
import type { WorkoutHistoryEntry } from '../workoutHistoryService';

jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'file:///cache/' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

// historyToCsv joins rows with CRLF (`\r\n`) and always ends with a trailing
// CRLF, so a naive split('\n') would leave a stray trailing empty entry and a
// trailing '\r' on every line. trim() + split('\r\n') strips the trailing
// terminator so line counts and exact-string assertions line up with the
// real output.
const toLines = (csv: string) => csv.trim().split('\r\n');

const entry = {
  id: 'w1',
  user_id: 'u1',
  completed_at: '2026-09-22T10:30:00.000Z',
  total_volume: 360,
  duration_minutes: 45,
  workout_data: {
    name: 'Push, "A"',
    exercises: [
      { name: 'Bench', sets: [{ weight: '60', reps: '6', isComplete: true }] },
    ],
  },
} as unknown as WorkoutHistoryEntry;

describe('historyToCsv', () => {
  it('writes a header row and one row per set, quoting commas and quotes', () => {
    const lines = toLines(historyToCsv([entry]));
    expect(lines[0]).toBe('date,time,workout,duration_min,exercise,set,weight_kg,reps,completed,bodyweight_kg,notes');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"Push, ""A"""');
    expect(lines[1]).toContain(',Bench,1,60,6,');
  });

  it('returns only the header for no rows', () => {
    expect(toLines(historyToCsv([]))).toHaveLength(1);
  });
});
