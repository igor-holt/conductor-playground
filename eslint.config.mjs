import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".context/**",
      ".git/**",
      ".github/**",
      "apps/operator-web/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "notebooks/**",
      "packages/puf-harness/**"
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
    },
  }
);
