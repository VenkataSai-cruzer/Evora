'use client';

import { type HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-xl border transition-all duration-200',
  {
    variants: {
      variant: {
        default:
          'border-[var(--color-border)] bg-surface hover:bg-surface-hover',
        elevated:
          'border-[var(--color-border)] bg-surface-elevated',
        glass:
          'border-white/10 bg-white/5 backdrop-blur-xl',
      },
      hover: {
        true: 'hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5',
        false: '',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      hover: false,
      padding: 'md',
    },
  },
);

interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cardVariants({ variant, hover, padding, className })}
        {...props}
      />
    );
  },
);

Card.displayName = 'Card';
