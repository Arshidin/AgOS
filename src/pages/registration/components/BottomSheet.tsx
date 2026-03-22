import { useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetOption {
  value: string
  label: string
}

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  options: BottomSheetOption[]
  value: string
  onChange: (value: string) => void
}

export function BottomSheet({
  open,
  onClose,
  title,
  options,
  value,
  onChange,
}: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 reg-backdrop-enter"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl reg-sheet-enter max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8ddd0]">
          <h3 className="text-base font-medium text-[#2B180A]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-[#6b5744] hover:text-[#2B180A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value)
                onClose()
              }}
              className={cn(
                'w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors',
                value === opt.value
                  ? 'bg-[#fdf6ee] text-[#2B180A]'
                  : 'text-[#2B180A]/80 hover:bg-[#fdf6ee]/50'
              )}
            >
              <span className="text-[15px]">{opt.label}</span>
              {value === opt.value && (
                <Check className="h-4 w-4 text-[hsl(24,73%,54%)]" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
