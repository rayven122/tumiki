export const buildOidcDiscoveryUrl = (issuer: string): string =>
  `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
