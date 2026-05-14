import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import EditTab from './EditTab';

jest.mock('../data/configurationProvider', () => ({
  getMe: jest.fn(),
}));

jest.mock('../data/apiProvider', () => ({
  getConfiguration: jest.fn(),
}));

jest.mock('../data/tagProvider', () => ({
  getCountryCodeMappingsList: jest.fn(),
}));

jest.mock('./UserList', () => ({
  UserList: ({ userInfo, showFunction }) => (
    <div
      data-testid="user-list"
      data-user-info={JSON.stringify(userInfo)}
      data-show-function={String(showFunction)}
    >
      UserList
    </div>
  ),
}));

jest.mock('./HtmlBox', () => ({
  HtmlBox: ({ html }) => <div data-testid="html-box">{html}</div>,
}));

jest.mock('./AppInsights', () => ({
  reactPlugin: { name: 'react-plugin' },
}));

const configurationProvider = require('../data/configurationProvider');
const apiProvider = require('../data/apiProvider');
const tagProvider = require('../data/tagProvider');

describe('EditTab', () => {
  const flushEffects = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  const originalEnv = process.env.REACT_APP_FUNC_NAME;
  const originalVersion = process.env.REACT_APP_VERSION;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_VERSION = '1.2.3';
    process.env.REACT_APP_FUNC_NAME = 'func-name';
    configurationProvider.getMe.mockResolvedValue({
      isAdmin: true,
      isNFP: false,
      isGuest: false,
      country: 'RO',
    });
    tagProvider.getCountryCodeMappingsList.mockResolvedValue([]);
    apiProvider.getConfiguration.mockResolvedValue({
      UserManagementRestrictedMessage: 'Restricted area',
    });
  });

  afterEach(() => {
    process.env.REACT_APP_FUNC_NAME = originalEnv;
    process.env.REACT_APP_VERSION = originalVersion;
  });

  test('loads user data and renders UserList for non-guest users', async () => {
    render(<EditTab />);
    await flushEffects();

    expect(configurationProvider.getMe).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('user-list')).toBeInTheDocument();
    });

    expect(tagProvider.getCountryCodeMappingsList).toHaveBeenCalledTimes(1);
    expect(apiProvider.getConfiguration).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('user-list')).toHaveAttribute(
      'data-user-info',
      JSON.stringify({
        isAdmin: true,
        isNFP: false,
        isGuest: false,
        country: 'RO',
        isLoaded: true,
      }),
    );
    expect(screen.getByTestId('user-list')).toHaveAttribute('data-show-function', 'false');
    expect(screen.queryByTestId('html-box')).not.toBeInTheDocument();
    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
  });

  test('renders the restricted message for guest users', async () => {
    configurationProvider.getMe.mockResolvedValueOnce({
      isAdmin: false,
      isNFP: false,
      isGuest: true,
      country: '',
    });

    render(<EditTab />);
    await flushEffects();

    await waitFor(() => {
      expect(screen.getByTestId('html-box')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('html-box')).toHaveTextContent('Restricted area');
    });
    expect(screen.queryByTestId('user-list')).not.toBeInTheDocument();
  });

  test('does not overwrite configuration when loading returns undefined', async () => {
    apiProvider.getConfiguration.mockResolvedValueOnce(undefined);
    configurationProvider.getMe.mockResolvedValueOnce({
      isAdmin: false,
      isNFP: false,
      isGuest: true,
      country: '',
    });

    render(<EditTab />);
    await flushEffects();

    await waitFor(() => {
      expect(screen.getByTestId('html-box')).toBeInTheDocument();
    });

    expect(screen.getByTestId('html-box')).toBeEmptyDOMElement();
  });
});
