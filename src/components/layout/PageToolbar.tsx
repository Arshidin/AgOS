import React from 'react';

interface Props {
  /** Primary filter tabs (left side). */
  children: React.ReactNode;
  /** Optional right-aligned actions (search, sort). */
  actions?: React.ReactNode;
  /** Sticky offset from top — defaults to h-14 md:h-16 of SectionHeader. */
  offsetClass?: string;
}

/**
 * Sticky secondary toolbar sitting directly under SectionHeader.
 * Used for page-level filters / quick nav that should stay visible on scroll.
 * Mobile: horizontal scroll with momentum; Desktop: centered container.
 */
export default function PageToolbar({ children, actions, offsetClass = 'top-14 md:top-16' }: Props) {
  return (
    <div className={`sticky ${offsetClass} z-30 bg-[#fdf6ee]/95 backdrop-blur-md border-b border-[#2B180A]/8`}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="flex items-center gap-3 h-11 md:h-12">
          <div className="flex-1 flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {children}
          </div>
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

/** Tab button for use inside PageToolbar. */
export function ToolbarTab({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative shrink-0 inline-flex items-center gap-1.5 px-3 h-full text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'text-[#2B180A]'
          : 'text-[#2B180A]/50 hover:text-[#2B180A]/80'
      }`}
    >
      {icon}
      {children}
      {active && (
        <span className="absolute left-3 right-3 bottom-0 h-[2px] bg-[#2B180A] rounded-t-full" />
      )}
    </button>
  );
}

/** Secondary chip toggle (subtle, 2nd tier of filter). */
export function ToolbarChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-[#2B180A] text-white'
          : 'bg-transparent text-[#2B180A]/65 border border-[#2B180A]/15 hover:bg-[#2B180A]/5'
      }`}
    >
      {children}
    </button>
  );
}
