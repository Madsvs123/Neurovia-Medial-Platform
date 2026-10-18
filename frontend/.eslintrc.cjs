/* ESLint 8 config — the project shipped a `lint` script but no config file. */
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', '*.backup', 'vitest.config.js', 'vitest.setup.js'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    'react-refresh/only-export-components': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^(_|React$)', caughtErrors: 'none' }],
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
  overrides: [
    {
      // The messaging feature is held to a stricter standard than legacy pages.
      files: ['src/features/**/*.{js,jsx}', 'src/lib/**/*.js'],
      rules: {
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^(_|React$)', caughtErrors: 'none' }],
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'prefer-const': 'error',
        eqeqeq: ['error', 'smart'],
      },
    },
    {
      files: ['**/__tests__/**', '**/*.test.{js,jsx}'],
      globals: { describe: 'readonly', it: 'readonly', test: 'readonly', expect: 'readonly', vi: 'readonly', beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly' },
    },
  ],
};
