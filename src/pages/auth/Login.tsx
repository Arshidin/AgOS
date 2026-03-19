import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, Phone, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { phoneToFakeEmail } from '@/lib/auth-utils'
import { toast } from 'sonner'

export function Login() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('+7')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length !== 11) {
      setError('Введите номер телефона полностью')
      return
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }

    // Single source of truth for phone→email conversion
    const fakeEmail = phoneToFakeEmail(phone)

    setIsLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login')) {
          setError('Неверный номер телефона или пароль')
        } else {
          setError(authError.message)
        }
        return
      }

      toast.success('Вход выполнен')
      navigate('/cabinet', { replace: true })
    } catch {
      setError('Ошибка подключения. Попробуйте позже.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf6ee] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#2B180A] font-serif">
            ТУРАН
          </h1>
          <p className="text-sm text-[#6b5744] mt-1">
            Вход в личный кабинет
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-[#2B180A] mb-1.5">
              Номер телефона
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b5744]" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="+7 (___) ___-__-__"
                className="w-full pl-10 pr-4 py-2.5 border border-[#e8ddd0] rounded-xl bg-white text-[#2B180A] focus:outline-none focus:ring-2 focus:ring-[hsl(24,73%,54%)]/30 focus:border-[hsl(24,73%,54%)]"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-[#2B180A] mb-1.5">
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b5744]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full pl-10 pr-10 py-2.5 border border-[#e8ddd0] rounded-xl bg-white text-[#2B180A] focus:outline-none focus:ring-2 focus:ring-[hsl(24,73%,54%)]/30 focus:border-[hsl(24,73%,54%)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5744] hover:text-[#2B180A]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-[hsl(24,73%,54%)] text-white rounded-xl font-medium hover:bg-[hsl(24,73%,44%)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Войти'
            )}
          </button>
        </form>

        {/* Register link */}
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
