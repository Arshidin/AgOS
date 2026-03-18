import { useState } from 'react'
import { cn } from '@/lib/utils'

interface FloatingInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  maxLength?: number
  error?: string
  disabled?: boolean
  className?: string
}

export function FloatingInput({
  label,
  value,
  onChange,
  type = 'text',
  maxLength,
  error,
  disabled,
  className,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.length > 0

  return (
    <div className={cn('relative', className)}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={maxLength}
        disabled={disabled}
        className={cn(
          'reg-input w-full h-14 px-4 pt-5 pb-2 bg-white border rounded-xl text-[#2B180A] outline-none transition-colors',
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-[#e8ddd0] focus:border-[#2B180A]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />
      <label
        className={cn(
          'absolute left-4 transition-all duration-200 pointer-events-none',
          focused || hasValue
            ? 'top-2 text-xs text-[#6b5744]'
            : 'top-4 text-base text-[#6b5744]/60'
        )}
      >
        {label}
      </label>
      {error && (
        <p className="text-xs text-red-500 mt-1 px-1">{error}</p>
      )}
    </div>
  )
}
