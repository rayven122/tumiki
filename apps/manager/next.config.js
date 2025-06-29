/** @type {import("next").NextConfig} */
const config = {
  outputFileTracingIncludes: {
    "/mcp/servers": ["./mcp/*"],
  },
};

export default config;
