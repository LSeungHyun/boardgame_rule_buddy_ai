import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl', 
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none'
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4 sm:p-6',
  md: 'p-4 sm:p-6 md:p-8',
  lg: 'p-6 sm:p-8 md:p-12'
};

export function ResponsiveContainer({ 
  children, 
  maxWidth = 'lg', 
  padding = 'md',
  className 
}: ResponsiveContainerProps) {
  return (
    <div className={cn(
      'w-full mx-auto',
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}