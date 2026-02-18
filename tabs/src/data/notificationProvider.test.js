// Polyfill for String.prototype.replaceAll
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (search, replacement) {
    return this.split(search).join(replacement);
  };
}

const notificationProvider = require('./notificationProvider');
const apiProvider = require('./apiProvider');
const configurationProvider = require('./configurationProvider');
const providerHelper = require('./providerHelper');

// Mock dependencies
jest.mock('./apiProvider', () => ({
  apiPost: jest.fn(),
  getConfiguration: jest.fn(),
}));

jest.mock('./configurationProvider', () => ({
  getMe: jest.fn(),
}));

jest.mock('./providerHelper', () => ({
  buildTeamsURLs: jest.fn(),
}));

describe('notificationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOrgSuggestionNotification', () => {
    test('should send notification when HelpdeskEmail is configured', async () => {
      const mockConfig = {
        HelpdeskEmail: 'helpdesk@example.com',
        FromEmailAddress: 'from@example.com',
        NewOrganisationSuggestionSubject: 'New Organisation Suggestion',
        NewOrganisationSuggestionMailBody: 'A new organisation has been suggested:',
      };

      const mockProfile = {
        displayName: 'John Doe',
        mail: 'john@example.com',
      };

      const info = 'Test Organisation Info';

      apiProvider.getConfiguration.mockResolvedValue(mockConfig);
      configurationProvider.getMe.mockResolvedValue(mockProfile);
      apiProvider.apiPost.mockResolvedValue({});

      await notificationProvider.sendOrgSuggestionNotification(info);

      expect(apiProvider.getConfiguration).toHaveBeenCalledTimes(1);
      expect(configurationProvider.getMe).toHaveBeenCalledTimes(1);
      expect(apiProvider.apiPost).toHaveBeenCalledWith('users/from@example.com/sendMail', {
        message: {
          subject: 'New Organisation Suggestion',
          body: {
            contentType: 'Text',
            content:
              'A new organisation has been suggested:  Test Organisation Info\nRequested by user: John Doe - john@example.com',
          },
          toRecipients: [
            {
              emailAddress: {
                address: 'helpdesk@example.com',
              },
            },
          ],
        },
        saveToSentItems: true,
      });
    });

    test('should not send notification when HelpdeskEmail is not configured', async () => {
      const mockConfig = {
        FromEmailAddress: 'from@example.com',
        NewOrganisationSuggestionSubject: 'New Organisation Suggestion',
        NewOrganisationSuggestionMailBody: 'A new organisation has been suggested:',
      };

      const mockProfile = {
        displayName: 'John Doe',
        mail: 'john@example.com',
      };

      const info = 'Test Organisation Info';

      apiProvider.getConfiguration.mockResolvedValue(mockConfig);
      configurationProvider.getMe.mockResolvedValue(mockProfile);

      await notificationProvider.sendOrgSuggestionNotification(info);

      expect(apiProvider.getConfiguration).toHaveBeenCalledTimes(1);
      expect(configurationProvider.getMe).toHaveBeenCalledTimes(1);
      expect(apiProvider.apiPost).not.toHaveBeenCalled();
    });

    test('should handle API error and return false', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const mockConfig = {
        HelpdeskEmail: 'helpdesk@example.com',
        FromEmailAddress: 'from@example.com',
        NewOrganisationSuggestionSubject: 'New Organisation Suggestion',
        NewOrganisationSuggestionMailBody: 'A new organisation has been suggested:',
      };

      const mockProfile = {
        displayName: 'John Doe',
        mail: 'john@example.com',
      };

      const info = 'Test Organisation Info';

      apiProvider.getConfiguration.mockResolvedValue(mockConfig);
      configurationProvider.getMe.mockResolvedValue(mockProfile);
      apiProvider.apiPost.mockRejectedValue(new Error('API Error'));

      const result = await notificationProvider.sendOrgSuggestionNotification(info);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

      consoleSpy.mockRestore();
    });

    test('should handle empty info parameter', async () => {
      const mockConfig = {
        HelpdeskEmail: 'helpdesk@example.com',
        FromEmailAddress: 'from@example.com',
        NewOrganisationSuggestionSubject: 'New Organisation Suggestion',
        NewOrganisationSuggestionMailBody: 'A new organisation has been suggested:',
      };

      const mockProfile = {
        displayName: 'John Doe',
        mail: 'john@example.com',
      };

      apiProvider.getConfiguration.mockResolvedValue(mockConfig);
      configurationProvider.getMe.mockResolvedValue(mockProfile);
      apiProvider.apiPost.mockResolvedValue({});

      await notificationProvider.sendOrgSuggestionNotification('');

      expect(apiProvider.apiPost).toHaveBeenCalledWith(
        'users/from@example.com/sendMail',
        expect.objectContaining({
          message: expect.objectContaining({
            body: expect.objectContaining({
              content: expect.stringContaining('Requested by user: John Doe - john@example.com'),
            }),
          }),
        }),
      );
    });
  });

  describe('sendInvitationMail', () => {
    test('should send invitation mail successfully', async () => {
      const mockConfig = {
        FromEmailAddress: 'from@example.com',
        AddedToTeamsMailSubject: 'Welcome to Teams',
        AddedToTeamsMailBody: 'You have been added to the following teams:',
      };

      const user = {
        Email: 'user@example.com',
      };

      const mappings = [
        { TeamURL: 'https://teams.microsoft.com/team1' },
        { TeamURL: 'https://teams.microsoft.com/team2' },
      ];

      const teamsURLs = 'https://teams.microsoft.com/team1, https://teams.microsoft.com/team2';

      apiProvider.getConfiguration.mockResolvedValue(mockConfig);
      providerHelper.buildTeamsURLs.mockReturnValue(teamsURLs);
      apiProvider.apiPost.mockResolvedValue({});

      await notificationProvider.sendInvitationMail(user, mappings);

      expect(apiProvider.getConfiguration).toHaveBeenCalledTimes(1);
      expect(providerHelper.buildTeamsURLs).toHaveBeenCalledWith(user, mappings, mockConfig);
      expect(apiProvider.apiPost).toHaveBeenCalledWith('users/from@example.com/sendMail', {
        message: {
          subject: 'Welcome to Teams',
          body: {
            contentType: 'HTML',
            content:
              'You have been added to the following teams: https://teams.microsoft.com/team1, https://teams.microsoft.com/team2',
          },
          toRecipients: [
            {
              emailAddress: {
                address: 'user@example.com',
              },
            },
          ],
        },
        saveToSentItems: true,
      });
    });

    test('should handle empty mappings', async () => {
      const mockConfig = {
        FromEmailAddress: 'from@example.com',
        AddedToTeamsMailSubject: 'Welcome to Teams',
        AddedToTeamsMailBody: 'You have been added to the following teams:',
      };

      const user = {
        Email: 'user@example.com',
      };

      const mappings = [];

      const teamsURLs = '';

      apiProvider.getConfiguration.mockResolvedValue(mockConfig);
      providerHelper.buildTeamsURLs.mockReturnValue(teamsURLs);
      apiProvider.apiPost.mockResolvedValue({});

      await notificationProvider.sendInvitationMail(user, mappings);

      expect(apiProvider.apiPost).toHaveBeenCalledWith('users/from@example.com/sendMail', {
        message: {
          subject: 'Welcome to Teams',
          body: {
            contentType: 'HTML',
            content: 'You have been added to the following teams: ',
          },
          toRecipients: [
            {
              emailAddress: {
                address: 'user@example.com',
              },
            },
          ],
        },
        saveToSentItems: true,
      });
    });

    test('should handle API error in sendInvitationMail', async () => {
      const mockConfig = {
        FromEmailAddress: 'from@example.com',
        AddedToTeamsMailSubject: 'Welcome to Teams',
        AddedToTeamsMailBody: 'You have been added to the following teams:',
      };

      const user = {
        Email: 'user@example.com',
      };

      const mappings = [];

      apiProvider.getConfiguration.mockResolvedValue(mockConfig);
      providerHelper.buildTeamsURLs.mockReturnValue('');
      apiProvider.apiPost.mockRejectedValue(new Error('API Error'));

      await expect(notificationProvider.sendInvitationMail(user, mappings)).rejects.toThrow(
        'API Error',
      );
    });

    test('should handle user with different email format', async () => {
      const mockConfig = {
        FromEmailAddress: 'from@example.com',
        AddedToTeamsMailSubject: 'Welcome to Teams',
        AddedToTeamsMailBody: 'You have been added to the following teams:',
      };

      const user = {
        Email: 'user.name+tag@example-domain.com',
      };

      const mappings = [];

      apiProvider.getConfiguration.mockResolvedValue(mockConfig);
      providerHelper.buildTeamsURLs.mockReturnValue('');
      apiProvider.apiPost.mockResolvedValue({});

      await notificationProvider.sendInvitationMail(user, mappings);

      expect(apiProvider.apiPost).toHaveBeenCalledWith(
        'users/from@example.com/sendMail',
        expect.objectContaining({
          message: expect.objectContaining({
            toRecipients: [
              {
                emailAddress: {
                  address: 'user.name+tag@example-domain.com',
                },
              },
            ],
          }),
        }),
      );
    });
  });
});
