module.exports = {
  env: {
    browser: false,
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:security/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:jsdoc/recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'node/no-unsupported-features/es-syntax': ['error', { ignores: ['modules'] }],
    'import/order': ['error', {
      groups: ['builtin', 'external', 'internal'],
      'newlines-between': 'always'
    }],
    'import/no-unresolved': 'off',
    'jsdoc/require-returns': 'off',
    'jsdoc/require-param': 'off',
    'security/detect-object-injection': 'off',
    'node/no-missing-import': 'off'
  },
  overrides: [
    {
      files: ['**/*.test.js'],
      rules: {
        'node/no-unpublished-require': 'off'
      }
    }
  ]
};