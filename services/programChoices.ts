import type { Program, UserActiveProgram } from './exercise.types';
import { isBlankTemplateId } from './programEdits';
import { formatShortDate, plural } from '../utils/format';

export type ProgramChoice = { row: UserActiveProgram; name: string; meta: string; blank: boolean; active: boolean };

/**
 * The picker's two lists (Picker artboard). "Your programs" is every copy the
 * user has, current first, then the most recently used. "Start something new"
 * is the templates they have never started. A template they have a copy of
 * appears once, as the copy, so choosing it keeps their edits (D4).
 */
export function buildProgramChoices(templates: Program[], copies: UserActiveProgram[], currentRowId: string | null) {
  const yours = [...copies]
    .sort((a, b) => {
      if (a.id === currentRowId) return -1;
      if (b.id === currentRowId) return 1;
      return b.updated_at.localeCompare(a.updated_at);
    })
    .map<ProgramChoice>((row) => {
      const blank = isBlankTemplateId(row.program_template_id);
      const active = row.id === currentRowId;
      const days = plural(row.program_data.workouts?.length ?? 0, 'day');
      const meta = blank
        ? `Your own, ${days}${active ? ', active now' : ''}`
        : active
          ? `${days}, active now`
          : `${days}, last used ${formatShortDate(row.updated_at)}`;
      return { row, name: row.program_data.name, meta, blank, active };
    });
  const fresh = templates.filter((t) => !copies.some((c) => c.program_template_id === t.id));
  return { yours, fresh };
}
