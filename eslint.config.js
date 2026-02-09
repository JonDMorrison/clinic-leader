import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Design token enforcement: warn on hard-coded color classes
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/(?:^|\\s)(?:bg-white|bg-black|text-white|text-black|border-white|border-black)(?:\\s|$)/]",
          message: "Use semantic design tokens (bg-background, text-foreground, etc.) instead of hard-coded colors. See index.css for available tokens.",
        },
      ],
    },
  },
);
