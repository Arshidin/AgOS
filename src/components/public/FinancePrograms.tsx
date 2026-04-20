import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { useFinancePrograms } from "@/hooks/finance/useFinancePrograms";
import { buildDetailFromRow } from "@/lib/finance/program-details";
import Reveal from "./Reveal";
import SectionSticker from "./SectionSticker";

const FEATURED_ID = "zhaylau";
const SECONDARY_IDS = ["igilik", "bereke", "import_livestock"];

/* ── Design tokens (matches ValueProposition / site palette) ── */

const C = {
  text1: "#2B180A",
  text2: "rgba(43,24,10,0.65)",
  dim: "rgba(43,24,10,0.35)",
  primary: "#E8730C",
  green: "#6B9E6B",
  block_bg: "rgba(255,255,255,0.25)",
  block_border: "rgba(43,24,10,0.08)",
  divider: "rgba(43,24,10,0.05)",
  btn_dark: "#3f2407",
} as const;

/* ── Featured card (dark) ── */

function FeaturedCard({
  program,
  detail,
  lang,
  t,
}: {
  program: any;
  detail: ReturnType<typeof buildDetailFromRow>;
  lang: string;
  t: (k: string) => string;
}) {
  const name = program[`name_${lang}`] || program.name_ru;
  const desc = program[`description_${lang}`] || program.description_ru;
  const badges = detail.heroBadges.slice(0, 4);
  const keyParams = detail.keyParams.slice(0, 3);

  return (
    <Link
      to={`/finance/programs/${program.id}`}
      className="group block rounded-[16px] md:rounded-[20px] overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #2B180A 0%, #4a2a12 50%, #3f2407 100%)",
      }}
    >
      {/* Decorative warm circles */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: -60,
          top: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "rgba(232,115,12,0.06)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          left: -40,
          bottom: -80,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "rgba(232,115,12,0.04)",
        }}
      />

      <div className="relative z-[1] px-5 py-5 md:px-9 md:py-8">
        {/* Top row: badge + provider */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <span
            className="inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.07em]"
            style={{
              background: "rgba(232,115,12,0.15)",
              border: "1px solid rgba(232,115,12,0.3)",
              color: "#F0A060",
            }}
          >
            {t("finance.landing.featuredBadge")}
          </span>
          {detail.providerShort && (
            <span
              className="rounded-[10px] px-3 py-1.5 text-[11px] font-semibold tracking-[0.04em] flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {detail.providerShort}
            </span>
          )}
        </div>

        {/* Name */}
        <h3
          className="font-serif font-light text-[20px] md:text-[28px] leading-[1.2] mb-2"
          style={{ color: "#fdf6ee" }}
        >
          {name}
        </h3>

        {/* Description */}
        <p
          className="text-[12px] md:text-[13px] leading-[1.6] mb-5 max-w-[500px]"
          style={{ color: "rgba(253,246,238,0.55)" }}
        >
          {desc}
        </p>

        {/* Param pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {badges.map((b, i) => (
            <span
              key={i}
              className="text-[11px] md:text-[12px] font-semibold px-3 py-1 rounded-full"
              style={{
                background:
                  b.style === "green"
                    ? "rgba(232,115,12,0.18)"
                    : b.style === "yellow"
                    ? "rgba(232,115,12,0.22)"
                    : "rgba(253,246,238,0.08)",
                color:
                  b.style === "green"
                    ? "#F0A060"
                    : b.style === "yellow"
                    ? "#FAD07A"
                    : "rgba(253,246,238,0.5)",
                border:
                  b.style === "green"
                    ? "1px solid rgba(232,115,12,0.3)"
                    : b.style === "yellow"
                    ? "1px solid rgba(232,115,12,0.35)"
                    : "1px solid rgba(253,246,238,0.12)",
              }}
            >
              {b.text}
            </span>
          ))}
        </div>

        {/* Bottom: stats + CTA */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          {keyParams.length > 0 && (
            <div className="flex gap-6">
              {keyParams.map((kp, i) => (
                <div key={i} className="text-center">
                  <div
                    className="font-serif text-[18px] md:text-[22px] leading-none"
                    style={{ color: "#fdf6ee" }}
                  >
                    {kp.value}
                  </div>
                  <div
                    className="text-[10px] mt-0.5"
                    style={{ color: "rgba(253,246,238,0.4)" }}
                  >
                    {kp.label}
                  </div>
                </div>
              ))}
            </div>
          )}
          <span
            className="inline-flex items-center gap-2 rounded-[13px] px-5 py-2.5 text-[13px] font-medium flex-shrink-0 transition-all duration-300 group-hover:brightness-95"
            style={{
              background: "rgba(232,115,12,0.9)",
              color: "#fdf6ee",
            }}
          >
            {t("finance.landing.details")}
            <ArrowRight size={14} strokeWidth={2} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Secondary card ── */

function SecondaryCard({
  program,
  detail,
  lang,
  t,
  accentColor,
}: {
  program: any;
  detail: ReturnType<typeof buildDetailFromRow>;
  lang: string;
  t: (k: string) => string;
  accentColor: string;
}) {
  const name = program[`name_${lang}`] || program.name_ru;
  const desc = program[`description_${lang}`] || program.description_ru;
  const badges = detail.heroBadges.slice(0, 3);
  const isCredit = program.type === "credit";

  return (
    <Link
      to={`/finance/programs/${program.id}`}
      className="group block rounded-[14px] overflow-hidden relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        background: C.block_bg,
        border: `1px solid ${C.block_border}`,
      }}
    >
      {/* Top colored strip */}
      <div style={{ height: 3, background: accentColor }} />

      <div className="px-4 py-4 md:px-[18px] md:py-4">
        {/* Type label */}
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.07em] mb-2 mt-1"
          style={{ color: accentColor }}
        >
          {isCredit
            ? t("finance.landing.typeCredit")
            : t("finance.landing.typeSubsidy")}
        </div>

        {/* Name */}
        <div
          className="font-serif font-semibold text-[15px] leading-[1.3] mb-2"
          style={{ color: C.text1 }}
        >
          {name}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {badges.map((b, i) => (
            <span
              key={i}
              className="text-[10px] font-medium px-2.5 py-0.5 rounded-full"
              style={{
                background: "#f1e7dc",
                border: `1px solid ${C.block_border}`,
                color: "rgba(43,24,10,0.6)",
              }}
            >
              {b.text}
            </span>
          ))}
        </div>

        {/* Description */}
        <p
          className="text-[12px] leading-[1.45] line-clamp-2 pr-6"
          style={{ color: C.text2 }}
        >
          {desc}
        </p>

        {/* Arrow */}
        <span
          className="absolute bottom-3.5 right-4 transition-all duration-200 group-hover:translate-x-0.5"
          style={{ color: C.divider }}
        >
          <ArrowRight
            size={16}
            strokeWidth={2}
            className="transition-colors"
            style={{ color: C.dim }}
          />
        </span>
      </div>
    </Link>
  );
}

