import type { z } from "zod";

type FetchOidcDiscoveryOptions<T> = {
  timeoutMs: number;
  errorMessage: string;
  invalidResponseMessage: (message: string) => string;
  schema: z.ZodType<T>;
};

export const buildOidcDiscoveryUrl = (issuer: string): string =>
  `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;

export const fetchOidcDiscovery = async <T>(
  issuer: string,
  {
    timeoutMs,
    errorMessage,
    invalidResponseMessage,
    schema,
  }: FetchOidcDiscoveryOptions<T>,
): Promise<T> => {
  const discoveryUrl = buildOidcDiscoveryUrl(issuer);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(discoveryUrl, { signal: controller.signal });
  } catch (error) {
    throw new Error(errorMessage, { cause: error });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) throw new Error(`${errorMessage}: ${res.status}`);

  const result = schema.safeParse(await res.json());
  if (!result.success)
    throw new Error(invalidResponseMessage(result.error.message));

  return result.data;
};
