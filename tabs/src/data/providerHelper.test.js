// Polyfill for String.prototype.replaceAll
if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (search, replacement) {
        return this.split(search).join(replacement);
    };
}

const providerHelper = require('./providerHelper');

describe('providerHelper', () => {
    describe('capitalizeName', () => {
        test('should capitalize first and last name', () => {
            const user = {
                FirstName: 'john',
                LastName: 'doe'
            };

            providerHelper.capitalizeName(user);

            expect(user.FirstName).toBe('John');
            expect(user.LastName).toBe('Doe');
        });

        test('should handle already capitalized names', () => {
            const user = {
                FirstName: 'John',
                LastName: 'Doe'
            };

            providerHelper.capitalizeName(user);

            expect(user.FirstName).toBe('John');
            expect(user.LastName).toBe('Doe');
        });

        test('should handle single character names', () => {
            const user = {
                FirstName: 'j',
                LastName: 'd'
            };

            providerHelper.capitalizeName(user);

            expect(user.FirstName).toBe('J');
            expect(user.LastName).toBe('D');
        });

        test('should handle empty strings', () => {
            const user = {
                FirstName: '',
                LastName: ''
            };

            providerHelper.capitalizeName(user);

            expect(user.FirstName).toBe('');
            expect(user.LastName).toBe('');
        });

        test('should handle names with special characters', () => {
            const user = {
                FirstName: 'jéan',
                LastName: 'd\'angelo'
            };

            providerHelper.capitalizeName(user);

            expect(user.FirstName).toBe('Jéan');
            expect(user.LastName).toBe('D\'angelo');
        });
    });

    describe('getDistinctGroupsIds', () => {
        test('should return distinct group IDs from mappings', () => {
            const mappings = [
                {
                    O365GroupId: 'group1',
                    AdditionalGroupId: 'additional1',
                    MailingGroupId: 'mailing1'
                },
                {
                    O365GroupId: 'group2',
                    AdditionalGroupId: 'additional2',
                    MailingGroupId: 'mailing2'
                },
                {
                    O365GroupId: 'group1', // duplicate
                    AdditionalGroupId: 'additional3',
                    MailingGroupId: 'mailing3'
                }
            ];

            const result = providerHelper.getDistinctGroupsIds(mappings);

            expect(result).toEqual([
                'group1',
                'group2',
                'additional1',
                'additional2',
                'additional3',
                'mailing1',
                'mailing2',
                'mailing3'
            ]);
        });

        test('should filter out null and undefined values', () => {
            const mappings = [
                {
                    O365GroupId: 'group1',
                    AdditionalGroupId: null,
                    MailingGroupId: 'mailing1'
                },
                {
                    O365GroupId: 'group2',
                    AdditionalGroupId: 'additional2',
                    MailingGroupId: undefined
                },
                {
                    O365GroupId: null,
                    AdditionalGroupId: 'additional3',
                    MailingGroupId: 'mailing3'
                }
            ];

            const result = providerHelper.getDistinctGroupsIds(mappings);

            expect(result).toEqual(expect.arrayContaining([
                'group1',
                'group2',
                'mailing1',
                'additional2',
                'additional3',
                'mailing3'
            ]));
            expect(result).toHaveLength(6);
        });

        test('should handle empty mappings array', () => {
            const mappings = [];

            const result = providerHelper.getDistinctGroupsIds(mappings);

            expect(result).toEqual([]);
        });

        test('should handle mappings with all null values', () => {
            const mappings = [
                {
                    O365GroupId: null,
                    AdditionalGroupId: null,
                    MailingGroupId: null
                },
                {
                    O365GroupId: undefined,
                    AdditionalGroupId: undefined,
                    MailingGroupId: undefined
                }
            ];

            const result = providerHelper.getDistinctGroupsIds(mappings);

            expect(result).toEqual([]);
        });
    });

    describe('buildUserDisplaName', () => {
        test('should build display name for regular user', () => {
            const userData = {
                FirstName: 'John',
                LastName: 'Doe',
                Country: 'USA',
                NFP: false
            };

            const result = providerHelper.buildUserDisplaName(userData);

            expect(result).toBe('John Doe (USA)');
        });

        test('should build display name for NFP user', () => {
            const userData = {
                FirstName: 'Jane',
                LastName: 'Smith',
                Country: 'Canada',
                NFP: true
            };

            const result = providerHelper.buildUserDisplaName(userData);

            expect(result).toBe('Jane Smith (NFP-Canada)');
        });

        test('should handle user with NFP property as string', () => {
            const userData = {
                FirstName: 'Bob',
                LastName: 'Johnson',
                Country: 'UK',
                NFP: 'true'
            };

            const result = providerHelper.buildUserDisplaName(userData);

            expect(result).toBe('Bob Johnson (NFP-UK)');
        });

        test('should handle user with NFP property as number', () => {
            const userData = {
                FirstName: 'Alice',
                LastName: 'Brown',
                Country: 'Germany',
                NFP: 1
            };

            const result = providerHelper.buildUserDisplaName(userData);

            expect(result).toBe('Alice Brown (NFP-Germany)');
        });

        test('should handle user with falsy NFP values', () => {
            const userData = {
                FirstName: 'Charlie',
                LastName: 'Wilson',
                Country: 'France',
                NFP: false
            };

            const result = providerHelper.buildUserDisplaName(userData);

            expect(result).toBe('Charlie Wilson (France)');
        });
    });

    describe('buildTeamsURLs', () => {
        test('should build teams URLs for user with matching memberships', () => {
            const user = {
                Membership: ['Member', 'Admin'],
                OtherMemberships: ['Guest']
            };

            const mappings = [
                {
                    Membership: 'Member',
                    TeamURL: 'https://teams.microsoft.com/member-team',
                    O365GroupId: 'member-group-id'
                },
                {
                    Membership: 'Admin',
                    TeamURL: 'https://teams.microsoft.com/admin-team',
                    O365GroupId: 'admin-group-id'
                },
                {
                    Membership: 'Guest',
                    TeamURL: 'https://teams.microsoft.com/guest-team',
                    O365GroupId: 'guest-group-id'
                },
                {
                    Membership: 'Other',
                    TeamURL: 'https://teams.microsoft.com/other-team',
                    O365GroupId: 'other-group-id'
                }
            ];

            const config = {
                MainEionetGroupId: 'main-group-id'
            };

            const result = providerHelper.buildTeamsURLs(user, mappings, config);

            expect(result).toContain('<a href="https://teams.microsoft.com/member-team">Member</a>');
            expect(result).toContain('<a href="https://teams.microsoft.com/admin-team">Admin</a>');
            expect(result).toContain('<a href="https://teams.microsoft.com/guest-team">Guest</a>');
            expect(result).not.toContain('https://teams.microsoft.com/other-team');
        });

        test('should add main Eionet group for NFP users', () => {
            const user = {
                Membership: ['Member'],
                NFP: true
            };

            const mappings = [
                {
                    Membership: 'Member',
                    TeamURL: 'https://teams.microsoft.com/member-team',
                    O365GroupId: 'member-group-id'
                },
                {
                    Membership: 'Eionet',
                    TeamURL: 'https://teams.microsoft.com/eionet-team',
                    O365GroupId: 'main-group-id'
                }
            ];

            const config = {
                MainEionetGroupId: 'main-group-id'
            };

            const result = providerHelper.buildTeamsURLs(user, mappings, config);

            expect(result).toContain('<a href="https://teams.microsoft.com/member-team">Member</a>');
            expect(result).toContain('<a href="https://teams.microsoft.com/eionet-team">Eionet</a>');
        });

        test('should handle user with no matching memberships', () => {
            const user = {
                Membership: ['Other'],
                OtherMemberships: []
            };

            const mappings = [
                {
                    Membership: 'Member',
                    TeamURL: 'https://teams.microsoft.com/member-team',
                    O365GroupId: 'member-group-id'
                }
            ];

            const config = {
                MainEionetGroupId: 'main-group-id'
            };

            const result = providerHelper.buildTeamsURLs(user, mappings, config);

            expect(result).toBe('<br/>');
        });

        test('should handle empty mappings array', () => {
            const user = {
                Membership: ['Member']
            };

            const mappings = [];

            const config = {
                MainEionetGroupId: 'main-group-id'
            };

            const result = providerHelper.buildTeamsURLs(user, mappings, config);

            expect(result).toBe('<br/>');
        });

        test('should handle user with undefined memberships', () => {
            const user = {
                Membership: undefined,
                OtherMemberships: undefined
            };

            const mappings = [
                {
                    Membership: 'Member',
                    TeamURL: 'https://teams.microsoft.com/member-team',
                    O365GroupId: 'member-group-id'
                }
            ];

            const config = {
                MainEionetGroupId: 'main-group-id'
            };

            const result = providerHelper.buildTeamsURLs(user, mappings, config);

            expect(result).toBe('<br/>');
        });

        test('should handle NFP user without main group mapping', () => {
            const user = {
                Membership: ['Member'],
                NFP: true
            };

            const mappings = [
                {
                    Membership: 'Member',
                    TeamURL: 'https://teams.microsoft.com/member-team',
                    O365GroupId: 'member-group-id'
                }
            ];

            const config = {
                MainEionetGroupId: 'main-group-id'
            };

            // This test expects the function to throw an error when mainMapping is undefined
            expect(() => {
                providerHelper.buildTeamsURLs(user, mappings, config);
            }).toThrow();
        });
    });
});
