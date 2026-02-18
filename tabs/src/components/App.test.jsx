import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock dependencies
jest.mock('./lib/useTeamsAuth', () => ({
  useTeamsAuth: jest.fn(),
}));

jest.mock('./Privacy', () => {
  return function MockPrivacy() {
    return <div data-testid="privacy">Privacy Component</div>;
  };
});

jest.mock('./TermsOfUse', () => {
  return function MockTermsOfUse() {
    return <div data-testid="terms-of-use">Terms of Use Component</div>;
  };
});

jest.mock('./TabConfig', () => {
  return function MockTabConfig() {
    return <div data-testid="tab-config">Tab Config Component</div>;
  };
});

jest.mock('./EditTab', () => {
  return function MockEditTab() {
    return <div data-testid="edit-tab">Edit Tab Component</div>;
  };
});

// Mock Fluent UI React Components
jest.mock('@fluentui/react-components', () => ({
  FluentProvider: ({ children, theme }) => (
    <div data-testid="provider" data-theme={JSON.stringify(theme)}>
      {children}
    </div>
  ),
  teamsLightTheme: { name: 'teams-light-theme' },
  Text: ({ children, ...props }) => <p {...props}>{children}</p>,
  Spinner: ({ style }) => (
    <div data-testid="loader" style={style}>
      Loading...
    </div>
  ),
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  HashRouter: ({ children }) => <div data-testid="router">{children}</div>,
  Navigate: ({ to, replace }) => (
    <div data-testid="navigate" data-to={to} data-replace={String(replace)} />
  ),
  Routes: ({ children }) => <div data-testid="routes">{children}</div>,
  Route: ({ path, element }) => (
    <div data-testid="route" data-path={path}>
      {element}
    </div>
  ),
}));

describe('App Component', () => {
  const mockUseTeamsAuth = require('./lib/useTeamsAuth').useTeamsAuth;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render with loading state', () => {
    mockUseTeamsAuth.mockReturnValue({
      theme: null,
      loading: true,
      error: null,
    });

    render(<App />);

    expect(screen.getByTestId('provider')).toBeInTheDocument();
    expect(screen.getByTestId('router')).toBeInTheDocument();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/edittab');
  });

  test('should render with theme when not loading', () => {
    const mockTheme = { name: 'custom-theme' };
    mockUseTeamsAuth.mockReturnValue({
      theme: mockTheme,
      loading: false,
      error: null,
    });

    render(<App />);

    expect(screen.getByTestId('provider')).toBeInTheDocument();
    expect(screen.getByTestId('router')).toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toBeInTheDocument();
  });

  test('should render all routes when not loading', () => {
    mockUseTeamsAuth.mockReturnValue({
      theme: null,
      loading: false,
      error: null,
    });

    render(<App />);

    expect(screen.getByTestId('privacy')).toBeInTheDocument();
    expect(screen.getByTestId('terms-of-use')).toBeInTheDocument();
    expect(screen.getByTestId('edit-tab')).toBeInTheDocument();
    expect(screen.getByTestId('tab-config')).toBeInTheDocument();
  });

  test('should use teamsTheme when theme is null', () => {
    mockUseTeamsAuth.mockReturnValue({
      theme: null,
      loading: false,
      error: null,
    });

    render(<App />);

    const provider = screen.getByTestId('provider');
    expect(provider).toHaveAttribute('data-theme', '{"name":"teams-light-theme"}');
  });

  test('should use custom theme when provided', () => {
    const customTheme = { name: 'custom-theme', colors: { primary: 'blue' } };
    mockUseTeamsAuth.mockReturnValue({
      theme: customTheme,
      loading: false,
      error: null,
    });

    render(<App />);

    const provider = screen.getByTestId('provider');
    expect(provider).toHaveAttribute('data-theme', JSON.stringify(customTheme));
  });

  test('should render FluentProvider with theme', () => {
    mockUseTeamsAuth.mockReturnValue({
      theme: null,
      loading: false,
      error: null,
    });

    render(<App />);

    const provider = screen.getByTestId('provider');
    expect(provider).toBeInTheDocument();
    expect(provider).toHaveAttribute('data-theme');
  });

  test('should redirect to /edittab by default', () => {
    mockUseTeamsAuth.mockReturnValue({
      theme: null,
      loading: false,
      error: null,
    });

    render(<App />);

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/edittab');
  });

  test('should be a function component', () => {
    expect(typeof App).toBe('function');
  });

  test('should render without crashing', () => {
    mockUseTeamsAuth.mockReturnValue({
      theme: null,
      loading: false,
      error: null,
    });

    expect(() => {
      render(<App />);
    }).not.toThrow();
  });

  test('should handle undefined theme gracefully', () => {
    mockUseTeamsAuth.mockReturnValue({
      theme: undefined,
      loading: false,
      error: null,
    });

    render(<App />);

    expect(screen.getByTestId('provider')).toBeInTheDocument();
    expect(screen.getByTestId('router')).toBeInTheDocument();
  });

  test('should handle undefined loading state', () => {
    mockUseTeamsAuth.mockReturnValue({
      theme: null,
      loading: undefined,
      error: null,
    });

    render(<App />);

    expect(screen.getByTestId('provider')).toBeInTheDocument();
    expect(screen.getByTestId('router')).toBeInTheDocument();
  });

  test('should render all components when loading is false', () => {
    mockUseTeamsAuth.mockReturnValue({
      theme: null,
      loading: false,
      error: null,
    });

    render(<App />);

    // Check that all route components are rendered
    expect(screen.getByTestId('privacy')).toBeInTheDocument();
    expect(screen.getByTestId('terms-of-use')).toBeInTheDocument();
    expect(screen.getByTestId('edit-tab')).toBeInTheDocument();
    expect(screen.getByTestId('tab-config')).toBeInTheDocument();
  });

  test('should not render route components when loading is true', () => {
    mockUseTeamsAuth.mockReturnValue({
      theme: null,
      loading: true,
      error: null,
    });

    render(<App />);

    // Check that route components are not rendered when loading
    expect(screen.queryByTestId('privacy')).not.toBeInTheDocument();
    expect(screen.queryByTestId('terms-of-use')).not.toBeInTheDocument();
    expect(screen.queryByTestId('edit-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-config')).not.toBeInTheDocument();
  });
});
