import path from 'path'
import os from 'os'
import { readdir, readFile } from 'fs/promises'
import ini from 'ini'

const DIRECTORIES = [
  '/usr/share/applications',
  '/usr/local/share/applications',
  path.join(os.homedir(), '.local/share/applications'),
  '/var/lib/snapd/desktop/applications',
  '/var/lib/flatpak/exports/share/applications'
]

const EXCLUDED_PATTERNS = [/gnome/i, /org\.gnome/i, /kde/i, /xfce/i, /system/i]

interface AppEntry {
  id: string
  name: string
  comment?: string
  exec: string
  icon?: string
}

const parseDesktop = (content: string, filePath: string): AppEntry | null => {
  try {
    const parsed = ini.parse(content)
    const entry = parsed['Desktop Entry']
    if (!entry) return null
    if (entry.Type !== 'Application') return null
    if (entry.NoDisplay === 'true' || entry.Hidden === 'true') return null
    if (!entry.Name || !entry.Exec) return null

    const clean = String(entry.Exec)
      .replace(/%[a-zA-Z]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      id: path.basename(filePath),
      name: entry.Name,
      comment: entry.Comment,
      exec: clean,
      icon: entry.Icon
    }
  } catch (e) {
    console.warn('parseDesktop error', e)
    return null
  }
}

const listFiles = async (dir: string) => {
  try {
    const names = await readdir(dir)
    return names.filter((n) => n.endsWith('.desktop')).map((n) => path.join(dir, n))
  } catch (e) {
    return []
  }
}

export const getInstalledApps = async (): Promise<AppEntry[]> => {
  const lists = await Promise.all(DIRECTORIES.map(listFiles))
  const all = lists.flat()
  const items = await Promise.all(
    all.map(async (file) => {
      try {
        const content = await readFile(file, 'utf-8')
        return parseDesktop(content, file)
      } catch (e) {
        return null
      }
    })
  )

  return items
    .filter((i): i is AppEntry => !!i)
    .filter((a) => !EXCLUDED_PATTERNS.some((p) => p.test(a.name)))
}

export const launchApp = async (execLine: string) => {
  // simple split respecting quotes
  const parts: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < execLine.length; i++) {
    const ch = execLine[i]
    if (ch === '"') {
      inQuote = !inQuote
      continue
    }
    if (ch === ' ' && !inQuote) {
      if (cur) parts.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur) parts.push(cur)

  if (parts.length === 0) return null

  const child = require('child_process').spawn(parts[0], parts.slice(1), {
    detached: true,
    stdio: 'ignore',
    env: process.env
  })
  child.unref()
  return true
}
