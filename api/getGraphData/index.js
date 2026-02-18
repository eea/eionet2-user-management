require("isomorphic-fetch");
const { ConfidentialClientApplication } = require("@azure/msal-node");
const { Client } = require("@microsoft/microsoft-graph-client");

/**
 * This function handles requests from the Teams tab client.
 * The HTTP request must include a Teams SSO token in the Authorization header.
 * This function performs OBO (on-behalf-of) to call Microsoft Graph.
 *
 * @param {Context} context - The Azure Functions context object.
 * @param {HttpRequest} req - The HTTP request.
 */
module.exports = async function (context, req) {
  context.log("HTTP trigger function processed a request.");

  // Initialize response.
  const res = {
    status: 200,
    body: {},
  };

  // Put an echo into response body.
  res.body.receivedHTTPRequestBody = req.body || "";


  // Prepare access token.
  const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
  const accessToken = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!accessToken) {
    return {
      status: 400,
      body: {
        error: "No access token was found in request header. Expected Authorization: Bearer <token>.",
      },
    };
  }

  const method = req.method.toLowerCase();
  const credentialType =
    method !== "get" ? (req.body && req.body.credentialType) : req.query.credentialType;
  const eTag = method == 'patch' ? req.body.eTag : undefined;

  const tenantId = process.env.M365_TENANT_ID;
  const clientId = process.env.M365_CLIENT_ID;
  const clientSecret = process.env.M365_CLIENT_SECRET;
  const authorityHost = process.env.M365_AUTHORITY_HOST || "https://login.microsoftonline.com";
  const graphScopes = (process.env.GRAPH_SCOPES || "https://graph.microsoft.com/.default")
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (!tenantId || !clientId || !clientSecret) {
    return {
      status: 500,
      body: {
        error: "Missing required M365_* configuration for OBO.",
      },
    };
  }

  const msalClient = new ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,
      authority: `${authorityHost}/${tenantId}`,
    },
  });

  try {
    let tokenResult;
    if (credentialType === "app") {
      tokenResult = await msalClient.acquireTokenByClientCredential({
        scopes: graphScopes,
      });
    } else {
      tokenResult = await msalClient.acquireTokenOnBehalfOf({
        oboAssertion: accessToken,
        scopes: graphScopes,
      });
    }

    if (!tokenResult || !tokenResult.accessToken) {
      return {
        status: 500,
        body: {
          error:
            credentialType === "app"
              ? "Failed to obtain Graph access token via client credentials."
              : "Failed to obtain Graph access token via OBO.",
        },
      };
    }

    const graphClient = Client.init({
      authProvider: (done) => done(null, tokenResult.accessToken),
    });

    let path = "";
    let result;

    switch (method) {
      case "get":
        path = req.query.path;
        result = await graphClient.api(path).get(req.query.path)
        break;
      case "put":
        break;
      case "patch":
        path = req.body.path;
        result = await graphClient.api(path)
          .header('Content-Type', 'application/json')
          .patch(req.body.data);
        break;
      case "post":
        path = req.body.path;
        result = await graphClient.api(path)
          .header('Content-Type', 'application/json')
          .post(req.body.data);
        break;
      case "delete":
        path = req.body.path;
        result = await graphClient.api(path)
          .header('Content-Type', 'application/json')
          .delete();
        break;
    }

    res.body.graphClientMessage = result;

  } catch (e) {
    return {
      status: e.statusCode || e.status || 500,
      body: e.body || { error: e.message },
    };
  }

  return res;
};
