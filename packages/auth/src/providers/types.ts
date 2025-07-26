export type OAuthProvider =
  | "google"
  | "github"
  | "slack"
  | "notion"
  | "linkedin";

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

export type OAuthProviderMap = Record<OAuthProvider, OAuthProviderConfig>;
