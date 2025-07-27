import { Auth0Provider, getAccessToken, useUser } from "@auth0/nextjs-auth0";

import { OAUTH_PROVIDER_CONFIG } from "./providers/index.js";

export { useUser, getAccessToken, Auth0Provider, OAUTH_PROVIDER_CONFIG };
