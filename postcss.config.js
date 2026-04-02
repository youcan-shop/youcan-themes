import postcssDiscardComments from "postcss-discard-comments";
import postcssPresetEnv from "postcss-preset-env";

export default {
  plugins: [
    postcssPresetEnv({
      "nesting-rules": true,
      features: {
        "cascade-layers": false,
      },
    }),
    postcssDiscardComments({
      removeAll: true,
    }),
  ],
};
