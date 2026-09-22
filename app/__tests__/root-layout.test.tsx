/**
 * Regression test for the SDK 57 startup crash (spec 2026-09-22).
 *
 * `AppNavigator` in `app/_layout.tsx` used to pick between two React
 * fragments (`<>...</>`) as the direct children of `<Stack>`, one per auth
 * state. Expo Router 57's `mapProtectedScreen` only recognises
 * `Stack.Screen` / `Stack.Protected` / `Stack.Header` children; a Fragment
 * falls into its `console.warn` branch, which does
 * `` `Unknown child element passed to Stack: ${child.type}` `` — and a
 * Fragment's `type` is `Symbol(react.fragment)`, so the template literal
 * throws `TypeError: Cannot convert a Symbol value to a string`. Router 5
 * flattened fragments; Router 7 (used by Expo Router 57) does not.
 *
 * This uses `renderRouter` from `expo-router/testing-library` with an
 * in-memory file map so the real root layout is exercised through the real
 * navigator, with only its non-router dependencies mocked out.
 */
import React from 'react';
import { Text } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

// The real root layout, under test. Imported statically (not via
// `require`) so jest's hoisted `jest.mock` calls below still apply to its
// dependencies before this module is evaluated.
import RootLayout from '../_layout';

// -- Non-router dependencies of app/_layout.tsx --------------------------

let mockSession: { user: { id: string } } | null = null;

jest.mock('@/data/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ session: mockSession, loading: false }),
}));

jest.mock('@/contexts/WorkoutContext', () => ({
  __esModule: true,
  WorkoutProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/services/restNotifications', () => ({
  __esModule: true,
  installForegroundHandler: jest.fn(),
}));

jest.mock('@/hooks/useFrameworkReady', () => ({
  __esModule: true,
  useFrameworkReady: jest.fn(),
}));

jest.mock('expo-font', () => ({
  __esModule: true,
  useFonts: () => [true, null],
}));

jest.mock('expo-splash-screen', () => ({
  __esModule: true,
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// -- Stub screens ----------------------------------------------------------

function TabsHome() {
  return <Text>tabs-home</Text>;
}

function AuthLogin() {
  return <Text>auth-login</Text>;
}

describe('root layout navigator (Stack.Protected auth gate)', () => {
  beforeEach(() => {
    mockSession = null;
  });

  it('renders without throwing and resolves to the auth screen when signed out', async () => {
    mockSession = null;

    // `render` (and thus `renderRouter`) is async in this
    // @testing-library/react-native version: it returns a promise with the
    // route helpers attached, which must be awaited before the component
    // tree (and the fragment-children crash, if present) has actually run.
    const rendered = renderRouter(
      {
        _layout: RootLayout,
        '(tabs)/index': TabsHome,
        '(auth)/index': AuthLogin,
      },
      { initialUrl: '/' }
    );
    await rendered;

    expect(screen.getByText('auth-login')).toBeTruthy();
    expect(screen.queryByText('tabs-home')).toBeNull();
  });

  it('renders without throwing and resolves to the tabs screen when signed in', async () => {
    mockSession = { user: { id: 'user-1' } };

    const rendered = renderRouter(
      {
        _layout: RootLayout,
        '(tabs)/index': TabsHome,
        '(auth)/index': AuthLogin,
      },
      { initialUrl: '/' }
    );
    await rendered;

    expect(screen.getByText('tabs-home')).toBeTruthy();
    expect(screen.queryByText('auth-login')).toBeNull();
  });
});
