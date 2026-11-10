// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1); Google Antigravity Agent; Google Antigravity; Codex (model: GPT-5.6 Sol), date: 2026-10-11 to 2026-11-08
// Scope: Added the root ESLint flat configuration for TypeScript, React, React Hooks, and repository scripts; updated across 6 AI-assisted revisions through D4 wrap-up (added the k6 open() global to the tests/k6 block (tests/k6/lib/perf.js reads requirements.json and fixtures; issue #236)).
// Author review: I validated correctness, edited for style, and verified with automated tests.

import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/test-results/**",
      "**/.vite/**",
      "**/.turbo/**",
      "**/generated/**",
      "**/src/generated/**",
    ],
  },
  js.configs.recommended,
  {
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["services/**/*.ts", "packages/**/*.ts", "scripts/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["services/**/test/**/*.ts", "services/**/tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["apps/*/vite.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["apps/*/src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["scripts/uat/uat-d2-ui.mjs", "scripts/uat/uat-realtime.mjs"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["tests/k6/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        __ENV: "readonly",
        __VU: "readonly",
        __ITER: "readonly",
        open: "readonly",
      },
    },
  },
);
