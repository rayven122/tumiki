import { createClient } from "microcms-js-sdk";

const serviceDomain = process.env.MICROCMS_SERVICE_ID;
const apiKey = process.env.MICROCMS_API_KEY;

if (!serviceDomain) {
  throw new Error("MICROCMS_SERVICE_ID environment variable is required");
}

if (!apiKey) {
  throw new Error("MICROCMS_API_KEY environment variable is required");
}

export const client = createClient({
  serviceDomain,
  apiKey,
});
