import rootConfig from '../../eslint.config.mjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...rootConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
