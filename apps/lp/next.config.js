/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  reactStrictMode: false,
  typescript: {
    tsconfigPath: "./tsconfig.build.json",
  },
};

export default config;
