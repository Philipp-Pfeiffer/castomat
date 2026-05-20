import * as React from 'react'
import { cn } from '@renderer/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white/90 ring-offset-white/5 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white placeholder:text-white/35 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 glass-hover transition-all duration-200',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export { Input }
