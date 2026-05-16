import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserEdit } from './UserEdit';

jest.mock('../data/provider', () => ({
  editUser: jest.fn(),
  resendInvitation: jest.fn(),
}));

jest.mock('../data/sharepointProvider', () => ({
  getComboLists: jest.fn(),
  getOrganisationList: jest.fn(),
}));

jest.mock('../data/configurationProvider', () => ({
  getMappingsList: jest.fn(),
}));

jest.mock('../data/validator', () => ({
  validateName: jest.fn(() => ''),
  validatePhone: jest.fn(() => ''),
  validateMandatoryField: jest.fn(() => ''),
}));

jest.mock('@microsoft/applicationinsights-react-js', () => ({
  useAppInsightsContext: jest.fn(() => ({ name: 'app-insights' })),
  useTrackEvent: jest.fn(() => jest.fn()),
}));

jest.mock('./SwitchChip', () => {
  function MockSwitchChip(props) {
    return (
      <div data-testid="switch-chip" data-chip-value={props.chipValue}>
        {props.chipValue}
      </div>
    );
  }

  return MockSwitchChip;
});

const sharepointProvider = require('../data/sharepointProvider');
const configurationProvider = require('../data/configurationProvider');
const provider = require('../data/provider');
const validator = require('../data/validator');

