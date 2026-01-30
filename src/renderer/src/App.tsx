import { useState, useRef, KeyboardEvent, useEffect } from 'react'

import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup
} from '@renderer/elements/Command'
import { CommandEmpty, CommandShortcut } from '@renderer/elements/Command'
import { Footer } from '@renderer/elements/Footer'
import { Commands } from '@renderer/components/Commands'
import { CommandPage } from '@renderer/components/CommandPage'
import { CommandApplications } from '@renderer/components/CommandApplications'
import { CommandShortcuts } from '@renderer/components/CommandShortcuts'
import { useScrollToTop, useCommandValidator } from '@renderer/hooks'
import { Settings } from '@renderer/components/Settings'
import { Terminal } from '@renderer/components/Terminal'
import { ExitConfirmation } from '@renderer/components/ExitConfirmation'

type AppMode = 'search' | 'terminal' | 'exit-confirmation'

const App = () => {
  const [selectedCommand, setSelectedCommand] = useState<CommandT | null>(null)
  const [commandSearch, setCommandSearch] = useState('')
  const [mode, setMode] = useState<AppMode>('search')
  const [initialTerminalCommand, setInitialTerminalCommand] = useState<string>('')
  const commandListRef = useRef<HTMLDivElement | null>(null)
  const [currentBangName, setCurrentBangName] = useState<string | null>(null)

  const { isValidCommand } = useCommandValidator(commandSearch)

  useScrollToTop(commandListRef, [commandSearch])

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (mode === 'terminal') {
        setMode('exit-confirmation')
      } else if (mode === 'exit-confirmation') {
        setMode('search')
        setCommandSearch('')
      } else {
        setCommandSearch('')
      }
    }
  }

  const handleRunInTerminal = () => {
    if (commandSearch.trim()) {
      setInitialTerminalCommand(commandSearch)
      setMode('terminal')
    }
  }

  const handleCancelExit = () => {
    setMode('terminal')
  }

  const handleConfirmExit = () => {
    setMode('search')
    setCommandSearch('')
    setInitialTerminalCommand('')
  }

  const commandFilter = (value: string, search: string, keywords: string[] | undefined): number => {
    if (value && value.startsWith('sc-')) return 1
    const extendValue = keywords?.join(' ') || ''
    const words = search.toLowerCase().split(' ')
    const found = words.every((word) => extendValue.toLowerCase().includes(word))
    return found ? 1 : 0
  }

  // Handle keyboard events for exit confirmation
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (mode === 'exit-confirmation') {
        if (e.key === 'Escape') {
          e.preventDefault()
          handleConfirmExit()
        } else if (e.key !== 'Escape') {
          handleCancelExit()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode])

  return (
    <div className="glass h-full rounded-xl relative">
      {mode === 'search' && !selectedCommand && (
        <Command
          filter={commandFilter}
          loop
          defaultValue={
            isValidCommand && commandSearch.trim() ? `terminal-${commandSearch}` : undefined
          }
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-glass">
            <CommandInput
              autoFocus
              value={commandSearch}
              onValueChange={setCommandSearch}
              onKeyDown={handleInputKeyDown}
              placeholder="Search commands..."
            />
            {currentBangName && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-white/87 text-xs font-medium border border-white/10 glass-hover">
                {currentBangName}
              </span>
            )}
            <Settings />
          </div>

          <CommandList ref={commandListRef}>
            {/* Terminal Group - always first, before CommandEmpty */}
            {isValidCommand && commandSearch.trim() && (
              <CommandGroup heading="Terminal">
                <CommandItem
                  onSelect={handleRunInTerminal}
                  value={`terminal-${commandSearch}`}
                  keywords={[commandSearch, 'terminal', 'shell', 'bash', 'run', 'execute']}
                >
                  <div className="flex items-center gap-2">
                    <i className="ph ph-terminal text-white/60" />
                    <span>Run in Terminal: {commandSearch}</span>
                  </div>
                </CommandItem>
              </CommandGroup>
            )}

            <CommandEmpty />

            <Commands commandSearch={commandSearch} setSelectedCommand={setSelectedCommand} />
            <CommandApplications commandSearch={commandSearch} />
            <CommandShortcuts commandSearch={commandSearch} setCurrentBang={setCurrentBangName} />
          </CommandList>

          <Footer>
            <span className="flex items-center gap-2 text-xs text-white/60">
              Run
              <CommandShortcut>↵</CommandShortcut>
            </span>
          </Footer>
        </Command>
      )}

      {mode === 'search' && selectedCommand && (
        <CommandPage
          selectedCommand={selectedCommand}
          setSelectedCommand={setSelectedCommand}
          setCommandSearch={setCommandSearch}
        />
      )}

      {mode === 'terminal' && <Terminal initialCommand={initialTerminalCommand} />}

      <ExitConfirmation
        isOpen={mode === 'exit-confirmation'}
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />
    </div>
  )
}

export default App
