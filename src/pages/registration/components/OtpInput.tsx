import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  error?: string
  disabled?: boolean
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  error,
  disabled,
}: OtpInputProps) {
  const handleChange = (val: string) => {
    onChange(val)
    if (val.length === 6 && onComplete) {
      onComplete(val)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-[#6b5744] text-center">
        Введите код из SMS
      </p>
      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={value}
          onChange={handleChange}
          disabled={disabled}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      {error && (
        <p className="text-xs text-center" style={{ color: 'var(--red)' }}>{error}</p>
      )}
    </div>
  )
}
