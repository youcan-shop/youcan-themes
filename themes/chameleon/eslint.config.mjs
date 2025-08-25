import globals from "globals";
import pluginJs from "@eslint/js";
import shopifyEslintPlugin from "@shopify/eslint-plugin";
import prettier from "eslint-config-prettier";

const config = [
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...shopifyEslintPlugin.configs.esnext,
  {
    rules: {
      ...prettier.rules,
      semi: "error",
      "no-unused-vars": "warn",
    },
  },
  {
    globals: {
      youcanjs: "readonly",
      publish: "readonly",
      subscribe: "readonly",
      PUB_SUB_EVENTS: "readonly",
      toast: "readonly",
    },
  },
];

export default config;
