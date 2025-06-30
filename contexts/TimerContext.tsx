import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

type TimerMode = 'stopwatch' | 'countdown' | 'interval';

interface TimerContextType {
  time: number;
  isRunning: boolean;
  mode: TimerMode;
  startTimer: () => void;
  pauseTimer: () => void; 
  resetTimer: () => void;
  setMode: (mode: TimerMode) => void;
  setInitialTime: (time: number) => void;
  onTimerComplete?: () => void;
  setOnTimerComplete: (callback: () => void) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [initialTime, setInitialTime] = useState(0);
  const [onTimerComplete, setOnTimerComplete] = useState<(() => void) | undefined>();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => {
          if (mode === 'countdown') {
            if (prevTime <= 1) {
              setIsRunning(false);
              // Call completion callback if set
              if (onTimerComplete) {
                onTimerComplete();
              }
              return 0;
            }
            return prevTime - 1;
          } else {
            return prevTime + 1;
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode, onTimerComplete]);

  const startTimer = () => {
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTime(mode === 'countdown' ? initialTime : 0);
  };

  const handleSetMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    setTime(newMode === 'countdown' ? initialTime : 0);
  };

  const handleSetInitialTime = (newTime: number) => {
    setInitialTime(newTime);
    if (mode === 'countdown') {
      setTime(newTime);
    }
  };

  const handleSetOnTimerComplete = (callback: () => void) => {
    setOnTimerComplete(() => callback);
  };

  return (
    <TimerContext.Provider
      value={{
        time,
        isRunning,
        mode,
        startTimer,
        pauseTimer,
        resetTimer,
        setMode: handleSetMode,
        setInitialTime: handleSetInitialTime,
        onTimerComplete,
        setOnTimerComplete: handleSetOnTimerComplete,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}