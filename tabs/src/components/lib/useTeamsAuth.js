import { useEffect, useState } from 'react';
import { app, authentication } from '@microsoft/teams-js';
import {
  teamsLightTheme,
  teamsDarkTheme,
  teamsHighContrastTheme,
} from '@fluentui/react-components';

const themeMap = {
  default: teamsLightTheme,
  light: teamsLightTheme,
  dark: teamsDarkTheme,
  contrast: teamsHighContrastTheme,
  highContrast: teamsHighContrastTheme,
};

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await app.initialize();
    initialized = true;
  }
}

function resolveTheme(rawTheme) {
  return themeMap[rawTheme] || teamsLightTheme;
}

export function useTeamsAuth() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    theme: teamsLightTheme,
  });

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        await ensureInitialized();
        const context = await app.getContext();
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            theme: resolveTheme(context?.app?.theme),
          }));
        }

        if (app.registerOnThemeChangeHandler) {
          app.registerOnThemeChangeHandler((theme) => {
            if (!cancelled) {
              setState((previous) => ({
                ...previous,
                theme: resolveTheme(theme),
              }));
            }
          });
        }

        await authentication.getAuthToken();

        if (!cancelled) {
          setState((previous) => ({ ...previous, loading: false, error: null }));
        }
      } catch (error) {
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error: error,
          }));
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
