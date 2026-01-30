import { cn } from '@renderer/lib/utils'

interface ExitConfirmationProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

export const ExitConfirmation = ({
  isOpen,
  onConfirm,
  onCancel,
  className
}: ExitConfirmationProps) => {
  if (!isOpen) return null

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center',
        'bg-black/60 backdrop-blur-sm z-50',
        className
      )}
    >
      <div className="glass rounded-xl p-6 max-w-sm mx-4 border border-white/10">
        <h3 className="text-lg font-medium text-white/87 mb-2">Close Terminal?</h3>
        <p className="text-sm text-white/60 mb-4">
          Press <kbd className="px-2 py-1 bg-white/10 rounded text-xs">ESC</kbd> again to confirm,
          or any other key to cancel.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white/87 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm bg-white/20 text-white/87 hover:bg-white/30 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
