import { apiGet, apiPost, apiPatch, apiDelete, getConfiguration, logInfo } from './apiProvider';
import { getSPUserByMail, saveSPUser } from './sharepointProvider';
import { getMappingsList } from './configurationProvider';
import { getDistinctGroupsIds, capitalizeName, buildUserDisplaName } from './providerHelper';
import { addTag, removeTag, getCountryName } from './tagProvider';
import { postUserGroup, deleteUserGroup, getExistingGroups } from './userGroupProvider';
import { sendInvitationMail } from './notificationProvider';
import messages from './messages.json';
import * as constants from './constants';

function wrapError(err, message) {
  return {
    Message: message,
    Error: err,
    Success: false,
  };
}

export async function getUserByMail(email) {
  try {
    const adResponse = await apiGet(
        "/users/?$filter=mail eq '" + email?.replaceAll("'", "''") + "'",
      ),
      spUser = await getSPUserByMail(email),
      adMessage = adResponse.graphClientMessage;

    const adUser = adMessage.value?.length ? adMessage.value[0] : undefined;

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

async function saveADUser(userId, userData) {
  await apiPatch('/users/' + userId, {
    givenName: userData.FirstName,
    surname: userData.LastName,
    displayName: buildUserDisplaName(userData),
    department: 'Eionet',
    country: userData.Country,
  });
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

export async function inviteUser(user, mappings) {
  capitalizeName(user);
  try {
    let firstMapping = mappings.find(
        (m) =>
          user.Membership?.includes(m.Membership) || user.OtherMemberships?.includes(m.Membership),
      ),
      config = await getConfiguration();
    let userId,
      invitationResponse,
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
        if (invitationResponse?.graphClientMessage.invitedUser) {
          userId = invitationResponse.graphClientMessage.invitedUser.id;
          await saveADUser(userId, user);
        }
      } catch (err) {
        return wrapError(err, messages.UserInvite.Errors.ADUserCreation);
      }
    } else {
      userId = user.ADProfile.id;
      try {
        //check MFA status only for existing
        user.LastInvitationDate = new Date();
        const mfaResponse = await checkMFAStatus(user.ADProfile.displayName);
        user.SignedIn = mfaResponse?.value?.length > 0 && mfaResponse.value[0].isMfaRegistered;

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
              await postUserGroup(groupId, userId, user.Email);
            }
          } catch (err) {
            return wrapError(err, messages.UserInvite.Errors.JoiningTeam);
          }
        }

        const userMappings = mappings.filter(
          (m) =>
            user.Membership?.includes(m.Membership) ||
            user.OtherMemberships?.includes(m.Membership),
        );

        //apply user membership and country tag
        const userGroupIds = getDistinctGroupsIds(userMappings);
        const existingGroups = await getExistingGroups(userId, userGroupIds);
        try {
          for (const groupId of userGroupIds.filter((id) => !existingGroups?.includes(id))) {
            await postUserGroup(groupId, userId, user.Email);
          }
        } catch (err) {
          return wrapError(err, messages.UserInvite.Errors.JoiningTeam);
        }

        if (user.SignedIn) {
          //apply membership tags
          try {
            if (user.NFP) {
              await addTag(config.MainEionetGroupId, constants.NFP_TAG, userId);
              await addTag(config.MainEionetGroupId, getCountryName(user.Country), userId);
            }
            const tags = [...new Set(userMappings.filter((m) => m.Tag))];
            for (const m of tags) {
              addTag(m.O365GroupId, m.Tag, userId);
              addTag(m.O365GroupId, getCountryName(user.Country), userId);
            }
          } catch (err) {
            return wrapError(err, messages.UserInvite.Errors.TagsCreation);
          }
        }

        if (sendMail) {
          try {
            await sendInvitationMail(user, mappings);
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
    logInfo('User invited: ' + user.Email, '', user, 'Add user', user.Email);
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
          user.Membership?.includes(m.Membership) || user.OtherMemberships?.includes(m.Membership),
      ),
      oldMappings = mappings.filter(
        (m) =>
          oldValues.Membership?.includes(m.Membership) ||
          oldValues.OtherMemberships?.includes(m.Membership),
      ),
      newGroups = getDistinctGroupsIds(newMappings),
      oldGroups = getDistinctGroupsIds(oldMappings),
      newTags = [...new Set(newMappings.filter((m) => m.Tag))],
      oldTags = [...new Set(oldMappings.filter((m) => m.Tag))],
      config = await getConfiguration();

    const existingGroups = await getExistingGroups(user.ADUserId, newGroups);

    for (const groupId of newGroups.filter((id) => !existingGroups?.includes(id))) {
      await postUserGroup(groupId, user.ADUserId, user.Email);

      const groupMapping = mappings.filter((m) => m.O365GroupId === groupId);
      groupMapping[0]?.Tag && addTag(groupId, getCountryName(user.Country), user.ADUserId);
    }

    if (user.SignedIn) {
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
    }

    for (const groupId of oldGroups) {
      if (!newGroups.includes(groupId) && !(user.NFP && groupId === config.MainEionetGroupId)) {
        await deleteUserGroup(groupId, user.ADUserId, user.Email);
      }
    }

    if (user.SignedIn && oldValues.Country !== user.Country) {
      for (const m of newMappings) {
        if (m.Tag) {
          addTag(m.O365GroupId, getCountryName(user.Country), user.ADUserId);
        }
        removeTag(m.O365GroupId, getCountryName(oldValues.Country), user.ADUserId);
      }
    }

    if (user.NFP && !oldValues.NFP) {
      const nfpGroupIds = [
        ...new Set([config.NFPGroupId, config.MainEionetGroupId].filter((g) => !!g)),
      ];

      const existingNFPGroups = await getExistingGroups(user.ADUserId, nfpGroupIds);

      if (!existingNFPGroups?.includes(config.NFPGroupId)) {
        await postUserGroup(config.NFPGroupId, user.ADUserId, user.Email);
      }
      if (!existingNFPGroups?.includes(config.MainEionetGroupId)) {
        await postUserGroup(config.MainEionetGroupId, user.ADUserId, user.Email);
      }

      if (user.SignedIn) {
        try {
          await addTag(config.MainEionetGroupId, constants.NFP_TAG, user.ADUserId);
        } catch (err) {
          return wrapError(err, messages.UserInvite.Errors.TagsCreation);
        }
      }
    } else if (!user.NFP && oldValues.NFP) {
      await deleteUserGroup(config.NFPGroupId, user.ADUserId, user.Email);
      if (!newGroups.includes(config.MainEionetGroupId)) {
        await deleteUserGroup(config.MainEionetGroupId, user.ADUserId, user.Email);
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

    logInfo(`User edited: ${user.Email}`, '', user, 'Edit user', user.Email);
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
              user.Membership?.includes(m.Membership) ||
              user.OtherMemberships?.includes(m.Membership),
          ),
          groups = getDistinctGroupsIds(filteredMappings);

        for (const groupId of groups) {
          await deleteUserGroup(groupId, user.ADUserId, user.Email);
        }

        if (user.NFP) {
          await deleteUserGroup(config.NFPGroupId, user.ADUserId, user.Email);

          if (!groups.length) {
            await deleteUserGroup(config.MainEionetGroupId, user.ADUserId, user.Email);
          }
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

    logInfo('User removed: ' + user.Email, '', user, 'Remove user', user.Email);
    return { Success: true };
  }
  return false;
}

export async function resendInvitation(user, mappings, oldValues) {
  try {
    user.LastInvitationDate = new Date();
    const editResult = await editUser(user, mappings, oldValues);
    if (editResult.Success) {
      await sendInvitationMail(user, mappings);
      return { Success: true };
    } else {
      return editResult;
    }
  } catch (err) {
    return wrapError(err, messages.UserInvite.Errors.Mail);
  }
}
