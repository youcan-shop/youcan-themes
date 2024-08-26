import postcssDiscardComments from 'postcss-discard-comments'
import postcssPresetEnv from 'postcss-preset-env'

export default {
  plugins: [
    postcssPresetEnv({
      'nesting-rules': true,
      'features': {},
    }),
    postcssDiscardComments({
      removeAll: true
    }),
  ]
}
