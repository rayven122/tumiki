import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next",
      "next-env.d.ts", // Next.js auto-generated file
      "prisma/**",
      "src/app/(chat)/**", // For ai-chatbot
      "src/artifacts/**", // For ai-chatbot
      "src/components/*.tsx", // For ai-chatbot
      "src/hooks/**", // For ai-chatbot
      "src/lib/ai/**", // For ai-chatbot
      "src/lib/constants.ts", // For ai-chatbot
      "src/lib/editor/suggestions.tsx", // For ai-chatbot
      "vitest.config.ts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
