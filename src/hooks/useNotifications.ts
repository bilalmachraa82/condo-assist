import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNativePushNotifications } from './useNativePushNotifications';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const nativePush = useNativePushNotifications();

  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) return 'denied';
    
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const showNotification = async (options: NotificationOptions) => {
    // Use native push notifications if available
    if (nativePush.isNative) {
      await nativePush.showNotification(options);
      return;
    }

    // Fallback to web notifications
    if (!isSupported) {
      toast(options.title, { description: options.body });
      return;
    }

    if (permission === 'default') {
      const newPermission = await requestPermission();
      if (newPermission !== 'granted') {
        toast(options.title, { description: options.body });
        return;
      }
    }

    if (permission === 'granted') {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction
      });
    } else {
      toast(options.title, { description: options.body });
    }
  };

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    isNative: nativePush.isNative,
    registrationToken: nativePush.registrationToken
  };
}