/* ── Main section ── */

export default function FinancePrograms() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useFinancePrograms();

  const lang = i18n.language?.startsWith("kk") ? "kz" : i18n.language;

  const featuredProgram = data?.programs.find((p) => p.id === FEATURED_ID);
  const secondaryPrograms = SECONDARY_IDS.map((id) =>
    data?.programs.find((p) => p.id === id)
  ).filter(Boolean) as NonNullable<typeof data>["programs"];

  if (!isLoading && !featuredProgram && secondaryPrograms.length === 0)
    return null;

  return (
    <section className="py-12 md:py-24" style={{ background: "#fdf6ee" }}>
      <div className="mx-auto max-w-[1200px] px-4 md:px-10">
        {/* Pill */}
        <SectionSticker
          icon={
            <svg viewBox="0 0 13 13" fill="none" className="w-full h-full">
              <rect
                x="1.5"
                y="4"
                width="10"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M4.5 4V3a2 2 0 014 0v1"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          }
        >
          {t("finance.landing.sticker")}
        </SectionSticker>

        {/* Header */}
        <Reveal delay={100}>
          <div className="flex items-end justify-between gap-5 flex-wrap mb-6 md:mb-10">
            <h2 className="font-serif font-light text-[clamp(1.55rem,5vw,2.9rem)] leading-[1.12] tracking-editorial text-foreground">
              {t("finance.landing.title")}
              <br />
              {t("finance.landing.titleAccent")}
            </h2>
            <Link
              to="/finance/programs"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap pb-0.5 transition-opacity hover:opacity-70"
              style={{
                color: C.primary,
                borderBottom: `1.5px solid rgba(232,115,12,0.3)`,
              }}
            >
              {t("finance.landing.allPrograms")} →
            </Link>
          </div>
        </Reveal>

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="flex flex-col gap-3 md:gap-4">
            <div
              className="rounded-[16px] md:rounded-[20px] animate-pulse h-[280px] md:h-[320px]"
              style={{ background: "rgba(43,24,10,0.06)" }}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-[14px] animate-pulse h-[160px]"
                  style={{ background: "rgba(43,24,10,0.04)" }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 md:gap-4">
            {/* Featured card */}
            {featuredProgram && (
              <Reveal delay={150}>
                <FeaturedCard
                  program={featuredProgram}
                  detail={buildDetailFromRow(featuredProgram)}
                  lang={lang}
                  t={t}
                />
              </Reveal>
            )}

            {/* Secondary cards — 3 cols desktop, 1 col mobile */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {secondaryPrograms.map((program, idx) => (
                <Reveal key={program.id} delay={200 + idx * 80}>
                  <SecondaryCard
                    program={program}
                    detail={buildDetailFromRow(program)}
                    lang={lang}
                    t={t}
                    accentColor={
                      program.type === "credit" ? C.primary : C.green
                    }
                  />
                </Reveal>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <Reveal delay={400}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 md:mt-10 pt-1">
            <p
              className="text-[13px] md:text-[14px] leading-[1.55] max-w-[440px]"
              style={{ color: C.dim }}
            >
              {t("finance.landing.bottomText")}{" "}
              <strong style={{ color: C.text1, fontWeight: 600 }}>
                {t("finance.landing.bottomTextBold")}
              </strong>{" "}
              {t("finance.landing.bottomTextEnd")}
            </p>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2.5 sm:gap-3 flex-shrink-0">
              <Link
                to="/finance/build"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3 text-[13px] font-medium text-white transition-all duration-300 hover:brightness-90"
                style={{ background: C.btn_dark, borderRadius: 13 }}
              >
                {t("finance.landing.selectProgram")}
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <Link
                to="/finance/programs"
                className="inline-flex items-center justify-center w-full sm:w-auto px-7 py-3 text-[13px] font-medium transition-all duration-300 hover:opacity-70 underline underline-offset-4"
                style={{
                  color: "rgba(43,24,10,0.7)",
                  textDecorationColor: "rgba(43,24,10,0.2)",
                }}
              >
                {t("finance.landing.allPrograms")}
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
