#!/usr/bin/env bash
set -e

echo "=== 1. Building Vite Web Assets ==="
npm run build

echo "=== 2. Initializing / Syncing Capacitor Android Project ==="
if [ ! -d "android" ]; then
  echo "Android platform not found. Adding Android platform..."
  npx cap add android
else
  echo "Syncing web assets with Capacitor Android..."
  npx cap sync android
fi

echo "=== 3. Building Android APK via Gradle (Debug) ==="
cd android
./gradlew assembleDebug

echo "=== Build Complete! ==="
echo "APK location: android/app/build/outputs/apk/debug/app-debug.apk"
