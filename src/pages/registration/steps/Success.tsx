import { useNavigate } from 'react-router-dom'
import type { RoleType } from '../constants'

interface SuccessProps {
  role: RoleType
}

const ROLE_MESSAGES: Record<RoleType, { title: string; desc: string; cta: string; route: string }> = {
  farmer: {
    title: 'Регистрация завершена!',
    desc: 'Теперь вы можете заполнить профиль фермы, добавить поголовье и воспользоваться AI-ветеринаром.',
    cta: 'Перейти в кабинет',
    route: '/cabinet/farm',
  },
  mpk: {
    title: 'Регистрация завершена!',
    desc: 'Ваш личный кабинет будет доступен в ближайшее время. Мы сообщим по SMS.',
    cta: 'На главную',
    route: '/cabinet',
  },
  services: {
    title: 'Регистрация завершена!',
    desc: 'Кабинет сервисной компании будет доступен в ближайшее время. Мы сообщим по SMS.',
    cta: 'На главную',
    route: '/cabinet',
  },
  feed_producer: {
    title: 'Регистрация завершена!',
    desc: 'Кабинет кормопроизводителя будет доступен в ближайшее время. Мы сообщим по SMS.',
    cta: 'На главную',
    route: '/cabinet',
  },
}

export function Success({ role }: SuccessProps) {
  const navigate = useNavigate()
  const msg = ROLE_MESSAGES[role]

  return (
    <div className="space-y-8 text-center reg-benefit-enter">
      {/* Animated checkmark */}
      <div className="flex justify-center">
        <svg className="w-20 h-20" viewBox="0 0 52 52">
          <circle
            className="reg-checkmark-circle"
            cx="26"
            cy="26"
            r="25"
            fill="none"
            stroke="#2d7a3a"
            strokeWidth="2"
          />
          <path
            className="reg-checkmark-check"
            fill="none"
            stroke="#2d7a3a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.1 27.2l7.1 7.2 16.7-16.8"
          />
        </svg>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-[#2B180A] font-serif">
          {msg.title}
        </h2>
        <p className="text-sm text-[#6b5744] leading-relaxed max-w-sm mx-auto">
          {msg.desc}
        </p>
      </div>

      <button
        onClick={() => navigate(msg.route)}
        className="reg-btn-primary w-full"
      >
        {msg.cta}
      </button>
    </div>
  )
}
