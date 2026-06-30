import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

// Flat config covering the whole monorepo. ESLint handles correctness, Prettier
// handles formatting, and eslint-config-prettier (last) disables any stylistic
// rules that would fight Prettier. Type-aware linting is intentionally off to
// keep the lint loop fast; tsc owns type correctness via `yarn typecheck`.
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.config.{js,ts}",
      "apps/web/dist/**",
      "apps/api/prisma/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // TypeScript already checks for undefined identifiers, so the core rule is
    // redundant and produces false positives on Node and DOM globals.
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-undef": "off",
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  prettier,
);
