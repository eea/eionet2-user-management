const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export function capitalizeName(user) {
  user.FirstName = capitalizeFirst(user.FirstName);
  user.LastName = capitalizeFirst(user.LastName);
}

export function getDistinctGroupsIds(mappings) {
  let groupIds = mappings.map((m) => m.O365GroupId);

  groupIds = groupIds.concat(mappings.map((m) => m.AdditionalGroupId));
  groupIds = groupIds.concat(mappings.map((m) => m.MailingGroupId));

  return [...new Set(groupIds.filter((g) => !!g))];
}

export function buildUserDisplaName(userData) {
  let displayName = userData.FirstName + ' ' + userData.LastName + ' (' + userData.Country + ')';
  if (userData.NFP) {
    displayName = userData.FirstName + ' ' + userData.LastName + ' (NFP-' + userData.Country + ')';
  }

  return displayName;
}

export function buildTeamsURLs(user, mappings, config) {
  let teamURLs = {};
  mappings
    .filter(
      (m) =>
        (user.Membership && user.Membership.includes(m.Membership)) ||
        (user.OtherMemberships && user.OtherMemberships.includes(m.Membership)),
    )
    .forEach((mapping) => {
      teamURLs[mapping.O365GroupId] = { url: mapping.TeamURL, name: mapping.Membership };
    });

  if (user.NFP && !teamURLs[config.MainEionetGroupId]) {
    const mainMapping = mappings.find((m) => m.O365GroupId === config.MainEionetGroupId);
    teamURLs[config.MainEionetGroupId] = {
      url: mainMapping.TeamURL,
      mainMapping: mainMapping.Membership,
    };
  }

  let result = '<br/>';

  for (const value of Object.values(teamURLs)) {
    result += `<a href="${value.url}">${value.name}</a><br/>`;
  }
  return result;
}
