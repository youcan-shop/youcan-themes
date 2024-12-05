import globals from "globals";
import pluginJs from "@eslint/js";
import shopifyEslintPlugin from '@shopify/eslint-plugin';

const config = [
  {languageOptions: {globals: globals.browser}},
  pluginJs.configs.recommended,
  {
    files: ["themes/**/assets/*.js"],
    ignores: ["**/*.config.js"],
    rules: {
      semi: "error",
      "no-unused-vars": "warn",
    },
  },
  ...shopifyEslintPlugin.configs.esnext,
];

export default config;
