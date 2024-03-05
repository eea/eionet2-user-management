import { apiPost, getConfiguration } from './apiProvider';
import { getMe } from './configurationProvider';
import { buildTeamsURLs } from './providerHelper';

export async function sendOrgSuggestionNotification(info) {
  const config = await getConfiguration(),
    profile = await getMe();
  if (config.HelpdeskEmail) {
    try {
      await apiPost('users/' + config.FromEmailAddress + '/sendMail', {
        message: {
          subject: config.NewOrganisationSuggestionSubject,
          body: {
            contentType: 'Text',
            content:
              config.NewOrganisationSuggestionMailBody +
              '  ' +
              info +
              '\n' +
              'Requested by user: ' +
              profile.displayName +
              ' - ' +
              profile.mail,
          },
          toRecipients: [
            {
              emailAddress: {
                address: config.HelpdeskEmail,
              },
            },
          ],
        },
        saveToSentItems: true,
      });
    } catch (err) {
      console.log(err);
      return false;
    }
  }
}

export async function sendInvitationMail(user, mappings) {
  const config = await getConfiguration(),
    teamsURLs = buildTeamsURLs(user, mappings, config);

  await apiPost('users/' + config.FromEmailAddress + '/sendMail', {
    message: {
      subject: config.AddedToTeamsMailSubject,
      body: {
        contentType: 'HTML',
        content: config.AddedToTeamsMailBody + ' ' + teamsURLs,
      },
      toRecipients: [
        {
          emailAddress: {
            address: user.Email,
          },
        },
      ],
    },
    saveToSentItems: true,
  });
}
