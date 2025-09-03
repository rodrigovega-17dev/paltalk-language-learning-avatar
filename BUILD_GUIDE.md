# 🏗️ Guía para Generar APK Localmente

Esta guía te ayudará a generar un APK de tu app de Expo sin usar EAS (Expo Application Services).

## 📋 Prerrequisitos

### 1. **Android Studio & SDK**
```bash
# Descargar e instalar Android Studio
# https://developer.android.com/studio

# Configurar variables de entorno (añadir a ~/.zshrc o ~/.bashrc)
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

### 2. **Java JDK 17**
```bash
# macOS (con Homebrew)
brew install openjdk@17

# Configurar JAVA_HOME
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
```

### 3. **Node.js & npm**
```bash
# Verificar versión (debe ser 16+)
node --version
npm --version
```

## 🚀 Métodos de Build

### **Método 1: Expo Development Build (Recomendado)**

Este es el método más moderno y flexible:

```bash
# 1. Instalar dependencias
npm install

# 2. Generar archivos nativos
npx expo prebuild --platform android --clean

# 3. Compilar APK
cd android
./gradlew assembleRelease

# El APK estará en: android/app/build/outputs/apk/release/app-release.apk
```

**O usar el script automatizado:**
```bash
./build-android.sh
```

### **Método 2: Expo Build (Legacy)**

⚠️ **Nota**: Este método está deprecated pero aún funciona:

```bash
# Instalar Expo CLI global (si no lo tienes)
npm install -g @expo/cli

# Build APK
expo build:android --type apk
```

### **Método 3: Turtle CLI (Manual)**

Para control total del proceso:

```bash
# Instalar Turtle CLI
npm install -g @expo/turtle-cli

# Configurar
turtle setup:android

# Build
turtle build:android --platform android --type apk
```

## ⚙️ Configuración Adicional

### **Firma de APK (Opcional)**

Para apps de producción, necesitas firmar el APK:

1. **Generar keystore:**
```bash
keytool -genkey -v -keystore my-app-key.keystore -alias my-app-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configurar en android/app/build.gradle:**
```gradle
android {
    signingConfigs {
        release {
            storeFile file('../../my-app-key.keystore')
            storePassword 'your-password'
            keyAlias 'my-app-alias'
            keyPassword 'your-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### **Variables de Entorno**

Crea un archivo `.env.local` con tus claves API:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-key

# ElevenLabs
EXPO_PUBLIC_ELEVENLABS_API_KEY=your-elevenlabs-key
```

## 🐛 Solución de Problemas

### **Error: Android SDK not found**
```bash
# Verificar instalación
echo $ANDROID_HOME
adb version

# Si no funciona, reinstalar Android Studio y configurar SDK
```

### **Error: Java version incompatible**
```bash
# Verificar versión Java
java -version

# Debe ser JDK 17 o superior
```

### **Error: Gradle build failed**
```bash
# Limpiar cache de Gradle
cd android
./gradlew clean

# Rebuild
./gradlew assembleRelease
```

### **Error: Metro bundler**
```bash
# Limpiar cache de Metro
npx expo start --clear
```

## 📱 Instalación del APK

### **En dispositivo físico:**
```bash
# Habilitar "Fuentes desconocidas" en Configuración > Seguridad
# Transferir APK al dispositivo e instalar
```

### **Con ADB:**
```bash
# Conectar dispositivo por USB
adb devices

# Instalar APK
adb install language-learning-avatar.apk
```

### **En emulador:**
```bash
# Iniciar emulador desde Android Studio
# Arrastrar APK al emulador
```

## 🎯 Consejos Finales

1. **Primera vez**: El build puede tardar 10-15 minutos
2. **Builds posteriores**: Serán más rápidos (3-5 minutos)
3. **Tamaño del APK**: Típicamente 50-100MB para apps de Expo
4. **Testing**: Siempre prueba en dispositivo real antes de distribuir
5. **Optimización**: Usa `--release` para builds optimizados

## 📊 Verificación del APK

```bash
# Ver información del APK
aapt dump badging language-learning-avatar.apk

# Ver tamaño
ls -lh language-learning-avatar.apk

# Verificar firma (si está firmado)
jarsigner -verify language-learning-avatar.apk
```

¡Listo! Tu APK debería funcionar perfectamente en dispositivos Android. 🎉