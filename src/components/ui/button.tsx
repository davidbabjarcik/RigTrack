import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-90',
        outline: 'border bg-surface hover:bg-muted',
        ghost: 'hover:bg-muted',
        destructive: 'border border-destructive/40 text-destructive hover:bg-destructive/10',
      },
      size: {
        default: 'h-11 px-4',
        sm: 'h-9 px-3',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type Variants = VariantProps<typeof buttonVariants>

export function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & Variants) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

/** Odkaz, ktorý vyzerá ako tlačidlo. */
export function LinkButton({ className, variant, size, ...props }: LinkProps & Variants) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
