import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TABS = [
  { key: 'catalog', to: '/subsidies/catalog' },
  { key: 'passports', to: '/subsidies/passports' },
  { key: 'compare', to: '/subsidies/compare' },
  { key: 'glossary', to: '/subsidies/glossary' },
] as const;

/**
 * Level-2 navigation inside the Subsidies instrument.
 * Switches between Catalog / Investment passports / Match wizard.
 */
export default function SubsidiesSecondaryNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const activeKey =
    pathname.startsWith('/subsidies/passports') ? 'passports' :
    pathname.startsWith('/subsidies/compare') ? 'compare' :
    pathname.startsWith('/subsidies/glossary') ? 'glossary' :
    pathname.startsWith('/subsidies/match') ? 'match' :
    pathname.startsWith('/subsidies/catalog') || pathname.startsWith('/subsidies/') ? 'catalog' :
    null;

  return (
    <div className="border-b border-[#2B180A]/10 bg-white/50">
      <div className="max-w-[1200px] mx-auto px-4 md:px-10">
        <nav className="flex gap-1 md:gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const active = activeKey === tab.key;
            return (
              <Link
                key={tab.key}
                to={tab.to}
                className={`shrink-0 px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium transition-colors relative ${
                  active ? 'text-[#2B180A]' : 'text-[#2B180A]/55 hover:text-[#2B180A]/85'
                }`}
              >
                <span className="whitespace-nowrap">{t(`subsidies.subnav.${tab.key}`)}</span>
                {active && (
                  <span className="absolute left-3 right-3 md:left-4 md:right-4 bottom-0 h-[2px] bg-[#2B180A] rounded-t-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
