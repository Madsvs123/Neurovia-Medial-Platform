// ESLint 9 flat config (the previous .eslintrc.js was never loadable by the
// installed ESLint 9, so `npm run lint` had been broken).
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**', 'logs/**', 'public/**', 'uploads/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$|^req$|^res$', caughtErrors: 'none' }],
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // The new messaging module is held to a stricter standard than legacy code.
    files: ['modules/**/*.js', 'realtime/**/*.js', 'config/**/*.js', 'scripts/**/*.js'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'prefer-const': 'error',
      'eqeqeq': ['error', 'smart'],
    },
  },
];
