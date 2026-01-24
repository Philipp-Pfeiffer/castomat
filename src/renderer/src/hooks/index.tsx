import { DependencyList, useEffect, useState, useCallback, useRef } from 'react'
import debounce from 'lodash/debounce'
import { winElectron } from '@renderer/lib/utils'

/**
 * Scrolls an element to the top when the dependency list changes.
 * @param {React.MutableRefObject<HTMLDivElement | null>} ref - The element to scroll.
 * @param {DependencyList} deps - The dependency list.
 */
export const useScrollToTop = (
  ref: React.MutableRefObject<HTMLDivElement | null>,
  deps: DependencyList
) => {
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = 0
    }
  }, deps)
}

/**
 * Returns an array of installed applications.
 * @returns {ApplicationT[]} - A list of installed applications.
 */
export const useInstalledApplications = (): ApplicationT[] => {
  const [applications, setApplications] = useState<ApplicationT[]>([])

  useEffect(() => {
    const getInstalledApplications = async () => {
      if (winElectron && winElectron.getInstalledApps) {
        const appsFound = await winElectron.getInstalledApps()
        setApplications(appsFound)
      } else if (winElectron && winElectron.listInstalledApplications) {
        // fallback to older handler
        const appsFound = await winElectron.listInstalledApplications()
        setApplications(appsFound)
      }
    }

    getInstalledApplications()
  }, [])

  return applications
}

/**
 * Fetches plugin actions for a given plugin and command
 * @param pluginName name of the plugin to fetch actions for
 * @param commandName name of the command to fetch actions for
 * @returns array of actions for the given plugin and command
 */
export const useFetchActions = (pluginName: string, commandName: string) => {
  const [actions, setActions] = useState<ActionT[]>([])

  useEffect(() => {
    async function fetchActions() {
      if (pluginName && commandName) {
        const pluginActions = await winElectron.getPluginActions(pluginName, commandName)
        setActions(pluginActions)
      }
    }

    fetchActions()
  }, [pluginName, commandName])

  return actions
}

/**
 * Observe selected option in the command list and return the selected value.
 * @param {ResultT[]} commandResult - Result of the command execution.
 * @returns {ResultT['data'] | undefined} - The selected value.
 */
export const useObserveSelectedOption = (commandResult: ResultT[]) => {
  const [selectedValue, setSelectedValue] = useState<ResultT['data']>()

  useEffect(() => {
    const getData = (id: string | null) => {
      return commandResult?.find((result) => result.data.id === id)?.data
    }

    const observer = new MutationObserver(() => {
      const selectedItem = document.querySelector('[role="option"][data-selected="true"]')

      if (selectedItem) setSelectedValue(getData(selectedItem.getAttribute('data-value')))
      else setSelectedValue(undefined)
    })

    const options = document.querySelectorAll('[role="option"]')
    options.forEach((option) => observer.observe(option, { attributes: true }))

    return () => observer.disconnect()
  }, [commandResult])

  return selectedValue
}

// Terminal-related hooks

interface UseCommandValidatorReturn {
  isValidCommand: boolean
  isChecking: boolean
  commandCache: Set<string>
}

/**
 * Hook for validating shell commands with two-stage validation
 * Stage 1: Fast cache lookup (instant)
 * Stage 2: Full validation with debounce (only if cache hit)
 */
