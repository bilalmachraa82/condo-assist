import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.547ef223c1fa45adb53c1ad4427f0d14',
  appName: 'condo-assist',
  webDir: 'dist',
  server: {
    url: 'https://547ef223-c1fa-45ad-b53c-1ad4427f0d14.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Geolocation: {
      permissions: ['location']
    }
  }
};

export default config;