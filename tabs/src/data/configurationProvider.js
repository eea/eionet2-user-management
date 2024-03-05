import { apiGet } from './apiProvider';
import { getConfiguration } from './apiProvider';

let mappingsList;
export async function getMappingsList() {
  const config = await getConfiguration();
  try {
    if (!mappingsList) {
      const response = await apiGet(
        '/sites/' +
          config.SharepointSiteId +
          '/lists/' +
          config.MappingListId +
          '/items?$expand=fields',
      );
      mappingsList = response.graphClientMessage.value.map(function (mapping) {
        return {
          TeamURL: mapping.fields.TeamURL,
          O365GroupId: mapping.fields.O365GroupId,
          Membership: mapping.fields.Membership,
          Tag: mapping.fields.Tag,
          MailingGroupId: mapping.fields.MailingGroupId,
          AdditionalGroupId: mapping.fields.AdditionalGroupId,
        };
      });
    }
    return mappingsList;
  } catch (err) {
    console.log(err);
  }
}

let _profile;
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
