import { createClient } from "microcms-js-sdk";

const serviceDomain = process.env.MICROCMS_TUMIKI_BLOG_SERVICE_DOMAIN;
const apiKey = process.env.MICROCMS_TUMIKI_BLOG_API_KEY;

if (!serviceDomain) {
  throw new Error("MICROCMS_TUMIKI_BLOG_SERVICE_DOMAIN environment variable is required");
}

if (!apiKey) {
  throw new Error("MICROCMS_TUMIKI_BLOG_API_KEY environment variable is required");
}

export const client = createClient({
  serviceDomain,
  apiKey,
});
