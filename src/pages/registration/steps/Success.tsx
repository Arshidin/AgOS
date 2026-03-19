import { useNavigate } from 'react-router-dom'
import { MessageCircle, ClipboardList, ArrowRight } from 'lucide-react'
import type { RoleType } from '../constants'

interface SuccessProps {
  role: RoleType
  phone?: string
  companyName?: string
}

const CONFETTI_PARTICLES = [
  { left: '12%', delay: '0s', color: '#C4883A', size: 8 },
  { left: '28%', delay: '0.3s', color: '#E8C87A', size: 6 },
  { left: '42%', delay: '0.1s', color: '#D4A44C', size: 10 },
  { left: '58%', delay: '0.4s', color: '#C4883A', size: 7 },
  { left: '72%', delay: '0.15s', color: '#8B6914', size: 9 },
  { left: '85%', delay: '0.25s', color: '#E8C87A', size: 6 },
  { left: '50%', delay: '0.2s', color: '#C4883A', size: 8 },
]

function Confetti() {
  return (
    <div className="absolute inset-x-0 top-0 h-40 pointer-events-none overflow-hidden">
      {CONFETTI_PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full reg-confetti-particle"
          style={{
            left: p.left,
            top: '-12px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  )
}

function formatPhoneFull(digits: string): string {
  if (digits.length !== 10) return `+7${digits}`
  return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`
}

const ROLE_MESSAGES: Record<RoleType, { title: string; farmerMsg: string; nextStep: string; cta: string; route: string }> = {
  farmer: {
    title: 'Регистрация завершена!',
    farmerMsg: 'Ваш кабинет фермера активирован. Мы отправим уведомление на',
    nextStep: 'Заполните профиль фермы, добавьте поголовье и попробуйте AI-ветеринара',
    cta: 'Войти в кабинет',
    route: '/login',
  },
  mpk: {
    title: 'Регистрация завершена!',
    farmerMsg: 'Ваша заявка принята. Мы сообщим о подключении кабинета на',
    nextStep: 'Мы подготовим ваш личный кабинет и уведомим о готовности',
    cta: 'Войти в кабинет',
    route: '/login',
  },
  services: {
    title: 'Регистрация завершена!',
    farmerMsg: 'Ваша заявка принята. Мы сообщим о подключении кабинета на',
    nextStep: 'Мы подготовим ваш кабинет сервисной компании и уведомим о готовности',
    cta: 'Войти в кабинет',
    route: '/login',
  },
  feed_producer: {
    title: 'Регистрация завершена!',
    farmerMsg: 'Ваша заявка принята. Мы сообщим о подключении кабинета на',
    nextStep: 'Мы подготовим ваш кабинет кормопроизводителя и уведомим о готовности',
    cta: 'Войти в кабинет',
    route: '/login',
  },
}

export function Success({ role, phone = '', companyName = '' }: SuccessProps) {
  const navigate = useNavigate()
  const msg = ROLE_MESSAGES[role]
  const formattedPhone = formatPhoneFull(phone)

  const waMessage = encodeURIComponent(
    `Здравствуйте! Я зарегистрировался в TURAN${companyName ? ` (${companyName})` : ''}. Хочу уточнить детали.`
  )
  const waLink = `https://wa.me/77753387130?text=${waMessage}`

  return (
    <div className="text-center relative">
      <Confetti />

      {/* Animated checkmark */}
      <div className="flex justify-center pt-4">
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

      <h2 className="font-serif text-[26px] font-semibold mt-6 text-[#2B180A]">
        {msg.title}
      </h2>

      <p className="text-[15px] max-w-[360px] mx-auto mt-3 leading-relaxed text-[#6b5744]">
        {msg.farmerMsg}{' '}
        {phone && <span className="font-semibold text-[#2B180A]">{formattedPhone}</span>}
        {phone ? '.' : ''}
      </p>

      {/* Next steps */}
      <div className="flex flex-col gap-3 mt-10">
        {/* WhatsApp */}
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200 hover:shadow-sm reg-benefit-enter"
          style={{ background: 'rgba(43,24,10,0.02)', animationDelay: '150ms' }}
        >
          <div className="w-10 h-10 rounded-xl bg-[#fdf6ee] flex items-center justify-center shrink-0 mt-0.5">
            <MessageCircle size={20} className="text-[hsl(24,73%,54%)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-[#2B180A] font-medium">
              Написать в WhatsApp
            </p>
            <p className="text-xs text-[#6b5744]/70 mt-0.5">Открыть чат</p>
          </div>
          <ArrowRight size={16} className="text-[#6b5744]/40 shrink-0 mt-1" />
        </a>

        {/* Info step */}
        <div
          className="flex items-start gap-3 p-4 rounded-xl text-left reg-benefit-enter"
          style={{ background: 'rgba(43,24,10,0.02)', animationDelay: '300ms' }}
        >
          <div className="w-10 h-10 rounded-xl bg-[#fdf6ee] flex items-center justify-center shrink-0 mt-0.5">
            <ClipboardList size={20} className="text-[hsl(24,73%,54%)]" />
          </div>
          <p className="text-sm leading-relaxed text-[#6b5744]">
            {msg.nextStep}
          </p>
        </div>
      </div>

      <button
        onClick={() => navigate(msg.route)}
        className="reg-btn-primary w-full mt-10"
      >
        {msg.cta}
      </button>
    </div>
  )
}
