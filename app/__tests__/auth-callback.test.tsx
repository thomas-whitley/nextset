import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import AuthCallbackScreen from '../(auth)/auth-callback';
import { supabase } from '@/data/supabase-client';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('expo-router', () => ({
  __esModule: true,
  router: { replace: jest.fn() },
}));

let mockUrl: string | null = null;
jest.mock('expo-linking', () => ({
  __esModule: true,
  useURL: () => mockUrl,
}));

let mockAuthListener: ((event: string) => void) | null = null;
jest.mock('@/data/supabase-client', () => ({
  __esModule: true,
  supabase: {
    auth: {
      setSession: jest.fn(),
      onAuthStateChange: jest.fn((cb: (event: string) => void) => {
        mockAuthListener = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
    },
  },
}));

const setSession = supabase.auth.setSession as jest.Mock;

describe('AuthCallbackScreen', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUrl = null;
    mockAuthListener = null;
    setSession.mockResolvedValue({ error: null });
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    jest.useRealTimers();
  });

  it('sets the session from the tokens in the redirect fragment', async () => {
    mockUrl = 'momentum://auth-callback#access_token=AT&refresh_token=RT&token_type=bearer';
    await render(<AuthCallbackScreen />);

    expect(setSession).toHaveBeenCalledWith({ access_token: 'AT', refresh_token: 'RT' });
    expect(screen.getByText('Signing you in…')).toBeTruthy();
  });

  it('shows the error Supabase put in the fragment', async () => {
    mockUrl = 'momentum://auth-callback#error=access_denied&error_description=The+user+denied+access';
    await render(<AuthCallbackScreen />);

    expect(setSession).not.toHaveBeenCalled();
    expect(screen.getByText("Couldn't sign in with Google")).toBeTruthy();
    expect(screen.getByText('The user denied access')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to log in' })).toBeTruthy();
  });

  it('shows an error when setSession fails', async () => {
    mockUrl = 'momentum://auth-callback#access_token=AT&refresh_token=RT';
    setSession.mockResolvedValue({ error: new Error('bad jwt') });
    await render(<AuthCallbackScreen />);

    expect(screen.getByText("Couldn't sign in with Google")).toBeTruthy();
  });

  it('gives up with an error when no tokens arrive', async () => {
    jest.useFakeTimers();
    await render(<AuthCallbackScreen />);
    expect(screen.queryByText("Couldn't sign in with Google")).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByText("Couldn't sign in with Google")).toBeTruthy();
  });

  it('does not give up when the session arrives by the auth listener (web)', async () => {
    jest.useFakeTimers();
    await render(<AuthCallbackScreen />);

    await act(async () => {
      mockAuthListener?.('SIGNED_IN');
      jest.advanceTimersByTime(3000);
    });
    expect(screen.queryByText("Couldn't sign in with Google")).toBeNull();
  });

  it('never logs the redirect URL', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockUrl = 'momentum://auth-callback#access_token=SECRET-AT&refresh_token=SECRET-RT';
    setSession.mockResolvedValue({ error: new Error('bad jwt') });
    await render(<AuthCallbackScreen />);

    const logged = JSON.stringify([...logSpy.mock.calls, ...errorSpy.mock.calls]);
    expect(logged).not.toContain('SECRET');
    logSpy.mockRestore();
  });
});
