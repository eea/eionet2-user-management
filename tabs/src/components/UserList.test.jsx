import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { UserList } from './UserList';

jest.mock('./eea_logo.svg', () => ({
  ReactComponent: () => <svg data-testid="eea-logo" />,
}));

jest.mock('../data/provider', () => ({
  getUser: jest.fn(),
  removeUser: jest.fn(),
  removeUserMemberships: jest.fn(),
}));

jest.mock('../data/userGroupProvider', () => ({
  getUserGroups: jest.fn(),
}));

jest.mock('../data/apiProvider', () => ({
  logInfo: jest.fn(),
  getConfiguration: jest.fn(),
}));

jest.mock('../data/sharepointProvider', () => ({
  getInvitedUsers: jest.fn(),
}));

jest.mock('react-responsive', () => ({
  useMediaQuery: jest.fn(),
}));

jest.mock('./UserEdit', () => ({
  UserEdit: () => <div data-testid="user-edit">UserEdit</div>,
}));

jest.mock('./UserInvite', () => ({
  UserInvite: ({ userInfo, configuration, refreshList, checkPCP }) => (
    <div
      data-testid="user-invite"
      data-user-info={JSON.stringify(userInfo)}
      data-configuration={JSON.stringify(configuration)}
      data-refresh-list={String(typeof refreshList === 'function')}
      data-check-pcp={String(typeof checkPCP === 'function')}
    >
      UserInvite
    </div>
  ),
}));

jest.mock('./Snack', () => {
  function MockSnack(props) {
    return (
      <div data-testid="snack" data-open={String(props.open)}>
        {props.message}
      </div>
    );
  }

  return MockSnack;
});

jest.mock('./DeleteDialog', () => {
  function MockDeleteDialog(props) {
    return props.open ? (
      <div data-testid="delete-dialog">
        <div>{props.title}</div>
        <div>{typeof props.message === 'function' ? props.message() : props.message}</div>
        <button onClick={props.onYes}>Yes</button>
        <button onClick={props.onNo}>No</button>
      </div>
    ) : null;
  }

  return MockDeleteDialog;
});

jest.mock('./ResizableGrid', () => {
  function MockResizableGrid(props) {
    const titleColumn = props.columns.find((column) => column.field === 'Title');
    const membershipColumn = props.columns.find((column) => column.field === 'MembershipString');
    const signedInColumn = props.columns.find((column) => column.field === 'SignedIn');
    const editColumn = props.columns.find((column) => column.field === 'Edit');

    return (
      <div
        data-testid="resizable-grid"
        data-rows={JSON.stringify(props.rows)}
        data-columns-count={String(props.columns.length)}
      >
        {props.rows.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            <div data-testid={`title-${row.id}`}>{titleColumn.renderCell({ row })}</div>
            <div data-testid={`membership-${row.id}`}>{membershipColumn.renderCell({ row })}</div>
            <div data-testid={`signedin-${row.id}`}>{signedInColumn.renderCell({ row })}</div>
            <div data-testid={`actions-${row.id}`}>{editColumn.renderCell({ row })}</div>
          </div>
        ))}
      </div>
    );
  }

  return MockResizableGrid;
});

jest.mock('./HtmlBox', () => ({
  HtmlBox: ({ html }) => <div data-testid="html-box">{html}</div>,
}));

jest.mock('@microsoft/applicationinsights-react-js', () => ({
  useAppInsightsContext: jest.fn(() => ({ name: 'app-insights' })),
  useTrackEvent: jest.fn(() => jest.fn()),
}));

const apiProvider = require('../data/apiProvider');
const sharepointProvider = require('../data/sharepointProvider');
const provider = require('../data/provider');
const userGroupProvider = require('../data/userGroupProvider');
const responsive = require('react-responsive');

