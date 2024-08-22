import discardComments from 'postcss-discard-comments';

export default {
  plugins: [
    discardComments({
      removeAll: true,
    }),
  ],
};