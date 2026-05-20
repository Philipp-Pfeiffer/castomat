import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@renderer/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-white/20 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-white/8 bg-white/8 text-white/90',
        secondary: 'border-white/5 bg-white/5 text-white/55',
        destructive: 'border-red-500/20 bg-red-500/20 text-red-400',
        outline: 'border-white/8 text-white/55'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
