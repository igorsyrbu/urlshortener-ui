import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const CULORI_ONLY_IN_THEME_BUILDER =
  "culori costs ~15 KB gzip; only src/lib/themes/custom-theme.ts may import it, so it stays out of the root layout.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/themes/custom-theme.ts", "src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {paths: [{name: "culori", message: CULORI_ONLY_IN_THEME_BUILDER}]}],
    },
  },
  {
    files: ["src/app/layout.tsx", "src/providers/**/*.{ts,tsx}", "src/lib/themes/theme-storage.ts", "src/lib/themes/palette-init-script.ts"],
    ignores: ["src/**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", {
        paths: [{name: "@/lib/themes/custom-theme", allowTypeImports: true, message: CULORI_ONLY_IN_THEME_BUILDER}],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
