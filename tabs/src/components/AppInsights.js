import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { createBrowserHistory } from 'history';
const browserHistory = createBrowserHistory({ basename: '' });
var reactPlugin = new ReactPlugin();

var appInsights = new ApplicationInsights({
  config: {
    connectionString:
      'InstrumentationKey=55ec89cb-ce77-466d-9e29-6d1ce6f1db00;IngestionEndpoint=https://westeurope-5.in.applicationinsights.azure.com/;LiveEndpoint=https://westeurope.livediagnostics.monitor.azure.com/;ApplicationId=9dec353f-2ef1-485c-9574-966835f38881',
    extensions: [reactPlugin],
    extensionConfig: {
      [reactPlugin.identifier]: { history: browserHistory },
    },
  },
});
appInsights.loadAppInsights();
export { reactPlugin, appInsights };
