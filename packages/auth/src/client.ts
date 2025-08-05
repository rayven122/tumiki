import { Auth0Provider, getAccessToken, useUser } from "@auth0/nextjs-auth0";

import { OAUTH_PROVIDERS, PROVIDER_CONNECTIONS } from "./providers.js";

export {
  useUser,
  getAccessToken,
  Auth0Provider,
  OAUTH_PROVIDERS,
  PROVIDER_CONNECTIONS,
};
