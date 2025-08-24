
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LOADING_MESSAGES } from '@/utils/constants';

interface LoadingSpinnerProps {
  message?: keyof typeof LOADING_MESSAGES | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'default', 
  size = 'md',
  className 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  const loadingText = typeof message === 'string' && message in LOADING_MESSAGES 
    ? LOADING_MESSAGES[message as keyof typeof LOADING_MESSAGES]
    : typeof message === 'string' 
      ? message 
      : LOADING_MESSAGES.default;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      <span className="text-sm text-muted-foreground">{loadingText}</span>
    </div>
  );
};

interface LoadingButtonProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  loadingText = LOADING_MESSAGES.processing,
  children,
  className,
  disabled,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {isLoading ? loadingText : children}
    </button>
  );
};

export const LoadingCard: React.FC<{ message?: string }> = ({ 
  message = LOADING_MESSAGES.loading 
}) => {
  return (
    <div className="border rounded-lg p-6 animate-pulse">
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner message={message} size="lg" />
      </div>
    </div>
  );
};

export const LoadingPage: React.FC<{ message?: string }> = ({ 
  message = LOADING_MESSAGES.loading 
}) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner message={message} size="lg" />
    </div>
  );
};
