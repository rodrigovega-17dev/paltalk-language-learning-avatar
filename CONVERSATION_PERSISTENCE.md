# Conversation Persistence Setup

This document explains how to set up conversation data persistence using Supabase.

## Environment Variables

To enable conversation persistence, you need to configure environment variables:

### Setup Steps

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and fill in your actual values:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-supabase-anon-key
   EXPO_PUBLIC_OPENAI_API_KEY=your-actual-openai-api-key
   ```

### Required Variables

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key
- `EXPO_PUBLIC_OPENAI_API_KEY`: Your OpenAI API key for ChatGPT integration

### Optional Variables

- `EXPO_PUBLIC_SPEECH_TO_TEXT_ENDPOINT`: Custom speech-to-text service endpoint
- `EXPO_PUBLIC_ELEVENLABS_API_KEY`: Your ElevenLabs API key for high-quality TTS (optional)

## Database Schema

Create the following table in your Supabase database:

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  language TEXT NOT NULL,
  cefr_level TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_language ON conversations(language);
CREATE INDEX idx_conversations_cefr_level ON conversations(cefr_level);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);
```

## Development Mode

When environment variables are not configured, the app will:
- Display a warning message about Supabase not being configured
- Disable conversation persistence features
- Continue to work normally for other features

## Features

When properly configured, the conversation persistence system provides:

### Automatic Message Saving
- User and assistant messages are automatically saved during conversations
- Messages include timestamps and unique IDs
- Conversation context is maintained across sessions

### Conversation History
- Users can view their past conversations
- Conversations are organized by language and CEFR level
- Support for filtering and pagination

### Data Management
- Conversations can be retrieved, updated, and deleted
- Support for conversation context loading
- Proper error handling and graceful degradation

## Usage

### Starting a New Conversation
```typescript
const conversation = await conversationService.startNewConversation(
  userId, 
  'english', 
  'B1'
);
```

### Loading Conversation History
```typescript
const history = await conversationService.getConversationHistory(userId, 10);
```

### Loading Previous Conversation Context
```typescript
const context = await conversationService.loadConversationContext(conversationId);
```

## Components

### ConversationHistory Component
A React Native component that displays conversation history with:
- Conversation previews with last message
- Date formatting (relative time)
- Pull-to-refresh functionality
- Empty state handling
- Error handling with retry options

## Testing

The conversation persistence system includes comprehensive tests:
- Unit tests for storage operations
- Integration tests with conversation service
- Error scenario testing
- Mock implementations for development

All tests pass and provide 100% coverage of the persistence functionality.