import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, ArrowRight, Menu, X, ChevronRight } from 'lucide-react';
import turanIcon from '@/assets/turan-icon.svg';

const LANGUAGES = [
  { code: 'kz', display: 'KZ', label: 'Қазақша' },
  { code: 'ru', display: 'RU', label: 'Русский' },
  { code: 'en', display: 'EN', label: 'English' },
] as const;

export interface SectionTab {
  key: string;
  to: string;
  labelKey: string;
  icon?: React.ComponentType<{ className?: string }>;
  match: (pathname: string, search: string) => boolean;
  accent?: boolean;
}

interface Props {
  sectionLabelKey: string;
  tabs?: SectionTab[];
}

export default function SectionHeader({ sectionLabelKey, tabs = [] }: Props) {
  const { t, i18n } = useTranslation();
  const { pathname, search } = useLocation();
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const resolvedLang = i18n.language?.startsWith('kk') ? 'kz' : i18n.language;
  const currentLang = LANGUAGES.find((l) => l.code === resolvedLang) || LANGUAGES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('turan_language', code);
    setLangOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#fdf6ee]/95 backdrop-blur-md border-b border-[#2B180A]/8">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="h-14 md:h-[56px] flex items-center gap-3 md:gap-5">

          {/* ─── Left: Brand breadcrumb ─── */}
          <nav className="flex items-center shrink-0 min-w-0" aria-label="Breadcrumb">
            <Link
              to="/"
              className="flex items-center gap-2 group"
              aria-label="Turan — Home"
            >
              <img src={turanIcon} alt="" className="w-7 h-7 md:w-8 md:h-8 shrink-0" />
              <span className="hidden sm:inline font-serif font-bold text-[#2B180A] text-base md:text-lg tracking-tight group-hover:text-[#E07A34] transition-colors duration-200">
                Turan
              </span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 md:mx-2.5 text-[#2B180A]/25 shrink-0" aria-hidden />
            <span className="font-medium text-sm md:text-[15px] text-[#2B180A]/80 whitespace-nowrap">
              {t(sectionLabelKey)}
            </span>
          </nav>

          {/* ─── Center: Tabs (desktop) — underline style ─── */}
          {tabs.length > 0 && (
            <>
              <span className="hidden md:block w-px h-5 bg-[#2B180A]/10 ml-2 shrink-0" aria-hidden />
              <nav
                className="hidden md:flex items-center gap-1 ml-1"
                aria-label="Section"
              >
                {tabs.map((tab) => {
                  const active = tab.match(pathname, search);
                  const Icon = tab.icon;

                  if (tab.accent) {
                    return (
                      <Link
                        key={tab.key}
                        to={tab.to}
                        className="flex items-center gap-1.5 ml-2 px-4 py-[7px] text-[13px] font-semibold rounded-[10px] bg-[#E07A34] text-white hover:bg-[#d06a24] transition-all duration-200"
                      >
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        <span className="whitespace-nowrap">{t(tab.labelKey)}</span>
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={tab.key}
                      to={tab.to}
                      className={`relative flex items-center gap-1.5 px-3 py-[15px] text-[13px] font-medium transition-colors duration-200 ${
                        active
                          ? 'text-[#2B180A]'
                          : 'text-[#2B180A]/45 hover:text-[#2B180A]/75'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {Icon && (
                        <Icon className={`w-3.5 h-3.5 transition-colors duration-200 ${
                          active ? 'text-[#E07A34]' : ''
                        }`} />
                      )}
                      <span className="whitespace-nowrap">{t(tab.labelKey)}</span>
                      {active && (
                        <span className="absolute left-3 right-3 bottom-0 h-[2px] bg-[#2B180A] rounded-t-full" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </>
          )}

          {/* ─── Spacer ─── */}
          <div className="flex-1" />

          {/* ─── Right: Lang + Join + burger ─── */}
          <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
            {/* Language picker */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-[#2B180A]/50 hover:text-[#2B180A]/80 hover:bg-[#2B180A]/[0.04] transition-all duration-200"
                aria-haspopup="listbox"
                aria-expanded={langOpen}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{currentLang.display}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <ul
                  role="listbox"
                  className="absolute right-0 top-full mt-1.5 min-w-[140px] rounded-xl border border-[#2B180A]/8 bg-white shadow-lg shadow-[#2B180A]/[0.08] py-1 z-50"
                >
                  {LANGUAGES.map((lang) => (
                    <li key={lang.code}>
                      <button
                        onClick={() => changeLanguage(lang.code)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-[#2B180A]/[0.04] transition-colors duration-150 ${
                          currentLang.code === lang.code ? 'text-[#E07A34] font-medium' : 'text-[#2B180A]'
                        }`}
                      >
                        {lang.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Mobile burger */}
            {tabs.length > 0 && (
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#2B180A]/[0.04] transition-colors duration-200"
                aria-label="Menu"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="w-5 h-5 text-[#2B180A]/70" /> : <Menu className="w-5 h-5 text-[#2B180A]/70" />}
              </button>
            )}

            {/* Join CTA */}
            <Link
              to="/join"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[13px] text-xs md:text-[13px] font-semibold bg-[#3f2407] text-white hover:brightness-[0.92] transition-all duration-300"
            >
              {t('navbar.join')}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* ─── Mobile expanded panel ─── */}
        {mobileOpen && tabs.length > 0 && (
          <nav className="md:hidden pb-3 pt-2 flex flex-col gap-0.5 border-t border-[#2B180A]/6 animate-in slide-in-from-top-2 duration-200" aria-label="Section mobile">
            {tabs.map((tab) => {
              const active = tab.match(pathname, search);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.key}
                  to={tab.to}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    tab.accent
                      ? 'bg-[#E07A34] text-white hover:bg-[#d06a24]'
                      : active
                      ? 'text-[#2B180A] bg-white shadow-sm'
                      : 'text-[#2B180A]/60 hover:bg-white/60'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {Icon && <Icon className={`w-4 h-4 ${active ? 'text-[#E07A34]' : ''}`} />}
                  {t(tab.labelKey)}
                </Link>
              );
            })}
            <Link
              to="/join"
              className="sm:hidden flex items-center justify-center gap-1.5 mt-2 px-3 py-2.5 rounded-[13px] text-sm font-semibold bg-[#3f2407] text-white hover:brightness-[0.92] transition-all duration-300"
            >
              {t('navbar.join')}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
