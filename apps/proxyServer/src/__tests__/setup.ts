import { config } from "dotenv";
import { resolve } from "path";
import { beforeAll } from "vitest";

// Load test environment variables
beforeAll(() => {
  config({ path: resolve(__dirname, "../../.env.test") });
});
