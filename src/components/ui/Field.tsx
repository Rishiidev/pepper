import React, { useId } from 'react';
import { cn } from './cn';

interface FieldProps {
  label: string;
  hint?: string;
  children: (props: { id: string; 'aria-describedby'?: string }) => React.ReactNode;
  className?: string;
}

/** Label + control + hint with the wiring done for you. */
export const Field: React.FC<FieldProps> = ({ label, hint, children, className }) => {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-text-primary">
        {label}
      </label>
      {children({ id, 'aria-describedby': hintId })}
      {hint && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
};

export const inputClass =
  'h-10 w-full rounded-input border border-border-strong bg-surface-card px-3 text-sm text-text-primary placeholder:text-text-muted';
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...rest }, ref) => (
  <input ref={ref} className={cn(inputClass, className)} style={{ borderColor: 'var(--pp-border-strong)' }} {...rest} />
));
Input.displayName = 'Input';
