# eionet2-user-management

[![GitHub release](https://img.shields.io/github/v/release/eea/eionet2-user-management)](https://github.com/eea/eionet2-user-management/releases)

This Eionet 2.0 MS Teams app implements functionalities for:
- Creating/Adding users to the (MS Teams) Eionet 2.0 teams
- Remove users
- Managing the users' attributes

The app is available only to the Eionet Admin and NFP roles. For the rest of the users, they can manage their own data through the [Self-service app](https://github.com/eea/eionet2-self-service).

### Creating/Adding users to the Eionet teams

The flow for inviting (external) users to join Eionet 2.0 MS Teams space is:
- The (Admin or NFP) user opens the "Create user" MS Teams app tab.
- The (Admin or NFP) user enters the invited user email; email address logical validation checks are performed by the application.
- The (Admin or NFP) user enters the user attributes (contact data, roles, organizations etc.).
- The user receives (by email) and accepts the invitation to join.
- The user is automatically joined to the specific Eionet teams, based on its account attributes.

During the process, various validation checks are performed by the application. Depending on the current user role - Admin or NFP, the app will impose specific restrictions in creating/adding users.

### Removing users
The flow for removing an user is:
- The (Admin or NFP) user opens the "Manage users" MS Teams app tab.
- The (Admin or NFP) removes the user ("Remove")

### Managing the user attributes

The flow for managing user attributes is:
- The (Admin or NFP) user opens the "Manage users" MS Teams app tab.
- The (Admin or NFP) user updates the user attributes (contact data, roles, organizations etc.)

During the process, various validation checks are performed by the application. Depending on the role - Admin or NFP, the app will impose specific restrictions in managing the user attributes.

## Features

- Invite (external) users to join specific Eionet 2.0 teams (in the MS Teams EEA space)
- Define user attributes (contact data, roles, organizations etc.)
- Update user attributes
- Remove users

## Getting started

The application is available as a "tab" application in the MS Teams Eionet 2.0 teams.
Users will see two tabs:
- *Create user* (this tab provides  functionalities for inviting users to join Eionet 2.0)
- *Manage users* (this tab provides functionalities for managing user attributes - contact data, roles, organizations etc.)

The application exchanges data with the EEA Azure tenant and with an internal EEA SharePoint instance to retrieve and store the data used by the application.

## Release

See [RELEASE.md](https://github.com/eea/eionet2-user-management/blob/master/RELEASE.md).

## How to contribute

For now the contributions are not open outside the internal EEA project team.

## Copyright and license

The Initial Owner of the Original Code is [European Environment Agency (EEA)](http://eea.europa.eu).
All Rights Reserved.

See [LICENSE.md](https://github.com/eea/eionet2-user-management/blob/master/LICENSE.md) for details.