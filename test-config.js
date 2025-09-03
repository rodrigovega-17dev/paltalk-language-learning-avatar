// Simple test script to verify environment configuration
const { config } = require('./src/config/environment.ts');

console.log('Testing environment configuration...');
console.log('OpenAI API Key:', config.openaiApiKey ? 'Present' : 'Missing');
console.log('ElevenLabs API Key:', config.elevenLabsApiKey ? 'Present' : 'Missing');
console.log('Supabase URL:', config.supabaseUrl ? 'Present' : 'Missing');
console.log('Supabase Anon Key:', config.supabaseAnonKey ? 'Present' : 'Missing');

if (config.openaiApiKey && config.elevenLabsApiKey && config.supabaseUrl && config.supabaseAnonKey) {
  console.log('✅ All API keys are configured');
} else {
  console.log('❌ Some API keys are missing');
}