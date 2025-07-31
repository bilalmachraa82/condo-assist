import { useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface Position {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function useNativeGeolocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);

  const getCurrentPosition = async (): Promise<Position> => {
    setIsLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });

        const position = {
          latitude: coordinates.coords.latitude,
          longitude: coordinates.coords.longitude,
          accuracy: coordinates.coords.accuracy
        };

        setCurrentPosition(position);
        return position;
      } else {
        // Fallback for web
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const pos = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              };
              setCurrentPosition(pos);
              resolve(pos);
            },
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermissions = async () => {
    if (!Capacitor.isNativePlatform()) return true;
    
    const permissions = await Geolocation.checkPermissions();
    return permissions.location === 'granted';
  };

  const requestPermissions = async () => {
    if (!Capacitor.isNativePlatform()) return true;
    
    const permissions = await Geolocation.requestPermissions();
    return permissions.location === 'granted';
  };

  return {
    getCurrentPosition,
    checkPermissions,
    requestPermissions,
    currentPosition,
    isLoading,
    isNative: Capacitor.isNativePlatform()
  };
}