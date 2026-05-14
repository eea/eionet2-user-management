jest.mock('./apiProvider', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
  apiDelete: jest.fn(),
  getConfiguration: jest.fn(),
  logInfo: jest.fn(),
}));

jest.mock('./sharepointProvider', () => ({
  getSPUserByMail: jest.fn(),
  saveSPUser: jest.fn(),
  checkPCP: jest.fn(),
}));

jest.mock('./configurationProvider', () => ({
  getMappingsList: jest.fn(),
}));

jest.mock('./providerHelper', () => ({
  getDistinctGroupsIds: jest.fn(),
  capitalizeName: jest.fn(),
  buildUserDisplaName: jest.fn(),
}));

jest.mock('./tagProvider', () => ({
  addTag: jest.fn(),
  removeTag: jest.fn(),
  getCountryName: jest.fn(),
}));

jest.mock('./userGroupProvider', () => ({
  postUserGroup: jest.fn(),
  deleteUserGroup: jest.fn(),
  getExistingGroups: jest.fn(),
}));

jest.mock('./notificationProvider', () => ({
  sendInvitationMail: jest.fn(),
}));

const apiProvider = require('./apiProvider');
const sharepointProvider = require('./sharepointProvider');
const configurationProvider = require('./configurationProvider');
const notificationProvider = require('./notificationProvider');
const providerHelper = require('./providerHelper');
const tagProvider = require('./tagProvider');
const userGroupProvider = require('./userGroupProvider');
const provider = require('./provider');

