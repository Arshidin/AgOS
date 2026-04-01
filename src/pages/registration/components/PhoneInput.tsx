import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: () => void
  error?: string
  disabled?: boolean
}

function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10)
  if (d.length === 0) return ''
  if (d.length <= 3) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  if (d.length <= 8) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`
}

export function PhoneInput({
  value,
  onChange,
  onComplete,
  error,
  disabled,
}: PhoneInputProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasValue = value.length > 0

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, 10)
      onChange(raw)
      // Auto-advance: blur when 10 digits filled
      if (raw.length === 10) {
        setTimeout(() => inputRef.current?.blur(), 80)
        onComplete?.()
      }
    },
    [onChange, onComplete]
  )

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center h-14 bg-white border rounded-xl transition-colors overflow-hidden',
          error
            ? 'border-red-400 focus-within:border-red-500'
            : 'border-[#e8ddd0] focus-within:border-[#2B180A]',
          disabled && 'opacity-50'
        )}
      >
        <span className="pl-4 text-[#2B180A] font-medium select-none shrink-0">
          +7
        </span>
        <input
          ref={inputRef}
          type="tel"
          value={formatPhone(value)}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder={!focused && !hasValue ? '' : '(777) 123-45-67'}
          className="reg-input flex-1 h-full px-2 pt-5 pb-2 bg-transparent text-[#2B180A] outline-none"
        />
      </div>
      <label
        className={cn(
          'absolute left-14 transition-all duration-200 pointer-events-none',
          focused || hasValue
            ? 'top-1.5 text-xs text-[#6b5744]'
            : 'top-4 text-base text-[#6b5744]/60'
        )}
      >
        Номер телефона
      </label>
      {error && (
        <p className="text-xs mt-1 px-1" style={{ color: 'var(--red)' }}>{error}</p>
      )}
    </div>
  )
}
