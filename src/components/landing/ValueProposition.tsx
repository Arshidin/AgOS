import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./Reveal";
import SectionSticker from "./SectionSticker";
import { useIsMobile } from "@/hooks/use-mobile";

/* ═══════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════ */

function useInView(threshold = 0.25) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e?.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useCountUp(target: number, start: boolean, duration = 800) {
  const [value, setValue] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!start) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setValue(target); return; }
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setValue(Math.round((1 - (1 - p) ** 2) * target));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [start, target, duration]);
  return value;
}

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════ */

const MONO = "'JetBrains Mono', 'DM Mono', 'SF Mono', monospace";

const C = {
  text1: "#2B180A",
  text2: "rgba(43,24,10,0.65)",
  dim: "rgba(43,24,10,0.35)",
  // Primary accent pill — warm orange (Delphi-style)
  pill_accent_bg: "rgba(232,115,12,0.08)",
  pill_accent_fg: "#E8730C",
  // Muted pill — grey-beige for secondary values
  pill_muted_bg: "rgba(43,24,10,0.05)",
  pill_muted_fg: "rgba(43,24,10,0.5)",
  // Status pills
  pill_green_bg: "rgba(107,158,107,0.1)",
  pill_green_fg: "#5A8A5A",
  status_amber_bg: "rgba(196,136,58,0.08)",
  status_amber_fg: "#B8751A",
  // Layout
  block_bg: "rgba(255,255,255,0.25)",
  block_border: "rgba(43,24,10,0.08)",
  divider: "rgba(43,24,10,0.05)",
  connector: "rgba(43,24,10,0.1)",
  green: "#6B9E6B",
  // Progress bar gradient
  progress_gradient: "linear-gradient(90deg, #E8730C, #F0933C)",
} as const;

/* ═══════════════════════════════════════════════════════════════
   SHARED PRIMITIVES
   ═══════════════════════════════════════════════════════════════ */

/** Inline pill — accent (orange), muted (grey), or green */
function Pill({ children, variant = "accent" }: { children: ReactNode; variant?: "accent" | "muted" | "green" }) {
  const styles = {
    accent: { bg: C.pill_accent_bg, fg: C.pill_accent_fg, weight: "600" },
    muted:  { bg: C.pill_muted_bg,  fg: C.pill_muted_fg,  weight: "500" },
    green:  { bg: C.pill_green_bg,  fg: C.pill_green_fg,  weight: "600" },
  }[variant];
  return (
    <span
      className="inline-block rounded-md px-1.5 py-0.5 text-[11px] md:px-2.5 md:py-1 md:text-[14px]"
      style={{ background: styles.bg, color: styles.fg, fontWeight: styles.weight }}
    >
      {children}
    </span>
  );
}

/** Small status pill for result rows */
function StatusPill({ children, color = "green" }: { children: ReactNode; color?: "green" | "amber" }) {
  const bg = color === "green" ? C.pill_green_bg : C.status_amber_bg;
  const fg = color === "green" ? C.pill_green_fg : C.status_amber_fg;
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] md:px-2 md:text-[11px] font-medium whitespace-nowrap"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

/** Section label — like "When" in Delphi */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] md:text-[13px] font-normal" style={{ color: C.dim }}>
      {children}
    </span>
  );
}

