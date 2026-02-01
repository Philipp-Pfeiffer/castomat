import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import debounce from 'lodash/debounce'
import { Search } from 'lucide-react'

import { Footer } from '@renderer/elements/Footer'
import { CommandShortcut } from '@renderer/elements/Command'
import { winElectron } from '@renderer/lib/utils'

type ClipboardPageProps = {
  setShowClipboardManager: (show: boolean) => void
}

const formatTime = (timestamp: number): string => {
  const sec = Math.floor((Date.now() - timestamp) / 1000)
  if (sec < 60) return 'now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`
  return `${Math.floor(sec / 86400)}d`
}

const truncate = (text: string, max = 35): string => {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return t.slice(0, max) + '…'
}

export const ClipboardPage = ({ setShowClipboardManager }: ClipboardPageProps) => {
  const [entries, setEntries] = useState<ClipboardEntryT[]>([])
  const [search, setSearch] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<ClipboardEntryT | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)

  const fetchHistory = useCallback(
    debounce(async (query: string) => {
      if (winElectron?.getClipboardHistory) {
        setIsLoading(true)
        const history = await winElectron.getClipboardHistory(query)
        setEntries(history)
        setSelectedEntry((prev) => {
          const found = history.find((e) => e.id === prev?.id)
          return found ?? history[0] ?? null
        })
        setIsLoading(false)
      }
    }, 200),
    []
  )

  useEffect(() => {
    fetchHistory(search)
  }, [search, fetchHistory])

  useEffect(() => {
    if (!isLoading && entries.length > 0 && !selectedEntry) {
      setSelectedEntry(entries[0])
    }
  }, [entries, isLoading, selectedEntry])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' || (e.key === 'Backspace' && !search)) {
      e.preventDefault()
      setShowClipboardManager(false)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = entries.findIndex((e) => e.id === selectedEntry?.id)
      const next =
        e.key === 'ArrowDown'
          ? entries[Math.min(idx + 1, entries.length - 1)]
          : entries[Math.max(idx - 1, 0)]
      if (next) setSelectedEntry(next)
    } else if (e.key === 'Enter' && selectedEntry) {
      e.preventDefault()
      handlePaste(selectedEntry)
    }
  }

  const handlePaste = async (entry: ClipboardEntryT) => {
    if (winElectron?.pasteClipboardEntry) {
      await winElectron.pasteClipboardEntry(entry)
      winElectron.hideMainWindow()
    }
  }

  const previewEntry = selectedEntry ?? entries[0]

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <input
            autoFocus
            className="flex h-11 flex-1 rounded-lg bg-transparent py-3 text-sm outline-hidden placeholder:text-white/40"
            value={search}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Type to filter entries..."
          />
        </div>
        <span className="text-xs text-white/40">
          Escape to go back · ↑↓ to select · Enter to paste
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: List */}
        <div
          ref={listRef}
          className="w-[42%] flex flex-col border-r border-white/10 overflow-y-auto shrink-0"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <i className="ph ph-hourglass-high text-5xl text-white/20 animate-spin" />
              <p className="mt-2 text-sm text-white/40">Loading...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <i className="ph ph-clipboard-text text-5xl text-white/20" />
              <p className="mt-2 text-sm text-white/40 text-center">
                {search ? 'No matching entries' : 'Clipboard history is empty'}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntry(entry)}
                  onDoubleClick={() => handlePaste(entry)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    selectedEntry?.id === entry.id
                      ? 'bg-white/15 text-white'
                      : 'hover:bg-white/5 text-white/87'
                  }`}
                >
                  {entry.type === 'image' && entry.thumbnailBase64 ? (
                    <img
                      src={entry.thumbnailBase64}
                      alt=""
                      className="h-9 w-12 rounded object-cover shrink-0 bg-white/5"
                    />
                  ) : (
                    <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-white/5 shrink-0">
                      <i className="ph ph-clipboard-text text-white/60 text-base" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {entry.type === 'text' && entry.text ? (
                      <span className="block truncate text-sm">{truncate(entry.text)}</span>
                    ) : (
                      <span className="block text-sm text-white/60">Image</span>
                    )}
                    <span className="text-xs text-white/40">
                      {formatTime(entry.timestamp)}
                      {entry.pinned && ' · Pinned'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white/[0.02]">
          {previewEntry ? (
            <>
              <div className="flex-1 overflow-auto p-4">
                {previewEntry.type === 'text' && previewEntry.text ? (
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm text-white/90 leading-relaxed">
                    {previewEntry.text}
                  </pre>
                ) : previewEntry.type === 'image' && previewEntry.imageBase64 ? (
                  <div className="flex items-center justify-center min-h-full">
                    <img
                      src={previewEntry.imageBase64}
                      alt="Clipboard"
                      className="max-w-full max-h-[320px] object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-white/40">No preview available</p>
                )}
              </div>
              <div className="shrink-0 border-t border-white/10 px-4 py-3">
                <button
                  type="button"
                  onClick={() => handlePaste(previewEntry)}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/15 transition-colors"
                >
                  <i className="ph ph-copy text-base" />
                  Copy to Clipboard
                </button>
              </div>
            </>
          ) : (
            !isLoading &&
            entries.length === 0 && (
              <div className="flex flex-1 items-center justify-center p-4">
                <p className="text-sm text-white/40 text-center">Select an entry to preview</p>
              </div>
            )
          )}
        </div>
      </div>

      <Footer>
        <span className="flex items-center gap-2 text-xs text-white/60">
          Paste
          <CommandShortcut>↵</CommandShortcut>
        </span>
      </Footer>
    </div>
  )
}