describe('provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    sharepointProvider.checkPCP.mockResolvedValue({});
    apiProvider.getConfiguration.mockResolvedValue({
      InviteEmailText: 'Invite body',
      MainEionetGroupId: 'main-group',
      NFPGroupId: 'nfp-group',
      SharepointSiteId: 'site-id',
      UserListId: 'user-list-id',
    });
    providerHelper.capitalizeName.mockImplementation(() => {});
    providerHelper.buildUserDisplaName.mockReturnValue('John Doe');
    providerHelper.getDistinctGroupsIds.mockImplementation((mappings) => [
      ...new Set(mappings.map((mapping) => mapping.O365GroupId)),
    ]);
    tagProvider.getCountryName.mockImplementation((country) => `Country:${country}`);
    userGroupProvider.getExistingGroups.mockResolvedValue([]);
    sharepointProvider.saveSPUser.mockResolvedValue({});
    apiProvider.apiPatch.mockResolvedValue({});
    apiProvider.apiPost.mockResolvedValue({});
    apiProvider.logInfo.mockImplementation(() => {});
    notificationProvider.sendInvitationMail.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getUserByMail', () => {
    test('returns AD and SharePoint user details when found', async () => {
      apiProvider.apiGet.mockResolvedValue({
        graphClientMessage: {
          value: [{ id: 'ad-user-1', mail: 'user@example.com' }],
        },
      });
      sharepointProvider.getSPUserByMail.mockResolvedValue({ id: 'sp-user-1' });

      const result = await provider.getUserByMail('user@example.com');

      expect(apiProvider.apiGet).toHaveBeenCalledWith("/users/?$filter=mail eq 'user@example.com'");
      expect(sharepointProvider.getSPUserByMail).toHaveBeenCalledWith('user@example.com');
      expect(result).toEqual({
        ADUser: { id: 'ad-user-1', mail: 'user@example.com' },
        SharepointUser: { id: 'sp-user-1' },
        Continue: false,
      });
    });

    test('escapes single quotes and allows continuing when AD user is missing', async () => {
      apiProvider.apiGet.mockResolvedValue({
        graphClientMessage: {
          value: [],
        },
      });
      sharepointProvider.getSPUserByMail.mockResolvedValue(undefined);

      const result = await provider.getUserByMail("o'connor@example.com");

      expect(apiProvider.apiGet).toHaveBeenCalledWith(
        "/users/?$filter=mail eq 'o''connor@example.com'",
      );
      expect(result).toEqual({
        ADUser: undefined,
        SharepointUser: undefined,
        Continue: true,
      });
    });

    test('returns undefined when lookup fails', async () => {
      apiProvider.apiGet.mockRejectedValue(new Error('lookup failed'));

      await expect(provider.getUserByMail('user@example.com')).resolves.toBeUndefined();
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    test('returns the graph client payload', async () => {
      apiProvider.apiGet.mockResolvedValue({
        graphClientMessage: { id: 'user-1', displayName: 'Test User' },
      });

      const result = await provider.getUser('user-1');

      expect(apiProvider.apiGet).toHaveBeenCalledWith('/users/user-1');
      expect(result).toEqual({ id: 'user-1', displayName: 'Test User' });
    });

    test('returns undefined when fetching the user fails', async () => {
      apiProvider.apiGet.mockRejectedValue(new Error('fetch failed'));

      await expect(provider.getUser('user-1')).resolves.toBeUndefined();
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('removeUserMemberships', () => {
    test('is exported as a function', () => {
      expect(typeof provider.removeUserMemberships).toBe('function');
    });
  });

  describe('inviteUser', () => {
    test('returns a PCP validation error when duplicate PCP values exist', async () => {
      sharepointProvider.checkPCP.mockResolvedValue({ Member: 'existing@example.com' });

      const result = await provider.inviteUser(
        {
          Email: 'user@example.com',
          Country: 'RO',
          Membership: ['Member'],
          FirstName: 'John',
          LastName: 'Doe',
        },
        [{ Membership: 'Member', TeamURL: 'https://team.example', O365GroupId: 'group-1' }],
      );

      expect(result).toEqual({
        Success: false,
        Error: {},
        Message: 'The following groups already have PCPs specified:Member: existing@example.com',
      });
      expect(apiProvider.apiPost).not.toHaveBeenCalled();
    });

    test('invites a new user, updates AD, adds groups, and saves the SharePoint user', async () => {
      apiProvider.apiPost.mockResolvedValueOnce({
        graphClientMessage: {
          invitedUser: { id: 'new-user-id' },
        },
      });

      const result = await provider.inviteUser(
        {
          Email: 'user@example.com',
          Country: 'RO',
          Membership: ['Member'],
          OtherMemberships: ['Observer'],
          FirstName: 'John',
          LastName: 'Doe',
        },
        [
          { Membership: 'Member', TeamURL: 'https://team.example', O365GroupId: 'group-1' },
          { Membership: 'Observer', TeamURL: 'https://team.example', O365GroupId: 'group-2' },
        ],
      );

      expect(providerHelper.capitalizeName).toHaveBeenCalled();
      expect(apiProvider.apiPost).toHaveBeenNthCalledWith(
        1,
        '/invitations/',
        expect.objectContaining({
          invitedUserEmailAddress: 'user@example.com',
          invitedUserDisplayName: 'John Doe',
          inviteRedirectUrl: 'https://team.example',
          sendInvitationMessage: true,
        }),
      );
      expect(apiProvider.apiPatch).toHaveBeenCalledWith('/users/new-user-id', {
        givenName: 'John',
        surname: 'Doe',
        displayName: 'John Doe',
        department: 'Eionet',
        country: 'RO',
      });
      expect(userGroupProvider.postUserGroup).toHaveBeenCalledWith(
        'group-1',
        'new-user-id',
        'user@example.com',
      );
      expect(userGroupProvider.postUserGroup).toHaveBeenCalledWith(
        'group-2',
        'new-user-id',
        'user@example.com',
      );
      expect(sharepointProvider.saveSPUser).toHaveBeenCalledWith(
        'new-user-id',
        expect.objectContaining({ Email: 'user@example.com' }),
        true,
      );
      expect(apiProvider.logInfo).toHaveBeenCalledWith(
        'User invited: user@example.com',
        '',
        expect.objectContaining({ Email: 'user@example.com' }),
        'Add user',
        'user@example.com',
      );
      expect(result).toEqual({ Success: true });
    });

    test('resends invitation mail for an existing AD user and adds signed-in tags', async () => {
      apiProvider.apiGet.mockResolvedValueOnce({
        graphClientMessage: {
          value: [{ isMfaRegistered: true }],
        },
      });

      const result = await provider.inviteUser(
        {
          Email: 'existing@example.com',
          Country: 'RO',
          Membership: ['Member'],
          FirstName: 'Jane',
          LastName: 'Doe',
          ADProfile: {
            id: 'existing-id',
            displayName: "Jane O'Connor",
          },
          NFP: 'NFP role',
        },
        [
          { Membership: 'Member', O365GroupId: 'group-1', Tag: 'MemberTag' },
          { Membership: 'Unused', O365GroupId: 'group-2', Tag: 'UnusedTag' },
          { Membership: 'fallback', O365GroupId: 'main-group', TeamURL: 'https://team.example' },
        ],
      );

      expect(apiProvider.apiGet).toHaveBeenCalledWith(
        "/reports/credentialUserRegistrationDetails?$filter=userDisplayName eq 'Jane O''Connor'",
      );
      expect(notificationProvider.sendInvitationMail).toHaveBeenCalledWith(
        expect.objectContaining({ Email: 'existing@example.com', SignedIn: true }),
        expect.any(Array),
      );
      expect(tagProvider.addTag).toHaveBeenCalledWith(
        'main-group',
        'National-Focal-Points',
        'existing-id',
      );
      expect(tagProvider.addTag).toHaveBeenCalledWith('main-group', 'Country:RO', 'existing-id');
      expect(sharepointProvider.saveSPUser).toHaveBeenCalledWith(
        'existing-id',
        expect.objectContaining({ SignedIn: true }),
        true,
      );
      expect(result).toEqual({ Success: true });
    });
  });

  describe('editUser', () => {
    test('updates memberships, tags, AD, and SharePoint for an existing user', async () => {
      const user = {
        ADUserId: 'user-1',
        Email: 'user@example.com',
        Country: 'RO',
        Membership: ['Member'],
        OtherMemberships: ['Observer'],
        FirstName: 'John',
        LastName: 'Doe',
        SignedIn: true,
        NFP: '',
      };
      const oldValues = {
        ADUserId: 'user-1',
        Email: 'user@example.com',
        Country: 'DE',
        Membership: ['OldMember'],
        OtherMemberships: [],
        FirstName: 'John',
        LastName: 'Doe',
        SignedIn: true,
        NFP: 'Old NFP',
      };
      const mappings = [
        { Membership: 'Member', O365GroupId: 'group-1', Tag: 'MemberTag' },
        { Membership: 'Observer', O365GroupId: 'group-2', Tag: 'ObserverTag' },
        { Membership: 'OldMember', O365GroupId: 'old-group', Tag: 'OldTag' },
      ];

      userGroupProvider.getExistingGroups.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await provider.editUser(user, mappings, oldValues);

      expect(userGroupProvider.postUserGroup).toHaveBeenCalledWith(
        'group-1',
        'user-1',
        'user@example.com',
      );
      expect(userGroupProvider.postUserGroup).toHaveBeenCalledWith(
        'group-2',
        'user-1',
        'user@example.com',
      );
      expect(userGroupProvider.deleteUserGroup).toHaveBeenCalledWith(
        'old-group',
        'user-1',
        'user@example.com',
      );
      expect(userGroupProvider.deleteUserGroup).toHaveBeenCalledWith(
        'nfp-group',
        'user-1',
        'user@example.com',
      );
      expect(userGroupProvider.deleteUserGroup).toHaveBeenCalledWith(
        'main-group',
        'user-1',
        'user@example.com',
      );
      expect(tagProvider.addTag).toHaveBeenCalledWith('group-1', 'MemberTag', 'user-1');
      expect(tagProvider.removeTag).toHaveBeenCalledWith('old-group', 'OldTag', 'user-1');
      expect(tagProvider.removeTag).toHaveBeenCalledWith('group-1', 'Country:DE', 'user-1');
      expect(apiProvider.apiPatch).toHaveBeenCalledWith('/users/user-1', {
        givenName: 'John',
        surname: 'Doe',
        displayName: 'John Doe',
        department: 'Eionet',
        country: 'RO',
      });
      expect(sharepointProvider.saveSPUser).toHaveBeenCalledWith('user-1', user, false, oldValues);
      expect(result).toEqual({ Success: true });
    });
  });

  describe('removeUser', () => {
    test('returns false when no user is provided', async () => {
      await expect(provider.removeUser(undefined)).resolves.toBe(false);
    });

    test('removes groups, handles 404 AD errors, deletes the SharePoint row, and logs success', async () => {
      configurationProvider.getMappingsList.mockResolvedValue([
        { Membership: 'Member', O365GroupId: 'group-1' },
      ]);
      apiProvider.apiPatch.mockRejectedValueOnce({
        response: { data: { error: { statusCode: 404 } } },
      });

      const result = await provider.removeUser({
        id: 'sp-item-1',
        ADUserId: 'user-1',
        Email: 'user@example.com',
        FirstName: 'John',
        LastName: 'Doe',
        Membership: ['Member'],
        OtherMemberships: [],
        NFP: 'NFP role',
      });

      expect(userGroupProvider.deleteUserGroup).toHaveBeenCalledWith(
        'group-1',
        'user-1',
        'user@example.com',
      );
      expect(userGroupProvider.deleteUserGroup).toHaveBeenCalledWith(
        'nfp-group',
        'user-1',
        'user@example.com',
      );
      expect(apiProvider.logInfo).toHaveBeenCalledWith(
        'User not found in Entra during removal: user@example.com',
        '',
        expect.objectContaining({ Email: 'user@example.com' }),
        'Remove user',
        'user@example.com',
      );
      expect(apiProvider.apiDelete).toHaveBeenCalledWith(
        '/sites/site-id/lists/user-list-id/items/sp-item-1',
      );
      expect(result).toEqual({ Success: true });
    });
  });

  describe('resendInvitation', () => {
    test('updates the date, reuses editUser logic, and sends the invite mail when edit succeeds', async () => {
      const user = {
        ADUserId: 'user-1',
        Email: 'user@example.com',
        Country: 'RO',
        Membership: ['Member'],
        OtherMemberships: [],
        FirstName: 'John',
        LastName: 'Doe',
        SignedIn: false,
        NFP: '',
      };
      const oldValues = {
        ...user,
        Country: 'RO',
        Membership: ['Member'],
        OtherMemberships: [],
        NFP: '',
      };
      const mappings = [{ Membership: 'Member', O365GroupId: 'group-1', Tag: 'MemberTag' }];

      userGroupProvider.getExistingGroups.mockResolvedValueOnce([]);

      const result = await provider.resendInvitation(user, mappings, oldValues);

      expect(notificationProvider.sendInvitationMail).toHaveBeenCalledWith(user, mappings);
      expect(user.LastInvitationDate).toBeInstanceOf(Date);
      expect(result).toEqual({ Success: true });
    });
  });
});
