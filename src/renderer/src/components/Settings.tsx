import { useEffect, useState } from 'react'
import { FolderCode, Keyboard, SettingsIcon } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from '@renderer/elements/Sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/elements/Tooltip'
import { Button } from '@renderer/elements/Button'
import { Label } from '@renderer/elements/Label'
import { Input } from '@renderer/elements/Input'
import { Alert } from '@renderer/elements/Alert'
import { HotkeyInput } from '@renderer/elements/HotkeyInput'
import { Dialog, DialogContent, DialogTrigger } from '@renderer/elements/Dialog'
import { winElectron } from '@renderer/lib/utils'

const NAV = [
  { id: 'hotkeys', name: 'Hotkeys', icon: Keyboard },
  { id: 'plugins', name: 'Plugins', icon: FolderCode }
]

export const Settings = () => {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('hotkeys')
  const [pluginsDir, setPluginsDir] = useState<string | null>(null)
  const [plugins, setPlugins] = useState<PluginT[]>([])
  const [disabledPlugins, setDisabledPluginsState] = useState<string[]>([])

  useEffect(() => {
    const fetchPluginsDir = async () => {
      try {
        const dir = await winElectron.getPluginsDir()
        setPluginsDir(dir)
      } catch (error) {
        setPluginsDir(null)
      }
    }

    fetchPluginsDir()

    const fetchPlugins = async () => {
      const plugins = await winElectron.getPlugins()
      setPlugins(plugins)
    }
    fetchPlugins()

    const fetchDisabledPlugins = async () => {
      const disabledPlugins = await winElectron.getDisabledPlugins()
      setDisabledPluginsState(disabledPlugins)
    }
    fetchDisabledPlugins()

    winElectron.ipcRenderer.send('enable-global-shortcuts')
  }, [open])

  const handleChoosePluginsDir = async () => {
    const newDir = await winElectron.choosePluginsDir()
    if (newDir) setPluginsDir(newDir)
    winElectron.showMainWindow()
  }

  const handleOpenChange = async (state: boolean) => {
    setOpen(state)
    if (!state) await winElectron.reloadApp()
  }

  const handleDisablePluginChange = async (plugin: PluginT, isDisabled: boolean) => {
    try {
      await winElectron.setDisabledPlugins(plugin.name, isDisabled)
      setDisabledPluginsState((prev) => {
        const newDisabled = isDisabled
          ? [...prev, plugin.name]
          : prev.filter((n) => n !== plugin.name)
        return newDisabled
      })
    } catch (error) {
      console.error('Failed to update plugin state:', error)
    }
  }
  const hasAlreadyPluginsDir = typeof pluginsDir === 'string'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Button size="icon" variant="outline">
                <SettingsIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 h-5/6 w-5/6">
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {NAV.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={item.id === activeTab}>
                          <a onClick={() => setActiveTab(item.id)}>
                            <item.icon />
                            <span>{item.name}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-8">
              {activeTab === 'hotkeys' && (
                <>
                  <HotkeyInput label="Toggle app visibility" type="toggle-app" />

                  <HotkeyInput label="Toggle more actions" type="more-actions" />
                </>
              )}

              {activeTab === 'plugins' && (
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="pluginsDir">Plugins directory</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      className="cursor-default"
                      id="pluginsDir"
                      onClick={handleChoosePluginsDir}
                      placeholder="Click here to select a directory"
                      spellCheck={false}
                      value={hasAlreadyPluginsDir ? pluginsDir : ''}
                    />
                  </div>
                  <div className="flex flex-col gap-2 mt-3">
                    <Label>Installed plugins ({plugins.length})</Label>
                    {plugins.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No plugins found. Select a plugins directory above.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {plugins.map((plugin) => {
                          const isDisabled = disabledPlugins.includes(plugin.name)
                          return (
                            <div
                              key={plugin.name}
                              className="flex items-center justify-between rounded-xl border border-white/8 p-2.5 hover:bg-white/5 transition-colors"
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="font-medium text-foreground text-sm">
                                  {plugin.label}
                                </div>
                                <div className="text-xs text-white/35">
                                  v{plugin.version} • by {plugin.author}
                                </div>
                              </div>
                              <button
                                className={`ml-4 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shadow-sm border ${
                                  isDisabled
                                    ? 'bg-emerald-900/10 text-emerald-500 border-emerald-800/20 hover:bg-emerald-900/20 hover:border-emerald-800/30'
                                    : 'bg-red-900/10 text-red-500 border-red-800/20 hover:bg-red-900/20 hover:border-red-800/30'
                                }`}
                                onClick={() => handleDisablePluginChange(plugin, !isDisabled)}
                              >
                                {isDisabled ? 'Enable' : 'Disable'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Alert>Close the settings window to apply changes.</Alert>
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
