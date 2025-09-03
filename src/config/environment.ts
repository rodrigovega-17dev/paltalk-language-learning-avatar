import Constants from 'expo-constants';

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  openaiApiKey: string;
  elevenLabsApiKey: string;
  speechToTextEndpoint: string;
}

// Get environment variables from Expo Constants (works in both dev and production)
const getEnvVar = (key: string, fallback: string = ''): string => {
  // Try multiple sources for environment variables
  
  // 1. Expo Constants extra (for production builds)
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  
  // 2. Expo Constants manifest extra (legacy)
  if (Constants.manifest?.extra?.[key]) {
    return Constants.manifest.extra[key];
  }
  
  // 3. Process env (for development)
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
  
  // 4. Direct access to expo config
  if (Constants.expoConfig?.env?.[key]) {
    return Constants.expoConfig.env[key];
  }
  
  console.warn(`Environment variable ${key} not found, using fallback: ${fallback}`);
  return fallback;
};

export const config: AppConfig = {
  supabaseUrl: getEnvVar('EXPO_PUBLIC_SUPABASE_URL', 'https://nlvtxrxcbsqggzjaovyb.supabase.co'),
  supabaseAnonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sdnR4cnhjYnNxZ2d6amFvdnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NzcyNDYsImV4cCI6MjA2OTE1MzI0Nn0.tSujENjByUNCMNnL67F9wpQsGEK6eR50nNffpzN__oU'),
  openaiApiKey: getEnvVar('EXPO_PUBLIC_OPENAI_API_KEY', ''),
  elevenLabsApiKey: getEnvVar('EXPO_PUBLIC_ELEVENLABS_API_KEY', 'sk_89e8f7f66056f398e500d0bb5802962f2ac84b95e5cf5927'),
  speechToTextEndpoint: getEnvVar('EXPO_PUBLIC_SPEECH_TO_TEXT_ENDPOINT', ''),
};

// Debug logging (only in development)
if (__DEV__) {
  console.log('Environment Configuration:');
  console.log('- Supabase URL:', config.supabaseUrl.substring(0, 30) + '...');
  console.log('- Supabase Key:', config.supabaseAnonKey.substring(0, 20) + '...');
  console.log('- OpenAI Key:', config.openaiApiKey.substring(0, 20) + '...');
  console.log('- ElevenLabs Key:', config.elevenLabsApiKey.substring(0, 20) + '...');
  console.log('- Speech Endpoint:', config.speechToTextEndpoint || 'Not configured');
  console.log('- Constants extra:', Constants.expoConfig?.extra ? 'Available' : 'Not available');
  console.log('- Process env available:', typeof process !== 'undefined' ? 'Yes' : 'No');
}

export default config;