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
      '@aegis/database': resolve(
        __dirname,
        '../../packages/database/client.ts'
      ),
      '@aegis/auth': resolve(__dirname, '../../packages/auth/index.ts'),
      '@aegis/middlewares': resolve(__dirname, '../../packages/middlewares/index.ts'),
      '@aegis/gateway': resolve(__dirname, '../../packages/gateway/index.ts'),
    },
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
    }),
  ],
};
