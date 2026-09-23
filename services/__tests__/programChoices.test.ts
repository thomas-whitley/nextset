import { buildProgramChoices } from '../programChoices';
import { programTemplates } from '../../data/programTemplates';
import { formatShortDate } from '../../utils/format';
import type { UserActiveProgram } from '../exercise.types';

const row = (id: string, templateId: string, name: string, updated: string, days = 3): UserActiveProgram => ({
  id, user_id: 'u', program_template_id: templateId, created_at: updated, updated_at: updated,
  program_data: {
    id: `active_${templateId}`, name, creator: '', description: '',
    workouts: Array.from({ length: days }, (_, i) => ({ id: `${templateId}-${i}`, name: `D${i}`, description: '', order: i, exercises: [] })),
  },
});

test('current copy first, then most recently used; templates never started listed as new', () => {
  const copies = [
    row('r1', 'upper-lower', 'Upper / Lower', '2026-08-12T10:00:00Z', 4),
    row('r2', 'ppl', 'Push / Pull / Legs', '2026-09-01T10:00:00Z'),
    row('r3', 'blank-abc', 'Arms and abs', '2026-09-20T10:00:00Z', 1),
  ];
  const { yours, fresh } = buildProgramChoices(programTemplates, copies, 'r2');
  expect(yours.map((c) => c.name)).toEqual(['Push / Pull / Legs', 'Arms and abs', 'Upper / Lower']);
  expect(yours[0]).toMatchObject({ active: true, blank: false, meta: '3 days, active now' });
  expect(yours[1]).toMatchObject({ active: false, blank: true, meta: 'Your own, 1 day' });
  expect(yours[2].meta).toBe(`4 days, last used ${formatShortDate('2026-08-12T10:00:00Z')}`);
  expect(fresh.map((t) => t.id)).toEqual(['full-body-3', 'strength-5x5', 'body-part-5']);
});

test('an active blank says so', () => {
  const { yours } = buildProgramChoices(programTemplates, [row('r3', 'blank-abc', 'Arms', '2026-09-20T10:00:00Z', 1)], 'r3');
  expect(yours[0].meta).toBe('Your own, 1 day, active now');
});

test('no copies: every template is new', () => {
  expect(buildProgramChoices(programTemplates, [], null).fresh).toHaveLength(programTemplates.length);
});
