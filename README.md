# Language Learning Avatar

An interactive language learning app with AI-powered conversation practice and animated avatar feedback.

## Features

- 🗣️ **Voice Conversations**: Practice speaking with an AI language tutor
- 🎭 **Animated Avatar**: Visual feedback and engagement through Lottie animations
- 📚 **CEFR Levels**: Support for A1-C2 language proficiency levels
- 🌍 **Multiple Languages**: English, Spanish, French, and German
- 🎵 **Dual TTS Providers**: Toggle between Expo Speech and ElevenLabs for different voice quality
- 🎤 **Voice Selection**: Choose from multiple ElevenLabs voices for each language
- 🏷️ **Audio Tags**: Predefined voice settings for different learning scenarios (speed, emotion, stability)
- 💾 **Conversation History**: Persistent conversation storage and retrieval
- 📱 **Cross-Platform**: Built with React Native and Expo

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd language-learning-avatar
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   ./setup-env.sh
   ```
   
   Or manually:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual credentials
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

### Required Services

To use all features, you'll need accounts and API keys for:

- **Supabase**: Database and authentication
  - Create account at [supabase.com](https://supabase.com)
  - Get your project URL and anon key from Settings > API
  
- **OpenAI**: ChatGPT integration
  - Create account at [platform.openai.com](https://platform.openai.com)
  - Generate API key from API Keys section

- **ElevenLabs**: High-quality TTS (optional)
  - Create account at [elevenlabs.io](https://elevenlabs.io)
  - Generate API key from Profile Settings

## Configuration

### Environment Variables

Create a `.env.local` file with:

```bash
# Supabase (required for persistence and auth)
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenAI (required for conversations)
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key

# Speech-to-Text (optional)
EXPO_PUBLIC_SPEECH_TO_TEXT_ENDPOINT=your-speech-service-endpoint

# ElevenLabs TTS (optional)
EXPO_PUBLIC_ELEVENLABS_API_KEY=sk_89e8f7f66056f398e500d0bb5802962f2ac84b95e5cf5927
```

### Database Setup

If using conversation persistence, set up your Supabase database:

1. Run the SQL schema from `CONVERSATION_PERSISTENCE.md`
2. Enable Row Level Security policies
3. Configure authentication settings

## Development

### Running Tests

```bash
npm test
```

### Project Structure

```
src/
├── components/          # React Native components
├── services/           # Business logic and API integrations
├── types/              # TypeScript type definitions
└── __tests__/          # Test files
```

### Key Components

- **ConversationScreen**: Main conversation interface
- **AvatarContainer**: Animated avatar display
- **ConversationHistory**: Past conversation viewer
- **SettingsScreen**: User preferences and configuration

### Key Services

- **conversationService**: Handles voice input/output and ChatGPT integration
- **conversationStorageService**: Manages conversation persistence
- **authService**: User authentication and profiles
- **avatarAnimationController**: Avatar animation management

## Features in Detail

### Conversation Persistence

The app automatically saves conversation history when properly configured:

- Messages are stored with timestamps and metadata
- Conversations can be filtered by language and CEFR level
- Full conversation context is maintained across sessions
- Graceful degradation when database is unavailable

See `CONVERSATION_PERSISTENCE.md` for detailed setup instructions.

### Avatar Animations

Interactive avatar provides visual feedback:

- Listening state animations
- Speaking state animations
- Idle state animations
- Synchronized with conversation flow

### Language Support

Currently supports:
- English (en-US)
- Spanish (es-ES)
- French (fr-FR)
- German (de-DE)

CEFR levels A1 through C2 with appropriate vocabulary and complexity.

## Deployment

### Expo Build

```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

### Environment Variables for Production

Set production environment variables in your deployment platform:
- Expo: Use `expo secrets:push`
- Vercel/Netlify: Set in dashboard
- App stores: Configure in build settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

[Add your license information here]

## Support

For issues and questions:
- Check existing GitHub issues
- Review documentation in `CONVERSATION_PERSISTENCE.md`
- Create a new issue with detailed information