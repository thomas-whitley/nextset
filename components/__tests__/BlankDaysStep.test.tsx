import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BlankDaysStep from '../BlankDaysStep';

const props = (over = {}) => ({ busy: false, onCreate: jest.fn(), onBack: jest.fn(), ...over });

test('starts at 3 days and creates with the chosen count', async () => {
  const p = props();
  await render(<BlankDaysStep {...p} />);
  expect(screen.getByText('3')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('More days'));
  await fireEvent.press(screen.getByLabelText('Create program with 4 days'));
  expect(p.onCreate).toHaveBeenCalledWith(4);
});

test('stops at 1 and at 7', async () => {
  const p = props();
  await render(<BlankDaysStep {...p} />);
  for (let i = 0; i < 5; i++) await fireEvent.press(screen.getByLabelText('Fewer days'));
  expect(screen.getByText('1')).toBeTruthy();
  for (let i = 0; i < 9; i++) await fireEvent.press(screen.getByLabelText('More days'));
  expect(screen.getByText('7')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Create program with 7 days'));
  expect(p.onCreate).toHaveBeenCalledWith(7);
});

test('Back returns to the lists; busy blocks a second create', async () => {
  const p = props({ busy: true });
  await render(<BlankDaysStep {...p} />);
  await fireEvent.press(screen.getByLabelText('Create program with 3 days'));
  expect(p.onCreate).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Back to programs'));
  expect(p.onBack).toHaveBeenCalled();
});
