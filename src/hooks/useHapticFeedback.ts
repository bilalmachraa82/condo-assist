import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export function useHapticFeedback() {
  const vibrate = async (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (Capacitor.isNativePlatform()) {
      try {
        const impactStyle = {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy
        }[style];
        
        await Haptics.impact({ style: impactStyle });
      } catch (error) {
        console.warn('Haptic feedback not available:', error);
      }
    } else {
      // Web fallback - use Vibration API if available
      if ('vibrator' in navigator || 'vibrate' in navigator) {
        const duration = {
          light: 10,
          medium: 50,
          heavy: 100
        }[style];
        
        navigator.vibrate?.(duration);
      }
    }
  };

  const success = () => vibrate('light');
  const warning = () => vibrate('medium');
  const error = () => vibrate('heavy');

  return {
    vibrate,
    success,
    warning,
    error,
    isNative: Capacitor.isNativePlatform()
  };
}