import {
  loadConfiguration,
  ResourceType,
  LogLevel,
  setLogLevel,
  setLogFunction,
  TeamsUserCredential,
} from '@microsoft/teamsfx';
import { useData } from './useData';
import { useTeams } from 'msteams-react-base-component';

let teamsfxEndpoint = process.env.REACT_APP_TEAMSFX_ENDPOINT;
let startLoginPageUrl = process.env.REACT_APP_START_LOGIN_PAGE_URL;
let functionEndpoint = process.env.REACT_APP_FUNC_ENDPOINT;
let clientId = process.env.REACT_APP_CLIENT_ID;

// TODO fix this when the SDK stops hiding global state!
let initialized = false;

export function useTeamsFx() {
  const [result] = useTeams({});
  const { error, loading } = useData(async () => {
    if (!initialized) {
      if (process.env.NODE_ENV === 'development') {
        setLogLevel(LogLevel.Verbose);
        setLogFunction((_level, message) => {
          console.log(message);
        });
      }
      loadConfiguration({
        authentication: {
          initiateLoginEndpoint: startLoginPageUrl,
          simpleAuthEndpoint: teamsfxEndpoint,
          clientId: clientId,
        },
        resources: [
          {
            type: ResourceType.API,
            name: 'default',
            properties: {
              endpoint: functionEndpoint,
            },
          },
        ],
      });

      initialized = true;
      const credential = new TeamsUserCredential();
      // Get the user info from access token
      await credential.getUserInfo();
    }
  });
  const isInTeams = true;
  return { error, loading, isInTeams, ...result };
}
