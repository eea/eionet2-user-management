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

function isAlreadyMemberError(err) {
  const code = err?.response?.data?.error?.code ?? err?.response?.data?.code ?? err?.code;
  const message =
    err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.message ?? '';
  return code === 'Request_BadRequest' && /already exist/i.test(message);
}

function isNotMemberError(err) {
  return err?.response?.status === 404;
}

export async function postUserGroup(groupId, userId, email) {
  if (groupId) {
    const apiPath = `/groups/${groupId}/members/$ref`;
    try {
      await apiPost(
        apiPath,
        {
          '@odata.id': constants.DIRECTORY_OBJECTS_PATH + userId,
        },
        'app',
        true,
      );
    } catch (err) {
      //Graph's membership reads are eventually consistent, so we can't reliably
      //pre-check. Treat "already a member" as success; the desired end state holds.
      if (isAlreadyMemberError(err)) {
        return;
      }
      await logInfo(
        `An error has occured when adding userId ${userId} to group ${groupId}.`,
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
  const apiPath = '/groups/' + groupId + '/members/' + userId + '/$ref';
  try {
    await apiDelete(apiPath, 'app', true);
  } catch (err) {
    //404 means the user is not in the group — desired end state already holds.
    if (isNotMemberError(err)) {
      return;
    }
    await logInfo(
      'Group removal returned error. ',
      apiPath,
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
