/** @type {import("next").NextConfig} */
const config = {
  // framer-motion の useEffect 二重実行を防ぐため false（manager/internal-manager と統一）
  reactStrictMode: false,
  typescript: {
    tsconfigPath: "./tsconfig.build.json",
  },
};

export default config;