describe('UserEdit', () => {
  const flushEffects = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  const baseUser = {
    Phone: '',
    Email: 'user@example.com',
    Country: 'RO',
    Membership: ['Member'],
    OtherMemberships: ['Observer'],
    FirstName: 'John',
    LastName: 'Doe',
    Gender: 'Mr',
    GenderTitle: 'Mr',
    Organisation: 'Org A',
    OrganisationLookupId: 'org-1',
    NFP: '',
    ADProfile: {},
    SignedIn: false,
    LastInvitationDate: '2024-01-05T10:30:00Z',
    EEANominated: false,
    SuggestedOrganisation: '',
  };

  const configuration = {
    EEANominatedTooltip: 'EEA nominated help',
    PcpValidationMessage: 'Duplicate PCP:',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sharepointProvider.getComboLists.mockResolvedValue({
      countries: ['RO', 'DE'],
      memberships: ['Member', 'Lead'],
      otherMemberships: ['Observer'],
      genders: ['Mr', 'Ms'],
      nfps: ['NFP Group'],
    });
    sharepointProvider.getOrganisationList.mockResolvedValue([
      { content: 'org-1', header: 'Org A', unspecified: false },
    ]);
    configurationProvider.getMappingsList.mockResolvedValue([{ Membership: 'Member' }]);
  });

  test('loads combo lists and organisations on mount', async () => {
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={jest.fn()}
        saveFunction={jest.fn()}
        newYN={true}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();

    await waitFor(() => {
      expect(sharepointProvider.getComboLists).toHaveBeenCalledTimes(1);
    });

    expect(sharepointProvider.getOrganisationList).toHaveBeenCalledWith('RO');
    expect(configurationProvider.getMappingsList).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('user@example.com')).toBeInTheDocument();
  });

  test('renders save-and-send mode for new users', async () => {
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={jest.fn()}
        saveFunction={jest.fn()}
        newYN={true}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save and send invitation' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Update user/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Re-send invite email/i })).not.toBeInTheDocument();
  });

  test('renders update mode, resend button, and pending-invite warning for existing users', async () => {
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={jest.fn()}
        saveFunction={jest.fn()}
        newYN={false}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update user' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Re-send invite email/i })).toBeInTheDocument();
    expect(screen.getByText(/User was last invited on/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Note: If the email or other details needs to be changed/i),
    ).toBeInTheDocument();
  });

  test('submits new user successfully via saveFunction', async () => {
    const saveFunction = jest.fn().mockResolvedValue({ Success: true });
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={jest.fn()}
        saveFunction={saveFunction}
        newYN={true}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    const button = await screen.findByRole('button', { name: 'Save and send invitation' });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(saveFunction).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Saved and invitation sent' })).toBeInTheDocument();
    });
  });

  test('shows warning when saveFunction fails for a new user', async () => {
    const saveFunction = jest.fn().mockResolvedValue({
      Success: false,
      Message: 'Failed to save',
      Error: 'reason',
    });
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={jest.fn()}
        saveFunction={saveFunction}
        newYN={true}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    const button = await screen.findByRole('button', { name: 'Save and send invitation' });
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to save/i)).toBeInTheDocument();
    });
    expect(saveFunction).toHaveBeenCalledTimes(1);
  });

  test('submits edit for existing user and calls refreshRow on success', async () => {
    provider.editUser.mockResolvedValue({ Success: true });
    const refreshRow = jest.fn();
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={refreshRow}
        saveFunction={jest.fn()}
        newYN={false}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    const updateButton = await screen.findByRole('button', { name: 'Update user' });
    await act(async () => {
      fireEvent.click(updateButton);
    });

    await waitFor(() => {
      expect(provider.editUser).toHaveBeenCalledTimes(1);
    });
    expect(refreshRow).toHaveBeenCalledTimes(1);
  });

  test('shows warning when editUser fails', async () => {
    provider.editUser.mockResolvedValue({
      Success: false,
      Message: 'Edit failed',
      Error: 'denied',
    });
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={jest.fn()}
        saveFunction={jest.fn()}
        newYN={false}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    const updateButton = await screen.findByRole('button', { name: 'Update user' });
    await act(async () => {
      fireEvent.click(updateButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Edit failed/i)).toBeInTheDocument();
    });
  });

  test('submits resend invitation for not-signed-in user', async () => {
    provider.resendInvitation.mockResolvedValue({ Success: true });
    const refreshRow = jest.fn();
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={refreshRow}
        saveFunction={jest.fn()}
        newYN={false}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    const resendButton = await screen.findByRole('button', { name: /Re-send invite email/i });
    await act(async () => {
      fireEvent.click(resendButton);
    });

    await waitFor(() => {
      expect(provider.resendInvitation).toHaveBeenCalledTimes(1);
    });
    expect(refreshRow).toHaveBeenCalledTimes(1);
  });

  test('shows warning when resendInvitation fails', async () => {
    provider.resendInvitation.mockResolvedValue({
      Success: false,
      Message: 'Resend failed',
      Error: 'no permission',
    });
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={jest.fn()}
        saveFunction={jest.fn()}
        newYN={false}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    const resendButton = await screen.findByRole('button', { name: /Re-send invite email/i });
    await act(async () => {
      fireEvent.click(resendButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Resend failed/i)).toBeInTheDocument();
    });
  });

  test('blocks submit and surfaces missing-membership warning when nothing is selected', async () => {
    const saveFunction = jest.fn();
    const noMembershipUser = {
      ...baseUser,
      Membership: [],
      OtherMemberships: [],
      NFP: '',
    };
    render(
      <UserEdit
        userEntity={noMembershipUser}
        refreshRow={jest.fn()}
        saveFunction={saveFunction}
        newYN={true}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    const button = await screen.findByRole('button', { name: 'Save and send invitation' });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(saveFunction).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Membership/i);
    });
  });

  test('blocks submit when validation reports errors', async () => {
    validator.validateName.mockReturnValueOnce('First name is required');
    const saveFunction = jest.fn();
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={jest.fn()}
        saveFunction={saveFunction}
        newYN={true}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    const button = await screen.findByRole('button', { name: 'Save and send invitation' });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(saveFunction).not.toHaveBeenCalled();
  });

  test('updates user fields and triggers validation on edit/blur', async () => {
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={jest.fn()}
        saveFunction={jest.fn()}
        newYN={true}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    const firstName = await screen.findByDisplayValue('John');
    await act(async () => {
      fireEvent.change(firstName, { target: { id: 'firstName', value: 'Jane' } });
      fireEvent.blur(firstName, { target: { id: 'firstName' } });
    });

    const lastName = screen.getByDisplayValue('Doe');
    await act(async () => {
      fireEvent.change(lastName, { target: { id: 'lastName', value: 'Smith' } });
      fireEvent.blur(lastName, { target: { id: 'lastName' } });
    });

    const jobTitle = screen.getByLabelText(/Job title/i);
    await act(async () => {
      fireEvent.change(jobTitle, { target: { id: 'jobTitle', value: 'Engineer' } });
    });

    const phone = screen.getByLabelText(/Phone/i);
    await act(async () => {
      fireEvent.change(phone, { target: { id: 'phone', value: '+12345' } });
      fireEvent.blur(phone, { target: { id: 'phone' } });
    });

    const department = screen.getByLabelText(/Department/i);
    await act(async () => {
      fireEvent.change(department, { target: { id: 'department', value: 'IT' } });
    });

    expect(validator.validateName).toHaveBeenCalled();
    expect(validator.validatePhone).toHaveBeenCalled();
  });

  test('runs default branch of validateField for unknown ids', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={jest.fn()}
        saveFunction={jest.fn()}
        newYN={true}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    const jobTitle = screen.getByLabelText(/Job title/i);
    await act(async () => {
      fireEvent.change(jobTitle, { target: { id: 'jobTitle', value: 'Tester' } });
    });

    expect(consoleSpy).toHaveBeenCalledWith('Undefined field for validation');
    consoleSpy.mockRestore();
  });

  test('renders membership autocomplete for NFP user and seeds country', async () => {
    const nfpUser = {
      ...baseUser,
      Country: undefined,
    };
    render(
      <UserEdit
        userEntity={nfpUser}
        refreshRow={jest.fn()}
        saveFunction={jest.fn()}
        newYN={true}
        userInfo={{ isAdmin: false, isNFP: true, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    await waitFor(() => {
      expect(sharepointProvider.getOrganisationList).toHaveBeenCalled();
    });
    expect(screen.getByLabelText(/Membership of Eionet groups/i)).toBeInTheDocument();
  });

  test('renders EEA nominated checkbox for admins with memberships', async () => {
    render(
      <UserEdit
        userEntity={{ ...baseUser, EEANominated: true }}
        refreshRow={jest.fn()}
        saveFunction={jest.fn()}
        newYN={false}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    const checkbox = await screen.findByRole('checkbox', { name: /controlled/i });
    expect(checkbox).toBeChecked();
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(checkbox).not.toBeChecked();
  });

  test('renders suggested-organisation input when org is unspecified', async () => {
    sharepointProvider.getOrganisationList.mockResolvedValueOnce([
      { content: 'org-1', header: 'Org A', unspecified: true },
    ]);
    render(
      <UserEdit
        userEntity={{ ...baseUser }}
        refreshRow={jest.fn()}
        saveFunction={jest.fn()}
        newYN={true}
        userInfo={{ isAdmin: true, isNFP: false, isGuest: false, country: 'RO' }}
        configuration={configuration}
        checkPCP={jest.fn()}
      />,
    );
    await flushEffects();

    const field = await screen.findByLabelText(/Suggest new organisation/i);
    await act(async () => {
      fireEvent.change(field, {
        target: { id: 'suggestedOrganisation', value: 'New Org' },
      });
      fireEvent.blur(field, { target: { id: 'suggestedOrganisation' } });
    });

    expect(field.value).toBe('New Org');
  });
});
