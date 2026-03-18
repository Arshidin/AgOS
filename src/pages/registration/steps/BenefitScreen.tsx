import type { RoleType } from '../constants'

const BENEFIT_CONTENT: Record<
  RoleType,
  { step1: BenefitData; step2: BenefitData }
> = {
  farmer: {
    step1: {
      title: 'TURAN помогает вашему хозяйству',
      items: [
        'AI-ветеринар: анализ симптомов и рекомендации 24/7',
        'Расчёт рационов кормления по нормам NASEM',
        'План сезонных работ с напоминаниями',
        'Справедливые цены через координацию ассоциации',
      ],
    },
    step2: {
      title: 'Всё для фермера в одном кабинете',
      items: [
        'Учёт поголовья по группам и породам',
        'Отслеживание ветеринарных случаев',
        'Контроль складских запасов кормов',
        'Прозрачный рынок сбыта скота',
      ],
    },
  },
  mpk: {
    step1: {
      title: 'TURAN для закупщиков',
      items: [
        'Прямой доступ к фермерам ассоциации',
        'Актуальная информация о предложении',
        'Стандартизированная система грейдинга',
        'Координация закупок и логистики',
      ],
    },
    step2: {
      title: 'Преимущества работы через платформу',
      items: [
        'Агрегированное предложение по регионам',
        'Прозрачное ценообразование',
        'Сертификация и ветеринарные данные',
        'Система пулов для оптимизации логистики',
      ],
    },
  },
  services: {
    step1: {
      title: 'TURAN для сервисных компаний',
      items: [
        'Доступ к базе фермеров ассоциации',
        'Маркетплейс ветеринарных и зоотехнических услуг',
        'Система заявок на консультации',
        'Репутация и рейтинг среди фермеров',
      ],
    },
    step2: {
      title: 'Расширьте свою клиентскую базу',
      items: [
        'Автоматическое направление заявок по специализации',
        'Удобный календарь и управление заявками',
        'Рекомендации от AI-системы',
        'Аналитика по обращениям',
      ],
    },
  },
  feed_producer: {
    step1: {
      title: 'TURAN для кормопроизводителей',
      items: [
        'Каталог продукции для фермеров',
        'Система рекомендаций в рационах',
        'Прямые контакты с хозяйствами',
        'Аналитика спроса по регионам',
      ],
    },
    step2: {
      title: 'Ваши корма в рационах фермеров',
      items: [
        'Интеграция с калькулятором рационов',
        'Автоматические рекомендации на основе потребностей',
        'Логистическая координация доставки',
        'Отзывы и рейтинг от фермеров',
      ],
    },
  },
}

interface BenefitData {
  title: string
  items: string[]
}

interface BenefitScreenProps {
  role: RoleType
  step: 1 | 2
  onNext: () => void
}

export function BenefitScreen({ role, step, onNext }: BenefitScreenProps) {
  const content = step === 1
    ? BENEFIT_CONTENT[role].step1
    : BENEFIT_CONTENT[role].step2

  return (
    <div className="reg-benefit-enter space-y-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[#2B180A] font-serif leading-tight">
          {content.title}
        </h2>
      </div>

      <div className="space-y-4">
        {content.items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 reg-benefit-enter"
            style={{ animationDelay: `${(idx + 1) * 100}ms` }}
          >
            <div className="w-6 h-6 rounded-full bg-[hsl(24,73%,54%)]/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-[hsl(24,73%,54%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[15px] text-[#2B180A]/80 leading-relaxed">{item}</p>
          </div>
        ))}
      </div>

      <button onClick={onNext} className="reg-btn-primary w-full">
        Далее
      </button>
    </div>
  )
}
