import type { TextStyle } from 'react-native';
import { type, touch, bodyMap } from '../../constants/theme';

test('touch targets meet the Android minimum', () => {
  expect(touch.min).toBe(48);
  expect(touch.row).toBeGreaterThanOrEqual(56);
});

test('no type token is smaller than 13pt', () => {
  for (const [name, style] of Object.entries(type) as [string, TextStyle][]) {
    expect({ name, size: style.fontSize! >= 13 }).toEqual({ name, size: true });
  }
});

test('section labels are sentence case at 15pt', () => {
  expect(type.eyebrow.fontSize).toBe(15);
  expect(type.eyebrow.textTransform).toBeUndefined();
});

test('set inputs are 20pt tabular', () => {
  expect(type.setInput.fontSize).toBe(20);
  expect(type.setInput.fontVariant).toEqual(['tabular-nums']);
});

test('body map tints are defined', () => {
  expect(bodyMap).toEqual({ primary: '#1C4FA1', helping: '#9DB3DA', idle: '#E3E6E1', outline: '#C3C8C1' });
});
