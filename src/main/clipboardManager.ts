import type { BrowserWindow } from 'electron'
import { clipboard, nativeImage } from 'electron'
import storage from 'electron-json-storage'
import { exec } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'

const THUMBNAIL_SIZE = { width: 80, height: 60 }
const MAX_ENTRIES = 100
const POLL_INTERVAL_MS = 2000
const CLIPBOARD_STORAGE_KEY = 'clipboardHistory'
const FALLBACK_TIMEOUT_MS = 1000
const FALLBACK_MAX_BYTES = 512 * 1024
const FALLBACK_MAX_IMAGE_BYTES = 5 * 1024 * 1024

const execAsync = promisify(exec)
const execAsyncBinary = (
  cmd: string,
  opts: { timeout: number; maxBuffer: number; env: NodeJS.ProcessEnv }
): Promise<{ stdout: Buffer; stderr: string }> =>
  execAsync(cmd, { ...opts, encoding: 'buffer' })

export interface ClipboardEntryT {
  id: string
  text?: string
  imageBase64?: string
  thumbnailBase64?: string
  timestamp: number
  pinned: boolean
  type: 'text' | 'image'
}

let pollInterval: ReturnType<typeof setInterval> | null = null
let mainWindowRef: BrowserWindow | null = null
let lastTextHash: string | null = null
let lastImageHash: string | null = null

const storageGet = promisify(storage.get.bind(storage))
const storageSet = promisify(storage.set.bind(storage))

const getEntries = async (): Promise<ClipboardEntryT[]> => {
  try {
    const data = await storageGet(CLIPBOARD_STORAGE_KEY)
    const arr = Array.isArray(data) ? data : []
    return arr.filter((e): e is ClipboardEntryT => e && typeof e === 'object' && 'id' in e)
  } catch (error) {
    console.error('[ClipboardManager] Failed to get entries:', error)
    return []
  }
}

const setEntries = async (entries: ClipboardEntryT[]) => {
  try {
    await storageSet(CLIPBOARD_STORAGE_KEY, entries.slice(0, MAX_ENTRIES))
  } catch (error) {
    console.error('[ClipboardManager] Failed to save entries:', error)
    throw error
  }
}

const hashString = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return String(h)
}

const hashBuffer = (buf: Buffer) => {
  let h = 0
  for (let i = 0; i < Math.min(buf.length, 1024); i++) {
    h = ((h << 5) - h + buf[i]) | 0
  }
  return `${buf.length}-${h}`
}

/** Reject clipboard content that is clearly binary (e.g. image data mistaken as text). */
const looksLikeBinary = (s: string): boolean => {
  if (!s.length) return false
  if (s.includes('\0')) return true
  const first = s.charCodeAt(0)
  if (s.length >= 8 && (first === 0x89 || first === 0xfffd) && s.startsWith('PNG', 1)) return true
  if (s.length >= 4 && s.startsWith('IHDR')) return true
  return false
}

/**
 * Read clipboard text: use Electron first; on Linux when empty, try wl-paste (Wayland) or xclip/xsel (X11).
 * Only requests text/plain so image data is never stored as text.
 */
const readClipboardTextWithLinuxFallback = async (): Promise<string> => {
  const fromElectron = clipboard.readText()
  if (fromElectron && fromElectron.length > 0 && !looksLikeBinary(fromElectron)) return fromElectron
  if (process.platform !== 'linux') return ''

  const opts = {
    timeout: FALLBACK_TIMEOUT_MS,
    maxBuffer: FALLBACK_MAX_BYTES,
    encoding: 'utf8' as const,
    env: process.env
  }

  const accept = (raw: string): string => {
    const s = typeof raw === 'string' ? raw.trimEnd() : ''
    if (!s || looksLikeBinary(s)) return ''
    return s
  }

  if (process.env.WAYLAND_DISPLAY) {
    try {
      const { stdout } = await execAsync('wl-paste --no-newline --type text/plain', opts)
      return accept(stdout)
    } catch {
      return ''
    }
  }

  for (const cmd of ['xclip -selection clipboard -o -t text/plain', 'xsel -bo']) {
    try {
      const { stdout } = await execAsync(cmd, opts)
      const result = accept(stdout)
      if (result) return result
    } catch {
      // try next command
    }
  }
  return ''
}

