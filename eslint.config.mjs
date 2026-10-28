// AI Assistance Disclosure:
// Tool: Google Antigravity Agent, date: 2026-10-28
// Scope: Added k6 globals (__ENV, __VU, __ITER) for tests/k6 scripts.
// Author review: <to be completed by yanhwee>
//
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
// Scope: scripts/uat/uat-realtime.mjs shares the browser globals block with uat-d2-ui.mjs (page.evaluate callbacks; issue #197).
// Author review: <to be completed by Reallyeasy1>
//
// Tool: Google Antigravity Agent, date: 2026-10-21
// Scope: Added **/test-results/** to ESLint ignores.
// Author review: <to be completed by author after review>
//
// Tool: Google Antigravity, date: 2026-10-20
// Scope: Updated ESLint ignores for Prisma generated client path **/src/generated/**.
// Author review: <to be completed by author after review>
//
// Tool: Codex (model: GPT-5.6 Sol), date: 2026-10-11
// Scope: Added the root ESLint flat configuration for TypeScript, React, React Hooks, and repository scripts.
// Author review: <to be completed by ngkhengyang>

// AI-generated (edited by yanhwee)
// AI-generated (edited by ngkhengyang)
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
      },
    },
  },
);