/** Block container — semi-transparent white */
function Block({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[12px] md:rounded-[14px] px-2.5 py-2.5 md:px-5 md:py-4 ${className}`}
      style={{ background: C.block_bg, border: `1px solid ${C.block_border}` }}
    >
      {children}
    </div>
  );
}

/** Thin divider inside blocks */
function Divider() {
  return <div className="my-1.5 md:my-3" style={{ borderTop: `1px solid ${C.divider}` }} />;
}

/** Vertical connector between blocks */
function Connector({ visible, delayMs }: { visible: boolean; delayMs: number }) {
  return (
    <div className="flex justify-center py-0.5 md:py-1">
      <div
        className={`vp-connector-line${visible ? " visible" : ""}`}
        style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms", height: visible ? 20 : 0 }}
      />
    </div>
  );
}

/** Interactive hint — like "+ Add Action" in Delphi */
function Hint({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] md:text-[13px] font-medium mt-1.5 md:mt-2 inline-block" style={{ color: "rgba(43,24,10,0.25)" }}>
      {children}
    </span>
  );
}

/** Animated number */
function Num({ target, started, size = 24 }: { target: number; started: boolean; size?: number }) {
  const n = useCountUp(target, started);
  const isMobile = useIsMobile();
  const finalSize = isMobile ? Math.round(size * 0.8) : size;
  return (
    <span
      className="font-semibold tabular-nums"
      style={{ fontFamily: MONO, fontSize: finalSize, color: C.text1 }}
    >
      {n}
    </span>
  );
}

/** Progress Bar — 8px tall, 4px radius */
function ProgressBar({ percent, color, animate, delay = 0 }: { percent: number; color: string; animate: boolean; delay?: number }) {
  return (
    <div className="vp-progress-track" style={{ height: 8, borderRadius: 4, background: "rgba(43,24,10,0.05)" }}>
      <div
        className={`vp-progress-fill${animate ? " animate" : ""}`}
        style={{ "--fill": `${percent}%`, background: color, borderRadius: 4, transitionDelay: animate ? `${delay}ms` : "0ms" } as React.CSSProperties}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FARMER MOCKUP — No-code builder style
   ═══════════════════════════════════════════════════════════════ */

/* Farmer stagger delays per spec sequence */
const FD = [0, 150, 500, 700, 900, 1100, 1300, 1500, 1800] as const;

function FarmerMockup() {
  const { t } = useTranslation();
  const { ref, visible } = useInView(0.2);
  const d = (i: number) => ({ transitionDelay: visible ? `${FD[i]}ms` : "0ms" });

  return (
    <div ref={ref} className="font-serif flex flex-col gap-1.5 md:gap-2">
      {/* 0 — Section label */}
      <div className={`vp-chat-block${visible ? " visible" : ""}`} style={d(0)}>
        <SectionLabel>{t('valueProposition.farmer.demand')}</SectionLabel>
      </div>

      {/* 1 — Block: sentence with pills */}
      <div className={`vp-chat-block${visible ? " visible" : ""}`} style={d(1)}>
        <Block>
          <p className="text-[12px] md:text-[14px] leading-relaxed flex flex-wrap items-center gap-1 md:gap-1.5" style={{ color: C.text2 }}>
            <span>{t('valueProposition.farmer.inRegion')}</span>
            <Pill>{t('constants.regions.Актюбинская область')}</Pill>
            <span>{t('valueProposition.farmer.looking')}</span>
            <Pill>КРС</Pill>
            <span>{t('valueProposition.farmer.weight')}</span>
            <Pill>450+ кг</Pill>
          </p>

          <Divider />

          {/* 2 — Week row 1 */}
          <div className={`vp-chat-block flex items-center justify-between${visible ? " visible" : ""}`} style={d(2)}>
            <span className="text-[10px] md:text-[12px]" style={{ color: C.dim }}>{t('valueProposition.farmer.week12')}</span>
            <div className="flex items-baseline gap-1">
              <Num target={340} started={visible} />
              <span className="text-[10px] md:text-[12px]" style={{ color: C.dim }}>{t('valueProposition.farmer.heads')}</span>
            </div>
          </div>

          {/* 3 — Week row 2 */}
          <div className={`vp-chat-block flex items-center justify-between mt-1.5 md:mt-3${visible ? " visible" : ""}`} style={d(3)}>
            <span className="text-[10px] md:text-[12px]" style={{ color: C.dim }}>{t('valueProposition.farmer.week14')}</span>
            <div className="flex items-baseline gap-1">
              <Num target={180} started={visible} />
              <span className="text-[10px] md:text-[12px]" style={{ color: C.dim }}>{t('valueProposition.farmer.heads')}</span>
            </div>
          </div>

          {/* 4 — Hint */}
          <div className={`vp-chat-block${visible ? " visible" : ""}`} style={d(4)}>
            <Hint>{t('valueProposition.farmer.otherCategories')}</Hint>
          </div>
        </Block>
      </div>

      {/* 5 — Connector */}
      <Connector visible={visible} delayMs={FD[5]} />

      {/* 6 — Section label: Buyers */}
      <div className={`vp-chat-block${visible ? " visible" : ""}`} style={d(6)}>
        <SectionLabel>{t('valueProposition.farmer.buyers')}</SectionLabel>
      </div>

      {/* 7 — Block 2: Who's buying */}
      <div className={`vp-chat-block${visible ? " visible" : ""}`} style={d(7)}>
        <Block>
          <p className="text-[12px] md:text-[14px] leading-relaxed flex flex-wrap items-center gap-1 md:gap-1.5" style={{ color: C.text2 }}>
            <Pill>{t('valueProposition.farmer.3buyers')}</Pill>
            <span>{t('valueProposition.farmer.buyersLooking')}</span>
            <Pill>{t('valueProposition.farmer.purchaseWeek')}</Pill>
          </p>

          {/* 8 — Live indicator (dot starts pulsing) */}
          <div className={`vp-chat-block flex items-center gap-2 mt-2 md:mt-3${visible ? " visible" : ""}`} style={d(8)}>
            <span className="vp-green-dot" />
            <span className="text-[10px] md:text-[12px]" style={{ color: C.pill_green_fg }}>
              {t('valueProposition.farmer.updatedAgo')}
            </span>
          </div>
        </Block>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MPK MOCKUP — No-code builder style
   ═══════════════════════════════════════════════════════════════ */

/* MPK stagger delays per spec sequence */
const MD = [0, 150, 500, 700, 900, 1100, 1300, 1500, 1650, 1800, 2000] as const;

function MpkMockup() {
  const { t } = useTranslation();
  const { ref, visible } = useInView(0.2);
  const [fillReady, setFillReady] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setFillReady(true), MD[10]);
    return () => clearTimeout(t);
  }, [visible]);
  const d = (i: number) => ({ transitionDelay: visible ? `${MD[i]}ms` : "0ms" });

  return (
    <div ref={ref} className="font-serif flex flex-col gap-1.5 md:gap-2">
      {/* 0 — Section label */}
      <div className={`vp-chat-block${visible ? " visible" : ""}`} style={d(0)}>
        <SectionLabel>{t('valueProposition.mpk.request')}</SectionLabel>
      </div>

      {/* 1 — Block 1: Request sentence */}
      <div className={`vp-chat-block${visible ? " visible" : ""}`} style={d(1)}>
        <Block>
          <p className="text-[12px] md:text-[14px] leading-relaxed flex flex-wrap items-center gap-1 md:gap-1.5" style={{ color: C.text2 }}>
            <span>{t('valueProposition.mpk.need')}</span>
            <Pill>500 {t('valueProposition.mpk.heads')}</Pill>
            <span>{t('valueProposition.mpk.breed')}</span>
            <Pill>КРС · Grade A</Pill>
            <span>{t('valueProposition.mpk.weight')}</span>
            <Pill>420–480 кг</Pill>
          </p>

          <Divider />

          {/* 2 — Second sentence row */}
          <div className={`vp-chat-block${visible ? " visible" : ""}`} style={d(2)}>
            <p className="text-[12px] md:text-[14px] leading-relaxed flex flex-wrap items-center gap-1 md:gap-1.5" style={{ color: C.text2 }}>
              <span>{t('valueProposition.mpk.region')}</span>
              <Pill>{t('constants.regions.Алматинская область')}</Pill>
              <span>{t('valueProposition.mpk.forWeeks')}</span>
              <Pill>14–16</Pill>
            </p>
          </div>

          {/* 3 — Hint */}
          <div className={`vp-chat-block${visible ? " visible" : ""}`} style={d(3)}>
            <Hint>{t('valueProposition.mpk.addCondition')}</Hint>
          </div>
        </Block>
      </div>

      {/* 4 — Connector */}
      <Connector visible={visible} delayMs={MD[4]} />

      {/* 5 — Section label: Result */}
      <div className={`vp-chat-block${visible ? " visible" : ""}`} style={d(5)}>
        <SectionLabel>{t('valueProposition.mpk.result')}</SectionLabel>
      </div>

      {/* 6 — Result sentence */}
      <div className={`vp-chat-block${visible ? " visible" : ""}`} style={d(6)}>
        <Block className="flex flex-col gap-0">
          <p className="text-[12px] md:text-[14px] leading-relaxed flex flex-wrap items-center gap-1 md:gap-1.5" style={{ color: C.text2 }}>
            <span>{t('valueProposition.mpk.found')}</span>
            <Pill>420 / 500</Pill>
            <span>{t('valueProposition.mpk.headsFrom')}</span>
            <Pill>2 {t('valueProposition.mpk.regions')}</Pill>
          </p>

          <Divider />

          {/* Result rows — staggered individually */}
          <div className="flex flex-col gap-1.5 md:gap-3">
            {/* 7 — Row 1 */}
            <div className={`vp-chat-block flex items-center justify-between flex-wrap gap-2${visible ? " visible" : ""}`} style={d(7)}>
              <span className="text-[12px] md:text-[14px]" style={{ color: C.text2 }}>{t('constants.regions.Актюбинская область')}</span>
              <div className="flex items-center gap-2">
                <Num target={280} started={visible} size={18} />
                <span className="text-[10px] md:text-[12px]" style={{ color: C.dim }}>{t('valueProposition.mpk.heads')}</span>
                <StatusPill>{t('valueProposition.mpk.found_status')}</StatusPill>
              </div>
            </div>
            {/* 8 — Row 2 */}
            <div className={`vp-chat-block flex items-center justify-between flex-wrap gap-2${visible ? " visible" : ""}`} style={d(8)}>
              <span className="text-[12px] md:text-[14px]" style={{ color: C.text2 }}>{t('constants.regions.Костанайская область')}</span>
              <div className="flex items-center gap-2">
                <Num target={140} started={visible} size={18} />
                <span className="text-[10px] md:text-[12px]" style={{ color: C.dim }}>{t('valueProposition.mpk.heads')}</span>
                <StatusPill>{t('valueProposition.mpk.found_status')}</StatusPill>
              </div>
            </div>
            {/* 9 — Row 3 — pending */}
            <div className={`vp-chat-block flex items-center justify-between flex-wrap gap-2${visible ? " visible" : ""}`} style={d(9)}>
              <span className="text-[12px] md:text-[14px]" style={{ color: C.text2 }}>{t('valueProposition.mpk.remaining')}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold tabular-nums text-[15px] md:text-[18px]" style={{ fontFamily: MONO, color: "rgba(43,24,10,0.3)" }}>80</span>
                <span className="text-[10px] md:text-[12px]" style={{ color: C.dim }}>{t('valueProposition.mpk.heads')}</span>
                <StatusPill color="amber">{t('valueProposition.mpk.searching')}</StatusPill>
              </div>
            </div>
          </div>

          {/* 10 — Progress bar: label above, bar below, orange gradient */}
          <div className="mt-2 md:mt-5 flex flex-col gap-1 md:gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] md:text-[13px]" style={{ color: "rgba(43,24,10,0.4)" }}>{t('valueProposition.mpk.requestFilling')}</span>
              <span className="text-[12px] md:text-[14px] font-semibold" style={{ fontFamily: MONO, color: C.text1 }}>84%</span>
            </div>
            <ProgressBar percent={84} color={C.progress_gradient} animate={fillReady} />
          </div>
        </Block>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CARD WRAPPER
   ═══════════════════════════════════════════════════════════════ */
function VpCard({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <div
        className="rounded-[16px] md:rounded-[20px] flex flex-col"
        style={{
          background: "#f7f0e8",
          padding: "clamp(16px, 4vw, 48px) clamp(14px, 3vw, 40px)",
        }}
      >
        {children}
      </div>
    </Reveal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VALUE PROPOSITION SECTION
   ═══════════════════════════════════════════════════════════════ */

/** Minimalist bull/cow icon */
function FarmerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#786758" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-[18px] md:h-[18px]">
      {/* Horns */}
      <path d="M5 4c-.5-1.5-2-2-2-2" />
      <path d="M19 4c.5-1.5 2-2 2-2" />
      {/* Head */}
      <ellipse cx="12" cy="7" rx="7" ry="5" />
      {/* Ears */}
      <path d="M5.5 5.5C4.5 4 3 4 3 4" />
      <path d="M18.5 5.5C19.5 4 21 4 21 4" />
      {/* Eyes */}
      <circle cx="9" cy="6.5" r="0.5" fill="#786758" stroke="none" />
      <circle cx="15" cy="6.5" r="0.5" fill="#786758" stroke="none" />
      {/* Nostrils / muzzle */}
      <ellipse cx="12" cy="9.5" rx="2.5" ry="1.5" />
      <circle cx="11" cy="9.5" r="0.4" fill="#786758" stroke="none" />
      <circle cx="13" cy="9.5" r="0.4" fill="#786758" stroke="none" />
      {/* Body */}
      <path d="M7 12v6c0 1 1 2 2 2h1" />
      <path d="M17 12v6c0 1-1 2-2 2h-1" />
      {/* Legs */}
      <path d="M8 18v2" />
      <path d="M10 18v2" />
      <path d="M14 18v2" />
      <path d="M16 18v2" />
    </svg>
  );
}

/** Minimalist factory/plant icon */
function ProcessorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#786758" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-[18px] md:h-[18px]">
      {/* Main building */}
      <path d="M4 21V11h4v10" />
      {/* Sawtooth roof sections */}
      <path d="M8 21V13l4-3v11" />
      <path d="M12 21V13l4-3v11" />
      {/* Tall section */}
      <rect x="16" y="6" width="4" height="15" rx="0.5" />
      {/* Chimney */}
      <path d="M18 6V3" />
      {/* Smoke */}
      <path d="M18 3c0-1 1.5-1.5 1-2.5" opacity="0.5" />
      {/* Base line */}
      <line x1="2" y1="21" x2="22" y2="21" />
      {/* Window dots */}
      <circle cx="6" cy="15" r="0.5" fill="#786758" stroke="none" />
      <circle cx="18" cy="12" r="0.5" fill="#786758" stroke="none" />
      <circle cx="18" cy="15" r="0.5" fill="#786758" stroke="none" />
    </svg>
  );
}

/** Card label with icon */
function CardLabel({ icon, label }: { icon: "farmer" | "processor"; label: string }) {
  return (
    <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-6">
      <span
        className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-[8px] md:rounded-[9px]"
        style={{ background: "rgba(43,24,10,0.06)" }}
      >
        {icon === "farmer" ? <FarmerIcon /> : <ProcessorIcon />}
      </span>
      <span
        className="text-[10px] md:text-[12px] font-medium uppercase tracking-[0.08em]"
        style={{ color: C.dim }}
      >
        {label}
      </span>
    </div>
  );
}

const ValueProposition = () => {
  const { t } = useTranslation();
  return (
    <section id="value-proposition" className="py-12 md:py-24" style={{ background: "#fdf6ee" }}>
      <div className="mx-auto max-w-[1200px] px-4 md:px-10">
        {/* Header */}
        <div className="mb-8 md:mb-16 max-w-[600px] md:max-w-[700px] md:mx-auto md:text-center">
          <SectionSticker
            icon={
              <svg viewBox="0 0 18 18" fill="none" className="w-full h-full">
                <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <rect x="10" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <rect x="1" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <rect x="10" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            }
          >
            {t('valueProposition.stickerLabel')}
          </SectionSticker>
          <Reveal delay={100}>
            <h2 className="font-serif font-light text-[clamp(1.55rem,5vw,2.9rem)] leading-[1.12] tracking-editorial text-foreground">
              {t('valueProposition.title')}
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-2 md:mt-4 text-[13px] md:text-[16px] leading-relaxed text-muted-foreground">
              {t('valueProposition.subtitle')}
            </p>
          </Reveal>
        </div>

        {/* Two-card stack on mobile, grid on desktop */}
        <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6">
          <VpCard delay={0}>
            <CardLabel icon="farmer" label={t('valueProposition.forFarmers')} />
            <h3 className="font-serif font-semibold text-[clamp(16px,2.2vw,22px)] leading-[1.25] text-foreground mb-1.5 md:mb-3">
              {t('valueProposition.farmerTitle1')}{" "}
              <span style={{ color: C.pill_accent_fg }}>{t('valueProposition.farmerTitle2')}</span>
            </h3>
            <p className="text-[12px] md:text-[14px] leading-relaxed text-muted-foreground mb-4 md:mb-8 max-w-[420px]">
              {t('valueProposition.farmerDesc')}
            </p>
            <FarmerMockup />
          </VpCard>

          <VpCard delay={100}>
            <CardLabel icon="processor" label={t('valueProposition.forProcessors')} />
            <h3 className="font-serif font-semibold text-[clamp(16px,2.2vw,22px)] leading-[1.25] text-foreground mb-1.5 md:mb-3">
              {t('valueProposition.processorTitle1')}{" "}
              <span style={{ color: C.pill_accent_fg }}>{t('valueProposition.processorTitle2')}</span>
            </h3>
            <p className="text-[12px] md:text-[14px] leading-relaxed text-muted-foreground mb-4 md:mb-8 max-w-[420px]">
              {t('valueProposition.processorDesc')}
            </p>
            <MpkMockup />
          </VpCard>
        </div>
      </div>
    </section>
  );
};

export default ValueProposition;