type NativeImageT = ReturnType<typeof nativeImage.createFromBuffer>

/**
 * Read clipboard image: use Electron first; on Linux when empty, try wl-paste --type image/png (Wayland).
 */
const readClipboardImageWithLinuxFallback = async (): Promise<NativeImageT | null> => {
  const fromElectron = clipboard.readImage()
  if (!fromElectron.isEmpty()) return fromElectron
  if (process.platform !== 'linux' || !process.env.WAYLAND_DISPLAY) return null

  const opts = {
    timeout: FALLBACK_TIMEOUT_MS,
    maxBuffer: FALLBACK_MAX_IMAGE_BYTES,
    env: process.env
  }

  for (const mime of ['image/png', 'image/jpeg']) {
    try {
      const { stdout } = await execAsyncBinary(`wl-paste --type ${mime}`, opts)
      if (!Buffer.isBuffer(stdout) || stdout.length === 0) continue
      const img = nativeImage.createFromBuffer(stdout)
      if (!img.isEmpty()) return img
    } catch {
      // try next type
    }
  }
  return null
}

const isDuplicateText = (text: string, entries: ClipboardEntryT[]): boolean => {
  const normalized = text.trim()
  if (!normalized) return true
  return entries.some((e) => e.type === 'text' && e.text?.trim() === normalized && !e.pinned)
}

const addEntry = async (entry: ClipboardEntryT) => {
  try {
    const entries = await getEntries()
    const pinned = entries.filter((e) => e.pinned)
    const unpinned = entries.filter((e) => !e.pinned)
    const withoutDup = unpinned.filter((e) => e.id !== entry.id)
    await setEntries([entry, ...pinned, ...withoutDup])
    console.log(`[ClipboardManager] Added entry: ${entry.type} (${entry.id})`)
  } catch (error) {
    console.error('[ClipboardManager] Failed to add entry:', error)
    throw error
  }
}

let pollCount = 0

const pollClipboard = async () => {
  pollCount++
  try {
    // Log every 5th poll to verify interval is running
    if (pollCount % 5 === 0) {
      console.log(
        `[ClipboardManager] Poll #${pollCount} running (window visible: ${mainWindowRef?.isVisible()}, focused: ${mainWindowRef?.isFocused()})`
      )
    }

    const text = await readClipboardTextWithLinuxFallback()
    const textHash = hashString(text)

    // Debug logging - show actual text content and length
    if (pollCount % 5 === 0) {
      const textPreview = text ? `"${text.substring(0, 30).replace(/\n/g, '\\n')}"` : '(empty)'
      console.log(
        `[ClipboardManager] Read text: ${textPreview} (length: ${text?.length || 0}, hash: ${textHash}, lastHash: ${lastTextHash})`
      )
    }

    if (text && textHash !== lastTextHash) {
      console.log(
        `[ClipboardManager] New text detected! Hash changed from ${lastTextHash} to ${textHash}`
      )
      lastTextHash = textHash
      const entries = await getEntries()
      if (!isDuplicateText(text, entries)) {
        console.log('[ClipboardManager] Text is not duplicate, adding entry')
        await addEntry({
          id: randomUUID(),
          text,
          timestamp: Date.now(),
          pinned: false,
          type: 'text'
        })
      } else {
        console.log('[ClipboardManager] Text is duplicate, skipping')
      }
    } else if (!text) {
      lastTextHash = null
    } else if (pollCount % 5 === 0) {
      console.log('[ClipboardManager] Text unchanged or empty')
    }

    const img = await readClipboardImageWithLinuxFallback()
    if (img && !img.isEmpty()) {
      const buf = img.toPNG()
      const imgHash = hashBuffer(buf)
      if (imgHash !== lastImageHash) {
        console.log('[ClipboardManager] New image detected, hash changed')
        lastImageHash = imgHash
        const thumb = img.resize(THUMBNAIL_SIZE)
        const fullDataUrl = img.toDataURL()
        const thumbDataUrl = thumb.toDataURL()
        await addEntry({
          id: randomUUID(),
          imageBase64: fullDataUrl,
          thumbnailBase64: thumbDataUrl,
          timestamp: Date.now(),
          pinned: false,
          type: 'image'
        })
      }
    } else {
      lastImageHash = null
    }
  } catch (error) {
    console.error('[ClipboardManager] Error polling clipboard:', error)
  }
}

