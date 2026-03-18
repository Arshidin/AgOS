import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { Globe, Menu, X, ArrowRight, ChevronDown } from "lucide-react";
import turanIcon from "@/assets/turan-icon.svg";

const SCROLL_THRESHOLD = 80;
const T = "1s cubic-bezier(0.4, 0, 0.2, 1)";

const languages = [
  { code: "kz", display: "KZ", label: "Қазақша" },
  { code: "ru", display: "RU", label: "Русский" },
  { code: "en", display: "EN", label: "English" },
];

const navLinks: { key: string; to: string; external?: boolean }[] = [
  { key: "news", to: "/news" },
  { key: "startups", to: "/startups" },
  { key: "analytics", to: "/vision", external: true },
];

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const langButtonRef = useRef<HTMLButtonElement>(null);

  const resolvedLang = i18n.language?.startsWith("kk") ? "kz" : i18n.language;
  const currentLang = languages.find((l) => l.code === resolvedLang) || languages[0];

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > SCROLL_THRESHOLD);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("turan_language", code);
    setLangOpen(false);
  };

  return (
    <>
      <nav
        className="fixed z-50"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          top: 16,
          width: scrolled ? (isMobile ? "min(180px, calc(100% - 32px))" : "min(180px, 90vw)") : "calc(100% - 32px)",
          borderRadius: scrolled ? 30 : 24,
          backgroundColor: scrolled ? "rgba(253, 246, 238, 0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
          boxShadow: scrolled
            ? "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)"
            : "none",
          transition: `width ${T}, border-radius ${T}, background-color ${T}, backdrop-filter ${T}, box-shadow ${T}`,
        }}
      >
        <div
          className="flex items-center"
          style={{
            padding: scrolled ? "5px 8px" : isMobile ? "10px 8px" : "16px 24px",
            justifyContent: "space-between",
            position: "relative",
            transition: `padding ${T}`,
          }}
        >
          {/* ── Left ── */}
          <div className="flex items-center" style={{ zIndex: 1 }}>

            {/* Burger — mobile full + collapsed */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
              style={{
                width: 32,
                height: 32,
                color: "#3D2B1F",
                flexShrink: 0,
                display: isMobile ? "flex" : (scrolled ? "flex" : "none"),
              }}
              aria-label={t("navbar.menu")}
            >
              {menuOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
            </button>

            {/* Divider after burger — collapsed only, more transparent */}
            <div
              style={{
                width: scrolled ? 1 : 0,
                height: 20,
                background: "rgba(43, 24, 9, 0.06)",
                flexShrink: 0,
                marginLeft: scrolled ? 8 : 0,
                transition: `width ${T}, margin-left ${T}, opacity 0.5s ease`,
                opacity: scrolled ? 1 : 0,
              }}
            />

            {/* Nav links — desktop full only */}
            {navLinks.map((link) => {
              const linkStyle = {
                color: "#3D2B1F",
                fontSize: scrolled || isMobile ? 0 : 13,
                opacity: scrolled || isMobile ? 0 : 1,
                width: scrolled || isMobile ? 0 : "auto" as const,
                padding: scrolled || isMobile ? 0 : "4px 10px",
                overflow: "hidden" as const,
                cursor: "pointer" as const,
                transition: `opacity 0.5s ease, width ${T}, font-size ${T}, padding ${T}`,
              };
              return link.external ? (
                <a
                  key={link.key}
                  href={link.to}
                  className="font-medium whitespace-nowrap hover:opacity-70 transition-opacity"
                  style={linkStyle}
                >
                  {t(`navbar.${link.key}`)}
                </a>
              ) : (
                <Link
                  key={link.key}
                  to={link.to}
                  className="font-medium whitespace-nowrap hover:opacity-70 transition-opacity"
                  style={linkStyle}
                >
                  {t(`navbar.${link.key}`)}
                </Link>
              );
            })}
          </div>

          {/* ── Center: logo — absolutely centered, behind left/right for click-through ── */}
          <a
            href="/"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <span style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src={turanIcon}
                alt="Turan"
                style={{
                  height: 32,
                  width: 32,
                  flexShrink: 0,
                  transform: scrolled ? "rotate(180deg)" : "rotate(0deg)",
                  transition: `transform ${T}`,
                  willChange: "transform",
                }}
              />
              <span
                className="font-serif font-bold whitespace-nowrap"
                style={{
                  color: "#2B1809",
                  fontSize: scrolled ? 0 : 18,
                  opacity: scrolled ? 0 : 1,
                  maxWidth: scrolled ? 0 : 200,
                  overflow: "hidden",
                  transition: `opacity 0.7s ease, max-width ${T}, font-size ${T}`,
                }}
              >
                Turan
              </span>
            </span>
          </a>

          {/* ── Right ── */}
          <div className="flex items-center justify-end" style={{ position: "relative", zIndex: 2 }}>

            {/* Language switcher — desktop full only */}
            <div
              className="relative"
              ref={langRef}
              style={{
                opacity: scrolled || isMobile ? 0 : 1,
                width: scrolled || isMobile ? 0 : "auto",
                minWidth: scrolled || isMobile ? 0 : 88,
                overflow: scrolled || isMobile ? "hidden" : ("visible" as const),
                pointerEvents: scrolled || isMobile ? "none" : "auto",
                transition: `opacity 0.5s ease, width ${T}, min-width ${T}`,
              }}
            >
              <button
                ref={langButtonRef}
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full text-sm font-medium transition-colors hover:bg-black/5 active:scale-[0.98]"
                style={{ padding: "6px 10px", color: "#3D2B1F" }}
                aria-label={t("navbar.changeLanguage", "Сменить язык")}
                aria-expanded={langOpen}
                aria-haspopup="listbox"
              >
                <Globe size={16} strokeWidth={1.5} aria-hidden />
                <span style={{ fontSize: 12, fontWeight: 500 }}>{currentLang.display}</span>
                <ChevronDown
                  size={12}
                  strokeWidth={2}
                  style={{
                    opacity: 0.7,
                    transform: langOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                  aria-hidden
                />
              </button>

              {langOpen &&
                langButtonRef.current &&
                createPortal(
                  <div
                    role="listbox"
                    className="fixed rounded-xl shadow-xl border border-black/8 py-1.5 min-w-[160px] z-[9999] animate-in fade-in-0 zoom-in-95 duration-200"
                    style={{
                      top: langButtonRef.current.getBoundingClientRect().bottom + 8,
                      left: langButtonRef.current.getBoundingClientRect().right - 160,
                      backgroundColor: "rgba(253, 246, 238, 0.98)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                    }}
                  >
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        role="option"
                        aria-selected={resolvedLang === l.code}
                        onClick={() => changeLanguage(l.code)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors first:mt-0 last:mb-0 hover:bg-black/5 active:bg-black/8 ${
                          resolvedLang === l.code
                            ? "font-semibold text-[#E8922A] bg-[#E8922A]/8"
                            : "text-[#3D2B1F]"
                        }`}
                      >
                        <span className="font-medium">{l.display}</span>
                        <span className="opacity-80 ml-1">— {l.label}</span>
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
            </div>

            {/* Divider before CTA — collapsed only, more transparent */}
            <div
              style={{
                width: scrolled ? 1 : 0,
                height: 20,
                background: "rgba(43, 24, 9, 0.06)",
                flexShrink: 0,
                marginRight: scrolled ? 8 : 0,
                transition: `width ${T}, margin-right ${T}, opacity 0.5s ease`,
                opacity: scrolled ? 1 : 0,
              }}
            />

            {/* CTA — icon on mobile/collapsed, text on desktop full */}
            <Link
              to="/registration"
              className="group flex items-center justify-center rounded-full flex-shrink-0 hover:opacity-80 transition-opacity font-medium whitespace-nowrap"
              style={{
                backgroundColor: "#f1e7dc",
                color: "#3D2B1F",
                borderRadius: (isMobile || scrolled) ? "50%" : 11,
                width: (isMobile || scrolled) ? 32 : "auto",
                height: 32,
                padding: (isMobile || scrolled) ? 0 : "0 14px 0 14px",
                gap: (isMobile || scrolled) ? 0 : 4,
                fontSize: (isMobile || scrolled) ? 0 : 13,
                overflow: "hidden",
                transition: `width ${T}, border-radius ${T}, padding ${T}, font-size ${T}`,
              }}
              aria-label={t("navbar.join")}
            >
              <span
                style={{
                  opacity: (isMobile || scrolled) ? 0 : 1,
                  maxWidth: (isMobile || scrolled) ? 0 : 120,
                  overflow: "hidden",
                  transition: `opacity 0.5s ease, max-width ${T}`,
                  whiteSpace: "nowrap",
                }}
              >
                {t("navbar.join")}
              </span>
              <ArrowRight
                size={14}
                strokeWidth={2}
                style={{
                  flexShrink: 0,
                  width: scrolled ? 16 : (isMobile ? 16 : 14),
                  opacity: 1,
                  transition: `width ${T}`,
                }}
              />
            </Link>

          </div>
        </div>
      </nav>

      {/* Burger dropdown */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setMenuOpen(false)}
        />
      )}
      {menuOpen && (
        <div
          className="fixed z-50 rounded-2xl shadow-xl border border-black/5"
          style={{
            left: "50%",
            top: 64,
            transform: "translateX(-50%)",
            width: isMobile ? "min(180px, calc(100% - 32px))" : "min(180px, 90vw)",
            backgroundColor: "rgba(253, 246, 238, 0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            transformOrigin: "top center",
            animation: "menu-drop 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col py-3">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.key}
                  href={link.to}
                  className="px-6 py-3 text-sm font-medium hover:bg-black/5 transition-colors"
                  style={{ color: "#3D2B1F" }}
                  onClick={() => setMenuOpen(false)}
                >
                  {t(`navbar.${link.key}`)}
                </a>
              ) : (
                <Link
                  key={link.key}
                  to={link.to}
                  className="px-6 py-3 text-sm font-medium hover:bg-black/5 transition-colors"
                  style={{ color: "#3D2B1F" }}
                  onClick={() => setMenuOpen(false)}
                >
                  {t(`navbar.${link.key}`)}
                </Link>
              )
            )}
            <div className="mx-5 my-2 h-px bg-black/5" />
            <div className="flex items-center gap-1 px-6 py-2">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { changeLanguage(l.code); setMenuOpen(false); }}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                    i18n.language === l.code
                      ? "font-semibold text-[#E8922A] bg-[#E8922A]/10"
                      : "text-[#3D2B1F] hover:bg-black/5"
                  }`}
                >
                  {l.display}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
