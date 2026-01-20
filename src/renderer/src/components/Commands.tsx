import { useEffect, useState } from 'react'
import shuffle from 'lodash.shuffle'

import { winElectron } from '@renderer/lib/utils'
import { CommandGroup, CommandItem } from '@renderer/elements/Command'

type CommandsProps = {
  commandSearch: string
  setSelectedCommand: React.Dispatch<React.SetStateAction<CommandT | null>>
}

export const Commands = ({ commandSearch, setSelectedCommand }: CommandsProps) => {
  const [commands, setCommands] = useState<CommandT[]>([])

  useEffect(() => {
    const fetchCommands = async () => {
      if (winElectron && winElectron.getCommands) {
        const fetchedCommands = await winElectron.getCommands()
        setCommands(fetchedCommands)
      } else {
        console.error('electron.getCommands is not available')
      }
    }

    fetchCommands()
  }, [])

  const commandsToDisplay = commandSearch ? commands : shuffle(commands).slice(0, 5)

  return (
    <CommandGroup heading="Commands">
      {commandsToDisplay.map((command) => (
        <CommandItem
          key={`${command.plugin.name}-${command.name}`}
          onSelect={async () => {
            if (command.isImmediate) {
              await winElectron.runCommand(command.plugin.name, command.name, null)
              await winElectron.hideMainWindow()
            } else {
              setSelectedCommand(command)
            }
          }}
          value={command.name}
          keywords={command.keywords}
        >
          <div className="flex flex-1 items-center justify-between">
            <div className="flex gap-2.5 items-center">
              <div
                className="flex items-center justify-center h-6 w-6 rounded-lg"
                style={{ backgroundColor: command.bgColor, color: command.color }}
              >
                <i className={`ph ph-${command.icon} text-sm`} />
              </div>
              <span>{command.label}</span>
              <span className="text-xs text-white/40">{command.plugin.label}</span>
            </div>
            <span className="text-xs text-white/40">Command</span>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
