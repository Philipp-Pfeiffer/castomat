import { useEffect, useState } from 'react'

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from '@renderer/elements/Command'

import { Popover, PopoverContent, PopoverTrigger } from '@renderer/elements/Popover'
import { transformHotkey, winElectron } from '@renderer/lib/utils'

export const SubCommand = ({ actions, pluginName, commandName, result, inputRef }) => {
  const [open, setOpen] = useState(false)
  const [hotkey, setHotkey] = useState(['CTRL', 'G'])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e[`${hotkey[0].toLowerCase()}Key`] && e.key.toUpperCase() === hotkey[1]) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const fetchHotkey = async () => {
      try {
        const hk = await winElectron.getHotkeys()
        setHotkey(transformHotkey(hk['more-actions']))
      } catch (error) {
        setHotkey(['CTRL', 'G'])
      }
    }

    fetchHotkey()
  }, [open])

  const handleActionSelect = async (actionName: string) => {
    await winElectron.runPluginAction(pluginName, commandName, actionName, result)
    winElectron.hideMainWindow()
    setOpen(false)
  }

  const handlePopoverClose = (e: Event) => {
    e.preventDefault()
    inputRef?.current?.focus()
  }

  if (actions.length === 0) return null

  return (
    <>
      {open && <BlurOverlay />}

      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger onClick={() => setOpen(true)} aria-expanded={open}>
          <span className="flex items-center gap-2 text-xs">
            More
            <div className="flex items-center gap-0.5">
              <CommandShortcut>{hotkey[0]}</CommandShortcut>
              <CommandShortcut>{hotkey[1]}</CommandShortcut>
            </div>
          </span>
        </PopoverTrigger>
        <PopoverContent
          className="border border-glass rounded-lg relative z-20 glass shadow-glass"
          side="top"
          align="end"
          onCloseAutoFocus={handlePopoverClose}
          sideOffset={16}
          alignOffset={0}
        >
          <Command loop>
            <CommandList>
              <CommandGroup heading="Actions">
                {actions.map((action) => (
                  <SubItem key={action.name} onSelect={() => handleActionSelect(action.name)}>
                    {action.name}
                  </SubItem>
                ))}
              </CommandGroup>
            </CommandList>
            <CommandInput placeholder="Search for actions..." />
          </Command>
        </PopoverContent>
      </Popover>
    </>
  )
}

const SubItem = ({ children, onSelect }) => (
  <CommandItem className="flex items-center justify-between" onSelect={onSelect}>
    {children}
  </CommandItem>
)

const BlurOverlay = () => <div className="fixed inset-0 bg-black/60 z-10"></div>
