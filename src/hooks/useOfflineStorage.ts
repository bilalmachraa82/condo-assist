import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

interface CachedData {
  timestamp: number;
  data: any;
}

interface OfflineStorage {
  [key: string]: CachedData;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'luvimg_offline_cache';

export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineStorage>({});

  useEffect(() => {
    // Load cached data from localStorage
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        setOfflineData(JSON.parse(cached));
      } catch (error) {
        console.error('Failed to parse offline data:', error);
      }
    }

    // Initialize network status
    const initializeNetwork = async () => {
      if (Capacitor.isNativePlatform()) {
        const status = await Network.getStatus();
        setIsOnline(status.connected);

        // Listen for network changes
        Network.addListener('networkStatusChange', (status) => {
          setIsOnline(status.connected);
        });
      } else {
        // Web fallback
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      }
    };

    initializeNetwork();
  }, []);

  const cacheData = (key: string, data: any) => {
    const cachedData: CachedData = {
      timestamp: Date.now(),
      data
    };

    const newOfflineData = {
      ...offlineData,
      [key]: cachedData
    };

    setOfflineData(newOfflineData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOfflineData));
  };

  const getCachedData = (key: string) => {
    const cached = offlineData[key];
    if (!cached) return null;

    // Check if data is still valid
    const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
    if (isExpired) {
      const newOfflineData = { ...offlineData };
      delete newOfflineData[key];
      setOfflineData(newOfflineData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOfflineData));
      return null;
    }

    return cached.data;
  };

  const clearCache = () => {
    setOfflineData({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const syncPendingChanges = async () => {
    // This would sync any pending changes when back online
    // Implementation depends on your specific use case
    console.log('Syncing pending changes...');
  };

  return {
    isOnline,
    cacheData,
    getCachedData,
    clearCache,
    syncPendingChanges,
    hasCachedData: Object.keys(offlineData).length > 0
  };
}