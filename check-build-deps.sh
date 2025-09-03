#!/bin/bash

# Script para verificar dependencias de build de Android

echo "🔍 Verificando dependencias para build de Android..."
echo "================================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar comando
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $1 encontrado${NC}"
        if [ "$1" = "java" ]; then
            java -version 2>&1 | head -1
        elif [ "$1" = "node" ]; then
            echo "   Versión: $(node --version)"
        elif [ "$1" = "adb" ]; then
            echo "   Android SDK configurado"
        fi
        return 0
    else
        echo -e "${RED}❌ $1 no encontrado${NC}"
        return 1
    fi
}

# Verificar Node.js
echo "📦 Node.js y npm:"
check_command "node"
check_command "npm"
check_command "npx"

echo ""

# Verificar Java
echo "☕ Java JDK:"
check_command "java"
check_command "javac"

echo ""

# Verificar Android SDK
echo "🤖 Android SDK:"
check_command "adb"

if [ -z "$ANDROID_HOME" ]; then
    echo -e "${RED}❌ ANDROID_HOME no está configurado${NC}"
    echo -e "${YELLOW}   Configura: export ANDROID_HOME=\$HOME/Android/Sdk${NC}"
else
    echo -e "${GREEN}✅ ANDROID_HOME configurado: $ANDROID_HOME${NC}"
fi

echo ""

# Verificar Expo CLI
echo "🚀 Expo:"
if npm list -g @expo/cli &> /dev/null; then
    echo -e "${GREEN}✅ Expo CLI instalado globalmente${NC}"
else
    echo -e "${YELLOW}⚠️  Expo CLI no instalado globalmente${NC}"
    echo -e "${YELLOW}   Puedes usar: npx expo${NC}"
fi

echo ""

# Verificar archivos del proyecto
echo "📁 Archivos del proyecto:"
if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ package.json encontrado${NC}"
else
    echo -e "${RED}❌ package.json no encontrado${NC}"
fi

if [ -f "app.json" ]; then
    echo -e "${GREEN}✅ app.json encontrado${NC}"
else
    echo -e "${RED}❌ app.json no encontrado${NC}"
fi

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules instalado${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules no encontrado${NC}"
    echo -e "${YELLOW}   Ejecuta: npm install${NC}"
fi

echo ""
echo "🎯 Resumen:"
echo "=========="

# Verificar si todo está listo
all_good=true

if ! command -v node &> /dev/null; then all_good=false; fi
if ! command -v java &> /dev/null; then all_good=false; fi
if ! command -v adb &> /dev/null; then all_good=false; fi
if [ -z "$ANDROID_HOME" ]; then all_good=false; fi

if [ "$all_good" = true ]; then
    echo -e "${GREEN}🎉 ¡Todo listo para generar APK!${NC}"
    echo ""
    echo "Para generar APK, ejecuta:"
    echo "  npm run build:android"
    echo ""
    echo "O manualmente:"
    echo "  npm run prebuild:android"
    echo "  npm run build:apk"
else
    echo -e "${RED}❌ Faltan algunas dependencias${NC}"
    echo ""
    echo -e "${YELLOW}📋 Pasos para completar setup:${NC}"
    
    if ! command -v java &> /dev/null; then
        echo "  1. Instalar Java JDK 17: brew install openjdk@17"
    fi
    
    if ! command -v adb &> /dev/null || [ -z "$ANDROID_HOME" ]; then
        echo "  2. Instalar Android Studio y configurar SDK"
        echo "     https://developer.android.com/studio"
    fi
    
    echo "  3. Configurar variables de entorno en ~/.zshrc:"
    echo "     export ANDROID_HOME=\$HOME/Android/Sdk"
    echo "     export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
fi

echo ""