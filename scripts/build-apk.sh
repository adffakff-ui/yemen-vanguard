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

# Setup Android SDK if missing
export ANDROID_HOME="${HOME}/android-sdk"
if [ ! -d "$ANDROID_HOME/cmdline-tools" ]; then
  echo "=== Downloading Android Command Line Tools ==="
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  cd "$ANDROID_HOME"
  
  # Download command line tools
  curl -o commandlinetools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q commandlinetools.zip
  mkdir -p cmdline-tools/latest
  mv cmdline-tools/bin cmdline-tools/latest/
  mv cmdline-tools/lib cmdline-tools/latest/
  rm -f commandlinetools.zip
  cd - > /dev/null
fi

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

if ! command -v sdkmanager &> /dev/null; then
  echo "Warning: sdkmanager not found in PATH. Attempting standard paths..."
fi

echo "=== Accepting Android SDK Licenses & Installing Build Tools ==="
yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses || true
sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# Write local.properties for Gradle
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

echo "=== 3. Building Android APK via Gradle (Debug) ==="
cd android
./gradlew assembleDebug

echo "=== Build Complete! ==="
echo "APK location: android/app/build/outputs/apk/debug/app-debug.apk"
