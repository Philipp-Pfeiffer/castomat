import { contextBridge, ipcRenderer } from 'electron'
import { ElectronAPI, electronAPI } from '@electron-toolkit/preload'

const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      getCommands: () => {
        return ipcRenderer.invoke('get-commands')
      },
      runCommand: (pluginName, commandName, params) => {
        return ipcRenderer.invoke('run-command', pluginName, commandName, params)
      },
      getPluginActions: (pluginName, commandName) => {
        return ipcRenderer.invoke('get-plugin-actions', pluginName, commandName)
      },
      runPluginAction: (pluginName, commandName, actionName, result) => {
        return ipcRenderer.invoke('run-plugin-action', pluginName, commandName, actionName, result)
      },
      listInstalledApplications: () => {
        return ipcRenderer.invoke('list-installed-applications')
      },
      getInstalledApps: () => {
        return ipcRenderer.invoke('get-installed-apps')
      },
      launchApp: (execLine) => {
        return ipcRenderer.invoke('launch-app', execLine)
      },
      openApplication: (command) => {
        return ipcRenderer.invoke('open-application', command)
      },
      openExternal: (url) => {
        return ipcRenderer.invoke('open-external', url)
      },
      choosePluginsDir: () => {
        return ipcRenderer.invoke('choose-plugins-dir')
      },
      getPluginsDir: () => {
        return ipcRenderer.invoke('get-plugins-dir')
      },
      getPlugins: () => {
        return ipcRenderer.invoke('get-plugins')
      },
      getHotkeys: () => {
        return ipcRenderer.invoke('get-hotkeys')
      },
      setHotkey: (type, hotkey) => {
        return ipcRenderer.invoke('set-hotkey', type, hotkey)
      },
      setDisabledPlugins: (pluginName, isDisabled) => {
        return ipcRenderer.invoke('set-disabled-plugins', pluginName, isDisabled)
      },
      getDisabledPlugins: () => {
        return ipcRenderer.invoke('get-disabled-plugins')
      },
      showMainWindow: () => {
        return ipcRenderer.send('show-main-window')
      },
      hideMainWindow: () => {
        return ipcRenderer.send('hide-main-window')
      },
      reloadApp: () => {
        return ipcRenderer.send('reload-app')
      },
      // Terminal APIs
      validateShellCommand: (input) => {
        return ipcRenderer.invoke('validate-shell-command', input)
      },
      startTerminal: () => {
        return ipcRenderer.invoke('start-terminal')
      },
      stopTerminal: () => {
        return ipcRenderer.invoke('stop-terminal')
      },
      terminalInput: (data) => {
        return ipcRenderer.invoke('terminal-input', data)
      },
      onTerminalOutput: (callback) => {
        ipcRenderer.on('terminal-output', (_, data) => callback(data))
      },
      getCommandCache: () => {
        return ipcRenderer.invoke('get-command-cache')
      },
      onInitCommandCache: (callback) => {
        ipcRenderer.on('init-command-cache', (_, data) => callback(data))
      },
      runInKitty: (command: string) => {
        return ipcRenderer.invoke('run-in-kitty', command)
      },
      writeClipboard: (text: string) => {
        return ipcRenderer.invoke('write-clipboard', text)
      }
    } as ElectronAPI & ApiT)

    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
