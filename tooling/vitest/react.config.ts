import react from "@vitejs/plugin-react";
import { mergeConfig } from "vitest/config";

import baseConfig from "./base.config.js";

const reactConfig = {
  plugins: [react()],
  test: {
    environment: "jsdom",
    coverage: {
      exclude: [
        ...(Array.isArray(baseConfig.test?.coverage?.exclude)
          ? baseConfig.test.coverage.exclude
          : []),
        "src/**/types.ts",
        "src/**/_components/**",
      ],
    },
  },
};

export default mergeConfig(baseConfig, reactConfig);
