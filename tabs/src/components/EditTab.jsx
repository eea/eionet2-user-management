import { React, useState, useEffect } from 'react';
import { getMe } from '../data/configurationProvider';
import { getConfiguration } from '../data/apiProvider';
import { getCountryCodeMappingsList } from '../data/tagProvider';
import { UserList } from './UserList';
import { HtmlBox } from './HtmlBox';
import { Backdrop, CircularProgress, Typography } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { AppInsightsContext } from '@microsoft/applicationinsights-react-js';
import { reactPlugin } from './AppInsights';

const theme = createTheme({
  palette: {
    primary: {
      light: '#00A390',
      main: '#007B6C',
      dark: '#005248',
    },
    secondary: {
      light: '#006BB8',
      main: '#004B7F',
      dark: '#003052',
    },
    error: {
      main: '#B83230',
    },
    warning: {
      main: '#FF9933',
    },
    success: {
      main: '#007B6C',
    },
    info: {
      main: '#004B7F',
    },
    text: {
      primary: '#3D5265',
    },
    suplementary: {
      main: '#F9F9F9',
      text: '#3D5265',
    },
  },
});

const showFunction = Boolean(process.env.REACT_APP_FUNC_NAME);

export default function EditTab() {
  const [configuration, setConfiguration] = useState({}),
    [userInfo, setUserInfo] = useState({
      isAdmin: false,
      isNFP: false,
      isGuest: true,
      country: '',
      isLoaded: false,
    }),
    [loading, setloading] = useState(false);
  useEffect(() => {
    (async () => {
      setloading(true);
      let me = await getMe();
      setUserInfo({
        isAdmin: me.isAdmin,
        isNFP: me.isNFP,
        isGuest: me.isGuest,
        country: me.country,
        isLoaded: true,
      });
      await getCountryCodeMappingsList();
      let loadedConfiguration = await getConfiguration();
      if (loadedConfiguration) {
        setConfiguration(loadedConfiguration);
      }
      setloading(false);
    })();
  }, []);

  return (
    <AppInsightsContext.Provider value={reactPlugin}>
      <div>
        <ThemeProvider theme={theme}>
          <Backdrop
            sx={{ color: '#6b32a8', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={loading}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
          {userInfo.isLoaded && !userInfo.isGuest && (
            <UserList showFunction={showFunction} userInfo={userInfo} />
          )}
          {((!userInfo.isLoaded || userInfo.isGuest) && (
            <div
              style={{
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <HtmlBox html={configuration?.UserManagementRestrictedMessage}></HtmlBox>
            </div>
          ))}
          <Typography
            sx={{ position: 'absolute', bottom: '0', left: '0', width: '100%', zIndex: 1 }}
          >
            v{`${process.env.REACT_APP_VERSION}`}
          </Typography>
        </ThemeProvider>
      </div>
    </AppInsightsContext.Provider>
  );
}
