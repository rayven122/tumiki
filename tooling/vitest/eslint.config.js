import baseConfig from "@tumiki/eslint-config/base";

export default [
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"],
  },
];
