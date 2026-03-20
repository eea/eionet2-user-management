import React from 'react';
import { render, screen } from '@testing-library/react';
import TabConfig from './TabConfig';

const mockInitialize = jest.fn();
const mockRegisterOnSaveHandler = jest.fn();
const mockSetSettings = jest.fn();
const mockSetValidityState = jest.fn();

jest.mock('@microsoft/teams-js', () => ({
  initialize: () => mockInitialize(),
  settings: {
    registerOnSaveHandler: (handler) => mockRegisterOnSaveHandler(handler),
    setSettings: (settings) => mockSetSettings(settings),
    setValidityState: (state) => mockSetValidityState(state),
  },
}));

describe('TabConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes Teams and renders the configuration heading', () => {
    render(<TabConfig />);

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockSetValidityState).toHaveBeenCalledWith(true);
    expect(mockRegisterOnSaveHandler).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Tab Configuration')).toBeInTheDocument();
  });

  test('registers a save handler that stores the tab URLs and notifies success', () => {
    render(<TabConfig />);

    const saveHandler = mockRegisterOnSaveHandler.mock.calls[0][0];
    const notifySuccess = jest.fn();

    saveHandler({ notifySuccess });

    expect(mockSetSettings).toHaveBeenCalledWith({
      suggestedDisplayName: 'Manage users',
      entityId: 'EditUser',
      contentUrl: `https://${window.location.hostname}:${window.location.port}/index.html#/edittab`,
      websiteUrl: `https://${window.location.hostname}:${window.location.port}/index.html#/edittab`,
    });
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });
});
