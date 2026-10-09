import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**", "review-dist/**", "review/.render.mjs",
    "node_modules/**",
    "generated/**",
    ".local-ai/**",
    "next-env.d.ts",
  ]),
]);
