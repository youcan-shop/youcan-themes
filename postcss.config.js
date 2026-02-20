import postcssDiscardComments from "postcss-discard-comments";
import postcssPresetEnv from "postcss-preset-env";
import postcssCascadeLayers from "@csstools/postcss-cascade-layers";

export default {
  plugins: [
    postcssCascadeLayers(),
    postcssPresetEnv({
      "nesting-rules": true,
      features: {},
    }),
    postcssDiscardComments({
      removeAll: true,
    }),
  ],
};
