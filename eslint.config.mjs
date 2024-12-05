import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  {
    files: ["themes/**/assets/*.js"],
    rules: {
        semi: "error",
        "no-unused-vars": "warn",
    }
  }
];
