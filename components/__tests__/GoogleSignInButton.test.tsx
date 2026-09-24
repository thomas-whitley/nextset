import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import GoogleSignInButton from '../GoogleSignInButton';
import { supabase } from '@/data/supabase-client';

jest.mock('expo-web-browser', () => ({
  __esModule: true,
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('@/data/supabase-client', () => ({
  __esModule: true,
  supabase: { auth: { signInWithOAuth: jest.fn(), setSession: jest.fn() } },
}));

const signInWithOAuth = supabase.auth.signInWithOAuth as jest.Mock;
const setSession = supabase.auth.setSession as jest.Mock;
const openAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

const press = () => fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

describe('GoogleSignInButton', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    signInWithOAuth.mockResolvedValue({ data: { url: 'https://auth.example/authorize?x=1' }, error: null });
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => errorSpy.mockRestore());

  it('asks Supabase for the Google URL without redirecting, and always shows the account chooser', async () => {
    openAuthSession.mockResolvedValue({ type: 'cancel' });
    await render(<GoogleSignInButton />);
    await press();

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'momentum://auth-callback',
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });
  });

  it('opens the Google URL in an auth session that returns to the callback route', async () => {
    openAuthSession.mockResolvedValue({ type: 'success', url: 'momentum://auth-callback#access_token=AT&refresh_token=RT' });
    await render(<GoogleSignInButton />);
    await press();

    expect(openAuthSession).toHaveBeenCalledWith('https://auth.example/authorize?x=1', 'momentum://auth-callback');
  });

  it('leaves the session to the callback route instead of using the returned URL', async () => {
    openAuthSession.mockResolvedValue({ type: 'success', url: 'momentum://auth-callback#access_token=AT&refresh_token=RT' });
    await render(<GoogleSignInButton />);
    await press();

    expect(setSession).not.toHaveBeenCalled();
  });

  it('says nothing when the user closes the browser', async () => {
    openAuthSession.mockResolvedValue({ type: 'cancel' });
    await render(<GoogleSignInButton />);
    await press();

    expect(screen.queryByText(/Couldn't start Google sign-in/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).not.toBeDisabled();
  });

  it('shows an error when Supabase cannot start the sign-in', async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: null }, error: new Error('provider is not enabled') });
    await render(<GoogleSignInButton />);
    await press();

    expect(openAuthSession).not.toHaveBeenCalled();
    expect(screen.getByText("Couldn't start Google sign-in. Check your connection and try again.")).toBeTruthy();
  });

  it('shows an error when the browser cannot open', async () => {
    openAuthSession.mockRejectedValue(new Error('no browser'));
    await render(<GoogleSignInButton />);
    await press();

    expect(screen.getByText("Couldn't start Google sign-in. Check your connection and try again.")).toBeTruthy();
  });

  it('is disabled while the browser is open', async () => {
    let closeBrowser: (r: { type: string }) => void = () => {};
    openAuthSession.mockReturnValue(new Promise((resolve) => { closeBrowser = resolve; }));
    await render(<GoogleSignInButton />);
    const pressed = press();

    await waitFor(() => expect(openAuthSession).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();

    closeBrowser({ type: 'dismiss' });
    await pressed;
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Continue with Google' })).not.toBeDisabled(),
    );
  });
});
