import { useEffect } from 'react'
import { cn } from '@renderer/lib/utils'
import { TerminalOutput } from './TerminalOutput'
import { TerminalInput } from './TerminalInput'
import { useTerminal } from '@renderer/hooks'

interface TerminalProps {
  initialCommand?: string
  className?: string
}

export const Terminal = ({ initialCommand, className }: TerminalProps) => {
  const { lines, isRunning, sendInput, startTerminal, stopTerminal } = useTerminal()

  // Start terminal on mount
  useEffect(() => {
    startTerminal()

    // Send initial command if provided
    if (initialCommand) {
      // Small delay to ensure terminal is ready
      const timer = setTimeout(() => {
        sendInput(initialCommand)
      }, 100)
      return () => clearTimeout(timer)
    }

    return () => {
      stopTerminal()
    }
  }, [initialCommand, startTerminal, stopTerminal, sendInput])

  const handleSubmit = (input: string) => {
    sendInput(input)
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full w-full overflow-hidden rounded-xl',
        'bg-zinc-900/50',
        className
      )}
    >
      <TerminalOutput lines={lines} />
      <TerminalInput onSubmit={handleSubmit} isRunning={isRunning} />
    </div>
  )
}
