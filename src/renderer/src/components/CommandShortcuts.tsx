import { CommandGroup, CommandItem } from '@renderer/elements/Command'
import { BANGS, SHORTCUTS, winElectron } from '@renderer/lib/utils'

type CommandShortcutsProps = {
  commandSearch: string
  setCurrentBang: (bangName: string | null) => void
}

function parseBangAndQuery(
  commandSearch: string,
  setCurrentBang: (bangName: string | null) => void
): { bangPart: string | null; query: string } {
  if (!commandSearch.startsWith('!')) {
    return { bangPart: null, query: commandSearch }
  }
  let i = 1
  let bangPart = ''
  while (i < commandSearch.length && commandSearch[i] !== ' ') {
    bangPart += commandSearch[i]
    i++
  }
  let query = ''
  if (i < commandSearch.length) {
    query = commandSearch.slice(i).trim()
  }
  setCurrentBang(BANGS.find((bang) => bang.bang === bangPart)?.name || null)
  return { bangPart, query }
}

export const CommandShortcuts = ({ commandSearch, setCurrentBang }: CommandShortcutsProps) => {
  const { bangPart, query } = parseBangAndQuery(commandSearch, setCurrentBang)

  const handleSelect = (shortcut: ShortcutT) => {
    if (winElectron?.openExternal) {
      const url = shortcut.getUrl(query)
      winElectron.openExternal(url)
      winElectron.hideMainWindow?.()
    }
  }

  const filteredShortcuts = (() => {
    if (bangPart) {
      return SHORTCUTS.filter((shortcut) => shortcut.bang?.bang === bangPart)
    }
    return SHORTCUTS
  })()

  if (filteredShortcuts.length === 0) return null

  return (
    <CommandGroup heading="Shortcuts">
      {filteredShortcuts.map((shortcut) => (
        <CommandItem
          key={shortcut.name}
          onSelect={() => handleSelect(shortcut)}
          value={shortcut.name}
        >
          <div className="flex flex-1 items-center justify-between">
            <div className="flex gap-2.5 items-center min-w-0">
              <div
                className="flex items-center justify-center h-6 w-6 rounded-lg shrink-0"
                style={{ backgroundColor: shortcut.bgColor, color: shortcut.color }}
                aria-label={shortcut.bang?.name || shortcut.name}
                title={shortcut.bang?.name || shortcut.name}
              >
                <i className={`ph ph-${shortcut.icon} text-sm`} />
              </div>
              <span className="truncate">{shortcut.label(query)}</span>
            </div>
            <span className="text-xs text-white/40 ml-2">Shortcut</span>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
