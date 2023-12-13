import { apiGet, apiPost, apiPatch, apiDelete, getConfiguration, logInfo } from './apiProvider';
import { getMappingsList, getSPUserByMail } from './sharepointProvider';
import {
  getDistinctGroupsIds,
  buildTeamsURLs,
  capitalizeName,
  buildUserDisplaName,
} from './providerHelper';
import { addTag, removeTag, getCountryName } from './tagProvider';
import messages from './messages.json';
import * as constants from './constants';

function wrapError(err, message) {
  return {
    Message: message,
    Error: err,
    Success: false,
  };
}

async function postUserGroup(groupId, userId) {
  if (groupId) {
    const apiPath = `/groups/${groupId}/members/$ref`;
    try {
      await apiPost(apiPath, {
        '@odata.id': constants.DIRECTORY_OBJECTS_PATH + userId,
      });
    } catch (err) {
      logInfo(
        `An error has occured when adding userId ${userId} to group ${groupId}. This might be caused by the fact that the user is already member of the group`,
        apiPath,
        {
          userId: userId,
          groupId: groupId,
          error: err,
        },
        'postUserGroup',
      );
      throw err;
    }
  }
}

async function deleteUserGroup(groupId, userId) {
  try {
    await apiDelete('/groups/' + groupId + '/members/' + userId + '/$ref');
  } catch (err) {
    logInfo(
      'Group removal returned error. ',
      '',
      {
        userId: userId,
        groupId: groupId,
        error: err,
      },
      'Remove group',
    );
  }
}

let _profile = undefined;
export async function getMe() {
  if (!_profile) {
    const config = await getConfiguration(),
      response = await apiGet('me?$select=id,displayName,mail,mobilePhone,country', 'user'),
      groups = await apiGet('me/memberOf', 'user');

    const profile = response.graphClientMessage;
    if (groups.graphClientMessage) {
      let groupsList = groups.graphClientMessage.value;

      profile.isAdmin = groupsList.some((group) => {
        return group.id === config.AdminGroupId;
      });
      profile.isNFP =
        !profile.isAdmin &&
        groupsList.some((group) => {
          return group.id === config.NFPGroupId;
        });
      profile.isGuest = !profile.isAdmin && !profile.isNFP;
    }
    _profile = profile;
  }
  return _profile;
}

export async function getUserByMail(email) {
  try {
    const adResponse = await apiGet(
        "/users/?$filter=mail eq '" + email?.replaceAll("'", "''") + "'",
      ),
      spUser = await getSPUserByMail(email),
      adMessage = adResponse.graphClientMessage;

    const adUser = adMessage.value && adMessage.value.length ? adMessage.value[0] : undefined;

    return {
      ADUser: adUser,
      SharepointUser: spUser,
      Continue: (!adUser && !spUser) || (adUser && !spUser),
    };
  } catch (err) {
    console.log(err);
    return undefined;
  }
}

export async function getUser(userId) {
  try {
    const response = await apiGet('/users/' + userId);
    return response.graphClientMessage;
  } catch (err) {
    console.log(err);
    return undefined;
  }
}

export async function getUserGroups(userId) {
  try {
    const response = await apiGet('/users/' + userId + '/memberOf'),
      mappings = await getMappingsList();
    let value = response.graphClientMessage ? response.graphClientMessage.value : [];
    return value
      .filter((v) => {
        return !mappings.some((m) => {
          return m.O365GroupId === v.id;
        });
      })
      .map(function (e) {
        return e.displayName;
      })
      .join(', ');
  } catch (err) {
    console.log(err);
    return undefined;
  }
}

async function saveADUser(userId, userData) {
  await apiPatch('/users/' + userId, {
    givenName: userData.FirstName,
    surname: userData.LastName,
    displayName: buildUserDisplaName(userData),
    department: 'Eionet',
    country: userData.Country,
  });
}

