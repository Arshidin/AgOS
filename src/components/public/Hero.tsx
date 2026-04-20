import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Reveal from "./Reveal";
import ProjectOverlay, { type ProjectPopupData } from "./ProjectOverlay";
import turanIcon from "@/assets/turan-icon.svg";
import { supabase } from "@/lib/supabase";

/** Tumar ornament — Kazakh traditional amulet shape, used as subtle decorative detail */
function TumarOrnament({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <g transform="translate(100, 95)">
        <path d="M 0 -50 L 35 -20 L 35 25 L 0 50 L -35 25 L -35 -20 Z" stroke="#6B4226" strokeWidth="2.5" />
        <path d="M 0 -35 L 24 -14 L 24 18 L 0 35 L -24 18 L -24 -14 Z" stroke="#D97706" strokeWidth="1.5" />
        <path d="M 0 -20 L 13 -8 L 13 10 L 0 20 L -13 10 L -13 -8 Z" stroke="#D4C5A9" strokeWidth="1.5" />
        <circle cx="0" cy="0" r="4" fill="#D97706" />
        <line x1="-8" y1="0" x2="8" y2="0" stroke="#D97706" strokeWidth="1" />
        <line x1="0" y1="-8" x2="0" y2="8" stroke="#D97706" strokeWidth="1" />
        <path d="M 0 -50 L 5 -42 L -5 -42 Z" fill="#D97706" opacity="0.4" />
        <path d="M 0 50 L 5 42 L -5 42 Z" fill="#D97706" opacity="0.4" />
      </g>
    </svg>
  );
}

/** 8 project cards (fixed order). AI backgrounds in a unified cinematic style. */
const stickerKeys = [
  "hero.cards.coordination",
  "hero.cards.management",
  "hero.cards.consortium",
  "hero.cards.digitalization",
  "hero.cards.media",
  "hero.cards.conferences",
  "hero.cards.education",
  "hero.cards.products",
] as const;

const heroProjectCardsData = [
  { stickerKey: stickerKeys[0], name: "Turan Standard Pool", logo: "TSP", image: "/images/turan-standard-pool-bg.png", logoImage: "/images/tsp-logo.png", logoWide: true },
  { stickerKey: stickerKeys[1], name: "Zengi Farms", logo: "ZF", image: "/images/zengi-farms-bg.png", logoImage: "/images/zengi-farms-logo.png", logoWide: true },
  { stickerKey: stickerKeys[2], name: "ARQALAND", logo: "AQ", image: "/images/arqaland-bg.png", logoImage: "/images/arqaland-logo.png", logoWide: true },
  { stickerKey: stickerKeys[3], name: "JAILAU.PRO", logo: "JP", image: "/images/jailau-pro-bg.png" },
  { stickerKey: stickerKeys[4], name: "Dala.Camp Media", logo: "DC", image: "/images/dala-camp-media-bg.png", logoImage: "/images/dala-camp-logo.png", logoWide: true },
  { stickerKey: stickerKeys[5], name: "Dala.Camp Conf", logo: "DC", image: "/images/dala-camp-conf-bg.png" },
  { stickerKey: stickerKeys[6], name: "EDU.DALACAMP", logo: "ED", image: "/images/edu-dalacamp-bg.png", logoImage: "/images/edu-dalacamp-logo.png" },
  { stickerKey: stickerKeys[7], name: "ONDALA", logo: "ON", image: "/images/ondala-bg.png", logoImage: "/images/ondala-logo-v2.png", logoWide: true },
];

/** Popup data keys. Uses i18n keys for translatable content. */
const projectKeys = ['tsp', 'zengi', 'arqaland', 'jailau', 'dalaCampMedia', 'dalaCampConf', 'eduDalaCamp', 'ondala'] as const;
const projectMetricKeys = [
  ['farms', 'demandConsolidated', 'regionsCoverage', 'gradingLevels'],
  ['activeProjects', 'feedlotHeads', 'breedingHeads', 'largestProject'],
  ['farmsInConsortium', 'cattleHeads', 'pastureArea', 'baseRegion'],
  ['systemModules', 'scalability', 'monitoring', 'singlePlatform'],
  ['monthlyReach', 'subscribers', 'platforms', 'audienceAge'],
  ['participants', 'regions', 'formats', 'duration'],
  ['directions', 'platform', 'access', 'scalability'],
  ['model', 'traceability', 'positioning', 'segment'],
] as const;

const projectMetricValues = [
  ['250', '56 000', '16', '3'],
  ['14', '3 000+', '4 000+', '₸4.69 млрд'],
  ['20+1', '6 000', '42 000 га', 'Аркалык'],
  ['4', '∞', '24/7', '1'],
  ['20 млн+', '500K+', '4', '28–50'],
  ['100–500+', '10+', '2', '1 день+'],
  ['4', 'edu.dalacamp.kz', '24/7', '∞'],
  ['Франшиза', '100%', 'Степное', 'B2C'],
] as const;

