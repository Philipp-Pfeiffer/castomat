import { app, clipboard, dialog, shell } from 'electron'
import os from 'os'
import storage from 'electron-json-storage'
import fs from 'fs'
import path from 'path'
import { exec, spawn } from 'child_process'
import axios from 'axios'
import cheerio from 'cheerio'
import yaml from 'js-yaml'
import ini from 'ini'
import { readdir, readFile } from 'fs/promises'

storage.setDataPath(os.tmpdir())

const DIRECTORIES = [
  '/usr/share/applications',
  '/usr/local/share/applications',
  '$HOME/.local/share/applications',
  '/var/lib/snapd/desktop/applications',
  '/var/lib/flatpak/exports/share/applications'
]

const EXCLUDED_PATTERNS = [
  /gnome/i,
  /org\.gnome/i,
  /Org/i,
  /kde/i,
  /xfce/i,
  /system/i,
  /Settings/i,
  /Preferences/i,
  /Configuration/i
]

const DEPS = {
  app,
  axios,
  cheerio,
  clipboard,
  exec,
  shell,
  path
}

/**
 * Gets all commands from plugins
 * @returns resolved with an array of command objects
 */
export const getCommands = async () => {
  const currentPluginsDir = await getPluginsDir()
  const disabledPlugins = await getDisabledPlugins()
  const plugins = fs
    .readdirSync(currentPluginsDir)
    .filter((plugin) => plugin !== '.git')
    .filter((plugin) => {
      const pluginPath = path.join(currentPluginsDir, plugin)
      return fs.statSync(pluginPath).isDirectory()
    })

  return plugins.flatMap((plugin) => {
    if (disabledPlugins.includes(plugin)) {
      return []
    }

    const manifestPath = path.join(currentPluginsDir, plugin, 'manifest.yml')
    const manifest = yaml.load(fs.readFileSync(manifestPath, 'utf8')) as ManifestT

    return manifest.commands.map((command) => ({
      ...command,
      plugin: {
        name: plugin,
        label: manifest.label,
        version: manifest.version,
        author: manifest.author
      }
    }))
  })
}

/**
 * Lists all installed applications
 * @returns promise resolved with an array of application objects, each
 * containing the application name and command
 */

interface Application {
  name: string
  command: string
  isImmediate: boolean
}
const parseDesktopFile = (content: string, filePath: string): Application | null => {
  try {
    const parsed = ini.parse(content)
    const desktopEntry = parsed['Desktop Entry']

    if (!desktopEntry?.Type || desktopEntry.Type !== 'Application') {
      return null
    }

    if (!desktopEntry.Name || desktopEntry.NoDisplay === true) {
      return null
    }

    if (!desktopEntry.Exec) {
      return null
    }

    const cleanCommand = desktopEntry.Exec.replace(/@@[uf]\s+%[uf]\s+@@/g, '') // Remove Flatpak file forwarding
      .replace(/%\w+/g, '') // Remove field codes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    return {
      name: desktopEntry.Name,
      command: cleanCommand,
      isImmediate: true
    }
  } catch (error) {
    console.warn(`Failed to parse desktop file ${filePath}:`, error)
    return null
  }
}

const readDesktopFiles = async (directory: string): Promise<string[]> => {
  try {
    const files = await readdir(directory)
    return files
      .filter((file) => file.endsWith('.desktop'))
      .map((file) => path.join(directory, file))
  } catch (error) {
    // Directory doesn't exist or is not accessible
    return []
  }
}

export const listInstalledApplications = async (): Promise<Application[]> => {
  try {
    // Get all .desktop files from all directories
    const allFileLists = await Promise.all(DIRECTORIES.map(readDesktopFiles))

    const allDesktopFiles = allFileLists.flat()

    // Process each desktop file
    const applicationPromises = allDesktopFiles.map(async (filePath) => {
      try {
        const content = await readFile(filePath, 'utf-8')
        return parseDesktopFile(content, filePath)
      } catch (error) {
        console.warn(`Failed to read desktop file ${filePath}:`, error)
        return null
      }
    })

    const applications = await Promise.all(applicationPromises)

    return applications
      .filter((app): app is Application => app !== null)
      .filter((app) => !EXCLUDED_PATTERNS.some((pattern) => pattern.test(app.name)))
  } catch (error) {
    console.error('Failed to list installed applications:', error)
    return []
  }
}