export const useCommandValidator = (input: string): UseCommandValidatorReturn => {
  const [commandCache, setCommandCache] = useState<Set<string>>(new Set())
  const [isValidCommand, setIsValidCommand] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  // Initialize command cache from main process
  useEffect(() => {
    const loadCache = async () => {
      if (winElectron && winElectron.getCommandCache) {
        try {
          const commands = await winElectron.getCommandCache()
          setCommandCache(new Set(commands))
          setIsChecking(false)
        } catch (error) {
          console.error('Failed to load command cache:', error)
          setIsChecking(false)
        }
      }
    }

    loadCache()

    if (winElectron && winElectron.onInitCommandCache) {
      winElectron.onInitCommandCache((commands: string[]) => {
        setCommandCache(new Set(commands))
        setIsChecking(false)
      })
    }
  }, [])

  // Stage 1: Fast cache check
  const isInCache = useCallback(
    (cmd: string): boolean => {
      const firstToken = cmd.trim().split(/\s+/)[0]
      if (!firstToken) return false
      return commandCache.has(firstToken)
    },
    [commandCache]
  )

  // Stage 2: Full validation with debounce
  const validateCommand = useCallback(
    debounce(async (cmd: string) => {
      if (!winElectron || !winElectron.validateShellCommand) {
        setIsChecking(false)
        return
      }

      try {
        const isValid = await winElectron.validateShellCommand(cmd)
        setIsValidCommand(isValid)
      } catch (error) {
        console.error('Error validating command:', error)
        setIsValidCommand(false)
      } finally {
        setIsChecking(false)
      }
    }, 300),
    []
  )

  // Effect to run validation
  useEffect(() => {
    // Reset state when input changes
    setIsValidCommand(false)

    if (!input.trim()) {
      setIsChecking(false)
      return
    }

    // Stage 1: Check cache first
    if (!isInCache(input)) {
      setIsChecking(false)
      return
    }

    // Stage 2: Run debounced full validation
    setIsChecking(true)
    validateCommand(input)

    // Cleanup
    return () => {
      validateCommand.cancel()
    }
  }, [input, isInCache, validateCommand])

  return {
    isValidCommand,
    isChecking,
    commandCache
  }
}

interface TerminalLine {
  id: number
  content: string
}

interface UseTerminalReturn {
  lines: TerminalLine[]
  isRunning: boolean
  sendInput: (input: string) => void
  startTerminal: () => void
  stopTerminal: () => void
}

let lineIdCounter = 0

/**
 * Hook for managing terminal session
 */
export const useTerminal = (): UseTerminalReturn => {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const linesRef = useRef<TerminalLine[]>([])

  // Keep ref in sync with state
  useEffect(() => {
    linesRef.current = lines
  }, [lines])

  // Listen for terminal output
  useEffect(() => {
    if (!winElectron || !winElectron.onTerminalOutput) return

    const handleOutput = (data: string) => {
      // Filter out control characters and escape sequences for cleaner output

      const cleanData = data
        // eslint-disable-next-line no-control-regex
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // Remove ANSI escape sequences
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
        .replace(/\r/g, '') // Remove carriage returns

      if (!cleanData.trim()) return // Skip empty lines

      // Split by newlines and add each line
      const newLines = cleanData.split('\n').map((line) => ({
        id: lineIdCounter++,
        content: line
      }))

      setLines((prev) => {
        const updated = [...prev, ...newLines]
        // Keep only last 1000 lines to prevent memory issues
        if (updated.length > 1000) {
          return updated.slice(updated.length - 1000)
        }
        return updated
      })
    }

    winElectron.onTerminalOutput(handleOutput)

    // Note: We can't easily remove the listener with ipcRenderer
    // This is a limitation of the current setup
  }, [])

  const startTerminal = useCallback(() => {
    if (!winElectron || !winElectron.startTerminal) return

    winElectron.startTerminal()
    setIsRunning(true)
    setLines([])
    lineIdCounter = 0
  }, [])

  const stopTerminal = useCallback(() => {
    if (!winElectron || !winElectron.stopTerminal) return

    winElectron.stopTerminal()
    setIsRunning(false)
  }, [])

  const sendInput = useCallback(
    (input: string) => {
      if (!winElectron || !winElectron.terminalInput || !isRunning) return

      // Send to terminal (the terminal will echo it back)
      winElectron.terminalInput(input + '\n')
    },
    [isRunning]
  )

  return {
    lines,
    isRunning,
    sendInput,
    startTerminal,
    stopTerminal
  }
}
