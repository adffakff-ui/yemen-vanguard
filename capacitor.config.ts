import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tacticalgame.app',
  appName: 'Tactical Strike',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      keystorePath: 'debug.keystore',
      keystoreAlias: 'androiddebugkey',
      keystorePassword: 'android'
    }
  }
};

export default config;
