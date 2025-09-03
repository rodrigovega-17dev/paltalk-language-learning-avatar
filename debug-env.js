// Debug script to check environment variables
console.log('=== Environment Variables Debug ===');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '[SET]' : '[NOT SET]');
console.log('EXPO_PUBLIC_OPENAI_API_KEY:', process.env.EXPO_PUBLIC_OPENAI_API_KEY ? '[SET]' : '[NOT SET]');
console.log('EXPO_PUBLIC_ELEVENLABS_API_KEY:', process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ? '[SET]' : '[NOT SET]');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('===================================');