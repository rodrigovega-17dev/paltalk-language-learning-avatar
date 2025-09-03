#!/bin/bash

# Setup script for environment variables
echo "Setting up environment variables for Language Learning Avatar..."

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backing up to .env.local.backup"
    cp .env.local .env.local.backup
fi

# Copy example file
cp .env.example .env.local

echo "✅ Created .env.local from .env.example"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env.local and replace placeholder values with your actual credentials"
echo "2. Get your Supabase credentials from: https://app.supabase.com/project/_/settings/api"
echo "3. Get your OpenAI API key from: https://platform.openai.com/api-keys"
echo ""
echo "📖 For detailed setup instructions, see CONVERSATION_PERSISTENCE.md"