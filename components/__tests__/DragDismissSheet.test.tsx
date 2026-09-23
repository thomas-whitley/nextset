import React from 'react';
import { Keyboard, StyleSheet, Text } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import DragDismissSheet from '../gestures/DragDismissSheet';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

type Listener = (e: { endCoordinates: { height: number } }) => void;
let listeners: Record<string, Listener> = {};

beforeEach(() => {
  listeners = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, cb: Listener) => {
    listeners[name] = cb;
    return { remove: () => { delete listeners[name]; } };
  }) as any);
});
afterEach(() => jest.restoreAllMocks());

const show = (h: number) => Object.entries(listeners).find(([n]) => /Show$/.test(n))![1]({ endCoordinates: { height: h } });
const hide = () => Object.entries(listeners).find(([n]) => /Hide$/.test(n))![1]({ endCoordinates: { height: 0 } });
const lift = () => StyleSheet.flatten(screen.getByTestId('drag-dismiss-sheet').props.style).marginBottom ?? 0;

test('with avoidKeyboard the sheet rises by the keyboard height (device run T2-5)', async () => {
  await render(<DragDismissSheet visible avoidKeyboard onDismiss={jest.fn()}><Text>Body</Text></DragDismissSheet>);
  await act(async () => { show(300); });
  expect(lift()).toBe(300);
});

test('keyboard hide or closing the sheet drops the lift (Review Focus 5)', async () => {
  const { rerender } = await render(<DragDismissSheet visible avoidKeyboard onDismiss={jest.fn()}><Text>Body</Text></DragDismissSheet>);
  await act(async () => { show(300); });
  await act(async () => { hide(); });
  expect(lift()).toBe(0);
  await act(async () => { show(300); });
  await rerender(<DragDismissSheet visible={false} avoidKeyboard onDismiss={jest.fn()}><Text>Body</Text></DragDismissSheet>);
  await rerender(<DragDismissSheet visible avoidKeyboard onDismiss={jest.fn()}><Text>Body</Text></DragDismissSheet>);
  expect(lift()).toBe(0);
});

test('without avoidKeyboard the sheet ignores the keyboard', async () => {
  await render(<DragDismissSheet visible onDismiss={jest.fn()}><Text>Body</Text></DragDismissSheet>);
  expect(Object.keys(listeners)).toHaveLength(0);
});
