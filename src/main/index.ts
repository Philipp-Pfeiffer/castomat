import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, shell, Tray } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { join } from 'path'

app.name = 'castomat'

import icon from '../../resources/icon.png?asset'

import {
  choosePluginsDir,
  getCommands,
  getDisabledPlugins,
  getHotkeys,
  getPluginActions,
  getPluginsDir,
  getPlugins,
  initCommandCache,
  initClipboardManager,
  getClipboardHistory,
  deleteClipboardEntry,
  pinClipboardEntry,
  writeClipboardFromEntry,
  listInstalledApplications,
  openApplication,
  openExternal,
  runCommand,
  runPluginAction,
  setDisabledPlugins,
  setHotkey,
  startTerminal,
  stopTerminal,
  validateShellCommand,
  writeToTerminal,
  setupTerminalCallback,
  getCommandCache,
  runInKitty
} from './handlers'
import { getInstalledApps, launchApp } from './apps'
import type { ClipboardEntryT } from './clipboardManager'
import { setupAutoUpdater } from './autoUpdater'

let mainWindow: BrowserWindow
const gotTheLock = app.requestSingleInstanceLock()

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 480,
    frame: false,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    skipTaskbar: true,
    type: process.platform === 'linux' ? 'toolbar' : undefined,
    title: 'castomat',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.center()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  ipcMain.on('disable-global-shortcuts', () => globalShortcut.unregisterAll())
  ipcMain.on('enable-global-shortcuts', registerGlobalShortcut)

  mainWindow.on('blur', () => {
    if (!is.dev) mainWindow.hide()
  })

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
    return false
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    await mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const registerGlobalShortcut = async () => {
  const hotkeys = await getHotkeys()
  const toggleAppHotkey = hotkeys['toggle-app'] || 'Ctrl+Space'

  globalShortcut.unregisterAll()
  globalShortcut.register(toggleAppHotkey, () => {
    if (mainWindow.isVisible()) mainWindow.hide()
    else mainWindow.show()
  })
}

const createTray = () => {
  if (process.platform !== 'linux') return

  global.tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show app',
      click: () => mainWindow.show()
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  global.tray.setToolTip('Backslash')
  global.tray.setContextMenu(contextMenu)
}

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      mainWindow.show()
    }
  })

  app.whenReady().then(async () => {
    const { checkForUpdates } = setupAutoUpdater()

    electronApp.setAppUserModelId('com.electron')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    await createWindow()
    await registerGlobalShortcut()
    createTray()

    // Initialize command cache
    await initCommandCache()
    console.log('Command cache initialized')

    // Initialize clipboard manager (polls only when window not focused)
    try {
      await initClipboardManager(mainWindow)
      console.log('Clipboard manager initialized successfully')
    } catch (error) {
      console.error('Failed to initialize clipboard manager:', error)
    }

    ipcMain.handle('get-commands', () => {
      return getCommands()
    })

    ipcMain.handle('list-installed-applications', async () => {
      return listInstalledApplications()
    })

    ipcMain.handle('get-installed-apps', async () => {
      return getInstalledApps()
    })

    ipcMain.handle('launch-app', async (_, execLine) => {
      return launchApp(execLine)
    })

    ipcMain.handle('open-application', async (_, command) => {
      return openApplication(command)
    })

    ipcMain.handle('open-external', async (_, url) => {
      return openExternal(url)
    })

    ipcMain.handle('run-command', async (_, pluginName, commandName, params) => {
      return runCommand(pluginName, commandName, params)
    })

    ipcMain.handle('get-plugin-actions', async (_, pluginName, commandName) => {
      return getPluginActions(pluginName, commandName)
    })

    ipcMain.handle('run-plugin-action', async (_, pluginName, commandName, actionName, result) => {
      return runPluginAction(pluginName, commandName, actionName, result)
    })

    ipcMain.handle('choose-plugins-dir', async () => {
      return choosePluginsDir()
    })

    ipcMain.handle('get-plugins-dir', async () => {
      return getPluginsDir()
    })

    ipcMain.handle('get-plugins', async () => {
      return getPlugins()
    })

    ipcMain.handle('get-disabled-plugins', async () => {
      return getDisabledPlugins()
    })

    ipcMain.handle('set-disabled-plugins', async (_, pluginName, isDisabled) => {
      return setDisabledPlugins(pluginName, isDisabled)
    })

    ipcMain.handle('set-hotkey', async (_, type, hotkey) => {
      return setHotkey(type, hotkey)
    })

    ipcMain.handle('get-hotkeys', async () => {
      return getHotkeys()
    })

    // Terminal IPC handlers
    ipcMain.handle('get-command-cache', async () => {
      console.log('get-command-cache handler called')
      const cache = getCommandCache()
      console.log(`Returning ${cache.size} commands`)
      return Array.from(cache)
    })

    ipcMain.handle('validate-shell-command', async (_, input) => {
      return validateShellCommand(input)
    })

    ipcMain.handle('start-terminal', async () => {
      if (mainWindow) {
        startTerminal(mainWindow)
        setupTerminalCallback(mainWindow, (data) => {
          if (mainWindow) {
            mainWindow.webContents.send('terminal-output', data)
          }
        })
      }
    })

    ipcMain.handle('stop-terminal', async () => {
      stopTerminal()
    })

    ipcMain.handle('terminal-input', async (_, data) => {
      writeToTerminal(data)
    })

    ipcMain.handle('run-in-kitty', async (_, command: string) => {
      runInKitty(command)
      if (mainWindow) mainWindow.hide()
    })

    ipcMain.handle('write-clipboard', async (_, text: string) => {
      clipboard.writeText(text)
    })

    ipcMain.handle('get-clipboard-history', async (_, search?: string) => {
      return getClipboardHistory(search)
    })

    ipcMain.handle('delete-clipboard-entry', async (_, id: string) => {
      return deleteClipboardEntry(id)
    })

    ipcMain.handle('pin-clipboard-entry', async (_, id: string, pinned: boolean) => {
      return pinClipboardEntry(id, pinned)
    })

    ipcMain.handle('paste-clipboard-entry', async (_, entry: ClipboardEntryT) => {
      writeClipboardFromEntry(entry)
    })

    ipcMain.on('show-main-window', () => {
      if (mainWindow) mainWindow.show()
    })

    ipcMain.on('hide-main-window', () => {
      if (mainWindow) mainWindow.hide()
    })

    ipcMain.on('reload-app', () => {
      if (mainWindow) mainWindow.reload()
    })

    // Send command cache to renderer when window is ready
    mainWindow?.webContents.on('did-finish-load', () => {
      const cache = getCommandCache()
      mainWindow?.webContents.send('init-command-cache', Array.from(cache))
    })

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow()
      }
    })

    checkForUpdates()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
