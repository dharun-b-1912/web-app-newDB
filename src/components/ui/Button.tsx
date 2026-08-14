import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium font-sans transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857] focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap active:scale-[0.99] select-none rounded-[10px]',
  {
    variants: {
      variant: {
        primary:
          'bg-[#07563D] hover:bg-[#064E3B] text-white shadow-sm border border-transparent active:bg-[#064E3B] font-semibold',
        secondary:
          'bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#07563D] border border-[#A7F3D0] shadow-xs font-semibold',
        outline:
          'bg-white hover:bg-[#F9FAFB] text-[#0F172B] border border-[#E7EAF0] shadow-xs hover:border-slate-300 font-medium',
        ghost:
          'bg-transparent hover:bg-[#F9FAFB] text-[#62748E] hover:text-[#0F172B]',
        danger:
          'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm border border-transparent font-semibold',
        warning:
          'bg-[#D89A16] hover:bg-[#B45309] text-white shadow-sm border border-transparent font-semibold',
        success:
          'bg-[#15845B] hover:bg-[#0F5A3E] text-white shadow-sm border border-transparent font-semibold',
        link:
          'text-[#047857] underline-offset-4 hover:underline p-0 h-auto font-medium',
      },
      size: {
        sm: 'text-xs px-2.5 py-1.5 h-8 gap-1.5 rounded-[8px]',
        md: 'text-[13.5px] px-3.5 py-2 h-9 gap-2 rounded-[10px]',
        lg: 'text-base px-5 py-2.5 h-11 gap-2.5 rounded-[12px] font-semibold',
        icon: 'h-9 w-9 p-0 rounded-[10px]',
        'icon-sm': 'h-7 w-7 p-0 rounded-[8px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant: variant as any, size: size as any }), className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-current border-t-transparent mr-1.5" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
