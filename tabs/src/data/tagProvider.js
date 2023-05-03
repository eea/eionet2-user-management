import { apiGet, apiPost, apiDelete } from './apiProvider';

export async function addTag(teamId, name, userId) {
  let response = await apiGet('/teams/' + teamId + "/tags?$filter=displayName eq '" + name + "'");

  if (response.graphClientMessage.value && response.graphClientMessage.value.length) {
    let existingTag = response.graphClientMessage.value[0],
      tagMemberIdResponse = await apiGet(
        '/teams/' +
          teamId +
          '/tags/' +
          existingTag.id +
          "/members?$filter=userId eq '" +
          userId +
          "'",
      );

    if (
      !tagMemberIdResponse.graphClientMessage.value ||
      !tagMemberIdResponse.graphClientMessage.value.length
    ) {
      await apiPost('/teams/' + teamId + '/tags/' + existingTag.id + '/members', {
        userId: userId,
      });
    }
  } else {
    await apiPost('/teams/' + teamId + '/tags', {
      displayName: name,
      members: [
        {
          userId: userId,
        },
      ],
    });
  }
}

export async function removeTag(teamId, name, userId) {
  const response = await apiGet('/teams/' + teamId + "/tags?$filter=displayName eq '" + name + "'");

  if (response.graphClientMessage.value && response.graphClientMessage.value.length) {
    let existingTag = response.graphClientMessage.value[0],
      tagMemberIdResponse = await apiGet(
        '/teams/' +
          teamId +
          '/tags/' +
          existingTag.id +
          "/members?$filter=userId eq '" +
          userId +
          "'",
      );

    if (
      tagMemberIdResponse.graphClientMessage.value &&
      tagMemberIdResponse.graphClientMessage.value.length
    ) {
      let tagMemberId = tagMemberIdResponse.graphClientMessage.value[0].id;
      await apiDelete('/teams/' + teamId + '/tags/' + existingTag.id + '/members/' + tagMemberId);
    }
  }
}
