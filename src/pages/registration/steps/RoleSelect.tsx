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
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-[#2B180A] font-serif">
          Добро пожаловать в TURAN
        </h1>
        <p className="text-sm text-[#6b5744]">
          Выберите вашу роль для регистрации
        </p>
      </div>

      <div className="space-y-3">
        {ROLES.map((role) => (
          <button
            key={role.value}
            onClick={() => onSelect(role.value)}
            className={cn(
              'w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-[#e8ddd0]',
              'hover:border-[hsl(24,73%,54%)] hover:shadow-sm transition-all text-left'
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-[#fdf6ee] flex items-center justify-center text-2xl shrink-0">
              {ROLE_ICONS[role.value]}
            </div>
            <div>
              <p className="text-[15px] font-medium text-[#2B180A]">
                {role.title}
              </p>
              <p className="text-sm text-[#6b5744] mt-0.5">{role.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
