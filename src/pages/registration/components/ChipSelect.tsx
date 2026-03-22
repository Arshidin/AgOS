import { cn } from '@/lib/utils'

interface ChipOption {
  value: string
  label: string
}

interface ChipSelectProps {
  label: string
  options: ChipOption[]
  value: string[]
  onChange: (value: string[]) => void
  error?: string
}

export function ChipSelect({
  label,
  options,
  value,
  onChange,
  error,
}: ChipSelectProps) {
  const toggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue))
    } else {
      onChange([...value, optValue])
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm text-turan-fg2 font-medium">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                'px-3.5 py-2 rounded-full text-sm border transition-all',
                isSelected
                  ? 'bg-turan-fg text-white border-turan-fg'
                  : 'bg-turan-bg-c text-turan-fg/70 border-turan-bd hover:border-turan-bd-h'
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && (
        <p className="text-xs text-turan-red mt-1">{error}</p>
      )}
    </div>
  )
}
