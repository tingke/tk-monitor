import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'demo', 'coverage'] },
  ...tseslint.configs.recommended,
);
