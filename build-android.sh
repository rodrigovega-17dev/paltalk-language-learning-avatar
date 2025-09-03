#!/bin/bash

# Script para generar APK localmente con Expo Development Build
# Este script automatiza el proceso de build local

echo "🚀 Iniciando build local de Android APK..."

# Verificar que tienes las herramientas necesarias
echo "📋 Verificando dependencias..."

# Verificar Android Studio/SDK
if ! command -v adb &> /dev/null; then
    echo "❌ Android SDK no encontrado. Instala Android Studio primero."
    echo "   Descarga: https://developer.android.com/studio"
    exit 1
fi

# Verificar Java
if ! command -v java &> /dev/null; then
    echo "❌ Java no encontrado. Instala Java JDK 17 o superior."
    exit 1
fi

# Verificar Expo CLI
if ! command -v npx &> /dev/null; then
    echo "❌ Node.js/npm no encontrado."
    exit 1
fi

echo "✅ Dependencias verificadas"

# Limpiar builds anteriores
echo "🧹 Limpiando builds anteriores..."
rm -rf android/
rm -rf .expo/

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Pre-build para Android
echo "🔧 Generando archivos nativos de Android..."
npx expo prebuild --platform android --clean

# Build del APK
echo "🏗️ Compilando APK..."
cd android
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo "✅ APK generado exitosamente!"
    echo "📱 Ubicación: android/app/build/outputs/apk/release/app-release.apk"
    
    # Copiar APK a la raíz del proyecto
    cp app/build/outputs/apk/release/app-release.apk ../language-learning-avatar.apk
    echo "📁 APK copiado a: language-learning-avatar.apk"
    
    # Mostrar información del APK
    echo "📊 Información del APK:"
    ls -lh ../language-learning-avatar.apk
else
    echo "❌ Error al generar APK"
    exit 1
fi