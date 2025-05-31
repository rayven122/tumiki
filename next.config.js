/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./apps/manager/src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  outputFileTracingIncludes: {
    "/mcp/servers": ["./mcp/*"],
  },
};

export default config;
