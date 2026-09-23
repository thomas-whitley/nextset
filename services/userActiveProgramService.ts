import { supabase } from '../data/supabase-client';
import type { Database, Json } from '../data/supabase.types';
import { Program, UserActiveProgram } from './exercise.types';

type ActiveProgramRow = Database['public']['Tables']['user_active_programs']['Row'];

/** The DB stores program_data as jsonb; the app trusts it to be a Program. Cast once, here. */
const toActive = (row: ActiveProgramRow): UserActiveProgram => ({
  ...row,
  program_data: row.program_data as unknown as Program,
  created_at: row.created_at ?? '',
  updated_at: row.updated_at ?? '',
});

export class UserActiveProgramService {
  /**
   * Creates a new active program for a user based on a template
   */
  static async createActiveProgram(userId: string, templateProgram: Program): Promise<UserActiveProgram> {
    // Create a mutable copy of the template program
    const activeProgramData: Program = {
      ...templateProgram,
      isTemplate: false,
      templateId: templateProgram.id,
      id: `active_${templateProgram.id}_${Date.now()}`, // Generate unique ID for active program
    };

    const { data, error } = await supabase
      .from('user_active_programs')
      .insert({
        user_id: userId,
        program_template_id: templateProgram.id,
        program_data: activeProgramData as unknown as Json,
      })
      .select()
      .single();

    if (error) {
      // 23505 = unique_violation: another device created the copy first. Use it.
      if (error.code === '23505') {
        const existing = await UserActiveProgramService.getActiveProgram(userId, templateProgram.id);
        if (existing) return existing;
      }
      throw new Error(`Failed to create active program: ${error.message}`);
    }

    return toActive(data);
  }

  /**
   * The user's copy of a template. After migration 20260917100000 the pair is
   * unique; before it, duplicates existed and `.single()` reported them as
   * "not found", which made the app insert yet another copy. Read the newest.
   */
  static async getActiveProgram(userId: string, templateId: string): Promise<UserActiveProgram | null> {
    const { data, error } = await supabase
      .from('user_active_programs')
      .select('*')
      .eq('user_id', userId)
      .eq('program_template_id', templateId)
      .order('updated_at', { ascending: false })
      .limit(2);

    if (error) {
      throw new Error(`Failed to get active program: ${error.message}`);
    }
    if (data && data.length > 1) {
      console.error(`Duplicate active programs for template ${templateId}; using the newest`);
    }
    return data?.[0] ? toActive(data[0]) : null;
  }

  /**
   * Gets all active programs for a user
   */
  static async getUserActivePrograms(userId: string): Promise<UserActiveProgram[]> {
    const { data, error } = await supabase
      .from('user_active_programs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user active programs: ${error.message}`);
    }

    return (data || []).map(toActive);
  }

  /**
   * Updates an active program's data
   */
  static async updateActiveProgram(activeProgramId: string, programData: Program): Promise<UserActiveProgram> {
    const { data, error } = await supabase
      .from('user_active_programs')
      .update({
        program_data: programData as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeProgramId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update active program: ${error.message}`);
    }

    return toActive(data);
  }

  /**
   * Deletes an active program
   */
  static async deleteActiveProgram(activeProgramId: string): Promise<void> {
    const { error } = await supabase
      .from('user_active_programs')
      .delete()
      .eq('id', activeProgramId);

    if (error) {
      throw new Error(`Failed to delete active program: ${error.message}`);
    }
  }

  /**
   * Marks an active program as the most recently used one (restored on next launch).
   */
  static async touchActiveProgram(activeProgramId: string): Promise<void> {
    const { error } = await supabase
      .from('user_active_programs')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeProgramId);

    if (error) {
      throw new Error(`Failed to touch active program: ${error.message}`);
    }
  }

  /**
   * The program the user worked with most recently, or null.
   */
  static async getMostRecentActiveProgram(userId: string): Promise<UserActiveProgram | null> {
    const { data, error } = await supabase
      .from('user_active_programs')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to get most recent active program: ${error.message}`);
    }

    return data?.[0] ? toActive(data[0]) : null;
  }
}
