// eslint-disable-next-line no-undef
module.exports = {
  env: {
    browser: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
    'linebreak-style': ['error', 'unix'],
    semi: ['error', 'always'],
    '@typescript-eslint/explicit-module-boundary-types': 0,
    '@typescript-eslint/no-inferrable-types': 0,
    'import/no-unused-modules': [1, { unusedExports: true }],
    'import/no-default-export': 'error',
  },
};