const projectLinks = [
  'https://turanstandart.kz/platform',
  undefined,
  undefined,
  'https://jailau.pro',
  'https://dalacamp.kz',
  'https://dalacamp.kz',
  'https://edu.dalacamp.kz',
  'https://ondala.kz',
] as const;

function useProjectPopups(): ProjectPopupData[] {
  const { t } = useTranslation();
  return heroProjectCardsData.map((card, i) => ({
    sticker: t(card.stickerKey),
    name: card.name,
    image: card.image,
    description: t(`hero.projects.${projectKeys[i]}.description`),
    features: (t(`hero.projects.${projectKeys[i]}.features`, { returnObjects: true }) as string[]),
    link: projectLinks[i],
    metrics: (projectMetricKeys[i] ?? []).map((mk, mi) => ({
      value: (projectMetricValues[i]?.[mi] ?? '') as string,
      label: t(`hero.projects.${projectKeys[i]}.metrics.${mk}`),
    })),
  }));
}

/** Lazy-loaded hero card with skeleton placeholder and fade-in. */
const HeroCard = ({
  card,
  index,
  onOpen,
}: {
  card: (typeof heroProjectCardsData)[number] & { sticker: string };
  index: number;
  onOpen: (i: number) => void;
}) => {
  const [bgLoaded, setBgLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(!card.logoImage); // true if no logo

  return (
    <div
      className="hero-project-card group relative flex-shrink-0 w-[240px] h-[320px] md:w-[260px] md:h-[340px] lg:w-[280px] lg:h-[360px]"
      onClick={() => onOpen(index)}
      role="button"
      tabIndex={0}
      aria-label={card.name}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(index);
        }
      }}
    >
      {/* Skeleton placeholder */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: "linear-gradient(90deg, #3a2a1a 25%, #4a3a2a 50%, #3a2a1a 75%)",
          backgroundSize: "200% 100%",
          animation: bgLoaded ? "none" : "skeleton-shimmer 1.8s ease-in-out infinite",
          opacity: bgLoaded ? 0 : 1,
        }}
      />

      {/* Actual background image — lazy loaded */}
      <img
        src={card.image}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: bgLoaded ? 1 : 0 }}
        onLoad={() => setBgLoaded(true)}
      />

      {/* Card overlay content */}
      <div className="hero-card-overlay absolute inset-0 flex flex-col" style={{ zIndex: 1 }}>
        {/* Стикер + Название — верхний край */}
        <div className="flex flex-col items-center gap-2 pt-5">
          <span
            className="inline-block text-[10px] font-medium uppercase tracking-[0.05em] text-white rounded-md border px-2 py-0.5 font-body"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(8px)",
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            {card.sticker}
          </span>
          <h3
            className="text-[16px] font-bold text-white text-center font-serif uppercase"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
          >
            {card.name}
          </h3>
        </div>

        {/* Логотип — по центру */}
        <div className="flex-1 flex items-center justify-center">
          {card.logoImage ? (
            <img
              src={card.logoImage}
              alt={card.name}
              loading="lazy"
              decoding="async"
              className={`h-[54px] object-contain transition-opacity duration-400 ${card.logoWide ? "max-w-[85%]" : "w-[54px] rounded-full"}`}
              style={{ opacity: logoLoaded ? 1 : 0 }}
              onLoad={() => setLogoLoaded(true)}
            />
          ) : (
            <div
              className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-white text-[16px] font-bold"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              {card.logo}
            </div>
          )}
        </div>

        {/* Стрелка — правый нижний угол */}
        <div className="p-4 flex justify-end">
          <span
            className="hero-card-arrow text-white inline-block"
            style={{ fontSize: "20px" }}
            aria-hidden
          >
            →
          </span>
        </div>
      </div>
    </div>
  );
};

