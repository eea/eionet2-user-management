import React from 'react';
// https://fluentsite.z22.web.core.windows.net/quick-start
import {
  FluentProvider,
  teamsLightTheme,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { HashRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { useTeamsAuth } from './lib/useTeamsAuth';
import Privacy from './Privacy';
import TermsOfUse from './TermsOfUse';
import TabConfig from './TabConfig';
import EditTab from './EditTab';

/**
 * The main app which handles the initialization and routing
 * of the app.
 */
export default function App() {
  const { theme, loading, error } = useTeamsAuth();

  const renderRoutes = () => (
    <Routes>
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/termsofuse" element={<TermsOfUse />} />
      <Route path="/edittab" element={<EditTab />} />
      <Route path="/config" element={<TabConfig />} />
    </Routes>
  );

  const renderMessage = (message, action) => (
    <div style={{ margin: '100px auto', maxWidth: 320, textAlign: 'center' }}>
      <Text as="p">{message}</Text>
      {action}
      {error && (
        <Text as="p" role="alert" style={{ marginTop: 12 }}>
          {error.message || 'Sign in failed. Please try again.'}
        </Text>
      )}
    </div>
  );

  const renderFatalError = () =>
    renderMessage('Something went wrong while initializing Microsoft Teams authentication.', null);

  return (
    <FluentProvider theme={theme || teamsLightTheme}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/edittab" replace />} />
          <Route path="*" element={null} />
        </Routes>
        {loading ? (
          <Spinner style={{ margin: 100 }} />
        ) : error ? (
          renderFatalError()
        ) : (
          renderRoutes()
        )}
      </Router>
    </FluentProvider>
  );
}
