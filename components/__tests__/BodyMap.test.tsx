import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BodyMap from '../BodyMap';

test('describes itself for screen readers', async () => {
  await render(<BodyMap primary="Chest" secondary={['Shoulders']} />);
  expect(screen.getByLabelText('Muscles worked. Main: chest. Helping: shoulders.')).toBeTruthy();
});
test('renders nothing for an unmapped primary', async () => {
  await render(<BodyMap primary="Cardio" />);
  expect(screen.queryByLabelText(/Muscles worked/)).toBeNull();
});
