import globals from "globals";
import pluginJs from "@eslint/js";
import shopifyEslintPlugin from '@shopify/eslint-plugin';

const config = [
  {languageOptions: {globals: globals.browser}},
  pluginJs.configs.recommended,
  ...shopifyEslintPlugin.configs.esnext,
];

export default config;
