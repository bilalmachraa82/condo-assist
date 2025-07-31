import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export function useNativeStorage() {
  const [isNative] = useState(Capacitor.isNativePlatform());

  const setItem = async (key: string, value: any): Promise<void> => {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (isNative) {
      await Preferences.set({ key, value: stringValue });
    } else {
      localStorage.setItem(key, stringValue);
    }
  };

  const getItem = async (key: string): Promise<string | null> => {
    if (isNative) {
      const { value } = await Preferences.get({ key });
      return value;
    } else {
      return localStorage.getItem(key);
    }
  };

  const removeItem = async (key: string): Promise<void> => {
    if (isNative) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  };

  const clear = async (): Promise<void> => {
    if (isNative) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  };

  const keys = async (): Promise<string[]> => {
    if (isNative) {
      const { keys } = await Preferences.keys();
      return keys;
    } else {
      return Object.keys(localStorage);
    }
  };

  // Helper method for JSON storage
  const setJSON = async (key: string, value: any): Promise<void> => {
    await setItem(key, JSON.stringify(value));
  };

  const getJSON = async <T = any>(key: string): Promise<T | null> => {
    const value = await getItem(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('Error parsing JSON from storage:', error);
      return null;
    }
  };

  return {
    isNative,
    setItem,
    getItem,
    removeItem,
    clear,
    keys,
    setJSON,
    getJSON
  };
}