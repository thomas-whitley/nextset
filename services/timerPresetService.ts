import { supabase } from '../data/supabase-client';

export interface TimerExercise {
  name: string;
  workTime: number; // in seconds (0-180)
  restTime: number; // in seconds (0-180)
}

export interface TimerPresetData {
  type: 'circuit' | 'strength' | 'stopwatch';
  exercises: TimerExercise[];
  sets: number; // number of sets
  setRestTime: number; // rest between sets (0-300s)
  circuits: number; // number of circuits
  circuitRestTime: number; // rest between circuits (0-300s)
}

export interface TimerPreset {
  id: string;
  user_id?: string;
  preset_name: string;
  is_public: boolean;
  preset_data: TimerPresetData;
  created_at: string;
  updated_at: string;
}

export class TimerPresetService {
  /**
   * Get all available timer presets (public + user's own)
   */
  static async getTimerPresets(userId?: string): Promise<TimerPreset[]> {
    let query = supabase
      .from('timer_presets')
      .select('*')
      .order('is_public', { ascending: false })
      .order('created_at', { ascending: false });

    // If user is logged in, get public presets + their own
    if (userId) {
      query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
    } else {
      // If not logged in, only get public presets
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get timer presets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new timer preset
   */
  static async createTimerPreset(
    userId: string,
    presetName: string,
    presetData: TimerPresetData,
    isPublic: boolean = false
  ): Promise<TimerPreset> {
    const { data, error } = await supabase
      .from('timer_presets')
      .insert({
        user_id: userId,
        preset_name: presetName,
        is_public: isPublic,
        preset_data: presetData,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create timer preset: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a timer preset
   */
  static async updateTimerPreset(
    presetId: string,
    presetName: string,
    presetData: TimerPresetData,
    isPublic?: boolean
  ): Promise<TimerPreset> {
    const updateData: any = {
      preset_name: presetName,
      preset_data: presetData,
      updated_at: new Date().toISOString(),
    };

    if (isPublic !== undefined) {
      updateData.is_public = isPublic;
    }

    const { data, error } = await supabase
      .from('timer_presets')
      .update(updateData)
      .eq('id', presetId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update timer preset: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a timer preset
   */
  static async deleteTimerPreset(presetId: string): Promise<void> {
    const { error } = await supabase
      .from('timer_presets')
      .delete()
      .eq('id', presetId);

    if (error) {
      throw new Error(`Failed to delete timer preset: ${error.message}`);
    }
  }

  /**
   * Get a specific timer preset by ID
   */
  static async getTimerPreset(presetId: string): Promise<TimerPreset | null> {
    const { data, error } = await supabase
      .from('timer_presets')
      .select('*')
      .eq('id', presetId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get timer preset: ${error.message}`);
    }

    return data || null;
  }
}