/**
 * Opens an application with the given command
 * @param command command to run to open the application
 * @returns promise resolved when the application is opened
 */
export const openApplication = async (command: string) => {
  return exec(command, (error) => {
    if (error) console.error(`Error opening application: ${error.message}`)
  })
}

/**
 * Opens a URL in the default external browser
 * @param url URL to open
 * @returns Promise resolved when the URL is opened
 */
export const openExternal = async (url: string) => {
  return shell.openExternal(url)
}

/**
 * Runs a command from a given plugin
 * @param pluginName name of the plugin
 * @param commandName name of the command
 * @param param parameter to pass to the command
 * @returns result of the command
 */
export const runCommand = async (pluginName: string, commandName: string, param: string) => {
  const currentPluginsDir = await getPluginsDir()
  const pluginPath = path.join(currentPluginsDir, pluginName, 'index.js')

  if (!fs.existsSync(pluginPath)) {
    throw new Error(`Plugin ${pluginName} not found`)
  }

  const plugin = require(pluginPath)
  if (typeof plugin.commands[commandName].run !== 'function') {
    throw new Error(`Command ${commandName} not found in plugin ${pluginName}`)
  }

  return await plugin.commands[commandName].run(param, DEPS)
}

/**
 * Gets the actions for a given plugin and command
 * @param pluginName name of the plugin
 * @param commandName name of the command
 * @returns list of actions for the given plugin and command
 */
export const getPluginActions = async (pluginName: string, commandName: string) => {
  const currentPluginsDir = await getPluginsDir()
  const pluginPath = path.join(currentPluginsDir, pluginName, 'index.js')

  if (!fs.existsSync(pluginPath)) {
    throw new Error(`Plugin ${pluginName} not found`)
  }

  const plugin = require(pluginPath)

  if (!plugin.commands[commandName] || !plugin.commands[commandName].actions) {
    throw new Error(`Actions not found for command ${commandName} in plugin ${pluginName}`)
  }

  return plugin.commands[commandName].actions.map((action) => ({
    name: action.name,
    description: action.description || '',
    shortcut: action.shortcut
  }))
}

/**
 * Runs a plugin action
 * @param pluginName name of the plugin
 * @param commandName name of the command
 * @param actionName name of the action
 * @param result result from the command
 * @returns result of the action
 */
export const runPluginAction = async (
  pluginName: string,
  commandName: string,
  actionName: string,
  result: ResultT
) => {
  const currentPluginsDir = await getPluginsDir()
  const pluginPath = path.join(currentPluginsDir, pluginName, 'index.js')

  if (!fs.existsSync(pluginPath)) {
    throw new Error(`Plugin ${pluginName} not found`)
  }

  const plugin = require(pluginPath)

  if (!plugin.commands[commandName] || !plugin.commands[commandName].actions) {
    throw new Error(`Actions not found for command ${commandName} in plugin ${pluginName}`)
  }

  const action = plugin.commands[commandName].actions.find((a) => a.name === actionName)?.action

  if (!action || typeof action !== 'function') {
    throw new Error(`Action ${actionName} not found or not a function`)
  }

  return await action(result, DEPS)
}

/**
 * Opens a file dialog for the user to choose a new plugins directory.
 * If the user chooses a directory, the path is stored in the user's
 * preferences and returned.
 * @returns the path to the new plugins directory, or null if the user
 * canceled.
 */
export const choosePluginsDir = async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })

  if (!result.canceled && result.filePaths.length > 0) {
    const newPath = result.filePaths[0]
    await setPluginsDir(newPath)
    return newPath
  }

  return null
}

/**
 * Gets the directory where plugins are stored.
 * @returns a Promise that resolves with the path to the plugins directory.
 */
