import { renderHook, waitFor, act } from '@testing-library/react';
import { useTeamsAuth } from './useTeamsAuth';

const mockInitialize = jest.fn();
const mockGetContext = jest.fn();
const mockGetAuthToken = jest.fn();
const mockRegisterOnThemeChangeHandler = jest.fn();

let mockThemeChangeHandler;

jest.mock('@microsoft/teams-js', () => ({
  app: {
    initialize: () => mockInitialize(),
    getContext: () => mockGetContext(),
    registerOnThemeChangeHandler: (callback) => mockRegisterOnThemeChangeHandler(callback),
  },
  authentication: {
    getAuthToken: () => mockGetAuthToken(),
  },
}));

jest.mock('@fluentui/react-components', () => ({
  teamsLightTheme: { name: 'light-theme' },
  teamsDarkTheme: { name: 'dark-theme' },
  teamsHighContrastTheme: { name: 'high-contrast-theme' },
}));

describe('useTeamsAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockThemeChangeHandler = undefined;
    mockInitialize.mockResolvedValue(undefined);
    mockGetContext.mockResolvedValue({ app: { theme: 'light' } });
    mockGetAuthToken.mockResolvedValue('token');
    mockRegisterOnThemeChangeHandler.mockImplementation((callback) => {
      mockThemeChangeHandler = callback;
    });
  });

  test('initializes teams auth and resolves the context theme', async () => {
    const { result } = renderHook(() => useTeamsAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.theme).toEqual({ name: 'light-theme' });
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockGetContext).toHaveBeenCalledTimes(1);
    expect(mockGetAuthToken).toHaveBeenCalledTimes(1);
    expect(mockRegisterOnThemeChangeHandler).toHaveBeenCalledTimes(1);
    expect(result.current.theme).toEqual({ name: 'light-theme' });
  });

  test('maps dark and high contrast themes correctly', async () => {
    mockGetContext.mockResolvedValueOnce({ app: { theme: 'dark' } });

    const { result } = renderHook(() => useTeamsAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.theme).toEqual({ name: 'dark-theme' });

    act(() => {
      mockThemeChangeHandler('highContrast');
    });

    expect(result.current.theme).toEqual({ name: 'high-contrast-theme' });
  });

  test('falls back to the light theme for unknown or missing themes', async () => {
    mockGetContext.mockResolvedValueOnce({ app: { theme: 'unknown-theme' } });

    const { result } = renderHook(() => useTeamsAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.theme).toEqual({ name: 'light-theme' });

    act(() => {
      mockThemeChangeHandler(undefined);
    });

    expect(result.current.theme).toEqual({ name: 'light-theme' });
  });

  test('stores initialization errors and clears the loading state', async () => {
    const error = new Error('auth failed');
    mockGetAuthToken.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useTeamsAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.theme).toEqual({ name: 'light-theme' });
  });
});
