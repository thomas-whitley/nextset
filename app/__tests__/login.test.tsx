import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import LoginScreen from '../(auth)/index';
import { supabase } from '@/data/supabase-client';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('expo-router', () => ({
  __esModule: true,
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/data/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({ user: null, loading: false }),
}));

jest.mock('@/data/supabase-client', () => ({
  __esModule: true,
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      resend: jest.fn(),
    },
  },
}));

const signInWithPassword = supabase.auth.signInWithPassword as jest.Mock;

describe('LoginScreen', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('never logs the session tokens from a successful sign-in', async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'u1' },
        session: { access_token: 'SECRET-ACCESS', refresh_token: 'SECRET-REFRESH' },
      },
      error: null,
    });

    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email address'), 'a@b.co');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'hunter22');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect(signInWithPassword).toHaveBeenCalled();
    const logged = JSON.stringify([...logSpy.mock.calls, ...errorSpy.mock.calls]);
    expect(logged).not.toContain('SECRET-ACCESS');
    expect(logged).not.toContain('SECRET-REFRESH');
  });
});
