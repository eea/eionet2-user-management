// Polyfill for String.prototype.replaceAll
if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (search, replacement) {
        return this.split(search).join(replacement);
    };
}

const userGroupProvider = require('./userGroupProvider');
const apiProvider = require('./apiProvider');
const configurationProvider = require('./configurationProvider');
const constants = require('./constants');

// Mock dependencies
jest.mock('./apiProvider', () => ({
    apiGet: jest.fn(),
    apiPost: jest.fn(),
    apiDelete: jest.fn(),
    logInfo: jest.fn()
}));

jest.mock('./configurationProvider', () => ({
    getMappingsList: jest.fn()
}));

jest.mock('./constants', () => ({
    DIRECTORY_OBJECTS_PATH: 'https://graph.microsoft.com/v1.0/directoryObjects/'
}));

describe('userGroupProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getUserGroups', () => {
        test('should return user groups excluding mapped groups', async () => {
            const userId = 'user1';

            const mockUserGroupsResponse = {
                graphClientMessage: {
                    value: [
                        {
                            id: 'group1',
                            displayName: 'Group 1'
                        },
                        {
                            id: 'group2',
                            displayName: 'Group 2'
                        },
                        {
                            id: 'group3',
                            displayName: 'Group 3'
                        }
                    ]
                }
            };

            const mockMappings = [
                {
                    O365GroupId: 'group2'
                }
            ];

            apiProvider.apiGet.mockResolvedValue(mockUserGroupsResponse);
            configurationProvider.getMappingsList.mockResolvedValue(mockMappings);

            const result = await userGroupProvider.getUserGroups(userId);

            expect(result).toBe('Group 1, Group 3');
            expect(apiProvider.apiGet).toHaveBeenCalledWith('/users/user1/memberOf');
            expect(configurationProvider.getMappingsList).toHaveBeenCalledTimes(1);
        });

        test('should return all groups when no mappings exist', async () => {
            const userId = 'user1';

            const mockUserGroupsResponse = {
                graphClientMessage: {
                    value: [
                        {
                            id: 'group1',
                            displayName: 'Group 1'
                        },
                        {
                            id: 'group2',
                            displayName: 'Group 2'
                        }
                    ]
                }
            };

            const mockMappings = [];

            apiProvider.apiGet.mockResolvedValue(mockUserGroupsResponse);
            configurationProvider.getMappingsList.mockResolvedValue(mockMappings);

            const result = await userGroupProvider.getUserGroups(userId);

            expect(result).toBe('Group 1, Group 2');
        });

        test('should return empty string when user has no groups', async () => {
            const userId = 'user1';

            const mockUserGroupsResponse = {
                graphClientMessage: {
                    value: []
                }
            };

            const mockMappings = [];

            apiProvider.apiGet.mockResolvedValue(mockUserGroupsResponse);
            configurationProvider.getMappingsList.mockResolvedValue(mockMappings);

            const result = await userGroupProvider.getUserGroups(userId);

            expect(result).toBe('');
        });

        test('should handle missing graphClientMessage', async () => {
            const userId = 'user1';

            const mockUserGroupsResponse = {};

            const mockMappings = [];

            apiProvider.apiGet.mockResolvedValue(mockUserGroupsResponse);
            configurationProvider.getMappingsList.mockResolvedValue(mockMappings);

            const result = await userGroupProvider.getUserGroups(userId);

            expect(result).toBe('');
        });

        test('should handle error and return undefined', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            const userId = 'user1';

            apiProvider.apiGet.mockRejectedValue(new Error('API Error'));
            configurationProvider.getMappingsList.mockResolvedValue([]);

            const result = await userGroupProvider.getUserGroups(userId);

            expect(result).toBeUndefined();
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

            consoleSpy.mockRestore();
        });
    });

    describe('postUserGroup', () => {
        test('should add user to group successfully', async () => {
            const groupId = 'group1';
            const userId = 'user1';
            const email = 'user@example.com';

            apiProvider.apiPost.mockResolvedValue({});

            await userGroupProvider.postUserGroup(groupId, userId, email);

            expect(apiProvider.apiPost).toHaveBeenCalledWith('/groups/group1/members/$ref', {
                '@odata.id': 'https://graph.microsoft.com/v1.0/directoryObjects/user1'
            });
        });

        test('should not add user when groupId is null', async () => {
            const groupId = null;
            const userId = 'user1';
            const email = 'user@example.com';

            await userGroupProvider.postUserGroup(groupId, userId, email);

            expect(apiProvider.apiPost).not.toHaveBeenCalled();
        });

        test('should not add user when groupId is undefined', async () => {
            const groupId = undefined;
            const userId = 'user1';
            const email = 'user@example.com';

            await userGroupProvider.postUserGroup(groupId, userId, email);

            expect(apiProvider.apiPost).not.toHaveBeenCalled();
        });

        test('should handle error and log it', async () => {
            const groupId = 'group1';
            const userId = 'user1';
            const email = 'user@example.com';
            const error = new Error('API Error');

            apiProvider.apiPost.mockRejectedValue(error);

            await expect(userGroupProvider.postUserGroup(groupId, userId, email)).rejects.toThrow('API Error');

            expect(apiProvider.logInfo).toHaveBeenCalledWith(
                'An error has occured when adding userId user1 to group group1. This might be caused by the fact that the user is already member of the group',
                '/groups/group1/members/$ref',
                {
                    userId: 'user1',
                    groupId: 'group1',
                    error: error
                },
                'postUserGroup',
                'user@example.com'
            );
        });
    });

    describe('deleteUserGroup', () => {
        test('should remove user from group successfully', async () => {
            const groupId = 'group1';
            const userId = 'user1';
            const email = 'user@example.com';

            apiProvider.apiDelete.mockResolvedValue({});

            await userGroupProvider.deleteUserGroup(groupId, userId, email);

            expect(apiProvider.apiDelete).toHaveBeenCalledWith('/groups/group1/members/user1/$ref');
        });

        test('should handle error and log it', async () => {
            const groupId = 'group1';
            const userId = 'user1';
            const email = 'user@example.com';
            const error = new Error('API Error');

            apiProvider.apiDelete.mockRejectedValue(error);

            await userGroupProvider.deleteUserGroup(groupId, userId, email);

            expect(apiProvider.logInfo).toHaveBeenCalledWith(
                'Group removal returned error. ',
                '',
                {
                    userId: 'user1',
                    groupId: 'group1',
                    error: error
                },
                'Remove group',
                'user@example.com'
            );
        });
    });

    describe('getExistingGroups', () => {
        test('should return existing groups for user', async () => {
            const userId = 'user1';
            const groupIds = ['group1', 'group2', 'group3'];

            const mockResponse = {
                graphClientMessage: {
                    value: ['group1', 'group3']
                }
            };

            apiProvider.apiPost.mockResolvedValue(mockResponse);

            const result = await userGroupProvider.getExistingGroups(userId, groupIds);

            expect(result).toEqual(['group1', 'group3']);
            expect(apiProvider.apiPost).toHaveBeenCalledWith('/directoryObjects/user1/checkMemberGroups', {
                groupIds: ['group1', 'group2', 'group3']
            });
        });

        test('should handle multiple batches when groupIds exceed 20', async () => {
            const userId = 'user1';
            const groupIds = Array.from({ length: 45 }, (_, i) => `group${i + 1}`);

            const mockResponse1 = {
                graphClientMessage: {
                    value: ['group1', 'group2']
                }
            };

            const mockResponse2 = {
                graphClientMessage: {
                    value: ['group21', 'group22']
                }
            };

            const mockResponse3 = {
                graphClientMessage: {
                    value: ['group41', 'group42']
                }
            };

            apiProvider.apiPost
                .mockResolvedValueOnce(mockResponse1)
                .mockResolvedValueOnce(mockResponse2)
                .mockResolvedValueOnce(mockResponse3);

            const result = await userGroupProvider.getExistingGroups(userId, groupIds);

            expect(result).toEqual(['group1', 'group2', 'group21', 'group22', 'group41', 'group42']);
            expect(apiProvider.apiPost).toHaveBeenCalledTimes(3);
        });

        test('should handle empty groupIds array', async () => {
            const userId = 'user1';
            const groupIds = [];

            const result = await userGroupProvider.getExistingGroups(userId, groupIds);

            expect(result).toEqual([]);
            expect(apiProvider.apiPost).not.toHaveBeenCalled();
        });

        test('should handle missing graphClientMessage in response', async () => {
            const userId = 'user1';
            const groupIds = ['group1', 'group2'];

            const mockResponse = {};

            apiProvider.apiPost.mockResolvedValue(mockResponse);

            const result = await userGroupProvider.getExistingGroups(userId, groupIds);

            expect(result).toEqual([]);
        });

        test('should handle null graphClientMessage in response', async () => {
            const userId = 'user1';
            const groupIds = ['group1', 'group2'];

            const mockResponse = {
                graphClientMessage: null
            };

            apiProvider.apiPost.mockResolvedValue(mockResponse);

            const result = await userGroupProvider.getExistingGroups(userId, groupIds);

            expect(result).toEqual([]);
        });
    });
});

