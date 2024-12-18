/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'], // Path to tsconfig.json
    tsconfigRootDir: __dirname,   // Resolves the path correctly
    ecmaVersion: 'latest',        // ECMAScript version
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'eslint:recommended',
  ],
  // ignorePatterns: ['dist/', 'node_modules/'], // Exclude build output and node_modules
  // rules: {
  //   '@typescript-eslint/dot-notation': 'error',
  //   // Add other rules as needed
  // },

  extends: 'standard-with-typescript',
  env: {
    browser: true,
    node: true,
    jasmine: true,
    mocha: true,
    jest: true
  },
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018,
    project: './tsconfig.json'
  },
  ignorePatterns: [
    '.eslintrc.js',
    'app/private/**',
    'vagrant/**',
    'frontend/**',
    'dist/**'
  ],
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      rules: {
        'no-void': 'off', // conflicting with recommendation from @typescript-eslint/no-floating-promises
        // FIXME warnings below this line need to be checked and fixed.
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ],
};