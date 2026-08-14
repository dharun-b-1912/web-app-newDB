import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'outline';
  className?: string;
  key?: React.Key;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
}

export const Card = ({ className, variant = 'default', children, ...props }: CardProps) => {
  const variants = {
    default: 'bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
    flat: 'bg-gray-50 rounded-2xl border border-gray-100',
    outline: 'bg-white rounded-2xl border border-gray-200',
  };

  return (
    <div className={cn(variants[variant], 'p-5 transition-all', className)} {...props}>
      {children}
    </div>
  );
};
