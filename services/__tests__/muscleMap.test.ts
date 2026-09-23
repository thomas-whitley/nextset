import { highlightFor, worksSentence } from '../muscleMap';

test('primary and helping regions', () => {
  expect(highlightFor('Chest', ['Shoulders', 'Triceps'])).toEqual({ chest: 'primary', shoulders: 'helping', triceps: 'helping' });
});
test('primary wins if also listed as secondary', () => {
  expect(highlightFor('Quads', ['Quads', 'Glutes'])).toEqual({ quads: 'primary', glutes: 'helping' });
});
test('unmapped groups are ignored', () => {
  expect(highlightFor('Cardio', ['Other'])).toEqual({});
});
test('sentences', () => {
  expect(worksSentence('Chest', ['Shoulders', 'Triceps'])).toBe('Works your chest, with shoulders and triceps helping.');
  expect(worksSentence('Lower Back', [])).toBe('Works your lower back.');
  expect(worksSentence('Biceps', ['Forearms'])).toBe('Works your biceps, with forearms helping.');
  expect(worksSentence('Back', ['Biceps', 'Forearms', 'Shoulders'])).toBe('Works your back, with biceps, forearms and shoulders helping.');
  expect(worksSentence('Cardio')).toBeNull();
});
