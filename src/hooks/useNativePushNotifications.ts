import { useState, useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useNotifications } from './useNotifications';

export function useNativePushNotifications() {
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const webNotifications = useNotifications();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initializePushNotifications();
    }
  }, []);

  const initializePushNotifications = async () => {
    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      
      if (permStatus.receive !== 'granted') {
        throw new Error('User denied permissions!');
      }

      // Register with Apple / Google to receive push via APNS/FCM
      await PushNotifications.register();

      // On success, we should be able to receive notifications
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        setRegistrationToken(token.value);
        setIsRegistered(true);
      });

      // Some issue with our setup and push will not work
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      // Show us the notification payload if the app is open on our device
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
      });

      // Method called when tapping on a notification
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
      });

    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  const showNotification = async (options: {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
  }) => {
    if (Capacitor.isNativePlatform() && isRegistered) {
      // For native, notifications are handled by the backend
      // This would typically send the notification via your backend
      console.log('Would send push notification:', options);
    } else {
      // Fallback to web notifications
      await webNotifications.showNotification(options);
    }
  };

  return {
    isNative: Capacitor.isNativePlatform(),
    isRegistered,
    registrationToken,
    showNotification,
    webNotifications: !Capacitor.isNativePlatform() ? webNotifications : null
  };
}