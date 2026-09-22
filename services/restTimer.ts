export interface RestState {
  setId: string | null;
  endsAt: number | null;      // epoch ms
  exerciseName: string;
  setNumber: number;
}

export type RestAction =
  | { type: 'start'; setId: string; seconds: number; now: number; exerciseName: string; setNumber: number }
  | { type: 'skip' }
  | { type: 'expire' }
  | { type: 'adjust'; deltaSeconds: number; now: number };

export const IDLE_REST: RestState = { setId: null, endsAt: null, exerciseName: '', setNumber: 0 };

export function restReducer(state: RestState, action: RestAction): RestState {
  switch (action.type) {
    case 'start':
      return { setId: action.setId, endsAt: action.now + action.seconds * 1000, exerciseName: action.exerciseName, setNumber: action.setNumber };
    case 'adjust': {
      if (state.endsAt === null) return state;
      return { ...state, endsAt: Math.max(action.now, state.endsAt + action.deltaSeconds * 1000) };
    }
    case 'skip':
    case 'expire':
      return IDLE_REST;
  }
}

export function remainingSeconds(state: RestState, now: number): number {
  if (state.endsAt === null) return 0;
  return Math.max(0, Math.ceil((state.endsAt - now) / 1000));
}
