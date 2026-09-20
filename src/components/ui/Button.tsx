import React from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none select-none';

const VARIANTS: Record<Variant, string> = {
  // The one red action per view
  primary: 'bg-pepper-500 hover:bg-pepper-600 text-white',
  secondary: 'border border-current/30 hover:bg-black/5 dark:hover:bg-white/10',
  ghost: 'hover:bg-black/5 dark:hover:bg-white/10',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-xs',
  md: 'h-10 px-5 text-sm',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, type = 'button', ...rest }, ref) => (
    <button ref={ref} type={type} className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...rest} />
  )
);
Button.displayName = 'Button';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  size?: 'sm' | 'md';
}

/** Round icon-only control. The accessible name is required. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'sm', className, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors duration-150 disabled:opacity-50',
        size === 'sm' ? 'w-8 h-8' : 'w-10 h-10',
        className
      )}
      {...rest}
    />
  )
);
IconButton.displayName = 'IconButton';
