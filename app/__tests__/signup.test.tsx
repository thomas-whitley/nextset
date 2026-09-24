import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SignUpScreen from '../(auth)/signup';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('expo-router', () => ({
  __esModule: true,
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/data/supabase-client', () => ({
  __esModule: true,
  supabase: { auth: { signUp: jest.fn(), resend: jest.fn(), signInWithOAuth: jest.fn() } },
}));

jest.mock('expo-web-browser', () => ({ __esModule: true, openAuthSessionAsync: jest.fn() }));

/** Host elements in document order. */
function documentOrder(node: any, out: any[] = []): any[] {
  out.push(node);
  for (const child of node?.children ?? []) if (typeof child === 'object') documentOrder(child, out);
  return out;
}

describe('SignUpScreen', () => {
  it('offers Continue with Google above the email form', async () => {
    await render(<SignUpScreen />);
    const google = screen.getByRole('button', { name: 'Continue with Google' });
    const order = documentOrder(screen.root);
    expect(order.indexOf(google)).toBeLessThan(order.indexOf(screen.getByLabelText('Email address')));
    expect(screen.getByText('or', { includeHiddenElements: true })).toBeTruthy();
  });
});
