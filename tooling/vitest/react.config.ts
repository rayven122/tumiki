import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./base.config";

const reactConfig = defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    coverage: {
      exclude: [
        ...(baseConfig.test?.coverage?.exclude || []),
        "src/**/types.ts",
        "src/**/_components/**",
      ],
    },
  },
});

export default mergeConfig(baseConfig, reactConfig);