export const getPluginsDir = (): Promise<string> => {
  return new Promise((resolve) => {
    storage.get('pluginsDir', (error, data) => {
      if (error) throw error
      resolve(data as string)
    })
  })
}

export const getPlugins = async (): Promise<PluginT[]> => {
  const pluginsDir = await getPluginsDir()
  const plugins = fs
    .readdirSync(pluginsDir)
    .filter((plugin) => plugin !== '.git')
    .filter((plugin) => {
      const pluginPath = path.join(pluginsDir, plugin)
      return fs.statSync(pluginPath).isDirectory()
    })

  return plugins
    .map((plugin) => {
      try {
        const manifestPath = path.join(pluginsDir, plugin, 'manifest.yml')
        const manifest = yaml.load(fs.readFileSync(manifestPath, 'utf8')) as ManifestT
        return {
          name: plugin,
          label: manifest.label,
          version: manifest.version,
          author: manifest.author
        }
      } catch (error) {
        console.warn(`Failed to load plugin ${plugin}:`, error)
        return null
      }
    })
    .filter((plugin): plugin is PluginT => plugin !== null)
}

/**
 * Sets the directory where plugins are stored.
 * @param newPath the path to the plugins directory to set.
 * @returns a Promise that resolves when the value has been set.
 */
const setPluginsDir = (newPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    storage.set('pluginsDir', newPath, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

/**
 * Gets the current hotkeys.
 * @returns a Promise that resolves with the current hotkeys as an object.
 */
export const getHotkeys = (): Promise<{ [key: string]: string }> => {
  return new Promise((resolve) => {
    storage.get('hotkeys', (error, data) => {
      if (error) throw error
      resolve(data as { [key: string]: string })
    })
  })
}

/**
 * Sets a hotkey for the given type.
 * @param type the type of the hotkey (e.g. "toggle-app")
 * @param hotkey the hotkey to set (e.g. "Ctrl+Space")
 * @returns a Promise that resolves when the hotkey has been set.
 */
export const setHotkey = (type: string, hotkey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    storage.get('hotkeys', (error, data) => {
      if (error) reject(error)
      const hotkeys = (data as { [key: string]: string }) ?? {}
      hotkeys[type] = hotkey
      storage.set('hotkeys', hotkeys, (error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  })
}

export const setDisabledPlugins = (pluginName: string, isDisabled: boolean): Promise<void> => {
  return new Promise((resolve, reject) => {
    getDisabledPlugins()
      .then((disabledPlugins) => {
        const updatedPlugins = isDisabled
          ? [...disabledPlugins, pluginName]
          : disabledPlugins.filter((n) => n !== pluginName)
        storage.set('disabledPlugins', updatedPlugins, (error) => {
          if (error) reject(error)
          else resolve()
        })
      })
      .catch(reject)
  })
}

export const getDisabledPlugins = (): Promise<string[]> => {
  return new Promise((resolve) => {
    storage.get('disabledPlugins', (error, data) => {
      if (error) throw error
      // Ensure we always return an array, even if data is null, undefined, or not an array
      const disabledPlugins = Array.isArray(data) ? data : []
      resolve(disabledPlugins)
    })
  })
}

// Terminal-related imports
import { loadCommandCache, isKnownCommand } from './commandCache'
import { getTerminalSession, destroyTerminalSession } from './terminal'

// Command cache storage
let commandCache: Set<string> | null = null

/**
 * Initializes the command cache
 */
export const initCommandCache = async (): Promise<void> => {
  commandCache = await loadCommandCache()
}

/**
 * Gets the command cache
 */
export const getCommandCache = (): Set<string> => {
  if (!commandCache) {
    return new Set()
  }
  return commandCache
}

/**
 * Validates if input starts with a known command
 */
export const validateShellCommand = async (input: string): Promise<boolean> => {
  if (!commandCache) {
    commandCache = await loadCommandCache()
  }
  return isKnownCommand(input, commandCache)
}

/**
 * Starts the terminal session
 */
export const startTerminal = (window: Electron.BrowserWindow): void => {
  const session = getTerminalSession(window)
  session.start()
}

/**
 * Stops the terminal session
 */
export const stopTerminal = (): void => {
  destroyTerminalSession()
}

/**
 * Writes to the terminal
 */
export const writeToTerminal = (data: string): void => {
  const { BrowserWindow } = require('electron')
  const window = BrowserWindow.getFocusedWindow()
  if (window) {
    const session = getTerminalSession(window)
    if (session.isRunning()) {
      session.write(data)
    }
  }
}

/**
 * Sets up terminal data callback
 */
export const setupTerminalCallback = (
  window: Electron.BrowserWindow,
  callback: (data: string) => void
): void => {
  const session = getTerminalSession(window)
  session.onData(callback)
}

/**
 * Builds a temp rcfile that:
 * 1. Defines fastfetch/neofetch as no-op functions (prevents double fetch from .bashrc)
 * 2. Sources the original .bashrc (preserves all aliases, functions, settings)
 * This avoids syntax errors from commenting out lines.
 */
function buildLauncherRcContent(home: string): string {
  const bashrcPath = path.join(home, '.bashrc')
  const profilePath = path.join(home, '.profile')

  let content = ''

  // Source .profile if it exists
  if (fs.existsSync(profilePath)) {
    content += `source "${profilePath}" 2>/dev/null\n`
  }

  // Define no-op functions to prevent double fetch
  content += `# Prevent double fetch - castomat already ran it\n`
  content += `fastfetch() { :; }\n`
  content += `neofetch() { :; }\n`
  content += `export -f fastfetch neofetch 2>/dev/null\n`

  // Source original .bashrc
  if (fs.existsSync(bashrcPath)) {
    content += `\n# Load original .bashrc\n`
    content += `source "${bashrcPath}"\n`
  }

  return content
}

/**
 * Opens a new kitty window and runs the command there.
 * - Starts in HOME. Order: fetch once, then user command, then interactive bash (window stays open).
 * - Uses a temp rcfile with only fetch lines commented out so .bashrc syntax stays valid and no double fetch.
 */
export const runInKitty = (command: string): void => {
  const trimmed = command.trim()
  if (!trimmed) return

  const home = process.env.HOME || process.env.USER ? `/home/${process.env.USER}` : '/'
  const rcPath = path.join(os.tmpdir(), `castomat-rc-${process.pid}-${Date.now()}`)
  const scriptPath = path.join(os.tmpdir(), `castomat-script-${process.pid}-${Date.now()}.sh`)

  try {
    // Create rcfile without fetch
    fs.writeFileSync(rcPath, buildLauncherRcContent(home), 'utf8')

    // Create a script that runs fetch, then the command, then starts interactive bash
    const scriptContent = `#!/bin/bash
cd "${home}"
(fastfetch 2>/dev/null || neofetch 2>/dev/null)
${trimmed}
exec bash --rcfile "${rcPath}" -i
`
    fs.writeFileSync(scriptPath, scriptContent, 'utf8')
    fs.chmodSync(scriptPath, 0o755)
  } catch {
    // fallback: no rcfile, window stays open but user may see double fetch
    const bashScript = `(fastfetch 2>/dev/null || neofetch 2>/dev/null); ${trimmed}; exec bash -l`
    const child = spawn('kitty', ['-e', 'bash', '-c', bashScript], {
      detached: true,
      stdio: 'ignore',
      env: process.env,
      cwd: home
    })
    child.unref()
    return
  }

  // Start kitty with the script
  const child = spawn('kitty', ['-e', scriptPath], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
    cwd: home
  })
  child.unref()

  child.on('error', (err) => {
    console.warn('Failed to launch kitty:', err.message)
  })

  // Cleanup temp files after a delay
  setTimeout(() => {
    try {
      fs.unlinkSync(rcPath)
      fs.unlinkSync(scriptPath)
    } catch {
      // ignore cleanup errors
    }
  }, 5000)
}
