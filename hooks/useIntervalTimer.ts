import { useState, useEffect, useRef } from 'react';

export interface TimerConfig {
  circuitAmount: number;
  circuitRestSeconds: number;
  roundAmount: number;
  roundRestSeconds: number;
  exerciseAmount: number;
  exerciseTimeSeconds: number;
  exerciseRestSeconds: number;
}

export interface TimerState {
  timeRemaining: number;
  currentStatus: 'Work' | 'Rest' | 'Round Rest' | 'Circuit Rest' | 'Finished';
  currentCircuit: number;
  totalCircuits: number;
  currentRound: number;
  totalRounds: number;
  currentExercise: number;
  totalExercises: number;
  isRunning: boolean;
  progress: number; // 0 to 1 for progress indicator
}

export function useIntervalTimer(config: TimerConfig) {
  const [state, setState] = useState<TimerState>({
    timeRemaining: config.exerciseTimeSeconds,
    currentStatus: 'Work',
    currentCircuit: 1,
    totalCircuits: config.circuitAmount,
    currentRound: 1,
    totalRounds: config.roundAmount,
    currentExercise: 1,
    totalExercises: config.exerciseAmount,
    isRunning: false,
    progress: 1,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initialTimeRef = useRef<number>(config.exerciseTimeSeconds);

  // Start the timer
  const startTimer = () => {
    setState(prev => ({ ...prev, isRunning: true }));
  };

  // Pause the timer
  const pauseTimer = () => {
    setState(prev => ({ ...prev, isRunning: false }));
  };

  // Reset the timer to the beginning
  const resetTimer = () => {
    setState({
      timeRemaining: config.exerciseTimeSeconds,
      currentStatus: 'Work',
      currentCircuit: 1,
      totalCircuits: config.circuitAmount,
      currentRound: 1,
      totalRounds: config.roundAmount,
      currentExercise: 1,
      totalExercises: config.exerciseAmount,
      isRunning: false,
      progress: 1,
    });
    initialTimeRef.current = config.exerciseTimeSeconds;
  };

  // Determine the next state in the workout sequence
  const getNextState = (current: TimerState): TimerState => {
    // If we're in a work period
    if (current.currentStatus === 'Work') {
      // If there's exercise rest time configured
      if (config.exerciseRestSeconds > 0) {
        return {
          ...current,
          timeRemaining: config.exerciseRestSeconds,
          currentStatus: 'Rest',
          progress: 1,
        };
      } else {
        // Skip rest and move to next exercise/round/circuit
        return advanceToNextExercise(current);
      }
    }
    // If we're in an exercise rest period
    else if (current.currentStatus === 'Rest') {
      return advanceToNextExercise(current);
    }
    // If we're in a round rest period
    else if (current.currentStatus === 'Round Rest') {
      return {
        ...current,
        timeRemaining: config.exerciseTimeSeconds,
        currentStatus: 'Work',
        currentRound: current.currentRound + 1,
        currentExercise: 1,
        progress: 1,
      };
    }
    // If we're in a circuit rest period
    else if (current.currentStatus === 'Circuit Rest') {
      return {
        ...current,
        timeRemaining: config.exerciseTimeSeconds,
        currentStatus: 'Work',
        currentCircuit: current.currentCircuit + 1,
        currentRound: 1,
        currentExercise: 1,
        progress: 1,
      };
    }
    
    // Default case (should never reach here)
    return current;
  };

  // Helper function to advance to the next exercise, round, or circuit
  const advanceToNextExercise = (current: TimerState): TimerState => {
    // If there are more exercises in this round
    if (current.currentExercise < current.totalExercises) {
      return {
        ...current,
        timeRemaining: config.exerciseTimeSeconds,
        currentStatus: 'Work',
        currentExercise: current.currentExercise + 1,
        progress: 1,
      };
    }
    // If there are more rounds in this circuit
    else if (current.currentRound < current.totalRounds) {
      // If there's round rest time configured
      if (config.roundRestSeconds > 0) {
        return {
          ...current,
          timeRemaining: config.roundRestSeconds,
          currentStatus: 'Round Rest',
          progress: 1,
        };
      } else {
        // Skip round rest
        return {
          ...current,
          timeRemaining: config.exerciseTimeSeconds,
          currentStatus: 'Work',
          currentRound: current.currentRound + 1,
          currentExercise: 1,
          progress: 1,
        };
      }
    }
    // If there are more circuits
    else if (current.currentCircuit < current.totalCircuits) {
      // If there's circuit rest time configured
      if (config.circuitRestSeconds > 0) {
        return {
          ...current,
          timeRemaining: config.circuitRestSeconds,
          currentStatus: 'Circuit Rest',
          progress: 1,
        };
      } else {
        // Skip circuit rest
        return {
          ...current,
          timeRemaining: config.exerciseTimeSeconds,
          currentStatus: 'Work',
          currentCircuit: current.currentCircuit + 1,
          currentRound: 1,
          currentExercise: 1,
          progress: 1,
        };
      }
    }
    // Workout is complete
    else {
      return {
        ...current,
        timeRemaining: 0,
        currentStatus: 'Finished',
        isRunning: false,
        progress: 0,
      };
    }
  };

  // Timer effect
  useEffect(() => {
    if (state.isRunning) {
      initialTimeRef.current = state.timeRemaining;
      
      timerRef.current = setInterval(() => {
        setState(current => {
          // Calculate progress
          const newProgress = (current.timeRemaining - 1) / initialTimeRef.current;
          
          // If time is up
          if (current.timeRemaining <= 1) {
            // Clear the interval
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            
            // If we're finished, just return the finished state
            if (current.currentStatus === 'Finished') {
              return { ...current, timeRemaining: 0, progress: 0 };
            }
            
            // Otherwise, get the next state
            const nextState = getNextState(current);
            
            // Set a new interval for the next state if we're still running
            if (nextState.isRunning) {
              initialTimeRef.current = nextState.timeRemaining;
              timerRef.current = setInterval(() => {
                setState(s => ({
                  ...s,
                  timeRemaining: Math.max(0, s.timeRemaining - 1),
                  progress: Math.max(0, (s.timeRemaining - 1) / initialTimeRef.current),
                }));
              }, 1000);
            }
            
            return nextState;
          }
          
          // Just decrement the time
          return {
            ...current,
            timeRemaining: current.timeRemaining - 1,
            progress: newProgress,
          };
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.isRunning, config]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    state,
    startTimer,
    pauseTimer,
    resetTimer,
  };
}