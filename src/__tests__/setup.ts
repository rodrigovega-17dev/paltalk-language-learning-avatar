// Mock environment variables
process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'test-openai-api-key';
process.env.EXPO_PUBLIC_SPEECH_TO_TEXT_ENDPOINT = 'http://test-stt-endpoint';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(),
    })),
  })),
}));