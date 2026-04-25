import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Loader2, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { OtpInput } from '@/pages/registration/components/OtpInput'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [phone, setPhone] = useState('+7')
  const [otpSent, setOtpSent] = useState(false)
  const [otpValue, setOtpValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const phoneDigits = phone.replace(/\D/g, '').slice(1) // remove leading 7, get 10 digits
  const maskedPhone = phoneDigits.length >= 7
    ? `+7 (${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-••-••`
    : phone

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 1) return '+7'
    const rest = digits.slice(1, 11)
    let formatted = '+7'
    if (rest.length > 0) formatted += ' (' + rest.slice(0, 3)
    if (rest.length >= 3) formatted += ') ' + rest.slice(3, 6)
    if (rest.length >= 6) formatted += '-' + rest.slice(6, 8)
    if (rest.length >= 8) formatted += '-' + rest.slice(8, 10)
    return formatted
  }

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 11) {
      setError('Введите номер телефона полностью')
      return
    }
    setError(null)
    setIsSending(true)
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: `+7${digits.slice(1)}`,
      })
      if (authError) {
        setError(authError.message || 'Ошибка отправки кода')
        return
      }
      setOtpSent(true)
      setCountdown(60)
    } catch {
      setError('Ошибка отправки кода')
    } finally {
      setIsSending(false)
    }
  }

  const handleVerifyOtp = async (token: string) => {
    if (token.length < 6) return
    setError(null)
    setIsVerifying(true)
    try {
      const { error: authError } = await supabase.auth.verifyOtp({
        phone: `+7${phoneDigits}`,
        token,
        type: 'sms',
      })
      if (authError) {
        setError('Неверный код — попробуйте ещё раз')
        setOtpValue('')
        return
      }
      toast.success('Вход выполнен')
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/cabinet'
      navigate(from, { replace: true })
    } catch {
      setError('Ошибка проверки кода')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || isSending) return
    setIsSending(true)
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: `+7${phoneDigits}`,
      })
      if (authError) { setError(authError.message); return }
      setOtpValue('')
      setCountdown(60)
    } catch {
      setError('Ошибка отправки')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf6ee] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#2B180A] font-serif">ТУРАН</h1>
          <p className="text-sm text-[#6b5744] mt-1">Вход в личный кабинет</p>
        </div>

        {!otpSent ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2B180A] mb-1.5">
                Номер телефона
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b5744]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(null) }}
                  placeholder="+7 (___) ___-__-__"
                  className="w-full pl-10 pr-4 py-2.5 border border-[#e8ddd0] rounded-xl bg-white text-[#2B180A] focus:outline-none focus:ring-2 focus:ring-[hsl(24,73%,54%)]/30 focus:border-[hsl(24,73%,54%)]"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              onClick={handleSendOtp}
              disabled={isSending}
              className="w-full py-2.5 bg-[hsl(24,73%,54%)] text-white rounded-xl font-medium hover:bg-[hsl(24,73%,44%)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSending ? 'Отправка…' : 'Получить код'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-[#2B180A]">Код из SMS</p>
              <p className="text-sm text-[#6b5744]">Отправили на {maskedPhone}</p>
            </div>

            <OtpInput
              value={otpValue}
              onChange={setOtpValue}
              onComplete={handleVerifyOtp}
              disabled={isVerifying}
            />

            <button
              onClick={() => handleVerifyOtp(otpValue)}
              disabled={otpValue.length < 6 || isVerifying}
              className="w-full py-2.5 bg-[hsl(24,73%,54%)] text-white rounded-xl font-medium hover:bg-[hsl(24,73%,44%)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
              {isVerifying ? 'Проверка…' : 'Войти'}
            </button>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <p className="text-center text-sm text-[#6b5744]">
              Не пришло?{' '}
              {countdown > 0 ? (
                <span className="text-[#6b5744]/50">через {countdown} сек.</span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={isSending}
                  className="text-[hsl(24,73%,54%)] font-medium hover:underline"
                >
                  {isSending ? 'Отправка…' : 'Отправить снова'}
                </button>
              )}
            </p>

            <button
              onClick={() => { setOtpSent(false); setOtpValue(''); setError(null) }}
              className="w-full text-center text-sm text-[#6b5744]/50 hover:text-[#6b5744] transition-colors"
            >
              ← Изменить номер
            </button>
          </div>
        )}

        <p className="text-center text-sm text-[#6b5744]">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-[hsl(24,73%,54%)] font-medium hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  )
}
