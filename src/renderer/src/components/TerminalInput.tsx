import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { cn } from '@renderer/lib/utils'

interface TerminalInputProps {
  onSubmit: (input: string) => void
  isRunning: boolean
  className?: string
  placeholder?: string
}

export const TerminalInput = ({
  onSubmit,
  isRunning,
  className,
  placeholder = 'Enter command...'
}: TerminalInputProps) => {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when terminal starts
  useEffect(() => {
    if (isRunning && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isRunning])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      onSubmit(input)
      setInput('')
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-3 border-t border-white/10 bg-black/30',
        className
      )}
    >
      <span className="text-green-500 font-mono text-sm shrink-0">{'>'}</span>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={!isRunning}
        className={cn(
          'flex-1 bg-transparent text-sm font-mono text-white/87 outline-none',
          'placeholder:text-white/40',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        autoFocus
      />
    </div>
  )
}
