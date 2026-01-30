import { useRef, useEffect } from 'react'
import { cn } from '@renderer/lib/utils'

interface TerminalOutputProps {
  lines: Array<{ id: number; content: string }>
  className?: string
}

export const TerminalOutput = ({ lines, className }: TerminalOutputProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex-1 overflow-y-auto p-4 font-mono text-sm text-white/87',
        'bg-black/20',
        className
      )}
    >
      {lines.map((line) => (
        <div key={line.id} className="whitespace-pre-wrap break-all">
          {line.content}
        </div>
      ))}
    </div>
  )
}
