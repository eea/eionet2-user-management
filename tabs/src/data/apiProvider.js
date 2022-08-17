import {
  TeamsUserCredential,
  getResourceConfiguration,
  ResourceType,
} from '@microsoft/teamsfx';
import * as axios from 'axios';

async function callApiFunction(command, method, options, params) {
  var message = [];

  const credential = new TeamsUserCredential();
  const accessToken = await credential.getToken('');
  const apiConfig = getResourceConfiguration(ResourceType.API);
  const response = await axios.default.request({
    method: method,
    url: apiConfig.endpoint + '/api/' + command,
    headers: {
      authorization: 'Bearer ' + accessToken.token,
    },
    data: options,
    params,
  });
  message = response.data;

  return message;
}

export async function apiGet(path, credentialType = 'app') {
  try {
    return await callApiFunction('graphData', 'get', undefined, {
      path: path,
      credentialType: credentialType,
    });
  } catch (err) {
    logError(err, path, null);
    throw err;
  }
}

export async function apiPost(path, data, credentialType = 'app') {
  try {
    return await callApiFunction('graphData', 'post', {
      credentialType: credentialType,
      data: data,
      path: path,
    });
  } catch (err) {
    logError(err, path, data);
    throw err;
  }
}

export async function apiPatch(path, data, credentialType = 'app') {
  try {
    return await callApiFunction('graphData', 'patch', {
      credentialType: credentialType,
      data: data,
      path: path,
    });
  } catch (err) {
    logError(err, path, data);
    throw err;
  }
}

export async function apiDelete(path, credentialType = 'app') {
  try {
    return await callApiFunction('graphData', 'delete', {
      credentialType: credentialType,
      path: path,
    });
  } catch (err) {
    logError(err, path, null);
    throw err;
  }
}

var _userId = undefined;
export async function getUserId() {
  if (!_userId) {
    const response = await apiGet(
      'me?$select=id,displayName,mail,mobilePhone,country',
      'user'
    );

    if (response.graphClientMessage) {
      _userId = response.graphClientMessage.id;
    }
  }
  return _userId;
}

const sharepointSiteId =
    '7lcpdm.sharepoint.com,bf9359de-0f13-4b00-8b5a-114f6ef3bfb0,6609a994-5225-4a1d-bd05-a239c7b45f72',
  configurationListId = '010b1be2-0df5-4ab1-b2a7-17e010aae775';

var _configuration = undefined;
export async function getConfiguration() {
  try {
    if (!_configuration) {
      const response = await apiGet(
        '/sites/' +
          sharepointSiteId +
          '/lists/' +
          configurationListId +
          '/items?$expand=fields'
      );
      _configuration = {};
      response.graphClientMessage.value.forEach(function (item) {
        _configuration[item.fields.Title] = item.fields.Value;
      });
      _configuration.SharepointSiteId = sharepointSiteId;
    }
    return _configuration;
  } catch (err) {
    console.log(err);
    return undefined;
  }
}

export async function logError(err, apiPath, data) {
  const spConfig = await getConfiguration(),
    userId = await getUserId();

  let fields = {
    fields: {
      ApplicationName: 'Eionet2-User-Management',
      ApiPath: apiPath,
      ApiData: JSON.stringify(data),
      Title: err.response?.data?.error?.body,
      UserId: userId,
      Timestamp: new Date(),
      Logtype: 'Error',
    },
  };

  let graphURL =
    '/sites/' +
    spConfig.SharepointSiteId +
    '/lists/' +
    spConfig.LoggingListId +
    '/items';
  await apiPost(graphURL, fields);
}

export async function logInfo(message, apiPath, data, action) {
  const spConfig = await getConfiguration(),
    userId = await getUserId();

  let fields = {
    fields: {
      ApplicationName: 'Eionet2-User-Management',
      ApiPath: apiPath,
      ApiData: JSON.stringify(data),
      Title: message,
      UserId: userId,
      Timestamp: new Date(),
      Logtype: 'Info',
      Action: action,
    },
  };

  let graphURL =
    '/sites/' +
    spConfig.SharepointSiteId +
    '/lists/' +
    spConfig.LoggingListId +
    '/items';
  await apiPost(graphURL, fields);
}
