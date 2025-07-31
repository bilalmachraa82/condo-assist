import { useState, useCallback, useRef, useEffect } from 'react';
import { useIsMobile } from './use-mobile';

interface PullToRefreshOptions {
  threshold?: number;
  refreshFunction: () => Promise<void> | void;
  disabled?: boolean;
}

export function usePullToRefresh({ 
  threshold = 80, 
  refreshFunction, 
  disabled = false 
}: PullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const isMobile = useIsMobile();
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || !isMobile) return;
    
    // Only trigger if we're at the top of the page
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [disabled, isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || startY.current === null || disabled || !isMobile) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    
    // Prevent scrolling when pulling down
    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  }, [isPulling, threshold, disabled, isMobile]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled || !isMobile) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await refreshFunction();
      } catch (error) {
        console.error('Pull to refresh error:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    startY.current = null;
  }, [isPulling, pullDistance, threshold, refreshFunction, disabled, isMobile]);

  // Reset states when component unmounts or disabled changes
  useEffect(() => {
    if (disabled) {
      setIsPulling(false);
      setPullDistance(0);
      setIsRefreshing(false);
      startY.current = null;
    }
  }, [disabled]);

  const refreshTriggerOpacity = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isPulling,
    pullDistance,
    isRefreshing,
    refreshTriggerOpacity,
    shouldTrigger,
    isEnabled: isMobile && !disabled
  };
}