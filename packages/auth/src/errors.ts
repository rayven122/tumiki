export class OAuthError extends Error {
  constructor(
    message: string,
    public readonly provider?: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

export class TokenFetchError extends OAuthError {
  constructor(provider: string, originalError?: unknown) {
    super(
      `Failed to fetch access token for provider: ${provider}`,
      provider,
      originalError,
    );
    this.name = "TokenFetchError";
  }
}

export class InvalidProviderError extends OAuthError {
  constructor(provider: string) {
    super(`Invalid OAuth provider: ${provider}`, provider);
    this.name = "InvalidProviderError";
  }
}
