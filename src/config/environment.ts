import Constants from 'expo-constants';

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  openaiApiKey: string;
  elevenLabsApiKey: string;
  speechToTextEndpoint: string;
  googleTranslateApiKey: string;
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
  supabaseUrl: getEnvVar('EXPO_PUBLIC_SUPABASE_URL', ''),
  supabaseAnonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', ''),
  openaiApiKey: getEnvVar('EXPO_PUBLIC_OPENAI_API_KEY', ''),
  elevenLabsApiKey: getEnvVar('EXPO_PUBLIC_ELEVENLABS_API_KEY', ''),
  speechToTextEndpoint: getEnvVar('EXPO_PUBLIC_SPEECH_TO_TEXT_ENDPOINT', ''),
  googleTranslateApiKey: getEnvVar('EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY', ''),
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