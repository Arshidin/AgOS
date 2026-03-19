import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Reveal from "./Reveal";
import SectionSticker from "./SectionSticker";

const CTASection = () => {
  const { t } = useTranslation();

  return (
    <section id="cta" className="py-16 md:py-24 lg:py-32" style={{ background: "#fdf6ee" }}>
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        <div
          className="relative overflow-hidden rounded-[20px] md:rounded-[28px] px-6 py-16 md:px-12 md:py-24 lg:px-20 lg:py-28"
          style={{
            background: "#f7f0e8",
            border: "1px solid rgba(43,24,10,0.06)",
          }}
        >
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <div className="flex justify-center">
              <SectionSticker
                icon={
                  <svg viewBox="0 0 18 18" fill="none" className="w-full h-full">
                    <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M6 9.5l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              >
                {t('cta.stickerLabel')}
              </SectionSticker>
            </div>

            <Reveal delay={50}>
              <h2 className="font-serif font-light text-[clamp(1.75rem,5vw,3.25rem)] leading-[1.08] tracking-editorial text-foreground mb-4 md:mb-5">
                {t('cta.title1')}
                <br />
                <span className="text-primary">{t('cta.title2')}</span>
              </h2>
            </Reveal>

            <Reveal delay={100}>
              <p className="text-sm md:text-base text-muted-foreground font-serif max-w-lg mx-auto mb-8 md:mb-10 leading-relaxed">
                {t('cta.description')}
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="flex flex-row items-center justify-center gap-3">
                <Link
                  to="/register"
                  className="px-7 py-3 text-[15px] font-medium transition-all duration-300 hover:brightness-90"
                  style={{ backgroundColor: "#3f2407", color: "#fff", borderRadius: "13px" }}
                >
                  {t('cta.joinBtn')}
                </Link>
                <a
                  href="https://wa.me/77001234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-7 py-3 text-[15px] font-medium text-foreground/70 transition-all duration-300 hover:text-foreground underline underline-offset-4 decoration-foreground/30"
                >
                  {t('cta.writeBtn')}
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
