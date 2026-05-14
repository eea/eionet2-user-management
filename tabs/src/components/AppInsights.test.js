const mockLoadAppInsights = jest.fn();
const mockApplicationInsights = jest.fn().mockImplementation((options) => ({
  config: options.config,
  loadAppInsights: mockLoadAppInsights,
}));
const mockReactPlugin = jest.fn().mockImplementation(() => ({
  identifier: 'mock-react-plugin',
}));
const mockCreateBrowserHistory = jest.fn().mockReturnValue({ kind: 'history' });

jest.mock('@microsoft/applicationinsights-web', () => ({
  ApplicationInsights: mockApplicationInsights,
}));

jest.mock('@microsoft/applicationinsights-react-js', () => ({
  ReactPlugin: mockReactPlugin,
}));

jest.mock('history', () => ({
  createBrowserHistory: mockCreateBrowserHistory,
}));

describe('AppInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('creates and loads application insights with the react plugin configuration', () => {
    const module = require('./AppInsights');

    expect(mockCreateBrowserHistory).toHaveBeenCalledWith({ basename: '' });
    expect(mockReactPlugin).toHaveBeenCalledTimes(1);
    expect(mockApplicationInsights).toHaveBeenCalledTimes(1);
    expect(mockLoadAppInsights).toHaveBeenCalledTimes(1);

    expect(module.reactPlugin).toEqual({ identifier: 'mock-react-plugin' });
    expect(module.appInsights).toEqual(
      expect.objectContaining({
        config: expect.objectContaining({
          connectionString: expect.stringContaining('InstrumentationKey='),
          extensions: [module.reactPlugin],
          extensionConfig: {
            'mock-react-plugin': { history: { kind: 'history' } },
          },
        }),
      }),
    );
  });
});
