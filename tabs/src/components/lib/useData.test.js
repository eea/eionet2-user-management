import { renderHook, act, waitFor } from '@testing-library/react';
import { useData } from './useData';

describe('useData', () => {
  test('loads data automatically by default', async () => {
    const asyncFn = jest.fn().mockResolvedValue({ value: 1 });

    const { result } = renderHook(() => useData(asyncFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(asyncFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ value: 1 });
    expect(result.current.error).toBe(null);
  });

  test('does not auto-load when auto is false', () => {
    const asyncFn = jest.fn().mockResolvedValue({ value: 1 });

    const { result } = renderHook(() => useData(asyncFn, { auto: false }));

    expect(asyncFn).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
  });

  test('reload fetches data when auto is false', async () => {
    const asyncFn = jest.fn().mockResolvedValue('loaded');

    const { result } = renderHook(() => useData(asyncFn, { auto: false }));

    act(() => {
      result.current.reload();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(asyncFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe('loaded');
  });

  test('keeps previous data while reloading', async () => {
    let resolveCall;
    const asyncFn = jest
      .fn()
      .mockResolvedValueOnce('first-result')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCall = resolve;
          }),
      );

    const { result } = renderHook(() => useData(asyncFn));

    await waitFor(() => {
      expect(result.current.data).toBe('first-result');
    });

    act(() => {
      result.current.reload();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe('first-result');

    await act(async () => {
      resolveCall('second-result');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe('second-result');
  });

  test('stores errors from the async function', async () => {
    const error = new Error('fetch failed');
    const asyncFn = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useData(asyncFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(error);
  });

  test('reload throws for invalid asyncFn arguments', () => {
    const { result } = renderHook(() => useData(undefined, { auto: false }));

    expect(() => {
      act(() => {
        result.current.reload();
      });
    }).toThrow('invalid argument to useData, a function is required');
  });
});
