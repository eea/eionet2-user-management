import { apiGet, apiPost, apiDelete, logInfo } from './apiProvider';
import { getMappingsList } from './configurationProvider';
import * as constants from './constants';

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

export async function postUserGroup(groupId, userId, email) {
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
        email,
      );
      throw err;
    }
  }
}

export async function deleteUserGroup(groupId, userId, email) {
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
      email,
    );
  }
}

export async function getExistingGroups(userId, groupIds) {
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
