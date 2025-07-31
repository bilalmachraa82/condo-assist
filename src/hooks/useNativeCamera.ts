import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export function useNativeCamera() {
  const [isLoading, setIsLoading] = useState(false);

  const takePicture = async (options?: {
    source?: CameraSource;
    quality?: number;
  }) => {
    if (!Capacitor.isNativePlatform()) {
      // Fallback for web - use regular file input
      return null;
    }

    setIsLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: options?.quality || 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: options?.source || CameraSource.Prompt,
      });

      return {
        base64: image.base64String,
        format: image.format,
        webPath: image.webPath
      };
    } catch (error) {
      console.error('Error taking picture:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermissions = async () => {
    if (!Capacitor.isNativePlatform()) return true;
    
    const permissions = await Camera.checkPermissions();
    return permissions.camera === 'granted' && permissions.photos === 'granted';
  };

  const requestPermissions = async () => {
    if (!Capacitor.isNativePlatform()) return true;
    
    const permissions = await Camera.requestPermissions();
    return permissions.camera === 'granted' && permissions.photos === 'granted';
  };

  return {
    takePicture,
    checkPermissions,
    requestPermissions,
    isLoading,
    isNative: Capacitor.isNativePlatform()
  };
}