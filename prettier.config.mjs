/** @type {import('prettier').Config} */
const config = {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  plugins: ['prettier-plugin-prisma', 'prettier-plugin-tailwindcss'],
};

export default config;
