import { apiGet, getConfiguration } from './apiProvider';

export async function getOrganisationList(country) {
  const config = await getConfiguration();
  try {
    let path =
      '/sites/' +
      config.SharepointSiteId +
      '/lists/' +
      config.OrganisationListId +
      '/items?$expand=fields&$top=999';
    if (country) {
      path += "&$filter=fields/Country eq '" + country + "' or fields/Unspecified eq 1";
    }
    const response = await apiGet(path);
    const result = response.graphClientMessage.value
      .map(function (organisation) {
        return {
          header: organisation.fields.Title,
          content: organisation.id,
          unspecified: organisation.fields.Unspecified,
        };
      })
      .sort((a, b) => {
        return a.header > b.header ? 1 : b.header > a.header ? -1 : 0;
      });

    return [
      ...result.filter(({ unspecified }) => !unspecified),
      ...result.filter(({ unspecified }) => unspecified),
    ];
  } catch (err) {
    console.log(err);
    return [];
  }
}

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

export async function getComboLists() {
  const config = await getConfiguration();
  let lists = {};
  try {
    const response = await apiGet(
      '/sites/' + config.SharepointSiteId + '/lists/' + config.UserListId + '/columns',
    );
    const columns = response.graphClientMessage.value;
    let genderColumn = columns.find((column) => column.name === 'Gender');
    if (genderColumn?.choice) {
      lists.genders = genderColumn.choice.choices;
    }
    let countryColumn = columns.find((column) => column.name === 'Country');
    if (countryColumn?.choice) {
      lists.countries = countryColumn.choice.choices;
    }
    let membershipColumn = columns.find((column) => column.name === 'Membership');
    if (membershipColumn?.choice) {
      lists.memberships = membershipColumn.choice.choices.sort();
    }
    let otherMembershipColumn = columns.find((column) => column.name === 'OtherMemberships');
    if (otherMembershipColumn?.choice) {
      lists.otherMemberships = otherMembershipColumn.choice.choices.sort();
    }
    let nfpColumn = columns.find((column) => column.name === 'NFP');
    if (nfpColumn?.choice) {
      lists.nfps = nfpColumn.choice.choices;
    }

    return lists;
  } catch (err) {
    console.log(err);
  }
}

export async function getSPUserByMail(email) {
  const config = await getConfiguration();
  try {
    const path =
        '/sites/' +
        config.SharepointSiteId +
        '/lists/' +
        config.UserListId +
        "/items?$filter=fields/Email eq '" +
        email?.replaceAll("'", "''") +
        "'&$expand=fields",
      response = await apiGet(path),
      profile = response.graphClientMessage;
    if (profile.value?.length) {
      return profile.value[0];
    }
    return undefined;
  } catch (err) {
    console.log(err);
  }
}

export async function getInvitedUsers(userInfo) {
  const config = await getConfiguration();
  try {
    let path =
      '/sites/' +
      config.SharepointSiteId +
      '/lists/' +
      config.UserListId +
      '/items?$expand=fields&$top=999';
    if (userInfo.isNFP) {
      path += "&$filter=fields/Country eq '" + userInfo.country + "'";
    }

    let result = [];
    const organisations = await getOrganisationList();
    while (path) {
      const response = await apiGet(path),
        users = await response.graphClientMessage;

      users.value.forEach(function (user) {
        let organisation = organisations.find(
          (o) => o.content === user.fields.OrganisationLookupId,
        );

        //concatenate memberships, otherMemberships and NFP in one field to display in grid
        let memberships = (user.fields.Membership || []).concat(user.fields.OtherMemberships || []);
        user.fields.NFP && memberships.push(user.fields.NFP);

        result.push({
          Title: user.fields.Title,
          Email: user.fields.Email,
          Membership: user.fields.Membership,
          MembershipString: memberships?.toString(),
          OtherMemberships: user.fields.OtherMemberships,
          OtherMembershipsString: user.fields.OtherMemberships?.toString(),
          Country: user.fields.Country ? user.fields.Country : '',
          OrganisationLookupId: user.fields.OrganisationLookupId,
          Organisation: organisation ? organisation.header : '',
          Phone: user.fields.Phone,
          ADUserId: user.fields.ADUserId,
          Gender: user.fields.Gender ? user.fields.Gender : '',
          GenderTitle: user.fields.Gender ? user.fields.Gender : '',
          NFP: user.fields.NFP,
          SignedIn: user.fields.SignedIn,
          SuggestedOrganisation: user.fields.SuggestedOrganisation,
          LastInvitationDate: user.fields.LastInvitationDate
            ? user.fields.LastInvitationDate
            : user.createdDateTime,
          EEANominated: user.fields.EEANominated || false,
          id: user.fields.id,
        });
      });

      path = users['@odata.nextLink'];
    }

    if (userInfo.isNFP) {
      result = result.filter((user) => {
        return user.Membership?.length > 0 || user.NFP;
      });
    }

    return result;
  } catch (err) {
    console.log(err);
  }
}
