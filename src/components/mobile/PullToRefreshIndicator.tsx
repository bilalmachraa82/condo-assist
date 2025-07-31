import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  opacity: number;
  shouldTrigger: boolean;
}

export function PullToRefreshIndicator({ 
  pullDistance, 
  isRefreshing, 
  opacity, 
  shouldTrigger 
}: PullToRefreshIndicatorProps) {
  return (
    <div 
      className="absolute top-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center text-muted-foreground transition-all duration-200 z-50"
      style={{ 
        transform: `translateX(-50%) translateY(${Math.max(0, pullDistance - 40)}px)`,
        opacity
      }}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
        shouldTrigger ? "bg-primary text-primary-foreground" : "bg-muted",
        isRefreshing && "animate-spin"
      )}>
        <RefreshCw className="h-4 w-4" />
      </div>
      <div className="text-xs mt-1 font-medium">
        {isRefreshing ? 'Atualizando...' : shouldTrigger ? 'Solte para atualizar' : 'Puxe para atualizar'}
      </div>
    </div>
  );
}