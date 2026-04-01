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
      <label className="text-sm text-[#6b5744] font-medium">{label}</label>
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
                  ? 'bg-[#2B180A] text-white border-[#2B180A]'
                  : 'bg-white text-[#2B180A]/70 border-[#e8ddd0] hover:border-[#2B180A]/30'
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && (
        <p className="text-xs mt-1" style={{ color: 'var(--red)' }}>{error}</p>
      )}
    </div>
  )
}
