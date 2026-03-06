import { createClient } from "microcms-js-sdk";

let clientInstance: ReturnType<typeof createClient> | null = null;

export const client = {
  get: <T>(args: Parameters<ReturnType<typeof createClient>["get"]>[0]) => {
    if (!clientInstance) {
      const serviceDomain = process.env.MICROCMS_TUMIKI_BLOG_SERVICE_DOMAIN;
      const apiKey = process.env.MICROCMS_TUMIKI_BLOG_API_KEY;

      if (!serviceDomain || !apiKey) {
        // ビルド時はダミーデータを返す
        if (process.env.NODE_ENV === "production" && !serviceDomain) {
          return Promise.resolve({ contents: [] } as T);
        }

        throw new Error(
          `Missing required environment variables: ${!serviceDomain ? "MICROCMS_TUMIKI_BLOG_SERVICE_DOMAIN" : ""} ${!apiKey ? "MICROCMS_TUMIKI_BLOG_API_KEY" : ""}`.trim(),
        );
      }

      clientInstance = createClient({
        serviceDomain,
        apiKey,
      });
    }

    return clientInstance.get<T>(args);
  },
};
