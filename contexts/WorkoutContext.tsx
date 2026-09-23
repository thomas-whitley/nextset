import React, { createContext, useContext, useState, useEffect, useRef, useReducer } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserActiveProgramService } from '../services/userActiveProgramService';
import { WorkoutHistoryService } from '../services/workoutHistoryService';
import { createProgramSync } from '../services/programSync';
import { Exercise as DetailedExercise, Program, Workout, UserActiveProgram } from '../services/exercise.types';
import { programTemplates } from '../data/programTemplates';
import { useAuth } from '../data/AuthContext';
import { backfillRepsTargets } from '../services/repsTarget';
import { mergeBest, mergeBests, detectPr, type ExerciseBests } from '../services/prMath';
import { restReducer, IDLE_REST, type RestState, type RestAction } from '../services/restTimer';
import { cancelRestNotification } from '../services/restNotifications';
import { quickWorkoutName } from '../services/upNext';
import { addExercise, removeExercise, setSetCount, reorderExercises as reorderExerciseList, reorderDays, updateDay, makeBlankTemplate, resetToTemplate, isBlankProgram, isBlankTemplateId, cleanProgramName } from '../services/programEdits';

const workoutCheckpointKey = (userId: string) => `momentum:in_progress_workout:${userId}`;

interface WorkoutContextType {
  /** Built-in templates the user can choose from. */
  programs: Program[];
  /** The user's active program (their editable copy of a template), restored on launch. */
  currentProgram: Program | null;
  currentWorkout: Workout | null;
  currentActiveProgram: UserActiveProgram | null;
  isWorkoutActive: boolean;
  /** Wall-clock ms when the current workout started, or null when none is active. */
  workoutStartedAt: number | null;
  /** True until the active program has been looked up for the signed-in user. */
  isLoadingProgram: boolean;
  /** The last try to restore the user's program failed (not "no program yet"). */
  programLoadFailed: boolean;
  retryProgramLoad: () => void;
  /** Best weight / e1RM per exerciseId, loaded when a workout starts and raised as sets complete. */
  exerciseBests: ExerciseBests;
  /** Rest-timer state, lifted here so it survives Minimise (the screen unmounts, this doesn't). */
  rest: RestState;
  dispatchRest: (action: RestAction) => void;
  setCurrentProgram: (program: Program) => Promise<void>;
  /** Make one of the user's existing copies current (picker "Your programs"). */
  selectProgramCopy: (row: UserActiveProgram) => Promise<void>;
  /** Create a blank program (its own row, 1–7 empty days "Day 1".."Day N"), make it current, and return the day ids in order. */
  createBlankProgram: (days: number) => Promise<string[] | null>;
  /** Put the template's days back on the current copy, same row. False for blanks or while one of its days is running. */
  resetProgramToTemplate: () => Promise<boolean>;
  /** Rename the current program; blanks only (grill R2-Q3). */
  renameCurrentProgram: (name: string) => Promise<boolean>;
  /** Delete a blank program (grill R2-Q4). False for template copies or while one of its days is running. */
  deleteProgramCopy: (row: UserActiveProgram) => Promise<boolean>;
  startWorkout: (workout: Workout) => void;
  /** Start an empty workout with no program (spec §6.3). Saved to history; never written to program_data. */
  startQuickWorkout: () => void;
  updateSet: (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => Promise<void>;
  completeSet: (exerciseId: string, setId: string) => Promise<void>;
  /** Swaps an exercise's identity in the running workout, keeping the set count but clearing logged values. */
  replaceExercise: (exerciseId: string, next: DetailedExercise) => Promise<void>;
  finishWorkout: () => void;
  /** Throw the running workout away: nothing saved, and its program day restored to how it was at Start. */
  discardWorkout: () => void;
  addExerciseToWorkout: (workoutId: string, exercise: DetailedExercise) => Promise<void>;
  removeExerciseFromWorkout: (workoutId: string, exerciseId: string) => Promise<void>;
  updateExerciseSets: (workoutId: string, exerciseId: string, newSetCount: number) => Promise<void>;
  reorderWorkouts: (workoutIds: string[]) => Promise<void>;
  /** Reorders the exercises within the current workout (drag-reorder on the workout screen). */
  reorderExercises: (orderedExerciseIds: string[]) => Promise<void>;
  /** Fold or unfold an exercise card. Local only: checkpointed, never synced (spec R7). */
  setExerciseCollapsed: (exerciseId: string, collapsed: boolean) => void;
  /** Remove one set from the running workout; refuses the exercise's last set. */
  removeSet: (exerciseId: string, setId: string) => Promise<void>;
  /** Write any pending program edits to Supabase now (blur, before save, app background). */
  flushProgramSync: () => Promise<void>;
  /**
   * Edit one day of the current program from the day editor (spec §6.1).
   * Structural edits pass immediate=true (written now); set count and reps
   * target pass false (debounced), per grill R1-Q1. Refused (false) for the
   * day that is the running workout: one writer per day (R1-Q2).
   */
  editDay: (workoutId: string, edit: (day: Workout) => Workout | null, immediate: boolean) => boolean;
  /** True when this day is the running workout, so the editor shows it read-only. */
  isDayLocked: (workoutId: string) => boolean;
  /** True when the running workout is a day of the current program (blocks reset, delete and switching). */
  isProgramWorkoutRunning: boolean;
  /** True while a program edit has not reached Supabase (grill R2-Q2). */
  hasPendingProgramWrite: () => boolean;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

/** A day as program_data holds it: none of a session's own fields. */
function withoutSessionFields(w: Workout): Workout {
  const { startedAt, collapsedExerciseIds, discardRestore, ...day } = w;
  return day;
}

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [programs] = useState<Program[]>(programTemplates);
  const [currentProgram, setCurrentProgramState] = useState<Program | null>(null);
  const [currentActiveProgram, setCurrentActiveProgram] = useState<UserActiveProgram | null>(null);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [isLoadingProgram, setIsLoadingProgram] = useState(true);
  const [programLoadFailed, setProgramLoadFailed] = useState(false);
  const [programLoadAttempt, setProgramLoadAttempt] = useState(0);
  const [exerciseBests, setExerciseBests] = useState<ExerciseBests>({});
  const [rest, dispatchRest] = useReducer(restReducer, IDLE_REST);
  const { user } = useAuth();
  // Effects that load per-account data key on the id, not the object: AuthContext hands out a
  // new user object on every auth event (the hourly TOKEN_REFRESHED too), and re-running them
  // would reload the server copy over edits still waiting to sync (review I6).
  const userId = user?.id ?? null;

  // Refs mirror state so async code (the debounced program sync, effects that
  // fire after further edits) never reads a stale render-closure value.
  const currentWorkoutRef = useRef<Workout | null>(null);
  const currentProgramRef = useRef<Program | null>(null);
  const currentActiveProgramRef = useRef<UserActiveProgram | null>(null);
  const exerciseBestsRef = useRef<ExerciseBests>({});
  currentProgramRef.current = currentProgram;
  currentActiveProgramRef.current = currentActiveProgram;

  const programSync = useRef(
    createProgramSync(async (program) => {
      const activeProgram = currentActiveProgramRef.current;
      if (!activeProgram) return;
      const updated = await UserActiveProgramService.updateActiveProgram(activeProgram.id, program);
      // A reply for a row we have since left must not make it current again.
      if (currentActiveProgramRef.current?.id === updated.id) setCurrentActiveProgram(updated);
    })
  ).current;

  // Flush on background so a killed app never loses more than the debounce window.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') void programSync.flush();
    });
    return () => {
      sub.remove();
      void programSync.flush();
    };
  }, [programSync]);

  // Clear in-memory workout state on sign-out or account switch so a
  // previous user's program/workout data isn't visible to the next
  // signed-in user on a shared device.
  const previousUserId = useRef<string | null>(null);
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (previousUserId.current !== null && previousUserId.current !== currentUserId) {
      setCurrentProgramState(null);
      setCurrentActiveProgram(null);
      setCurrentWorkout(null);
      currentWorkoutRef.current = null;
      setIsWorkoutActive(false);
    }
    previousUserId.current = currentUserId;
  }, [user]);

  /** Makes a copy current: state, refs, and a lazy reps-target backfill (spec D13). */
  const adoptCopy = (row: UserActiveProgram) => {
    setProgramLoadFailed(false); // a program is in hand now, whatever the launch restore did (final review I1)
    currentActiveProgramRef.current = row;
    setCurrentActiveProgram(row);
    const loaded = row.program_data as Program;
    const filled = backfillRepsTargets(loaded, programTemplates);
    currentProgramRef.current = filled;
    setCurrentProgramState(filled);
    if (filled !== loaded) programSync.schedule(filled); // lazy persist
  };

  /**
   * Anything still pending belongs to the program we are about to leave:
   * write it there while the refs still point at it. If it cannot be
   * written, stay put, or its retry would land on the next program's row
   * (Review Focus 1).
   */
  const settleBeforeSwitch = async () => {
    await programSync.flush();
    if (programSync.hasPending()) throw new Error('Program edits are not saved yet');
  };

  /**
   * For one-off actions that report "Could not …" (reset, rename): write now,
   * or undo it here too, so a failed one never lands later (review M7). Earlier
   * edits are settled first, so a cancel drops only this change.
   */
  const applyNowOrRevert = async (edit: (program: Program) => Program | null): Promise<boolean> => {
    await programSync.flush();
    if (programSync.hasPending()) return false; // earlier edits still unwritten: change nothing
    const before = currentProgramRef.current;
    if (!applyProgramUpdate(edit, false)) return false;
    await programSync.flush();
    if (!programSync.hasPending()) return true;
    programSync.cancel();
    currentProgramRef.current = before;
    setCurrentProgramState(before);
    return false;
  };

  /** A day of the current program is the running workout. Ref-based, for use inside async actions. */
  const programWorkoutRunningNow = () => {
    const live = currentWorkoutRef.current;
    return !!live && !live.isQuick && !!currentProgramRef.current?.workouts.some((w) => w.id === live.id);
  };

  // Restore the most recently used active program so Home can offer "Start"
  // straight after launch instead of forgetting the user's choice.
  useEffect(() => {
    if (!userId) {
      setIsLoadingProgram(false);
      return;
    }
    let cancelled = false;
    setIsLoadingProgram(true);
    setProgramLoadFailed(false);
    (async () => {
      try {
        const active = await UserActiveProgramService.getMostRecentActiveProgram(userId);
        if (!cancelled && active) {
          adoptCopy(active);
        }
      } catch (error) {
        console.error('Failed to restore active program:', error);
        if (!cancelled) setProgramLoadFailed(true);
      } finally {
        if (!cancelled) setIsLoadingProgram(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, programLoadAttempt]);

  const retryProgramLoad = () => setProgramLoadAttempt((n) => n + 1);

  const persistWorkoutCheckpoint = async (workout: Workout | null) => {
    if (!user) return;
    try {
      if (workout) {
        await AsyncStorage.setItem(workoutCheckpointKey(user.id), JSON.stringify(workout));
      } else {
        await AsyncStorage.removeItem(workoutCheckpointKey(user.id));
      }
    } catch (error) {
      console.error('Failed to checkpoint in-progress workout:', error);
    }
  };

  /** Fetches lifetime bests and folds them into whatever ticks already raised in-memory (item 5). */
  const loadBests = async (userId: string) => {
    try {
      const fetched = await WorkoutHistoryService.getExerciseBests(userId);
      const merged = mergeBests(exerciseBestsRef.current, fetched);
      exerciseBestsRef.current = merged;
      setExerciseBests(merged);
    } catch (error) {
      console.error('Failed to load exercise bests:', error);
    }
  };

  // Restore an in-progress workout that was checkpointed before the app was
  // backgrounded or killed, so logged sets aren't silently lost.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(workoutCheckpointKey(userId));
        if (stored) {
          const restored = JSON.parse(stored) as Workout;
          // A checkpoint from before startedAt existed (or one that otherwise
          // lost it) must not show a blank/garbage duration on resume.
          let repaired = restored;
          if (repaired.startedAt === undefined) {
            repaired = { ...repaired, startedAt: Date.now() };
            await persistWorkoutCheckpoint(repaired);
          }
          currentWorkoutRef.current = repaired;
          setCurrentWorkout(repaired);
          setIsWorkoutActive(true);
          void loadBests(userId);
        }
      } catch (error) {
        console.error('Failed to restore in-progress workout:', error);
      }
    })();
  }, [userId]);

  const setCurrentProgram = async (program: Program) => {
    if (!user) {
      console.error('No user logged in');
      return;
    }
    await settleBeforeSwitch();
    try {
      // Reuse the user's existing copy of this template (keeps their edits, D4),
      // otherwise create one from the template.
      let row = await UserActiveProgramService.getActiveProgram(user.id, program.id);
      if (row) {
        await UserActiveProgramService.touchActiveProgram(row.id);
      } else {
        row = await UserActiveProgramService.createActiveProgram(user.id, program);
      }
      adoptCopy(row);
    } catch (error) {
      // No fallback to the bare template: with no row behind it the editor and
      // sync would write to nothing. Callers show "Check your connection".
      console.error('Failed to set current program:', error);
      throw error;
    }
  };

  const selectProgramCopy = async (row: UserActiveProgram) => {
    if (row.id === currentActiveProgramRef.current?.id) return;
    await settleBeforeSwitch();
    await UserActiveProgramService.touchActiveProgram(row.id);
    adoptCopy(row);
  };

  const createBlankProgram = async (days: number): Promise<string[] | null> => {
    if (!user) return null;
    await settleBeforeSwitch();
    const template = makeBlankTemplate(days);
    const row = await UserActiveProgramService.createActiveProgram(user.id, template);
    adoptCopy(row);
    return template.workouts.map((w) => w.id);
  };

  const resetProgramToTemplate = async (): Promise<boolean> => {
    const program = currentProgramRef.current;
    if (!program || isBlankProgram(program) || programWorkoutRunningNow()) return false;
    const template = programTemplates.find((t) => t.id === program.templateId);
    if (!template) return false;
    return applyNowOrRevert((p) => resetToTemplate(p, template));
  };

  // Current program only: updated_at is set by a DB trigger on every write and
  // defines "current", so writing a non-current row would make it the program
  // the app reopens on next launch.
  const renameCurrentProgram = async (raw: string): Promise<boolean> => {
    const name = cleanProgramName(raw);
    const program = currentProgramRef.current;
    if (!name || !program || !isBlankProgram(program)) return false;
    if (program.name === name) return true;
    return applyNowOrRevert((p) => ({ ...p, name }));
  };

  const deleteProgramCopy = async (row: UserActiveProgram): Promise<boolean> => {
    if (!user) return false;
    const isCurrent = row.id === currentActiveProgramRef.current?.id;
    // Any copy can go once it is not current (device run T2-11); the current one
    // only if it is a blank (the slab ⋯ offers nothing else).
    if (isCurrent && !isBlankTemplateId(row.program_template_id)) return false;
    if (isCurrent && programWorkoutRunningNow()) return false;
    // Settle first: a write for this row still pending or in flight could otherwise fail after the
    // delete and be retried against whichever row becomes current next (review I3).
    if (isCurrent) await settleBeforeSwitch();
    await UserActiveProgramService.deleteActiveProgram(row.id);
    if (!isCurrent) return true;
    currentActiveProgramRef.current = null;
    currentProgramRef.current = null;
    setCurrentActiveProgram(null);
    setCurrentProgramState(null);
    const next = await UserActiveProgramService.getMostRecentActiveProgram(user.id).catch(() => null);
    if (next) adoptCopy(next);
    return true;
  };

  const startWorkout = (workout: Workout) => {
    // Start with a clean sheet: nothing ticked, weights as the template/last edit left them.
    const fresh: Workout = {
      ...workout,
      // Always a fresh session start — never the incoming template/program
      // workout's startedAt, or last week's session start leaks into this one
      // (item 1). The AsyncStorage checkpoint is the only place startedAt
      // survives across app restarts (see the restore effect above).
      startedAt: Date.now(),
      collapsedExerciseIds: [],
      // The day as it is now, for Discard. A quick workout has no day to restore.
      discardRestore: workout.isQuick ? undefined : withoutSessionFields(workout),
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set, isComplete: false, pr: undefined, previousWeight: undefined, previousReps: undefined })),
      })),
    };
    currentWorkoutRef.current = fresh;
    setCurrentWorkout(fresh);
    setIsWorkoutActive(true);
    persistWorkoutCheckpoint(fresh);

    // Fill in "last time" hints from history once they arrive.
    if (!user) return;

    void loadBests(user.id);

    const names = fresh.exercises.map((e) => e.name);
    WorkoutHistoryService.getLastPerformance(user.id, names)
      .then((last) => {
        setCurrentWorkout((current) => {
          if (!current || current.id !== fresh.id) return current;
          const filled: Workout = {
            ...current,
            exercises: current.exercises.map((exercise) => {
              const prev = last[exercise.name];
              if (!prev) return exercise;
              return {
                ...exercise,
                sets: exercise.sets.map((set, i) => {
                  const p = prev[Math.min(i, prev.length - 1)];
                  return { ...set, previousWeight: p.weight, previousReps: p.reps };
                }),
              };
            }),
          };
          currentWorkoutRef.current = filled;
          return filled;
        });
      })
      .catch((error) => console.error('Failed to load last performance:', error));
  };

  /**
   * The one way program_data changes: edit the in-memory program (the ref,
   * never the render closure), then schedule the debounced write, or write
   * now when `immediate`. Returns false when there was nothing to change or
   * no cloud copy to write to.
   */
  const applyProgramUpdate = (edit: (program: Program) => Program | null, immediate: boolean): boolean => {
    const program = currentProgramRef.current;
    if (!program || !currentActiveProgramRef.current) return false;
    const next = edit(program);
    if (!next) return false;
    currentProgramRef.current = next;
    setCurrentProgramState(next);
    programSync.schedule(next);
    if (immediate) void programSync.flush();
    return true;
  };

  const startQuickWorkout = () => {
    const now = new Date();
    startWorkout({
      id: `quick_${now.getTime()}`,
      name: quickWorkoutName(now),
      description: '',
      order: 0,
      exercises: [],
      isQuick: true,
    });
  };

  /**
   * Applies an edit to the running workout using the *latest* workout (the
   * ref, not the render closure), then checkpoints locally at once and
   * schedules (or flushes) the cloud write. `edit` must be pure: it receives
   * the current workout and returns the next one, or null to make no change.
   * A ref (not a state updater) is the source of truth here so rapid
   * same-tick calls chain correctly without depending on React running
   * updaters synchronously.
   */
  const applyWorkoutUpdate = (edit: (current: Workout) => Workout | null, immediate: boolean) => {
    const current = currentWorkoutRef.current;
    if (!current) return;
    const next = edit(current);
    if (!next) return;
    currentWorkoutRef.current = next;
    setCurrentWorkout(next);
    persistWorkoutCheckpoint(next);

    // A quick workout belongs to no program (spec D12): the checkpoint above is its only copy.
    if (next.isQuick) return;
    // Strip transient session-only fields before this lands in program_data:
    // startedAt (item 1 — otherwise next week's session inherits this week's
    // start time) and each set's pr flag (item 2 — a per-session PR badge has
    // no business surviving into the program template), and
    // collapsedExerciseIds (spec R7) — a fold is how this session looks, not part of the program —
    // and discardRestore (T2-3), Discard's copy of the day at Start.
    const { startedAt, collapsedExerciseIds, discardRestore, ...forProgram } = next;
    const forProgramWorkout: Workout = {
      ...forProgram,
      exercises: forProgram.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map(({ pr, ...set }) => set),
      })),
    };
    applyProgramUpdate(
      (program) => ({
        ...program,
        // Keep the program's own order for this day. Days can be reordered on
        // the Programs tab while this workout runs, and the live copy still
        // carries the order it started with.
        workouts: program.workouts.map((w) => (w.id === forProgramWorkout.id ? { ...forProgramWorkout, order: w.order } : w)),
      }),
      immediate
    );
  };

  const updateSet = async (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => {
    applyWorkoutUpdate(
      (current) => ({
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? { ...exercise, sets: exercise.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set)) }
            : exercise
        ),
      }),
      false
    );
  };

  const completeSet = async (exerciseId: string, setId: string) => {
    applyWorkoutUpdate(
      (current) => ({
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                sets: exercise.sets.map((set) => {
                  if (set.id !== setId) return set;
                  if (set.isComplete) return { ...set, isComplete: false, pr: undefined }; // un-ticking clears the flag
                  // Flag the PR now, against bests as they stood BEFORE this
                  // tick (item 2) — mergeBest below raises exerciseBests only
                  // after this flag is computed, so a set never gets compared
                  // against a record it just set.
                  const flag = detectPr(exerciseBestsRef.current, exercise.exerciseId, set.weight, set.reps);
                  const pr = flag.weight && flag.e1rm ? 'both' : flag.weight ? 'weight' : flag.e1rm ? 'e1rm' : undefined;
                  return { ...set, isComplete: true, pr };
                }),
              }
            : exercise
        ),
      }),
      true
    );

    const live = currentWorkoutRef.current?.exercises.find((e) => e.id === exerciseId);
    const set = live?.sets.find((s) => s.id === setId);
    if (live && set?.isComplete) {
      const next = mergeBest(exerciseBestsRef.current, live.exerciseId, set.weight, set.reps);
      if (next !== exerciseBestsRef.current) {
        exerciseBestsRef.current = next;
        setExerciseBests(next);
      }
    }

    await programSync.flush();
  };

  const reorderExercises = async (orderedExerciseIds: string[]) => {
    // Never silently shrink the list on a stale or partial ordering: the pure edit refuses it.
    applyWorkoutUpdate((current) => reorderExerciseList(current, orderedExerciseIds), true);
    await programSync.flush();
  };

  const setExerciseCollapsed = (exerciseId: string, collapsed: boolean) => {
    const current = currentWorkoutRef.current;
    if (!current) return;
    const ids = current.collapsedExerciseIds ?? [];
    const has = ids.includes(exerciseId);
    if (has === collapsed) return;
    const next: Workout = {
      ...current,
      collapsedExerciseIds: collapsed ? [...ids, exerciseId] : ids.filter((id) => id !== exerciseId),
    };
    // Deliberately not applyWorkoutUpdate: a fold must not schedule a cloud write.
    currentWorkoutRef.current = next;
    setCurrentWorkout(next);
    persistWorkoutCheckpoint(next);
  };

  const removeSet = async (exerciseId: string, setId: string) => {
    applyWorkoutUpdate((current) => {
      const exercise = current.exercises.find((e) => e.id === exerciseId);
      if (!exercise || exercise.sets.length <= 1 || !exercise.sets.some((s) => s.id === setId)) return null;
      return {
        ...current,
        exercises: current.exercises.map((e) =>
          e.id === exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e
        ),
      };
    }, true);
    await programSync.flush();
  };

  const flushProgramSync = () => programSync.flush();

  const isDayLocked = (workoutId: string) =>
    !!currentWorkout && !currentWorkout.isQuick && currentWorkout.id === workoutId;

  const isProgramWorkoutRunning =
    !!currentWorkout && !currentWorkout.isQuick && !!currentProgram?.workouts.some((w) => w.id === currentWorkout.id);

  const editDay = (workoutId: string, edit: (day: Workout) => Workout | null, immediate: boolean): boolean => {
    const live = currentWorkoutRef.current;
    if (live && !live.isQuick && live.id === workoutId) return false;
    return applyProgramUpdate((program) => updateDay(program, workoutId, edit), immediate);
  };

  const hasPendingProgramWrite = () => programSync.hasPending();

  /** "Last time" hints for one exercise of the running workout, once history answers. */
  const fillLastTime = async (exerciseId: string, name: string) => {
    if (!user) return;
    const last = await WorkoutHistoryService.getLastPerformance(user.id, [name]).catch(
      () => ({} as Record<string, { weight: string; reps: string }[]>)
    );
    const prev = last[name];
    if (!prev || prev.length === 0) return;
    applyWorkoutUpdate(
      (current) =>
        current.exercises.some((e) => e.id === exerciseId)
          ? {
              ...current,
              exercises: current.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? {
                      ...exercise,
                      sets: exercise.sets.map((set, i) => {
                        const p = prev[Math.min(i, prev.length - 1)];
                        return { ...set, previousWeight: p.weight, previousReps: p.reps };
                      }),
                    }
                  : exercise
              ),
            }
          : null,
      false
    );
  };

  const replaceExercise = async (exerciseId: string, next: DetailedExercise) => {
    applyWorkoutUpdate(
      (current) => ({
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                exerciseId: next.id,
                name: next.name,
                sets: exercise.sets.map((set) => ({
                  ...set,
                  weight: '',
                  reps: '',
                  isComplete: false,
                  previousWeight: undefined,
                  previousReps: undefined,
                })),
              }
            : exercise
        ),
      }),
      true
    );
    await programSync.flush();
    await fillLastTime(exerciseId, next.name);
  };

  // The running workout's structure edits. The same code serves a program day
  // (applyWorkoutUpdate mirrors it into program_data) and a quick workout
  // (checkpoint only), so workout.tsx does not need to know which it is
  // (grill R1-Q4).
  const addExerciseToWorkout = async (workoutId: string, exercise: DetailedExercise) => {
    const before = new Set((currentWorkoutRef.current?.exercises ?? []).map((e) => e.id));
    applyWorkoutUpdate(
      (current) => (current.id === workoutId ? addExercise(current, { exerciseId: exercise.id, name: exercise.name }) : null),
      true
    );
    await programSync.flush();
    // It never asked history, so "Last time" stayed "—" (device run T2-10).
    const added = currentWorkoutRef.current?.exercises.find((e) => !before.has(e.id));
    if (added) await fillLastTime(added.id, added.name);
  };

  const removeExerciseFromWorkout = async (workoutId: string, exerciseId: string) => {
    applyWorkoutUpdate((current) => (current.id === workoutId ? removeExercise(current, exerciseId) : null), true);
    await programSync.flush();
  };

  const updateExerciseSets = async (workoutId: string, exerciseId: string, newSetCount: number) => {
    applyWorkoutUpdate((current) => (current.id === workoutId ? setSetCount(current, exerciseId, newSetCount) : null), true);
    await programSync.flush();
  };

  const reorderWorkouts = async (workoutIds: string[]) => {
    applyProgramUpdate((program) => reorderDays(program, workoutIds), true);
    await programSync.flush();
  };

  const finishWorkout = () => {
    // Flush, never cancel: the queue can hold editor edits, a day reorder, a rename or a reset
    // made before this workout (review I2). Mirroring the last set values too is harmless.
    void programSync.flush();
    currentWorkoutRef.current = null;
    setCurrentWorkout(null);
    setIsWorkoutActive(false);
    persistWorkoutCheckpoint(null);
    exerciseBestsRef.current = {};
    setExerciseBests({});
    dispatchRest({ type: 'skip' }); // back to IDLE_REST; a rest banner must not survive into the next workout
    void cancelRestNotification();
  };

  const discardWorkout = () => {
    const live = currentWorkoutRef.current;
    // A checkpoint from an older build has no restore point: discard as before.
    const before = live && !live.isQuick ? live.discardRestore : undefined;
    if (before) {
      applyProgramUpdate(
        (program) => ({
          ...program,
          // Keep the day's current order: days can be reordered while it runs.
          workouts: program.workouts.map((w) => (w.id === before.id ? { ...before, order: w.order } : w)),
        }),
        true
      );
    }
    finishWorkout();
  };

  return (
    <WorkoutContext.Provider
      value={{
        programs,
        currentProgram,
        currentWorkout,
        currentActiveProgram,
        isWorkoutActive,
        workoutStartedAt: currentWorkout?.startedAt ?? null,
        isLoadingProgram,
        programLoadFailed,
        retryProgramLoad,
        exerciseBests,
        rest,
        dispatchRest,
        setCurrentProgram,
        selectProgramCopy,
        createBlankProgram,
        resetProgramToTemplate,
        renameCurrentProgram,
        deleteProgramCopy,
        startWorkout,
        startQuickWorkout,
        updateSet,
        completeSet,
        replaceExercise,
        finishWorkout,
        discardWorkout,
        addExerciseToWorkout,
        removeExerciseFromWorkout,
        updateExerciseSets,
        reorderWorkouts,
        reorderExercises,
        setExerciseCollapsed,
        removeSet,
        flushProgramSync,
        editDay,
        isDayLocked,
        isProgramWorkoutRunning,
        hasPendingProgramWrite,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
