import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
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
  validateName: jest.fn(),
  validatePhone: jest.fn(),
  validateMandatoryField: jest.fn(),
}));

jest.mock('@microsoft/applicationinsights-react-js', () => ({
  useAppInsightsContext: jest.fn(() => ({ name: 'app-insights' })),
  useTrackEvent: jest.fn(() => jest.fn()),
}));

jest.mock('./SwitchChip', () => (props) => (
  <div data-testid="switch-chip" data-chip-value={props.chipValue}>
    {props.chipValue}
  </div>
));

const sharepointProvider = require('../data/sharepointProvider');
const configurationProvider = require('../data/configurationProvider');

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
});
