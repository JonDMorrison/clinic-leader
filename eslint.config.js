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
      // Design token enforcement: block hard-coded color classes (error in CI, warn locally)
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/(?:^|\\s)(?:bg-white|bg-black|text-white|text-black|border-white|border-black)(?:\\s|$)/]",
          message: "Use semantic design tokens (bg-background, text-foreground, etc.) instead of hard-coded colors.",
        },
        {
          selector: "Literal[value=/(?:^|\\s)(?:text-(?:red|blue|green|yellow|purple|pink|indigo|orange|teal|cyan|emerald|violet|fuchsia|rose|amber|lime|sky|slate|gray|zinc|neutral|stone)-\\d{2,3})(?:\\s|$)/]",
          message: "Use semantic design tokens instead of Tailwind palette colors (e.g., text-destructive not text-red-500).",
        },
        {
          selector: "Literal[value=/(?:^|\\s)(?:bg-(?:red|blue|green|yellow|purple|pink|indigo|orange|teal|cyan|emerald|violet|fuchsia|rose|amber|lime|sky|slate|gray|zinc|neutral|stone)-\\d{2,3})(?:\\s|$)/]",
          message: "Use semantic design tokens instead of Tailwind palette colors (e.g., bg-primary not bg-blue-500).",
        },
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}/]",
          message: "Use semantic design tokens from index.css instead of raw hex colors.",
        },
      ],
    },
  },
);