const Hero = () => {
  const { t } = useTranslation();
  const countRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLImageElement>(null);
  const startRef = useRef<number | null>(null);
  const [target, setTarget] = useState(253);
  const DURATION = 2500;

  /* Overlay state */
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayIndex, setOverlayIndex] = useState(0);
  const projectPopups = useProjectPopups();

  const openOverlay = useCallback((index: number) => {
    setOverlayIndex(index);
    setOverlayOpen(true);
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
  }, []);

  const navigateOverlay = useCallback((index: number) => {
    setOverlayIndex(index);
  }, []);

  /* Fetch live counter */
  useEffect(() => {
    supabase
      .from('app_counters')
      .select('value')
      .eq('id', 'registration_count')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setTarget(data.value);
      });
  }, []);

  /* Counter animation */
  useEffect(() => {
    let raf: number;
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const value = Math.round(1 + (target - 1) * eased);
      if (countRef.current) countRef.current.textContent = String(value);
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        if (iconRef.current) {
          iconRef.current.style.animation = "none";
          iconRef.current.style.transform = "rotate(360deg)";
        }
      }
    };
    startRef.current = null;
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <section className="pt-28 md:pt-36 pb-0 relative">
      {/* Background image — desktop */}
      <div
        className="absolute inset-0 pointer-events-none hidden md:block"
        style={{
          backgroundImage: "url('/images/hero-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 70%',
          backgroundRepeat: 'no-repeat',
          opacity: 0.70,
        }}
      />
      {/* Background image — mobile (portrait crop, desaturated 18.5%) */}
      <div
        className="absolute inset-0 pointer-events-none md:hidden"
        style={{
          backgroundImage: "url('/images/hero-bg-mobile.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 60%',
          backgroundRepeat: 'no-repeat',
          opacity: 0.55,
          filter: 'saturate(0.815)',
        }}
      />
      {/* Mobile text readability overlay */}
      <div
        className="absolute inset-0 pointer-events-none md:hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(253,246,238,0.75) 0%, rgba(253,246,238,0.45) 55%, rgba(253,246,238,0) 100%)',
        }}
      />

      <TumarOrnament className="absolute top-32 md:top-40 left-4 md:left-[10%] opacity-[0.15] w-[80px] md:w-[110px] pointer-events-none z-[1]" />

      {/* Top content — centered */}
      <div className="text-center px-6 max-w-4xl mx-auto relative z-[1]">
        <Reveal>
          <div className="animate-bounce-in">
            <Link
              to="/registration"
              className="inline-flex items-center gap-1.5 md:gap-2.5 rounded-full bg-background border border-border pl-1 md:pl-1.5 pr-3 md:pr-5 py-1 md:py-1.5 text-xs md:text-sm font-serif text-foreground hover:text-foreground mb-8 md:mb-10 shadow-sm hover:shadow-md hover:scale-[1.03] transition-[box-shadow,transform] duration-300"
            >
              <span className="inline-flex items-center gap-1 md:gap-1.5 rounded-full px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold text-white" style={{ backgroundColor: "#2d2d2d" }}>
                <img
                  src={turanIcon}
                  alt="Turan"
                  className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 animate-spin"
                  ref={iconRef}
                  style={{ animationDuration: "2.5s", animationIterationCount: "1", animationFillMode: "forwards" }}
                />
                <span ref={countRef} style={{ minWidth: "2.5ch", display: "inline-block", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>1</span>
              </span>
              <span className="text-xs md:text-sm font-medium text-muted-foreground">{t('hero.farmsInAssociation')}</span>
              <span className="text-muted-foreground text-xs md:text-sm">›</span>
            </Link>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="font-serif font-light text-[clamp(2.2rem,6vw,4.2rem)] leading-[1.08] tracking-editorial text-foreground mb-6">
            {t('hero.title1')}
            <br />
            {t('hero.title2')}
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="text-base md:text-lg text-muted-foreground font-serif max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('hero.subtitle1')}
            <br />
            {t('hero.subtitle2')}
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="flex flex-row items-center justify-center gap-3">
            <Link
              to="/registration"
              className="group/btn inline-flex items-center gap-2 px-7 py-3 text-[15px] font-medium transition-all duration-300 hover:brightness-90"
              style={{ backgroundColor: "#3f2407", color: "#fff", borderRadius: "13px" }}
            >
              {t('hero.joinBtn')}
              <span className="inline-block transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
            </Link>
            <button
              onClick={() => document.getElementById('hero-cards')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-7 py-3 text-[15px] font-medium text-foreground/70 transition-all duration-300 hover:text-foreground underline underline-offset-4 decoration-foreground/30"
            >
              {t('hero.learnMore')}
            </button>
          </div>
        </Reveal>
      </div>

      {/* Карточки команды (проектов) — 8 карточек */}
      <Reveal delay={400}>
        <div id="hero-cards" className="relative z-[1] mt-16 md:mt-20 flex gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide">
          {heroProjectCardsData.map((card, index) => (
            <HeroCard key={card.name + index} card={{ ...card, sticker: t(card.stickerKey) }} index={index} onOpen={openOverlay} />
          ))}
          <div className="flex-shrink-0 w-4" />
        </div>
      </Reveal>

      {/* Fullscreen Overlay */}
      <ProjectOverlay
        projects={projectPopups}
        activeIndex={overlayIndex}
        isOpen={overlayOpen}
        onClose={closeOverlay}
        onNavigate={navigateOverlay}
      />
    </section>
  );
};

export default Hero;
