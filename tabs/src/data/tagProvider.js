import { apiGet, apiPost, apiDelete, getConfiguration } from './apiProvider';

let countryMapping;
export async function getCountryCodeMappingsList() {
  const config = await getConfiguration();
  try {
    if (!countryMapping) {
      countryMapping = {};
      const response = await apiGet(
        '/sites/' +
          config.SharepointSiteId +
          '/lists/' +
          config.CountryCodeMappingListId +
          '/items?$expand=fields',
      );
      response.graphClientMessage.value.forEach(
        (mapping) => (countryMapping[mapping.fields.Title] = mapping.fields.CountryName),
      );
    }
    return countryMapping;
  } catch (err) {
    console.log(err);
  }
}

export function getCountryName(countryCode) {
  return countryMapping?.[countryCode];
}

export async function addTag(teamId, name, userId) {
  //Graph endpoints under /teams/{id}/tags can return 404 transiently while
  //group->team membership propagates after a fresh group-add. Treat 404 as
  //"skip" instead of letting it pollute the error log.
  try {
    let response = await apiGet(
      '/teams/' + teamId + "/tags?$filter=displayName eq '" + name + "'",
      'app',
      true,
    );

    if (response?.graphClientMessage?.value?.length) {
      const existingTag = response.graphClientMessage.value[0],
        tagMemberIdResponse = await getTag(teamId, existingTag.id, userId);

      if (!tagMemberIdResponse?.graphClientMessage?.value?.length) {
        await apiPost(
          '/teams/' + teamId + '/tags/' + existingTag.id + '/members',
          { userId: userId },
          'app',
          true,
        );
      }
    } else {
      await apiPost(
        '/teams/' + teamId + '/tags',
        {
          displayName: name,
          members: [{ userId: userId }],
        },
        'app',
        true,
      );
    }
  } catch (err) {
    if (err?.response?.status === 404) {
      console.log(`addTag skipped (404) for team ${teamId}, tag ${name}, user ${userId}`);
      return;
    }
    throw err;
  }
}

export async function removeTag(teamId, name, userId) {
  const response = await apiGet('/teams/' + teamId + "/tags?$filter=displayName eq '" + name + "'");

  if (response?.graphClientMessage?.value?.length) {
    const existingTag = response.graphClientMessage.value[0],
      tagMemberIdResponse = await getTag(teamId, existingTag.id, userId);

    if (tagMemberIdResponse?.graphClientMessage?.value?.length) {
      let tagMemberId = tagMemberIdResponse.graphClientMessage.value[0].id;
      await apiDelete('/teams/' + teamId + '/tags/' + existingTag.id + '/members/' + tagMemberId);
    }
  }
}

async function getTag(teamId, tagId, userId) {
  let response;
  try {
    //endpoint returns 404 Not Found if user doesn't have the tag. Error is logged in logging list, but is must not break the save flow.
    response = await apiGet(`/teams/${teamId}/tags/${tagId}/members?$filter=userId eq '${userId}'`);
  } catch (err) {
    console.log(err);
  }
  return response;
}
