import { createProgramSync } from '../programSync';
import type { Program } from '../exercise.types';

const program = (name: string): Program => ({ id: 'p', name, creator: '', description: '', workouts: [] });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('rapid schedules coalesce into one write with the last value', async () => {
  const write = jest.fn().mockResolvedValue(undefined);
  const sync = createProgramSync(write, 800);
  sync.schedule(program('a'));
  sync.schedule(program('b'));
  sync.schedule(program('c'));
  expect(write).not.toHaveBeenCalled();
  jest.advanceTimersByTime(799);
  expect(write).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  await Promise.resolve();
  expect(write).toHaveBeenCalledTimes(1);
  expect(write.mock.calls[0][0].name).toBe('c');
});

test('flush writes immediately and cancels the pending timer', async () => {
  const write = jest.fn().mockResolvedValue(undefined);
  const sync = createProgramSync(write, 800);
  sync.schedule(program('a'));
  await sync.flush();
  expect(write).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(1000);
  expect(write).toHaveBeenCalledTimes(1);
});

test('flush with nothing pending is a no-op', async () => {
  const write = jest.fn().mockResolvedValue(undefined);
  const sync = createProgramSync(write, 800);
  await sync.flush();
  expect(write).not.toHaveBeenCalled();
});

test('a failed write keeps the program pending so the next schedule retries it', async () => {
  const write = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
  const sync = createProgramSync(write, 800);
  sync.schedule(program('a'));
  await sync.flush();
  expect(write).toHaveBeenCalledTimes(1);
  sync.schedule(program('b'));
  jest.advanceTimersByTime(800);
  await Promise.resolve();
  expect(write).toHaveBeenCalledTimes(2);
  expect(write.mock.calls[1][0].name).toBe('b');
});

test('a schedule during an in-flight write is written after it, not dropped', async () => {
  let resolveFirst: () => void = () => {};
  const write = jest
    .fn()
    .mockImplementationOnce(() => new Promise<void>((r) => { resolveFirst = r; }))
    .mockResolvedValue(undefined);
  const sync = createProgramSync(write, 800);
  sync.schedule(program('a'));
  const flushing = sync.flush();
  sync.schedule(program('b'));
  resolveFirst();
  await flushing;
  jest.advanceTimersByTime(800);
  await Promise.resolve();
  expect(write).toHaveBeenCalledTimes(2);
  expect(write.mock.calls[1][0].name).toBe('b');
});

test('cancel drops the pending program', async () => {
  const write = jest.fn().mockResolvedValue(undefined);
  const sync = createProgramSync(write, 800);
  sync.schedule(program('a'));
  sync.cancel();
  jest.advanceTimersByTime(1000);
  await sync.flush();
  expect(write).not.toHaveBeenCalled();
});
