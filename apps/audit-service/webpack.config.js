const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join, resolve } = require('path');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  resolve: {
    alias: {
      '@aegis/common': resolve(__dirname, '../../packages/index.ts'),
      '@aegis/types': resolve(__dirname, '../../packages/types/index.ts'),
      '@aegis/database': resolve(__dirname, '../../packages/database/index.ts'),
      '@aegis/auth': resolve(__dirname, '../../packages/auth/index.ts'),
      '@aegis/middlewares': resolve(__dirname, '../../packages/middlewares/index.ts'),
      '@aegis/events': resolve(__dirname, '../../packages/events/index.ts'),
      '@aegis/email-templates': resolve(__dirname, '../../packages/email-templates/index.ts'),
    },
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
    }),
  ],
};