describe('UserList', () => {
  const flushEffects = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  const userInfo = {
    isAdmin: true,
    isNFP: false,
    isGuest: false,
    country: 'RO',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_VERSION = '1.2.3';
    responsive.useMediaQuery.mockReturnValue(false);
    apiProvider.getConfiguration.mockResolvedValue({
      SignedInTooltip: 'Signed in',
      NotSignedInTooltip: 'Not signed in',
      DeleteEionetUserDetails: 'Delete details',
      DeleteEionetUserMemberships: 'Delete memberships details',
      UserListSearchInfo: 'Search help',
      AppVersionMessage: 'Please reload to latest version',
      UserManagementVersion: '1.2.3',
      EEANominatedTooltip: 'EEA nominated',
    });
    sharepointProvider.getInvitedUsers.mockResolvedValue([
      {
        id: '1',
        Title: 'John Doe',
        Email: 'john@example.com',
        ADUserId: 'ad-1',
        Country: 'RO',
        Organisation: 'Org',
        Membership: ['Member'],
        MembershipString: 'Member',
        OtherMemberships: [],
        SignedIn: false,
        PCP: ['Member'],
      },
    ]);
    provider.getUser.mockResolvedValue({ givenName: 'John', surname: 'Doe' });
    provider.removeUser.mockResolvedValue({ Success: true });
    provider.removeUserMemberships.mockResolvedValue({ Success: true });
    userGroupProvider.getUserGroups.mockResolvedValue('Group A, Group B');
  });

  test('loads configuration and invited users into the grid', async () => {
    render(<UserList userInfo={userInfo} />);
    await flushEffects();

    expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('resizable-grid')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('resizable-grid').getAttribute('data-rows')).toContain(
        '"Email":"john@example.com"',
      );
    });

    expect(apiProvider.getConfiguration).toHaveBeenCalledTimes(1);
    expect(sharepointProvider.getInvitedUsers).toHaveBeenCalledWith(userInfo);
    expect(screen.getByTestId('resizable-grid')).toHaveAttribute('data-columns-count', '9');
  });

  test('opens the version dialog when configuration version differs from the app version', async () => {
    apiProvider.getConfiguration.mockResolvedValueOnce({
      AppVersionMessage: 'Please reload to latest version',
      UserManagementVersion: '9.9.9',
    });

    render(<UserList userInfo={userInfo} />);
    await flushEffects();

    await waitFor(() => {
      expect(screen.getByText('Application version')).toBeInTheDocument();
    });

    expect(screen.getByTestId('html-box')).toHaveTextContent('Please reload to latest version');
  });

  test('opens the invite dialog when clicking Invite user', async () => {
    render(<UserList userInfo={userInfo} />);
    await flushEffects();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Invite user' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Invite user' }));

    expect(screen.getByTestId('user-invite')).toBeInTheDocument();
    expect(screen.getByTestId('user-invite')).toHaveAttribute(
      'data-user-info',
      JSON.stringify(userInfo),
    );
    expect(screen.getByTestId('user-invite')).toHaveAttribute('data-refresh-list', 'true');
    expect(screen.getByTestId('user-invite')).toHaveAttribute('data-check-pcp', 'true');
  });

  test('opens the edit dialog and populates the selected user from AD details', async () => {
    render(<UserList userInfo={userInfo} />);
    await flushEffects();

    await waitFor(() => {
      expect(screen.getByTestId('actions-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('actions-1').querySelectorAll('button')[0]);

    await waitFor(() => {
      expect(screen.getByTestId('user-edit')).toBeInTheDocument();
    });

    expect(provider.getUser).toHaveBeenCalledWith('ad-1');
    expect(apiProvider.logInfo).not.toHaveBeenCalledWith(
      expect.stringContaining('The user account cannot be updated'),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  test('shows the missing AD user alert and logs when the AD lookup fails', async () => {
    provider.getUser.mockResolvedValueOnce(undefined);

    render(<UserList userInfo={userInfo} />);
    await flushEffects();

    fireEvent.click(screen.getByTestId('actions-1').querySelectorAll('button')[0]);

    await waitFor(() => {
      expect(
        screen.getByText(
          'The user account cannot be updated (account is not present in the Azure tenant).',
        ),
      ).toBeInTheDocument();
    });

    expect(apiProvider.logInfo).toHaveBeenCalledWith(
      'The user account cannot be updated (account is not present in the Azure tenant).',
      '',
      expect.objectContaining({ Email: 'john@example.com' }),
      'Edit user',
      'john@example.com',
    );
  });

  test('opens the remove dialog and removes the user after confirmation', async () => {
    render(<UserList userInfo={userInfo} />);
    await flushEffects();

    fireEvent.click(screen.getByTestId('actions-1').querySelectorAll('button')[1]);

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    });

    expect(userGroupProvider.getUserGroups).toHaveBeenCalledWith('ad-1');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(provider.removeUser).toHaveBeenCalledWith(
        expect.objectContaining({
          Email: 'john@example.com',
          FirstName: 'John',
          LastName: 'Doe',
          groupsString: 'Group A, Group B',
        }),
      );
    });

    expect(sharepointProvider.getInvitedUsers).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(screen.getByTestId('snack')).toHaveTextContent(
        "Success. User removed from Eionet's workspace.",
      );
    });
  });

  test('filters the grid rows when the search value is long enough', async () => {
    sharepointProvider.getInvitedUsers.mockResolvedValueOnce([
      {
        id: '1',
        Title: 'John Doe',
        Email: 'john@example.com',
        ADUserId: 'ad-1',
        Country: 'RO',
        Organisation: 'Org',
        Membership: ['Member'],
        MembershipString: 'Member',
        OtherMemberships: [],
        SignedIn: false,
      },
      {
        id: '2',
        Title: 'Jane Roe',
        Email: 'jane@example.com',
        ADUserId: 'ad-2',
        Country: 'DE',
        Organisation: 'Elsewhere',
        Membership: ['Lead'],
        MembershipString: 'Lead',
        OtherMemberships: [],
        SignedIn: true,
      },
    ]);

    render(<UserList userInfo={userInfo} />);
    await flushEffects();

    await waitFor(() => {
      expect(screen.getByTestId('row-2')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'jane' } });

    await waitFor(() => {
      expect(screen.queryByTestId('row-1')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('row-2')).toBeInTheDocument();
  });
});
