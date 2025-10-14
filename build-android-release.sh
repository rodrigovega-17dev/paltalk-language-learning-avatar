#!/bin/bash

# Android Release Build Script for BlaBla! Language Learning App
# This script builds a production-ready APK with all environment variables bundled

set -e  # Exit on any error

echo "======================================"
echo "BlaBla! Android Release Build"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_error ".env.local file not found!"
    echo "Please create .env.local with your API keys before building."
    exit 1
fi

print_success "Found .env.local file"

# Load environment variables from .env.local
echo ""
echo "Loading environment variables..."
export $(cat .env.local | grep -v '^#' | xargs)

# Verify critical environment variables
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ]; then
    print_error "EXPO_PUBLIC_SUPABASE_URL is not set!"
    exit 1
fi

if [ -z "$EXPO_PUBLIC_OPENAI_API_KEY" ]; then
    print_error "EXPO_PUBLIC_OPENAI_API_KEY is not set!"
    exit 1
fi

if [ -z "$EXPO_PUBLIC_ELEVENLABS_API_KEY" ]; then
    print_error "EXPO_PUBLIC_ELEVENLABS_API_KEY is not set!"
    exit 1
fi

print_success "All required environment variables are set"

# Update app.json with environment variables
echo ""
echo "Updating app.json with environment variables..."

# Backup original app.json
cp app.json app.json.backup

# Use node to update app.json with environment variables
node -e "
const fs = require('fs');
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Update extra section with environment variables
appJson.expo.extra = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    EXPO_PUBLIC_OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
    EXPO_PUBLIC_ELEVENLABS_API_KEY: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '',
    EXPO_PUBLIC_SPEECH_TO_TEXT_ENDPOINT: process.env.EXPO_PUBLIC_SPEECH_TO_TEXT_ENDPOINT || '',
    EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY || '',
};

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
console.log('app.json updated successfully');
"

print_success "app.json updated with environment variables"

# Run prebuild to generate native Android project
echo ""
echo "Running Expo prebuild for Android..."
npx expo prebuild --platform android --clean

print_success "Prebuild completed"

# Build the release APK
echo ""
echo "Building Android release APK..."
cd android
./gradlew assembleRelease

print_success "Android build completed!"

# Find and copy the APK
echo ""
echo "Locating release APK..."

APK_PATH="app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
    # Generate timestamp for APK name
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    OUTPUT_NAME="blabla-release-${TIMESTAMP}.apk"

    # Copy APK to project root
    cp "$APK_PATH" "../${OUTPUT_NAME}"

    cd ..

    print_success "APK copied to: ${OUTPUT_NAME}"

    # Get file size
    SIZE=$(du -h "${OUTPUT_NAME}" | cut -f1)
    echo ""
    echo "======================================"
    echo "Build Summary:"
    echo "======================================"
    echo "APK Location: ${OUTPUT_NAME}"
    echo "APK Size: ${SIZE}"
    echo ""
    print_success "Build completed successfully!"
    echo ""
    echo "You can now install this APK on your Android device."
    echo "Transfer it via USB, email, or cloud storage."
    echo ""
else
    cd ..
    print_error "APK file not found at expected location!"
    exit 1
fi

# Restore original app.json (remove API keys from source)
echo "Restoring original app.json..."
mv app.json.backup app.json
print_success "Original app.json restored"

echo ""
print_warning "IMPORTANT: The APK contains your API keys. Keep it secure!"
echo ""
