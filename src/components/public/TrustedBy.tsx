import { useTranslation } from "react-i18next";
import Reveal from "./Reveal";

/* ═══════════════════════════════════════════════════════════════
   TRUSTED BY — marquee on mobile, inline on desktop
   Corner-cross decorative borders inspired by reference
   ═══════════════════════════════════════════════════════════════ */

interface Partner {
  name: string;
  display: string;
  logo?: string;
  sub?: string;
  letterSpacing?: string;
  height?: string;
}

const LOGO_HEIGHT = "h-[32px] md:h-[38px]";

const partners: Partner[] = [
  { name: "kazbeef", display: "Kazbeef", logo: "/images/logo-kazbeef.png", height: LOGO_HEIGHT },
  { name: "kusto", display: "Kusto Agro", logo: "/images/logo-kusto-agro.png", height: LOGO_HEIGHT },
  { name: "qalmaq", display: "Qalmaq Tuqymy", logo: "/images/logo-qalmaq.png", height: LOGO_HEIGHT },
  { name: "terra", display: "Terra", sub: "Meat", letterSpacing: "0.03em" },
  { name: "eurotier", display: "EuroTier", logo: "/images/logo-eurotier.png", height: LOGO_HEIGHT },
];

function LogoMark({ partner }: { partner: Partner }) {
  if (partner.logo) {
    return (
      <div className="flex items-center select-none whitespace-nowrap">
        <img
          src={partner.logo}
          alt={partner.display}
          className={`${partner.height || "h-[36px] md:h-[42px]"} w-auto object-contain`}
          style={{ opacity: 0.55, filter: "grayscale(100%)" }}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-[6px] select-none whitespace-nowrap">
      <span
        className="font-serif font-normal text-[20px] md:text-[22px] lg:text-[24px] leading-none"
        style={{
          color: "rgba(43,24,10,0.55)",
          letterSpacing: partner.letterSpacing || "0.02em",
        }}
      >
        {partner.display}
      </span>
      {partner.sub && (
        <span
          className="text-[9px] md:text-[10px] font-semibold tracking-[0.12em] uppercase leading-none"
          style={{ color: "rgba(43,24,10,0.32)" }}
        >
          {partner.sub}
        </span>
      )}
    </div>
  );
}

function Separator() {
  return (
    <span
      className="hidden md:inline-block w-[3px] h-[3px] rounded-full flex-shrink-0"
      style={{ background: "rgba(43,24,10,0.18)" }}
    />
  );
}

/** Corner cross — small "+" mark at corners of the border frame */
function CornerCross({ className = "" }: { className?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" className={`absolute ${className}`} fill="none">
      <line x1="5.5" y1="0" x2="5.5" y2="11" stroke="rgba(43,24,10,0.2)" strokeWidth="0.8" />
      <line x1="0" y1="5.5" x2="11" y2="5.5" stroke="rgba(43,24,10,0.2)" strokeWidth="0.8" />
    </svg>
  );
}

/** Premium verified shield */
function TrustIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      className="flex-shrink-0"
      style={{ color: "rgba(43,24,10,0.42)" }}
    >
      <path
        d="M18 3L6 8.5v8c0 7.5 5 14.2 12 16.5 7-2.3 12-9 12-16.5v-8L18 3z"
        fill="rgba(43,24,10,0.04)"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M18 6.5L8.5 10.5v6.3c0 6 4 11.4 9.5 13.2 5.5-1.8 9.5-7.2 9.5-13.2v-6.3L18 6.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.35"
        strokeLinejoin="round"
      />
      <path
        d="M18 11l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9L14.4 22l.7-4-2.9-2.8 4-.6L18 11z"
        fill="currentColor"
        opacity="0.18"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="8.5" r="0.6" fill="currentColor" opacity="0.3" />
      <circle cx="15.5" cy="9.2" r="0.4" fill="currentColor" opacity="0.2" />
      <circle cx="20.5" cy="9.2" r="0.4" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

const TrustedBy = () => {
  const { t } = useTranslation();
  return (
    <section className="relative" style={{ background: "#fdf6ee" }}>
      <Reveal>
        <div className="mx-auto max-w-[1100px] px-6 md:px-10">
          {/* ── Decorative border frame with corner crosses ── */}
          <div className="relative py-10 md:py-14">
            {/* Top border line */}
            <div
              className="absolute top-0 left-4 right-4 md:left-0 md:right-0 h-px"
              style={{ background: "rgba(43,24,10,0.08)" }}
            />
            {/* Bottom border line */}
            <div
              className="absolute bottom-0 left-4 right-4 md:left-0 md:right-0 h-px"
              style={{ background: "rgba(43,24,10,0.08)" }}
            />

            {/* Corner crosses */}
            <CornerCross className="-top-[5px] left-[11px] md:-left-[5px]" />
            <CornerCross className="-top-[5px] right-[11px] md:-right-[5px]" />
            <CornerCross className="-bottom-[5px] left-[11px] md:-left-[5px]" />
            <CornerCross className="-bottom-[5px] right-[11px] md:-right-[5px]" />

            <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8 lg:gap-10">
              {/* Left label */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="hidden md:block"><TrustIcon /></span>
                <p
                  className="font-serif font-light text-[17px] md:text-[17px] leading-[1.35] text-center md:text-left"
                  style={{ color: "rgba(43,24,10,0.42)" }}
                >
                  {t('trustedBy.title1')}
                  <br />
                  {t('trustedBy.title2')}
                </p>
              </div>

              {/* Vertical separator — desktop only */}
              <div
                className="hidden md:block flex-shrink-0"
                style={{ width: 1, height: 40, background: "rgba(43,24,10,0.08)" }}
              />

              {/* Desktop: static row */}
              <div className="hidden md:flex items-center gap-x-0">
                {partners.map((p, i) => (
                  <div key={p.name} className="flex items-center">
                    <LogoMark partner={p} />
                    {i < partners.length - 1 && (
                      <span className="flex items-center mx-4 lg:mx-5">
                        <Separator />
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Mobile: marquee scroll */}
              <div className="md:hidden w-full overflow-hidden relative">
                {/* Fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-8 z-10" style={{ background: "linear-gradient(to right, #fdf6ee, transparent)" }} />
                <div className="absolute right-0 top-0 bottom-0 w-8 z-10" style={{ background: "linear-gradient(to left, #fdf6ee, transparent)" }} />
                <div className="flex animate-marquee items-center gap-8">
                  {/* Double the list for seamless loop */}
                  {[...partners, ...partners].map((p, i) => (
                    <div key={`${p.name}-${i}`} className="flex-shrink-0">
                      <LogoMark partner={p} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
};

export default TrustedBy;