async function sendOrgSuggestionNotification(info) {
  const config = await getConfiguration();
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
              _profile.displayName +
              ' - ' +
              _profile.mail,
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

async function saveSPUser(userId, userData, newYN, oldValues) {
  const spConfig = await getConfiguration();
  let isMfaRegistered = false;
  if (newYN) {
    userData.LastInvitationDate = new Date();
    const mfaResponse = await checkMFAStatus(buildUserDisplaName(userData));
    isMfaRegistered =
      mfaResponse &&
      mfaResponse.value &&
      mfaResponse.value.length > 0 &&
      mfaResponse.value[0].isMfaRegistered;
  }
  userData.Title = userData.FirstName + ' ' + userData.LastName;
  let fields = {
    fields: {
      Phone: userData.Phone,
      Email: userData.Email,
      Country: userData.Country,
      ...(userData.Membership && {
        'Membership@odata.type': 'Collection(Edm.String)',
        Membership: userData.Membership,
      }),
      ...(userData.OtherMemberships && {
        'OtherMemberships@odata.type': 'Collection(Edm.String)',
        OtherMemberships: userData.OtherMemberships,
      }),
      ...(userData.LastInvitationDate && { LastInvitationDate: userData.LastInvitationDate }),
      Title: userData.Title,
      Gender: userData.Gender,
      Organisation: userData.Organisation,
      OrganisationLookupId: userData.OrganisationLookupId,
      ADUserId: userId,
      NFP: userData.NFP,
      SuggestedOrganisation: userData.SuggestedOrganisation,
      EEANominated: userData.EEANominated,
      ...(isMfaRegistered && { SignedIn: true }),
      ...(isMfaRegistered && { SignedInDate: new Date() }),
    },
  };

  let graphURL = '/sites/' + spConfig.SharepointSiteId + '/lists/' + spConfig.UserListId + '/items';
  if (newYN) {
    await apiPost(graphURL, fields);
  } else {
    graphURL += '/' + userData.id;
    await apiPatch(graphURL, fields);
  }

  let organisationChanged =
    oldValues &&
    userData.SuggestedOrganisation &&
    userData.SuggestedOrganisation != oldValues.SuggestedOrganisation;
  if (userData.SuggestedOrganisation && (newYN || organisationChanged)) {
    sendOrgSuggestionNotification(userData.SuggestedOrganisation);
  }
}

async function checkMFAStatus(userDisplayName) {
  try {
    const response = await apiGet(
      "/reports/credentialUserRegistrationDetails?$filter=userDisplayName eq '" +
        userDisplayName.replace("'", "''") +
        "'",
    );
    return response.graphClientMessage;
  } catch (err) {
    console.log(err);
    return undefined;
  }
}

async function sendInvitationMail(user) {
  const config = await getConfiguration(),
    mappings = await getMappingsList(),
    teamsURLs = await buildTeamsURLs(user, mappings, config);

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

async function getExistingGroups(userId, groupIds) {
  let result = [];

  let localGroupsIds = [...groupIds];

  //directoryObjects endpoint allows max 20 groups ids per request.
  //see: https://learn.microsoft.com/en-us/graph/api/directoryobject-checkmembergroups?view=graph-rest-1.0&tabs=http#request-body
  while (localGroupsIds.length > 0) {
    const response = await apiPost('/directoryObjects/' + userId + '/checkMemberGroups', {
      groupIds: localGroupsIds.splice(0, 20),
    });

    response?.graphClientMessage?.value &&
      (result = result.concat(response?.graphClientMessage?.value));
  }
  return result;
}

export async function inviteUser(user, mappings) {
  capitalizeName(user);
  try {
    let firstMapping = mappings.find(
        (m) =>
          (user.Membership && user.Membership.includes(m.Membership)) ||
          (user.OtherMemberships && user.OtherMemberships.includes(m.Membership)),
      ),
      config = await getConfiguration();
    let userId = undefined,
      invitationResponse = undefined,
      sendMail = false;

    if (user.NFP && !firstMapping) {
      firstMapping = mappings.find((m) => m.O365GroupId === config.MainEionetGroupId);
    }

    if (!user.ADProfile) {
      try {
        invitationResponse = await apiPost('/invitations/', {
          invitedUserEmailAddress: user.Email,
          invitedUserDisplayName: user.FirstName + ' ' + user.LastName,
          inviteRedirectUrl: firstMapping.TeamURL,
          sendInvitationMessage: true,
          invitedUserMessageInfo: {
            customizedMessageBody: config.InviteEmailText,
          },
        });
      } catch (err) {
        return wrapError(err, messages.UserInvite.Errors.Invitation);
      }

      try {
        if (invitationResponse && invitationResponse.graphClientMessage.invitedUser) {
          userId = invitationResponse.graphClientMessage.invitedUser.id;
          await saveADUser(userId, user);
        }
      } catch (err) {
        return wrapError(err, messages.UserInvite.Errors.ADUserCreation);
      }
    } else {
      userId = user.ADProfile.id;
      try {
        await saveADUser(userId, user);
      } catch (err) {
        return wrapError(err, messages.UserEdit.Errors.ADUser);
      }
      sendMail = true;
    }

    if (userId) {
      try {
        //If NFP save to NFPs groups and Main EIONET group
        if (user.NFP) {
          try {
            const groupIds = [
              ...new Set([config.NFPGroupId, config.MainEionetGroupId].filter((g) => !!g)),
            ];

            const existingGroups = await getExistingGroups(userId, groupIds);

            for (const groupId of groupIds.filter((id) => !existingGroups?.includes(id))) {
              await postUserGroup(groupId, userId);
            }
          } catch (err) {
            return wrapError(err, messages.UserInvite.Errors.JoiningTeam);
          }

          try {
            await addTag(config.MainEionetGroupId, constants.NFP_TAG, userId);
            await addTag(config.MainEionetGroupId, getCountryName(user.Country), userId);
          } catch (err) {
            return wrapError(err, messages.UserInvite.Errors.TagsCreation);
          }
        }

        const userMappings = mappings.filter(
          (m) =>
            (user.Membership && user.Membership.includes(m.Membership)) ||
            (user.OtherMemberships && user.OtherMemberships.includes(m.Membership)),
        );

        //apply user membership and country tag
        const userGroupIds = getDistinctGroupsIds(userMappings);
        const existingGroups = await getExistingGroups(userId, userGroupIds);
        try {
          for (const groupId of userGroupIds.filter((id) => !existingGroups?.includes(id))) {
            await postUserGroup(groupId, userId);

            const groupMapping = userMappings.filter((m) => m.O365GroupId === groupId);
            groupMapping[0]?.Tag && addTag(groupId, getCountryName(user.Country), userId);
          }
        } catch (err) {
          return wrapError(err, messages.UserInvite.Errors.JoiningTeam);
        }

        //apply membership tags
        try {
          const tags = [...new Set(userMappings.filter((m) => m.Tag))];
          for (const m of tags) {
            addTag(m.O365GroupId, m.Tag, userId);
          }
        } catch (err) {
          return wrapError(err, messages.UserInvite.Errors.TagsCreation);
        }

        if (sendMail) {
          try {
            await sendInvitationMail(user);
            user.LastInvitationDate = new Date();
          } catch (err) {
            return wrapError(err, messages.UserInvite.Errors.Mail);
          }
        }
      } catch (err) {
        console.log(err);
        return false;
      }
      try {
        await saveSPUser(userId, user, true);
      } catch (err) {
        return wrapError(err, messages.UserInvite.Errors.SharepointUser);
      }
    }
    logInfo('User invited: ' + user.Email, '', user, 'Add user');
    return { Success: true };
  } catch (err) {
    return wrapError(err, messages.UserInvite.Errors.Error);
  }
}

export async function editUser(user, mappings, oldValues) {
  capitalizeName(user);
  try {
    let newMappings = mappings.filter(
        (m) =>
          (user.Membership && user.Membership.includes(m.Membership)) ||
          (user.OtherMemberships && user.OtherMemberships.includes(m.Membership)),
      ),
      oldMappings = mappings.filter(
        (m) =>
          (oldValues.Membership && oldValues.Membership.includes(m.Membership)) ||
          (oldValues.OtherMemberships && oldValues.OtherMemberships.includes(m.Membership)),
      ),
      newGroups = getDistinctGroupsIds(newMappings),
      oldGroups = getDistinctGroupsIds(oldMappings),
      newTags = [...new Set(newMappings.filter((m) => m.Tag))],
      oldTags = [...new Set(oldMappings.filter((m) => m.Tag))],
      config = await getConfiguration();

    const existingGroups = await getExistingGroups(user.ADUserId, newGroups);

    for (const groupId of newGroups.filter((id) => !existingGroups?.includes(id))) {
      await postUserGroup(groupId, user.ADUserId);

      const groupMapping = mappings.filter((m) => m.O365GroupId === groupId);
      groupMapping[0]?.Tag && addTag(groupId, getCountryName(user.Country), user.ADUserId);
    }

    for (const m of newTags) {
      if (!oldTags.includes(m)) {
        addTag(m.O365GroupId, m.Tag, user.ADUserId);
      }
    }

    for (const m of oldTags) {
      if (!newTags.includes(m)) {
        removeTag(m.O365GroupId, m.Tag, user.ADUserId);
      }
    }

    for (const groupId of oldGroups) {
      if (!newGroups.includes(groupId) && !(user.NFP && groupId === config.MainEionetGroupId)) {
        await deleteUserGroup(groupId, user.ADUserId);
      }
    }

    if (oldValues.Country !== user.Country) {
      for (const m of newMappings) {
        if (m.Tag) {
          addTag(m.O365GroupId, getCountryName(user.Country), user.ADUserId);
        }
        removeTag(m.O365GroupId, getCountryName(oldValues.Country), user.ADUserId);
      }
    }

    if (user.NFP && !oldValues.NFP) {
      await postUserGroup(config.NFPGroupId, user.ADUserId);

      if (!newGroups.includes(config.MainEionetGroupId)) {
        await postUserGroup(config.MainEionetGroupId, user.ADUserId);
      }

      try {
        await addTag(config.MainEionetGroupId, constants.NFP_TAG, user.ADUserId);
      } catch (err) {
        return wrapError(err, messages.UserInvite.Errors.TagsCreation);
      }
    } else if (!user.NFP && oldValues.NFP) {
      await deleteUserGroup(config.NFPGroupId, user.ADUserId);
      if (!newGroups.includes(config.MainEionetGroupId)) {
        await deleteUserGroup(config.MainEionetGroupId, user.ADUserId);
      }
    }

    try {
      await saveADUser(user.ADUserId, user);
    } catch (err) {
      return wrapError(err, messages.UserEdit.Errors.ADUser);
    }

    try {
      await saveSPUser(user.ADUserId, user, false, oldValues);
    } catch (err) {
      return wrapError(err, messages.UserEdit.Errors.SharepointUser);
    }

    return { Success: true };
  } catch (err) {
    return wrapError(err, messages.UserEdit.Errors.Error);
  }
}

export async function removeUserMemberships(user) {
  const oldValues = JSON.parse(JSON.stringify(user)),
    mappings = await getMappingsList();
  try {
    user.Membership = [];
    const editResult = await editUser(user, mappings, oldValues);
    if (editResult.Success) {
      return { Success: true };
    } else {
      return editResult;
    }
  } catch (err) {
    return wrapError(err, messages.UserInvite.Errors.Mail);
  }
}

export async function removeUser(user) {
  if (user) {
    const mappings = await getMappingsList(),
      config = await getConfiguration();

    if (user.ADUserId) {
      try {
        let filteredMappings = mappings.filter(
            (m) =>
              (user.Membership && user.Membership.includes(m.Membership)) ||
              (user.OtherMemberships && user.OtherMemberships.includes(m.Membership)),
          ),
          groups = getDistinctGroupsIds(filteredMappings);

        for (const groupId of groups) {
          await deleteUserGroup(groupId, user.ADUserId);
        }

        if (user.NFP) {
          await deleteUserGroup(config.NFPGroupId, user.ADUserId);
        }
      } catch (err) {
        return wrapError(err, messages.UserDelete.Errors.Groups);
      }

      const apiPath = '/users/' + user.ADUserId;
      try {
        await apiPatch(apiPath, {
          displayName: user.FirstName + ' ' + user.LastName,
          department: 'Ex-Eionet',
          country: null,
        });
      } catch (err) {
        return wrapError(err, messages.UserDelete.Errors.ADUser);
      }
    }

    try {
      const spConfig = await getConfiguration();
      await apiDelete(
        '/sites/' +
          spConfig.SharepointSiteId +
          '/lists/' +
          spConfig.UserListId +
          '/items/' +
          user.id,
      );
    } catch (err) {
      return wrapError(err, messages.UserDelete.Errors.ADUser);
    }

    logInfo('User removed: ' + user.Email, '', user, 'Remove user');
    return { Success: true };
  }
  return false;
}

export async function resendInvitation(user, mappings, oldValues) {
  try {
    user.LastInvitationDate = new Date();
    const editResult = await editUser(user, mappings, oldValues);
    if (editResult.Success) {
      await sendInvitationMail(user);
      return { Success: true };
    } else {
      return editResult;
    }
  } catch (err) {
    return wrapError(err, messages.UserInvite.Errors.Mail);
  }
}
