import type { ReactNode } from "react";
import Reveal from "./Reveal";

/**
 * Section sticker — pill-shaped badge with icon, used as a section label.
 * Matches site palette: warm beige bg (#f1e7dc), muted brown text (#786758).
 */
export default function SectionSticker({
  icon,
  children,
  delay = 0,
  className = "",
}: {
  icon: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <Reveal delay={delay}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 md:px-3.5 md:py-1.5 text-[10px] md:text-[11px] font-medium uppercase tracking-[0.1em] shadow-[0_1px_4px_rgba(43,24,10,0.06)] ${className || "mb-4 md:mb-5"}`}
        style={{
          background: "#f1e7dc",
          color: "#786758",
        }}
      >
        <span className="flex items-center justify-center w-3 h-3 md:w-3.5 md:h-3.5">
          {icon}
        </span>
        {children}
      </span>
    </Reveal>
  );
}
