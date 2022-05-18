# eionet2-self-service

[![GitHub release](https://img.shields.io/github/v/release/eea/eionet2-user-management)](https://github.com/eea/eionet2-user-management/releases)

This Eionet 2.0 MS Teams app implements functionalities for:
- Creating/Ading users to the (MS Teams) Eionet teams
- Managing the user attributes

The app will be available only to the Eionet Admins and NFP roles.

### Creating/Ading users to the Eionet teams

The flow for inviting (external) users to join Eionet 2.0 MS Teams space is:
- The (Admin or NFP) user open the "Create user" MS Teams app tab.
- The (Admin or NFP) user enters the invited user email; email address logical validation checks are being performed by the application.
- The (Admin or NFP) user enters the user attributes (contact data, roles, organizations etc.)
- The user receives (by email) and accepts the invitation to join
- The user is automatically joined to the specific Eionet teams

During the process various validations checks are being performed by the application. Depending on the role - Admin or NFP, the app will impose specific restrictions in creating users.

### Managing the users data

The flow for managing user attributes is:
- The (Admin or NFP) user open the "Manage users" MS Teams app tab.
- The (Admin or NFP) user updates the user attributes (contact data, roles, organizations etc.)

During the process various validations checks are being performed by the application. Depending on the role - Admin or NFP, the app will impose specific restrictions in managing user attributes.

## Features

- Invite (external) users to join specific Eionet 2.0 teams (in the MS Teams environment)
- Define user attributes (contact data, roles, organizations etc.)
- Update user attributes

## Getting started

The application is available as a "tab" application in the MS Teams Eionet 2.0 teams.
Users will see two tabs:
- Create user (this tab provides  functionalities for inviting users to join Eionet 2.0)
- Manage users (this tab provides functionalities for managing user attributes - contact data, roles, organizations etc.)

The applications exchanges data with the EEA Azure tenant and with an internal EEA SharePoint instance to retrieve and store the data used by the application.

## Release

See [RELEASE.md](https://github.com/eea/eionet2-user-management/blob/master/RELEASE.md).

## How to contribute

For now the contributions are not open outside the internal EEE project team.

## Copyright and license

The Initial Owner of the Original Code is [European Environment Agency (EEA)](http://eea.europa.eu).
All Rights Reserved.

See [LICENSE.md](https://github.com/eea/eionet2-user-management/blob/master/LICENSE.md) for details.
