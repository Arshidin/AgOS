import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { RoleType } from '../constants'

const ROLES: { value: RoleType; title: string; desc: string; icon: string }[] = [
  { value: 'farmer', title: 'Фермер', desc: 'Я выращиваю скот', icon: '/icons/cow.svg' },
  { value: 'mpk', title: 'Мясокомбинат / Откормплощадка', desc: 'Я закупаю скот', icon: '/icons/factory.svg' },
  { value: 'services', title: 'Сервисная компания', desc: 'Я оказываю услуги фермерам', icon: '/icons/wrench.svg' },
  { value: 'feed_producer', title: 'Кормопроизводитель', desc: 'Я произвожу/продаю корма', icon: '/icons/wheat.svg' },
]

// Simple icon fallbacks using unicode
const ROLE_ICONS: Record<RoleType, string> = {
  farmer: '\uD83D\uDC04',
  mpk: '\uD83C\uDFED',
  services: '\uD83D\uDD27',
  feed_producer: '\uD83C\uDF3E',
}

interface RoleSelectProps {
  onSelect: (role: RoleType) => void
}

export function RoleSelect({ onSelect }: RoleSelectProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-turan-fg font-serif">
          Добро пожаловать в TURAN
        </h1>
        <p className="text-sm text-turan-fg2">
          Выберите вашу роль для регистрации
        </p>
      </div>

      <div className="space-y-3">
        {ROLES.map((role) => (
          <button
            key={role.value}
            onClick={() => onSelect(role.value)}
            className={cn(
              'w-full flex items-center gap-4 p-4 bg-turan-bg-c rounded-xl border border-turan-bd',
              'hover:border-turan-accent hover:shadow-sm transition-all text-left'
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-turan-bg flex items-center justify-center text-2xl shrink-0">
              {ROLE_ICONS[role.value]}
            </div>
            <div>
              <p className="text-[15px] font-medium text-turan-fg">
                {role.title}
              </p>
              <p className="text-sm text-turan-fg2 mt-0.5">{role.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-[13px] mt-6 text-turan-fg3">
        Не уверены?{' '}
        <a
          href="https://wa.me/77753387130"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-turan-fg/70 transition-colors"
        >
          Написать в WhatsApp
        </a>
        {' '}&mdash; поможем выбрать
      </p>

      <p className="text-center text-sm text-turan-fg2 mt-2">
        Уже есть аккаунт?{' '}
        <button
          onClick={() => navigate('/login')}
          className="text-turan-accent font-medium hover:underline"
        >
          Войти
        </button>
      </p>
    </div>
  )
}
