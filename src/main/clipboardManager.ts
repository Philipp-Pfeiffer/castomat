import type { BrowserWindow } from 'electron'
import { clipboard, nativeImage } from 'electron'
import storage from 'electron-json-storage'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'

const THUMBNAIL_SIZE = { width: 80, height: 60 }
const MAX_ENTRIES = 100
const POLL_INTERVAL_MS = 2000
const CLIPBOARD_STORAGE_KEY = 'clipboardHistory'

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
  } catch {
    return []
  }
}

const setEntries = async (entries: ClipboardEntryT[]) => {
  await storageSet(CLIPBOARD_STORAGE_KEY, entries.slice(0, MAX_ENTRIES))
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

const isDuplicateText = (text: string, entries: ClipboardEntryT[]): boolean => {
  const normalized = text.trim()
  if (!normalized) return true
  return entries.some((e) => e.type === 'text' && e.text?.trim() === normalized && !e.pinned)
}

const addEntry = async (entry: ClipboardEntryT) => {
  const entries = await getEntries()
  const pinned = entries.filter((e) => e.pinned)
  const unpinned = entries.filter((e) => !e.pinned)
  const withoutDup = unpinned.filter((e) => e.id !== entry.id)
  await setEntries([entry, ...pinned, ...withoutDup])
}

const pollClipboard = async () => {
  try {
    if (mainWindowRef?.isFocused()) return
    const text = clipboard.readText()
    const textHash = hashString(text)
    if (text && textHash !== lastTextHash) {
      lastTextHash = textHash
      const entries = await getEntries()
      if (!isDuplicateText(text, entries)) {
        await addEntry({
          id: randomUUID(),
          text,
          timestamp: Date.now(),
          pinned: false,
          type: 'text'
        })
      }
    } else if (!text) {
      lastTextHash = null
    }

    const img = clipboard.readImage()
    if (!img.isEmpty()) {
      const buf = img.toPNG()
      const imgHash = hashBuffer(buf)
      if (imgHash !== lastImageHash) {
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
  } catch {
    // Ignore clipboard read errors
  }
}

export const initClipboardManager = async (window?: BrowserWindow) => {
  if (pollInterval) return
  mainWindowRef = window ?? null
  const entries = await getEntries()
  if (entries.length > 0) {
    const latest = entries[0]
    if (latest.type === 'text' && latest.text) {
      lastTextHash = hashString(latest.text)
    }
  }
  pollInterval = setInterval(pollClipboard, POLL_INTERVAL_MS)
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
  const entries = (await getEntries()).filter((e) => e.id !== id)
  await setEntries(entries)
}

export const pinClipboardEntry = async (id: string, pinned: boolean) => {
  const entries = await getEntries()
  const idx = entries.findIndex((e) => e.id === id)
  if (idx === -1) return
  entries[idx] = { ...entries[idx], pinned }
  await setEntries(entries)
}

export const writeClipboardFromEntry = (entry: ClipboardEntryT) => {
  if (entry.type === 'text' && entry.text) {
    clipboard.writeText(entry.text)
    return
  }
  if (entry.type === 'image' && entry.imageBase64) {
    const img = nativeImage.createFromDataURL(entry.imageBase64)
    if (!img.isEmpty()) {
      clipboard.writeImage(img)
    }
  }
}
