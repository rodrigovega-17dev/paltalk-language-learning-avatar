module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@supabase|zustand|expo|expo-av|expo-speech|expo-modules-core)/)',
  ],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^expo$': '<rootDir>/node_modules/expo',
    '^expo-av$': '<rootDir>/node_modules/expo-av',
    '^expo-speech$': '<rootDir>/node_modules/expo-speech',
  },
};