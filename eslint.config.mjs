import { defineConfig } from "eslint/config";
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      ".next/**",
      ".next-root-owned-cache/**",
      "node_modules/**",
      ".kilo/**",
    ],
  },
]);

export default eslintConfig;
