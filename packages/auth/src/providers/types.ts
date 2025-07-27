export type OAuthScope = {
  id: string;
  label: string;
  description: string;
  scopes: string[];
  category?: string;
};

export type OAuthProviderConfig = {
  name: string;
  icon: string;
  connection: string;
  availableScopes: OAuthScope[];
};
