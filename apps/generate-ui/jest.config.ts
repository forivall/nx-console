/* eslint-disable */
export default {
  coverageDirectory: '../../coverage/apps/generate-ui',

  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  globals: {},
  displayName: 'generate-ui',
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
  transform: {
    '^.+.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        stringifyContentPathRegex: '\\.(html|svg)$',

        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*.mjs$)'],
  preset: '../../jest.preset.js',
};
