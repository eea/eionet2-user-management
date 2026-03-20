import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { UserInvite } from './UserInvite';

jest.mock('../data/provider', () => ({
  getUserByMail: jest.fn(),
  inviteUser: jest.fn(),
}));

jest.mock('../data/configurationProvider', () => ({
  getMappingsList: jest.fn(),
}));

jest.mock('validator', () => ({
  isEmail: jest.fn(),
}));

jest.mock('./UserEdit', () => ({
  UserEdit: ({ userEntity, saveFunction, newYN, userInfo, configuration, checkPCP }) => (
    <div
      data-testid="user-edit"
      data-user-entity={JSON.stringify(userEntity)}
      data-new={String(newYN)}
      data-user-info={JSON.stringify(userInfo)}
      data-configuration={JSON.stringify(configuration)}
      data-check-pcp={String(typeof checkPCP === 'function')}
      data-save-function={String(typeof saveFunction === 'function')}
    >
      UserEdit
    </div>
  ),
}));

jest.mock('./HtmlBox', () => ({
  HtmlBox: ({ html }) => <div data-testid="html-box">{html}</div>,
}));

const provider = require('../data/provider');
const configurationProvider = require('../data/configurationProvider');
const validator = require('validator');

describe('UserInvite', () => {
  const flushEffects = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  const configuration = {
    UserAlreadyRegisteredMessage: 'User already registered',
  };
  const userInfo = {
    isNFP: false,
    country: 'RO',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configurationProvider.getMappingsList.mockResolvedValue([{ Membership: 'Member' }]);
    validator.isEmail.mockReturnValue(true);
    provider.getUserByMail.mockResolvedValue({
      ADUser: undefined,
      SharepointUser: undefined,
      Continue: true,
    });
  });

  test('shows an invalid email warning for malformed addresses', async () => {
    validator.isEmail.mockReturnValue(false);

    render(
      <UserInvite
        userInfo={userInfo}
        refreshList={jest.fn()}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invite user' }));

    await waitFor(() => {
      expect(screen.getByTestId('html-box')).toHaveTextContent(
        'Invalid email. Please correct the email address!',
      );
    });

    expect(provider.getUserByMail).not.toHaveBeenCalled();
    expect(screen.queryByTestId('user-edit')).not.toBeInTheDocument();
  });

  test('shows an EEA-specific warning for internal email addresses', async () => {
    render(
      <UserInvite
        userInfo={userInfo}
        refreshList={jest.fn()}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'person@eea.europa.eu' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Invite user' }));

    await waitFor(() => {
      expect(screen.getByTestId('html-box')).toHaveTextContent(
        'Users with EEA email address cannot be invited as guests.',
      );
    });

    expect(provider.getUserByMail).not.toHaveBeenCalled();
  });

  test('shows the user edit form when lookup allows continuing', async () => {
    const checkPCP = jest.fn();

    render(
      <UserInvite
        userInfo={userInfo}
        refreshList={jest.fn()}
        configuration={configuration}
        checkPCP={checkPCP}
      />,
    );
    await flushEffects();

    await waitFor(() => {
      expect(configurationProvider.getMappingsList).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'new.user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Invite user' }));

    await waitFor(() => {
      expect(screen.getByTestId('user-edit')).toBeInTheDocument();
    });

    expect(provider.getUserByMail).toHaveBeenCalledWith('new.user@example.com');
    expect(screen.getByTestId('user-edit')).toHaveAttribute('data-new', 'true');
    expect(screen.getByTestId('user-edit')).toHaveAttribute(
      'data-user-info',
      JSON.stringify(userInfo),
    );
    expect(screen.getByTestId('user-edit')).toHaveAttribute(
      'data-configuration',
      JSON.stringify(configuration),
    );
    expect(screen.getByTestId('user-edit')).toHaveAttribute('data-check-pcp', 'true');
    expect(screen.getByTestId('user-edit')).toHaveAttribute('data-save-function', 'true');
    expect(screen.getByTestId('user-edit').getAttribute('data-user-entity')).toContain(
      '"Email":"new.user@example.com"',
    );
  });

  test('shows the already registered warning when lookup cannot continue', async () => {
    provider.getUserByMail.mockResolvedValueOnce({
      ADUser: { id: 'existing-user' },
      SharepointUser: { id: 'sp-user' },
      Continue: false,
    });

    render(
      <UserInvite
        userInfo={userInfo}
        refreshList={jest.fn()}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Invite user' }));

    await waitFor(() => {
      expect(screen.getByTestId('html-box')).toHaveTextContent('User already registered');
    });

    expect(screen.queryByTestId('user-edit')).not.toBeInTheDocument();
  });
});
