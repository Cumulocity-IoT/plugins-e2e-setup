module.exports = {
  preset: 'ts-jest',
  testRegex: 'src/.*spec.ts$',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
