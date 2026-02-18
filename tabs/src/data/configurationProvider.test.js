// Polyfill for String.prototype.replaceAll
if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (search, replacement) {
        return this.split(search).join(replacement);
    };
}

// Mock apiProvider
jest.mock('./apiProvider', () => ({
    apiGet: jest.fn(),
    getConfiguration: jest.fn()
}));

describe('configurationProvider', () => {
    let configurationProvider;
    let apiProvider;

    beforeEach(() => {
        jest.clearAllMocks();
        // Clear module cache to reset internal state
        jest.resetModules();
        // Re-require the module to get fresh state
        configurationProvider = require('./configurationProvider');
        apiProvider = require('./apiProvider');
    });

    describe('getMappingsList', () => {
        test('should return mappings list when successful', async () => {
            const mockConfig = {
                SharepointSiteId: 'test-site-id',
                MappingListId: 'test-mapping-list-id'
            };

            const mockResponse = {
                graphClientMessage: {
                    value: [
                        {
                            fields: {
                                TeamURL: 'https://teams.microsoft.com/team1',
                                O365GroupId: 'group1-id',
                                Membership: 'Member',
                                Tag: 'tag1',
                                MailingGroupId: 'mail1-id',
                                AdditionalGroupId: 'additional1-id'
                            }
                        },
                        {
                            fields: {
                                TeamURL: 'https://teams.microsoft.com/team2',
                                O365GroupId: 'group2-id',
                                Membership: 'Admin',
                                Tag: 'tag2',
                                MailingGroupId: 'mail2-id',
                                AdditionalGroupId: 'additional2-id'
                            }
                        }
                    ]
                }
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet.mockResolvedValue(mockResponse);

            const result = await configurationProvider.getMappingsList();

            expect(result).toEqual([
                {
                    TeamURL: 'https://teams.microsoft.com/team1',
                    O365GroupId: 'group1-id',
                    Membership: 'Member',
                    Tag: 'tag1',
                    MailingGroupId: 'mail1-id',
                    AdditionalGroupId: 'additional1-id'
                },
                {
                    TeamURL: 'https://teams.microsoft.com/team2',
                    O365GroupId: 'group2-id',
                    Membership: 'Admin',
                    Tag: 'tag2',
                    MailingGroupId: 'mail2-id',
                    AdditionalGroupId: 'additional2-id'
                }
            ]);

            expect(apiProvider.getConfiguration).toHaveBeenCalledTimes(1);
            expect(apiProvider.apiGet).toHaveBeenCalledWith(
                '/sites/test-site-id/lists/test-mapping-list-id/items?$expand=fields'
            );
        });

        test('should return cached mappings list on second call', async () => {
            const mockConfig = {
                SharepointSiteId: 'test-site-id',
                MappingListId: 'test-mapping-list-id'
            };

            const mockResponse = {
                graphClientMessage: {
                    value: [
                        {
                            fields: {
                                TeamURL: 'https://teams.microsoft.com/team1',
                                O365GroupId: 'group1-id',
                                Membership: 'Member',
                                Tag: 'tag1',
                                MailingGroupId: 'mail1-id',
                                AdditionalGroupId: 'additional1-id'
                            }
                        }
                    ]
                }
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet.mockResolvedValue(mockResponse);

            // First call
            const result1 = await configurationProvider.getMappingsList();
            // Second call
            const result2 = await configurationProvider.getMappingsList();

            expect(result1).toEqual(result2);
            expect(apiProvider.apiGet).toHaveBeenCalledTimes(1); // Should only be called once due to caching
        });

        test('should handle empty response', async () => {
            const mockConfig = {
                SharepointSiteId: 'test-site-id',
                MappingListId: 'test-mapping-list-id'
            };

            const mockResponse = {
                graphClientMessage: {
                    value: []
                }
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet.mockResolvedValue(mockResponse);

            const result = await configurationProvider.getMappingsList();

            expect(result).toEqual([]);
        });

        test('should handle error and log it', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            const mockConfig = {
                SharepointSiteId: 'test-site-id',
                MappingListId: 'test-mapping-list-id'
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet.mockRejectedValue(new Error('API Error'));

            const result = await configurationProvider.getMappingsList();

            expect(result).toBeUndefined();
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

            consoleSpy.mockRestore();
        });
    });

    describe('getMe', () => {
        test('should return user profile with admin status', async () => {
            const mockConfig = {
                AdminGroupId: 'admin-group-id',
                NFPGroupId: 'nfp-group-id'
            };

            const mockProfileResponse = {
                graphClientMessage: {
                    id: 'user1',
                    displayName: 'John Doe',
                    mail: 'john@example.com',
                    mobilePhone: '123456789',
                    country: 'USA'
                }
            };

            const mockGroupsResponse = {
                graphClientMessage: {
                    value: [
                        { id: 'admin-group-id', displayName: 'Admin Group' },
                        { id: 'other-group-id', displayName: 'Other Group' }
                    ]
                }
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet
                .mockResolvedValueOnce(mockProfileResponse)
                .mockResolvedValueOnce(mockGroupsResponse);

            const result = await configurationProvider.getMe();

            expect(result).toEqual({
                id: 'user1',
                displayName: 'John Doe',
                mail: 'john@example.com',
                mobilePhone: '123456789',
                country: 'USA',
                isAdmin: true,
                isNFP: false,
                isGuest: false
            });

            expect(apiProvider.getConfiguration).toHaveBeenCalledTimes(1);
            expect(apiProvider.apiGet).toHaveBeenCalledWith('me?$select=id,displayName,mail,mobilePhone,country', 'user');
            expect(apiProvider.apiGet).toHaveBeenCalledWith('me/memberOf', 'user');
        });

        test('should return user profile with NFP status', async () => {
            const mockConfig = {
                AdminGroupId: 'admin-group-id',
                NFPGroupId: 'nfp-group-id'
            };

            const mockProfileResponse = {
                graphClientMessage: {
                    id: 'user1',
                    displayName: 'Jane Doe',
                    mail: 'jane@example.com',
                    mobilePhone: '987654321',
                    country: 'Canada'
                }
            };

            const mockGroupsResponse = {
                graphClientMessage: {
                    value: [
                        { id: 'nfp-group-id', displayName: 'NFP Group' },
                        { id: 'other-group-id', displayName: 'Other Group' }
                    ]
                }
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet
                .mockResolvedValueOnce(mockProfileResponse)
                .mockResolvedValueOnce(mockGroupsResponse);

            const result = await configurationProvider.getMe();

            expect(result).toEqual({
                id: 'user1',
                displayName: 'Jane Doe',
                mail: 'jane@example.com',
                mobilePhone: '987654321',
                country: 'Canada',
                isAdmin: false,
                isNFP: true,
                isGuest: false
            });
        });

        test('should return user profile with guest status', async () => {
            const mockConfig = {
                AdminGroupId: 'admin-group-id',
                NFPGroupId: 'nfp-group-id'
            };

            const mockProfileResponse = {
                graphClientMessage: {
                    id: 'user1',
                    displayName: 'Guest User',
                    mail: 'guest@example.com',
                    mobilePhone: '555555555',
                    country: 'UK'
                }
            };

            const mockGroupsResponse = {
                graphClientMessage: {
                    value: [
                        { id: 'other-group-id', displayName: 'Other Group' }
                    ]
                }
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet
                .mockResolvedValueOnce(mockProfileResponse)
                .mockResolvedValueOnce(mockGroupsResponse);

            const result = await configurationProvider.getMe();

            expect(result).toEqual({
                id: 'user1',
                displayName: 'Guest User',
                mail: 'guest@example.com',
                mobilePhone: '555555555',
                country: 'UK',
                isAdmin: false,
                isNFP: false,
                isGuest: true
            });
        });

        test('should return cached profile on second call', async () => {
            const mockConfig = {
                AdminGroupId: 'admin-group-id',
                NFPGroupId: 'nfp-group-id'
            };

            const mockProfileResponse = {
                graphClientMessage: {
                    id: 'user1',
                    displayName: 'John Doe',
                    mail: 'john@example.com',
                    mobilePhone: '123456789',
                    country: 'USA'
                }
            };

            const mockGroupsResponse = {
                graphClientMessage: {
                    value: [
                        { id: 'admin-group-id', displayName: 'Admin Group' }
                    ]
                }
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet
                .mockResolvedValueOnce(mockProfileResponse)
                .mockResolvedValueOnce(mockGroupsResponse);

            // First call
            const result1 = await configurationProvider.getMe();
            // Second call
            const result2 = await configurationProvider.getMe();

            expect(result1).toEqual(result2);
            expect(apiProvider.apiGet).toHaveBeenCalledTimes(2); // Profile and groups called once each
        });

        test('should handle missing groups response', async () => {
            const mockConfig = {
                AdminGroupId: 'admin-group-id',
                NFPGroupId: 'nfp-group-id'
            };

            const mockProfileResponse = {
                graphClientMessage: {
                    id: 'user1',
                    displayName: 'John Doe',
                    mail: 'john@example.com',
                    mobilePhone: '123456789',
                    country: 'USA'
                }
            };

            const mockGroupsResponse = {
                graphClientMessage: null
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet
                .mockResolvedValueOnce(mockProfileResponse)
                .mockResolvedValueOnce(mockGroupsResponse);

            const result = await configurationProvider.getMe();

            expect(result).toEqual({
                id: 'user1',
                displayName: 'John Doe',
                mail: 'john@example.com',
                mobilePhone: '123456789',
                country: 'USA'
            });
        });
    });
});