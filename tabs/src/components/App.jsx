import React from 'react';
import { Provider, teamsTheme, Loader } from '@fluentui/react-northstar';
import { HashRouter as Router, Redirect, Route } from 'react-router-dom';
import { useTeamsFx } from './lib/useTeamsFx';
import Privacy from './Privacy';
import TermsOfUse from './TermsOfUse';
import './App.css';
import TabConfig from './TabConfig';
import EditTab from './EditTab';

/**
 * The main app which handles the initialization and routing
 * of the app.
 */
export default function App() {
  const { theme, loading } = useTeamsFx();
  return (
    <Provider theme={theme || teamsTheme} styles={{ backgroundColor: '#eeeeee' }}>
      <Router>
        <Route exact path="/">
          <Redirect to="/edittab" />
        </Route>
        {loading ? (
          <Loader style={{ margin: 100 }} />
        ) : (
          <>
            <Route exact path="/privacy" component={Privacy} />
            <Route exact path="/termsofuse" component={TermsOfUse} />
            <Route exact path="/edittab" component={EditTab} />
            <Route exact path="/config" component={TabConfig} />
          </>
        )}
      </Router>
    </Provider>
  );
}
