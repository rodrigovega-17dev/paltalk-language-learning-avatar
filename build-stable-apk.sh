#!/bin/bash

echo "🚀 Building STABLE Android APK for Real Devices..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf android/
rm -rf .expo/

# Install dependencies with legacy peer deps
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Verify environment configuration
echo "🔍 Verifying environment configuration..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local file found"
else
    echo "⚠️  .env.local file not found, using app.json configuration"
fi

# Pre-build with stable configuration
echo "🔧 Generating stable Android files..."
npx expo prebuild --platform android --clean

# Build stable APK
echo "🏗️ Building stable APK..."
cd android
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo "✅ STABLE APK generated successfully!"
    echo "📱 Location: android/app/build/outputs/apk/release/app-release.apk"
    
    # Copy APK with timestamp
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    cp app/build/outputs/apk/release/app-release.apk ../language-learning-avatar-stable-${TIMESTAMP}.apk
    echo "📁 Stable APK: language-learning-avatar-stable-${TIMESTAMP}.apk"
    
    # Show APK info
    echo "📊 APK Information:"
    ls -lh ../language-learning-avatar-stable-${TIMESTAMP}.apk
    
    echo ""
    echo "🎉 Ready for real device testing!"
    echo "📋 Test checklist:"
    echo "   ✓ Install on real Android device"
    echo "   ✓ Test login/signup flow"
    echo "   ✓ Check safe areas and layout"
    echo "   ✓ Test voice features"
    echo "   ✓ Verify no crashes"
else
    echo "❌ Error building stable APK"
    exit 1
fi