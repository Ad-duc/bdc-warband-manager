/*
 * File:        eslint.config.js
 * Role:        ESLint flat configuration: TypeScript (type-aware), React hooks,
 *              React refresh, plus a ban on JSX text so that every visible
 *              string goes through i18n.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "coverage", "dev-dist", "playwright-report", "test-results", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: { allowDefaultProject: ["eslint.config.js"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Visible text must come from the i18n files, never from the JSX.
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXText[value=/[A-Za-z\\u00C0-\\u017F]/]",
          message: "Hard-coded text: use t('...') from react-i18next.",
        },
      ],
    },
  },
  {
    files: ["src/rules/**/*.ts"],
    rules: {
      // The rules engine stays framework free.
      "no-restricted-imports": [
        "error",
        { patterns: ["react", "react-*", "@testing-library/*", "zustand", "dexie", "i18next"] },
      ],
    },
  },
  {
    files: ["**/*.js"],
    ...tseslint.configs.disableTypeChecked,
  },
);
