#!/bin/bash

echo "🔧 Android SDK Setup Verification"
echo "================================="

# Check Android SDK
echo "📱 Checking Android SDK..."
if [ -z "$ANDROID_HOME" ]; then
    echo "❌ ANDROID_HOME not set"
    echo "   Add to ~/.zshrc or ~/.bashrc:"
    echo "   export ANDROID_HOME=\$HOME/Android/Sdk"
    echo "   export PATH=\$PATH:\$ANDROID_HOME/emulator"
    echo "   export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
else
    echo "✅ ANDROID_HOME: $ANDROID_HOME"
fi

# Check ADB
if command -v adb &> /dev/null; then
    echo "✅ ADB: $(adb version | head -1)"
else
    echo "❌ ADB not found - Install Android Studio"
fi

# Check Java
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -1)
    echo "✅ Java: $JAVA_VERSION"
else
    echo "❌ Java not found - Install JDK 17+"
fi

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
fi

# Check Gradle (after prebuild)
if [ -f "android/gradlew" ]; then
    echo "✅ Gradle wrapper found"
else
    echo "⚠️  Gradle wrapper not found - Run 'npx expo prebuild' first"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Fix any ❌ issues above"
echo "2. Run: npm install"
echo "3. Run: ./build-android.sh"
echo "4. Find APK in: android/app/build/outputs/apk/release/"