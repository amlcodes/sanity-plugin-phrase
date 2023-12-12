import { defineConfig } from '@sanity/pkg-utils'

export default defineConfig({
  legacyExports: true,
  dist: 'dist',
  tsconfig: 'tsconfig.dist.json',
  minify: false,
  bundles: [
    {
      source: './src/_exports/index.ts',
      require: './dist/index.js',
      import: './dist/index.esm.js',
    },
    {
      source: './src/_exports/adapters.ts',
      require: './dist/adapters.js',
      import: './dist/adapters.esm.js',
    },
    {
      source: './src/_exports/config.ts',
      require: './dist/config.js',
      import: './dist/config.esm.js',
    },
    {
      source: './src/_exports/backend.ts',
      require: './dist/backend.js',
      import: './dist/backend.esm.js',
    },
    {
      source: './src/_exports/utils.ts',
      require: './dist/utils.js',
      import: './dist/utils.esm.js',
    },
  ],

  // Remove this block to enable strict export validation
  extract: {
    rules: {
      'ae-forgotten-export': 'off',
      'ae-incompatible-release-tags': 'off',
      'ae-internal-missing-underscore': 'off',
      'ae-missing-release-tag': 'off',
      'tsdoc-unsupported-tag': 'off',
      'tsdoc-undefined-tag': 'off',
    },
  },
})
