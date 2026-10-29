import tseslint from 'typescript-eslint';
import decoratorNewline from './eslint-rules/decorator-newline.mjs';
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'work/**'] },
  ...tseslint.configs.recommended,
  {
    plugins: { 'project-style': { rules: { 'decorator-newline': decoratorNewline } } },
    rules: {
      'project-style/decorator-newline': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
