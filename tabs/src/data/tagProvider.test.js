// Polyfill for String.prototype.replaceAll
if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (search, replacement) {
        return this.split(search).join(replacement);
    };
}

const tagProvider = require('./tagProvider');
const apiProvider = require('./apiProvider');

// Mock apiProvider
jest.mock('./apiProvider', () => ({
    apiGet: jest.fn(),
    apiPost: jest.fn(),
    apiDelete: jest.fn(),
    getConfiguration: jest.fn()
}));

describe('tagProvider', () => {
    let tagProvider;
    let apiProvider;

    beforeEach(() => {
        jest.clearAllMocks();
        // Clear module cache to reset internal state
        jest.resetModules();
        // Re-require the module to get fresh state
        tagProvider = require('./tagProvider');
        apiProvider = require('./apiProvider');
    });

    describe('getCountryCodeMappingsList', () => {
        test('should return country mappings when successful', async () => {
            const mockConfig = {
                SharepointSiteId: 'test-site-id',
                CountryCodeMappingListId: 'test-country-list-id'
            };

            const mockResponse = {
                graphClientMessage: {
                    value: [
                        {
                            fields: {
                                Title: 'US',
                                CountryName: 'United States'
                            }
                        },
                        {
                            fields: {
                                Title: 'CA',
                                CountryName: 'Canada'
                            }
                        },
                        {
                            fields: {
                                Title: 'UK',
                                CountryName: 'United Kingdom'
                            }
                        }
                    ]
                }
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet.mockResolvedValue(mockResponse);

            const result = await tagProvider.getCountryCodeMappingsList();

            expect(result).toEqual({
                'US': 'United States',
                'CA': 'Canada',
                'UK': 'United Kingdom'
            });

            expect(apiProvider.getConfiguration).toHaveBeenCalledTimes(1);
            expect(apiProvider.apiGet).toHaveBeenCalledWith(
                '/sites/test-site-id/lists/test-country-list-id/items?$expand=fields'
            );
        });

        test('should return cached mappings on second call', async () => {
            const mockConfig = {
                SharepointSiteId: 'test-site-id',
                CountryCodeMappingListId: 'test-country-list-id'
            };

            const mockResponse = {
                graphClientMessage: {
                    value: [
                        {
                            fields: {
                                Title: 'US',
                                CountryName: 'United States'
                            }
                        }
                    ]
                }
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet.mockResolvedValue(mockResponse);

            // First call
            const result1 = await tagProvider.getCountryCodeMappingsList();
            // Second call
            const result2 = await tagProvider.getCountryCodeMappingsList();

            expect(result1).toEqual(result2);
            expect(apiProvider.apiGet).toHaveBeenCalledTimes(1); // Should only be called once due to caching
        });

        test('should handle empty response', async () => {
            const mockConfig = {
                SharepointSiteId: 'test-site-id',
                CountryCodeMappingListId: 'test-country-list-id'
            };

            const mockResponse = {
                graphClientMessage: {
                    value: []
                }
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet.mockResolvedValue(mockResponse);

            const result = await tagProvider.getCountryCodeMappingsList();

            expect(result).toEqual({});
        });

        test('should handle error and log it', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            const mockConfig = {
                SharepointSiteId: 'test-site-id',
                CountryCodeMappingListId: 'test-country-list-id'
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet.mockRejectedValue(new Error('API Error'));

            const result = await tagProvider.getCountryCodeMappingsList();

            expect(result).toBeUndefined();
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

            consoleSpy.mockRestore();
        });
    });

    describe('getCountryName', () => {
        test('should return country name for valid country code', async () => {
            const mockConfig = {
                SharepointSiteId: 'test-site-id',
                CountryCodeMappingListId: 'test-country-list-id'
            };

            const mockResponse = {
                graphClientMessage: {
                    value: [
                        {
                            fields: {
                                Title: 'US',
                                CountryName: 'United States'
                            }
                        }
                    ]
                }
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet.mockResolvedValue(mockResponse);

            await tagProvider.getCountryCodeMappingsList();
            const result = tagProvider.getCountryName('US');

            expect(result).toBe('United States');
        });

        test('should return undefined for invalid country code', async () => {
            const mockConfig = {
                SharepointSiteId: 'test-site-id',
                CountryCodeMappingListId: 'test-country-list-id'
            };

            const mockResponse = {
                graphClientMessage: {
                    value: [
                        {
                            fields: {
                                Title: 'US',
                                CountryName: 'United States'
                            }
                        }
                    ]
                }
            };

            apiProvider.getConfiguration.mockResolvedValue(mockConfig);
            apiProvider.apiGet.mockResolvedValue(mockResponse);

            await tagProvider.getCountryCodeMappingsList();
            const result = tagProvider.getCountryName('INVALID');

            expect(result).toBeUndefined();
        });

        test('should return undefined when countryMapping is not initialized', () => {
            const result = tagProvider.getCountryName('US');
            expect(result).toBeUndefined();
        });
    });

    describe('addTag', () => {
        test('should create new tag when tag does not exist', async () => {
            const teamId = 'team1';
            const name = 'New Tag';
            const userId = 'user1';

            const mockTagResponse = {
                graphClientMessage: {
                    value: []
                }
            };

            apiProvider.apiGet.mockResolvedValue(mockTagResponse);
            apiProvider.apiPost.mockResolvedValue({});

            await tagProvider.addTag(teamId, name, userId);

            expect(apiProvider.apiGet).toHaveBeenCalledWith(`/teams/${teamId}/tags?$filter=displayName eq '${name}'`);
            expect(apiProvider.apiPost).toHaveBeenCalledWith(`/teams/${teamId}/tags`, {
                displayName: name,
                members: [
                    {
                        userId: userId
                    }
                ]
            });
        });

        test('should add user to existing tag when tag exists but user is not a member', async () => {
            const teamId = 'team1';
            const name = 'Existing Tag';
            const userId = 'user1';

            const mockTagResponse = {
                graphClientMessage: {
                    value: [
                        {
                            id: 'tag1'
                        }
                    ]
                }
            };

            const mockTagMemberResponse = {
                graphClientMessage: {
                    value: []
                }
            };

            apiProvider.apiGet
                .mockResolvedValueOnce(mockTagResponse)
                .mockResolvedValueOnce(mockTagMemberResponse);
            apiProvider.apiPost.mockResolvedValue({});

            await tagProvider.addTag(teamId, name, userId);

            expect(apiProvider.apiGet).toHaveBeenCalledWith(`/teams/${teamId}/tags?$filter=displayName eq '${name}'`);
            expect(apiProvider.apiGet).toHaveBeenCalledWith(`/teams/${teamId}/tags/tag1/members?$filter=userId eq '${userId}'`);
            expect(apiProvider.apiPost).toHaveBeenCalledWith(`/teams/${teamId}/tags/tag1/members`, {
                userId: userId
            });
        });

        test('should not add user to existing tag when user is already a member', async () => {
            const teamId = 'team1';
            const name = 'Existing Tag';
            const userId = 'user1';

            const mockTagResponse = {
                graphClientMessage: {
                    value: [
                        {
                            id: 'tag1'
                        }
                    ]
                }
            };

            const mockTagMemberResponse = {
                graphClientMessage: {
                    value: [
                        {
                            id: 'member1'
                        }
                    ]
                }
            };

            apiProvider.apiGet
                .mockResolvedValueOnce(mockTagResponse)
                .mockResolvedValueOnce(mockTagMemberResponse);

            await tagProvider.addTag(teamId, name, userId);

            expect(apiProvider.apiGet).toHaveBeenCalledWith(`/teams/${teamId}/tags?$filter=displayName eq '${name}'`);
            expect(apiProvider.apiGet).toHaveBeenCalledWith(`/teams/${teamId}/tags/tag1/members?$filter=userId eq '${userId}'`);
            expect(apiProvider.apiPost).not.toHaveBeenCalled();
        });
    });

    describe('removeTag', () => {
        test('should remove user from tag when user is a member', async () => {
            const teamId = 'team1';
            const name = 'Existing Tag';
            const userId = 'user1';

            const mockTagResponse = {
                graphClientMessage: {
                    value: [
                        {
                            id: 'tag1'
                        }
                    ]
                }
            };

            const mockTagMemberResponse = {
                graphClientMessage: {
                    value: [
                        {
                            id: 'member1'
                        }
                    ]
                }
            };

            apiProvider.apiGet
                .mockResolvedValueOnce(mockTagResponse)
                .mockResolvedValueOnce(mockTagMemberResponse);
            apiProvider.apiDelete.mockResolvedValue({});

            await tagProvider.removeTag(teamId, name, userId);

            expect(apiProvider.apiGet).toHaveBeenCalledWith(`/teams/${teamId}/tags?$filter=displayName eq '${name}'`);
            expect(apiProvider.apiGet).toHaveBeenCalledWith(`/teams/${teamId}/tags/tag1/members?$filter=userId eq '${userId}'`);
            expect(apiProvider.apiDelete).toHaveBeenCalledWith(`/teams/${teamId}/tags/tag1/members/member1`);
        });

        test('should not remove user from tag when user is not a member', async () => {
            const teamId = 'team1';
            const name = 'Existing Tag';
            const userId = 'user1';

            const mockTagResponse = {
                graphClientMessage: {
                    value: [
                        {
                            id: 'tag1'
                        }
                    ]
                }
            };

            const mockTagMemberResponse = {
                graphClientMessage: {
                    value: []
                }
            };

            apiProvider.apiGet
                .mockResolvedValueOnce(mockTagResponse)
                .mockResolvedValueOnce(mockTagMemberResponse);

            await tagProvider.removeTag(teamId, name, userId);

            expect(apiProvider.apiGet).toHaveBeenCalledWith(`/teams/${teamId}/tags?$filter=displayName eq '${name}'`);
            expect(apiProvider.apiGet).toHaveBeenCalledWith(`/teams/${teamId}/tags/tag1/members?$filter=userId eq '${userId}'`);
            expect(apiProvider.apiDelete).not.toHaveBeenCalled();
        });

        test('should not remove user from tag when tag does not exist', async () => {
            const teamId = 'team1';
            const name = 'Non-existent Tag';
            const userId = 'user1';

            const mockTagResponse = {
                graphClientMessage: {
                    value: []
                }
            };

            apiProvider.apiGet.mockResolvedValue(mockTagResponse);

            await tagProvider.removeTag(teamId, name, userId);

            expect(apiProvider.apiGet).toHaveBeenCalledWith(`/teams/${teamId}/tags?$filter=displayName eq '${name}'`);
            expect(apiProvider.apiDelete).not.toHaveBeenCalled();
        });
    });
});
