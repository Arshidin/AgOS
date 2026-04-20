import { useState, useCallback, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Phone, MessageCircle, Globe, ChevronDown, ChevronRight, MessageSquare, FileText, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type Lang = 'ru' | 'kz';
const t = (ru: string, kz: string, lang: Lang) => (lang === 'ru' ? ru : kz);

/* ── Data ── */
const services = [
  {
    icon: MessageSquare,
    title: { ru: 'Консультация', kz: 'Кеңес беру' },
    sub: { ru: 'Бесплатный первый разбор', kz: 'Тегін алғашқы талдау' },
    points: [
      { ru: 'Анализ вашего хозяйства и целей', kz: 'Шаруашылығыңызды және мақсаттарыңызды талдау' },
      { ru: 'Подбор подходящей программы АКК', kz: 'АКК бағдарламасын іріктеу' },
      { ru: 'Оценка шансов на одобрение', kz: 'Мақұлдану мүмкіндігін бағалау' },
      { ru: 'Бесплатно на первом этапе', kz: 'Алғашқы кезеңде тегін' },
    ],
  },
  {
    icon: FileText,
    title: { ru: 'Готовим проект под ключ', kz: 'Жобаны толық дайындау' },
    sub: { ru: 'Полная упаковка документов', kz: 'Құжаттардың толық пакеті' },
    points: [
      { ru: 'Производственная модель фермы', kz: 'Фermanың өндірістік моделі' },
      { ru: 'Операционная модель — персонал, процессы, логистика', kz: 'Операциялық модель — персонал, процестер, логистика' },
      { ru: 'Финансовая модель на 10 лет — выручка, затраты, окупаемость', kz: '10 жылға арналған қаржылық модель — түсім, шығын, өтелімділік' },
      { ru: 'Бизнес-план по стандартам АКК', kz: 'АКК талаптарына сай бизнес-жоспар' },
      { ru: 'Полный пакет документов', kz: 'Құжаттардың толық пакеті' },
    ],
  },
  {
    icon: Users,
    title: { ru: 'Сопровождение в АКК', kz: 'АКК-да қолдау көрсету' },
    sub: { ru: 'Представляем ваши интересы', kz: 'Мүдделеріңізді қорғаймыз' },
    points: [
      { ru: 'Взаимодействие с менеджерами АКК', kz: 'АКК менеджерлерімен өзара әрекет' },
      { ru: 'Представление интересов клиента', kz: 'Клиенттің мүдделерін білдіру' },
      { ru: 'Ответы на запросы и замечания АКК', kz: 'АКК сұрауларына жауап беру' },
      { ru: 'До момента получения финансирования', kz: 'Қаржыландыру алынғанға дейін' },
    ],
  },
];

const steps = [
  { title: { ru: 'Консультация', kz: 'Кеңес беру' }, desc: { ru: 'Разбираем ваш проект и цели, подбираем программу АКК', kz: 'Жобаңызды талдап, АКК бағдарламасын іріктейміз' } },
  { title: { ru: 'Разработка проекта', kz: 'Жобаны әзірлеу' }, desc: { ru: 'Производственная, операционная и финансовая модели', kz: 'Өндірістік, операциялық және қаржылық модельдер' } },
  { title: { ru: 'Бизнес-план', kz: 'Бизнес-жоспар' }, desc: { ru: 'Готовим документы по требованиям АКК', kz: 'АКК талаптарына сай құжаттарды дайындаймыз' } },
  { title: { ru: 'Сопровождение', kz: 'Қолдау көрсету' }, desc: { ru: 'Подаём заявку и защищаем проект в АКК', kz: 'Өтінімді беріп, АКК-да жобаны қорғаймыз' } },
];

const programs = [
  { name: 'Жайлау', desc: { ru: 'Создание новых ферм', kz: 'Жаңа фермалар құру' }, tag: 'АКК', slug: 'zhaylau' },
  { name: 'Береке', desc: { ru: 'Импорт племенного скота', kz: 'Асыл тұқымды мал импорты' }, tag: 'АКК', slug: 'bereke' },
  { name: 'Игілік', desc: { ru: 'Импорт племенного скота', kz: 'Асыл тұқымды мал импорты' }, tag: 'АКК', slug: 'igilik' },
  { name: { ru: 'Откормочные площадки, птицефабрики', kz: 'Бордақылау алаңдары, құс фабрикалары' }, desc: { ru: 'Инфраструктура', kz: 'Инфрақұрылым' }, tag: 'АКК', slug: 'feedlots' },
];

const contacts = [
  { icon: Phone, label: { ru: 'Телефон', kz: 'Телефон' }, value: '+7 778 325 03 52', href: 'tel:+77783250352' },
  { icon: MessageCircle, label: { ru: 'WhatsApp', kz: 'WhatsApp' }, value: '+7 778 325 03 52', href: 'https://wa.me/77783250352' },
  { icon: Globe, label: { ru: 'Сайт', kz: 'Сайт' }, value: 'turanstandard.kz/finance', href: 'https://turanstandard.kz/finance' },
];

/* ── Accordion Item ── */
function AccordionItem({ service, lang, isOpen, onToggle }: { service: typeof services[0]; lang: Lang; isOpen: boolean; onToggle: () => void }) {
  const Icon = service.icon;
  return (
    <div className="rounded-xl overflow-hidden bg-white border border-border/60 shadow-sm">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left active:bg-muted/30 transition-colors">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[hsl(24,73%,54%)]/10">
          <Icon size={16} className="text-primary" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold leading-tight text-foreground">
            {t(service.title.ru, service.title.kz, lang)}
          </span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            {t(service.sub.ru, service.sub.kz, lang)}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted-foreground/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="transition-all duration-300 overflow-hidden"
        style={{ maxHeight: isOpen ? 400 : 0 }}
      >
        <div className="flex flex-col gap-2.5 px-4 pb-4 pt-3 border-t border-border/40" style={{ paddingLeft: 58 }}>
          {service.points.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full mt-[6px] shrink-0 bg-primary/60" />
              <span className="text-xs leading-relaxed text-muted-foreground">
                {t(p.ru, p.kz, lang)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function BusinessCardPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const browserLang = navigator.language?.slice(0, 2);
    return browserLang === 'kk' || browserLang === 'kz' ? 'kz' : 'ru';
  });
  const [openAcc, setOpenAcc] = useState<number | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const toggleAcc = useCallback((i: number) => {
    setOpenAcc(prev => (prev === i ? null : i));
  }, []);

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>TURAN — Агрофинансирование</title>
        <meta name="description" content="Готовим ваш проект к финансированию через АКК — под ключ" />
      </Helmet>

      <div className="min-h-dvh flex flex-col items-center bg-background" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>

        {/* ── Sticky Header ── */}
        <header className="w-full max-w-[480px] sticky top-0 z-50 flex items-center justify-between px-5 py-3 bg-background/80 backdrop-blur-lg border-b border-border/40">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/images/turan-icon.svg" alt="Turan" className="w-7 h-7" />
            <span className="text-sm font-semibold text-foreground tracking-tight group-hover:text-[hsl(var(--accent-foreground))] transition-colors" style={{ fontFamily: "'PT Serif', serif" }}>
              TURAN
            </span>
          </Link>
          <div className="flex rounded-full overflow-hidden border border-border bg-card">
            {(['ru', 'kz'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                  lang === l
                    ? 'bg-muted-foreground/15 text-foreground rounded-full'
                    : 'text-muted-foreground/50'
                }`}
              >
                {l === 'ru' ? 'RU' : 'ҚАЗ'}
              </button>
            ))}
          </div>
        </header>

        {/* ── Hero ── */}
        <div className="w-full max-w-[480px] px-6 pt-8 pb-6">

          <p className="text-xs font-medium tracking-[0.08em] uppercase text-muted-foreground mb-2">
            {t('Казахстанская Ассоциация Животноводов', 'Қазақстан Мал Шаруашылары Қауымдастығы', lang)}
          </p>

          <h1
            className="text-[26px] font-bold leading-[1.2] tracking-tight text-foreground"
            style={{ fontFamily: "'PT Serif', serif" }}
          >
            {t(
              'Готовим ваш проект к финансированию через АКК',
              'Жобаңызды АКК арқылы қаржыландыруға толық дайындаймыз',
              lang,
            )}
          </h1>

          {/* Trust badge */}
          <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-xl bg-primary/8 border border-primary/15 w-fit">
            <span className="text-primary text-sm font-semibold">500+</span>
            <span className="text-xs text-muted-foreground">
              {t('проектов по всему Казахстану', 'жоба бүкіл Қазақстан бойынша', lang)}
            </span>
          </div>
        </div>

        {/* ── Primary CTA ── */}
        <div className="w-full max-w-[480px] px-5 pb-6 flex flex-col gap-3">
          <a
            href="https://wa.me/77783250352"
            className="flex items-center justify-center gap-2.5 rounded-[13px] py-4 px-5 bg-[#25D366] text-white font-semibold text-base active:scale-[0.97] transition-transform shadow-md"
          >
            <MessageCircle size={20} />
            {t('Написать в WhatsApp', 'WhatsApp-қа жазу', lang)}
          </a>
          <a
            href="tel:+77783250352"
            className="flex items-center justify-center gap-2.5 rounded-[13px] py-3.5 px-5 bg-card border border-border text-foreground font-medium text-sm active:scale-[0.97] transition-transform"
          >
            <Phone size={18} />
            <span>{t('Позвонить', 'Қоңырау шалу', lang)}</span>
            <span className="text-muted-foreground text-xs ml-1">+7 778 325 03 52</span>
          </a>
        </div>

        {/* ── Services ── */}
        <Section label={t('Наши услуги', 'Біздің қызметтер', lang)}>
          <div className="flex flex-col gap-3">
            {services.map((s, i) => (
              <AccordionItem key={i} service={s} lang={lang} isOpen={openAcc === i} onToggle={() => toggleAcc(i)} />
            ))}
          </div>
        </Section>

        {/* ── How it works ── */}
        <Section label={t('Как это работает', 'Қалай жұмыс істейді', lang)}>
          <div className="flex flex-col relative">
            {/* Vertical line */}
            <div className="absolute left-[13px] top-4 bottom-4 w-px bg-border" />
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-4 py-4 relative">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-primary text-primary-foreground relative z-10">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {t(s.title.ru, s.title.kz, lang)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    {t(s.desc.ru, s.desc.kz, lang)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Programs ── */}
        <Section label={t('С какими программами работаем', 'Қандай бағдарламалармен жұмыс жасаймыз', lang)}>
          <div className="flex flex-col gap-2.5">
            {programs.map((p, i) => (
              <Link
                key={i}
                to={`/finance/programs/${p.slug}`}
                className="flex items-center justify-between rounded-xl p-4 bg-white border border-border/60 shadow-sm active:bg-muted/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {typeof p.name === 'string' ? p.name : t(p.name.ru, p.name.kz, lang)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(p.desc.ru, p.desc.kz, lang)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-[10px] font-semibold rounded-md px-2 py-1 bg-primary/10 text-primary">
                    {p.tag}
                  </span>
                  <ArrowRight size={16} className="text-muted-foreground/40" />
                </div>
              </Link>
            ))}
            <Link
              to="/finance/programs"
              className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-medium text-primary active:bg-muted/30 transition-colors"
            >
              {t('Другие программы', 'Басқа бағдарламалар', lang)}
              <ArrowRight size={14} />
            </Link>
          </div>
        </Section>

        {/* ── Contacts ── */}
        <Section label={t('Контакты', 'Байланыс', lang)}>
          <div className="flex flex-col gap-1">
            {contacts.map((c, i) => (
              <a
                key={i}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 py-3.5 px-1 rounded-lg active:bg-muted/30 transition-colors"
              >
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-card border border-border">
                  <c.icon size={17} className="text-primary" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                    {t(c.label.ru, c.label.kz, lang)}
                  </p>
                  <p className="text-sm font-medium text-foreground">{c.value}</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground/30 shrink-0" />
              </a>
            ))}
          </div>
        </Section>

        {/* ── Footer ── */}
        <div className="w-full max-w-[480px] text-center px-5 py-5 pb-24 border-t border-border/40">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('Казахстанская Ассоциация Животноводов TURAN', 'Қазақстан Мал Шаруашылары Қауымдастығы TURAN', lang)}
            <br />
            © 2025 ·{' '}
            <a href="https://turanstandard.kz" className="underline underline-offset-2 hover:text-foreground transition-colors">
              turanstandard.kz
            </a>
          </p>
        </div>

        {/* ── Sticky Bottom CTA ── */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 flex justify-center transition-all duration-300 ${
            showStickyBar ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}
        >
          <div className="w-full max-w-[480px] flex gap-2.5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-background/85 backdrop-blur-xl border-t border-border/50">
            <a
              href="https://wa.me/77783250352"
              className="flex-1 flex items-center justify-center gap-2 rounded-[13px] py-3 bg-[#25D366] text-white font-semibold text-sm active:scale-[0.97] transition-transform"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>
            <a
              href="tel:+77783250352"
              className="flex items-center justify-center gap-2 rounded-[13px] py-3 px-5 bg-card border border-border text-foreground font-medium text-sm active:scale-[0.97] transition-transform"
            >
              <Phone size={16} />
              {t('Позвонить', 'Қоңырау', lang)}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Section wrapper ── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[480px] px-5 py-6">
      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/70 mb-4">
        {label}
      </p>
      {children}
    </div>
  );
}
