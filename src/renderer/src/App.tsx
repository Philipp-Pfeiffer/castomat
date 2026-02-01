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
import { ClipboardPage } from '@renderer/components/ClipboardPage'
import { useScrollToTop, useCommandValidator } from '@renderer/hooks'
import { Settings } from '@renderer/components/Settings'
import { ExitConfirmation } from '@renderer/components/ExitConfirmation'
import { evaluateMathExpression, looksLikeMathExpression } from '@renderer/lib/calculator'

type AppMode = 'search' | 'exit-confirmation'

const CLIPBOARD_KEYWORDS = ['clip', 'cb', 'clipboard', 'zwischenablage', 'zähler', 'bild', 'image']

const showClipboardManagerOption = (search: string): boolean => {
  const q = search.toLowerCase().trim()
  if (!q) return true
  return CLIPBOARD_KEYWORDS.some((kw) => q.includes(kw))
}

const App = () => {
  const [selectedCommand, setSelectedCommand] = useState<CommandT | null>(null)
  const [commandSearch, setCommandSearch] = useState('')
  const [mode, setMode] = useState<AppMode>('search')
  const [showClipboardManager, setShowClipboardManager] = useState(false)
  const commandListRef = useRef<HTMLDivElement | null>(null)
  const [currentBangName, setCurrentBangName] = useState<string | null>(null)

  const { isValidCommand } = useCommandValidator(commandSearch)

  useScrollToTop(commandListRef, [commandSearch])

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (mode === 'exit-confirmation') {
        setMode('search')
        setCommandSearch('')
      } else if (showClipboardManager) {
        setShowClipboardManager(false)
      } else {
        setCommandSearch('')
      }
    }
  }

  const handleRunInTerminal = () => {
    const cmd = commandSearch.trim()
    if (cmd && window.electron?.runInKitty) {
      window.electron.runInKitty(cmd)
      setCommandSearch('')
    }
  }

  const handleConfirmExit = () => {
    setMode('search')
    setCommandSearch('')
  }

  const calcResult = evaluateMathExpression(commandSearch)
  const showCalculator = looksLikeMathExpression(commandSearch)
  const hasValidCalcResult = calcResult !== null

  const handleCopyCalculatorResult = () => {
    if (calcResult === null) return
    const text = Number.isInteger(calcResult)
      ? String(calcResult)
      : String(Number(calcResult.toPrecision(10)))
    window.electron?.writeClipboard?.(text)
    setCommandSearch('')
  }

  const commandFilter = (value: string, search: string, keywords: string[] | undefined): number => {
    if (value && value.startsWith('sc-')) return 1
    if (value && value.startsWith('calc-')) return 1
    if (value === 'clipboard-manager') return 1
    const extendValue = keywords?.join(' ') || ''
    const words = search.toLowerCase().split(' ')
    const found = words.every((word) => extendValue.toLowerCase().includes(word))
    return found ? 1 : 0
  }

  // Handle keyboard events for exit confirmation and clipboard manager back
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (mode === 'exit-confirmation') {
        if (e.key === 'Escape') {
          e.preventDefault()
          handleConfirmExit()
        }
      } else if (showClipboardManager && e.key === 'Escape') {
        e.preventDefault()
        setShowClipboardManager(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, showClipboardManager])

  return (
    <div className="glass h-full rounded-xl relative">
      {mode === 'search' && !selectedCommand && !showClipboardManager && (
        <Command
          filter={commandFilter}
          loop
          defaultValue={
            showCalculator && hasValidCalcResult
              ? `calc-${calcResult}`
              : isValidCommand && commandSearch.trim()
                ? `terminal-${commandSearch}`
                : undefined
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
            {/* Calculator Group - show when input looks like math (stable, no snap in/out) */}
            {showCalculator && (
              <CommandGroup heading="Calculator">
                {hasValidCalcResult ? (
                  <CommandItem
                    onSelect={handleCopyCalculatorResult}
                    value={`calc-${calcResult}`}
                    keywords={[commandSearch, String(calcResult), 'copy', 'calculator']}
                  >
                    <div className="flex items-center justify-between w-full gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <i className="ph ph-calculator text-white/60 shrink-0" />
                        <span className="truncate">{commandSearch.trim()}</span>
                        <span className="text-white/40">=</span>
                      </div>
                      <span className="font-mono text-white/87 tabular-nums shrink-0">
                        {Number.isInteger(calcResult)
                          ? calcResult
                          : Number(calcResult.toPrecision(10))}
                      </span>
                    </div>
                  </CommandItem>
                ) : (
                  <CommandItem value="calc-invalid" disabled>
                    <div className="flex items-center gap-2 min-w-0">
                      <i className="ph ph-calculator text-white/60 shrink-0" />
                      <span className="truncate">{commandSearch.trim()}</span>
                      <span className="text-white/40">–</span>
                      <span className="text-white/40">Complete the expression</span>
                    </div>
                  </CommandItem>
                )}
              </CommandGroup>
            )}

            {/* Clipboard Manager - when user searches for clipboard */}
            {showClipboardManagerOption(commandSearch) && (
              <CommandGroup heading="Tools">
                <CommandItem
                  onSelect={() => {
                    setShowClipboardManager(true)
                    setCommandSearch('')
                  }}
                  value="clipboard-manager"
                  keywords={['clipboard', 'clip', 'cb', 'zwischenablage', 'history']}
                >
                  <div className="flex items-center gap-2">
                    <i className="ph ph-clipboard-text text-white/60" />
                    <span>Clipboard Manager</span>
                  </div>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Terminal Group */}
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
              {showCalculator && hasValidCalcResult ? (
                <>
                  Copy result
                  <CommandShortcut>↵</CommandShortcut>
                </>
              ) : (
                <>
                  Run
                  <CommandShortcut>↵</CommandShortcut>
                </>
              )}
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

      {mode === 'search' && showClipboardManager && (
        <ClipboardPage setShowClipboardManager={setShowClipboardManager} />
      )}

      <ExitConfirmation
        isOpen={mode === 'exit-confirmation'}
        onConfirm={handleConfirmExit}
        onCancel={() => setMode('search')}
      />
    </div>
  )
}

export default App