export const initClipboardManager = async (window?: BrowserWindow) => {
  if (pollInterval) {
    console.log('[ClipboardManager] Already initialized, skipping')
    return
  }

  try {
    mainWindowRef = window ?? null
    console.log('[ClipboardManager] Initializing...')

    const entries = await getEntries()
    console.log(`[ClipboardManager] Loaded ${entries.length} entries from storage`)

    if (entries.length > 0) {
      const latest = entries[0]
      if (latest.type === 'text' && latest.text) {
        lastTextHash = hashString(latest.text)
        console.log('[ClipboardManager] Set initial text hash from latest entry')
      }
    }

    pollInterval = setInterval(pollClipboard, POLL_INTERVAL_MS)
    console.log(`[ClipboardManager] Started polling every ${POLL_INTERVAL_MS}ms`)
  } catch (error) {
    console.error('[ClipboardManager] Failed to initialize:', error)
    throw error
  }
}

export const stopClipboardManager = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

export const getClipboardHistory = async (search?: string): Promise<ClipboardEntryT[]> => {
  const entries = await getEntries()
  const pinned = entries.filter((e) => e.pinned)
  const unpinned = entries.filter((e) => !e.pinned)
  const sorted = [...pinned, ...unpinned.sort((a, b) => b.timestamp - a.timestamp)]

  if (!search || !search.trim()) return sorted

  const q = search.toLowerCase().trim()
  return sorted.filter((e) => {
    if (e.type === 'text' && e.text) {
      return e.text.toLowerCase().includes(q)
    }
    if (e.type === 'image') return q.includes('bild') || q.includes('image') || q.includes('img')
    return false
  })
}

export const deleteClipboardEntry = async (id: string) => {
  try {
    const entries = (await getEntries()).filter((e) => e.id !== id)
    await setEntries(entries)
    console.log(`[ClipboardManager] Deleted entry: ${id}`)
  } catch (error) {
    console.error(`[ClipboardManager] Failed to delete entry ${id}:`, error)
    throw error
  }
}

export const pinClipboardEntry = async (id: string, pinned: boolean) => {
  try {
    const entries = await getEntries()
    const idx = entries.findIndex((e) => e.id === id)
    if (idx === -1) {
      console.warn(`[ClipboardManager] Entry not found for pinning: ${id}`)
      return
    }
    entries[idx] = { ...entries[idx], pinned }
    await setEntries(entries)
    console.log(`[ClipboardManager] ${pinned ? 'Pinned' : 'Unpinned'} entry: ${id}`)
  } catch (error) {
    console.error(`[ClipboardManager] Failed to ${pinned ? 'pin' : 'unpin'} entry ${id}:`, error)
    throw error
  }
}

export const writeClipboardFromEntry = (entry: ClipboardEntryT) => {
  try {
    if (entry.type === 'text' && entry.text) {
      clipboard.writeText(entry.text)
      console.log('[ClipboardManager] Wrote text to clipboard')
      return
    }
    if (entry.type === 'image' && entry.imageBase64) {
      const img = nativeImage.createFromDataURL(entry.imageBase64)
      if (!img.isEmpty()) {
        clipboard.writeImage(img)
        console.log('[ClipboardManager] Wrote image to clipboard')
      } else {
        console.warn('[ClipboardManager] Failed to create image from data URL')
      }
    }
  } catch (error) {
    console.error('[ClipboardManager] Failed to write to clipboard:', error)
    throw error
  }
}
