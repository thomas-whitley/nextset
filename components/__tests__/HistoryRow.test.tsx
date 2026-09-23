import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import HistoryRow from '../HistoryRow';

test('the row has breathing room and no text under 15pt (device run T2-6, M11)', async () => {
  await render(<HistoryRow title="Full Body A" completedAt="2026-08-28T10:00:00Z" sets={2} volume={960} first onPress={jest.fn()} />);
  const sets = StyleSheet.flatten(screen.getByText('2 sets').props.style);
  expect(sets.fontSize).toBeGreaterThanOrEqual(15);
  const row = StyleSheet.flatten(screen.getByRole('button').props.style);
  expect(row.paddingVertical).toBeGreaterThan(0);
});
