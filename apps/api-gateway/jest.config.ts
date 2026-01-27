export default {
  displayName: 'api-gateway',
  // preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api-gateway',
  moduleNameMapper: {
    '^@aegis/common$': '<rootDir>/../../packages/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
