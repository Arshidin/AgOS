/**
 * AgOS / TURAN Design System — Design Tokens v11
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Token-driven, shadcn/ui + Tailwind compatible
 * Dual format: HSL channels (Tailwind) + Hex (CSS direct)
 * Theme: [data-theme="dark"] / [data-theme="light"]
 *
 * BRAND: Turan corporate identity (turan.kz)
 *   Primary bg:  warm beige (#f0ebe2)
 *   Primary fg:  dark brown (#3d2b1f)
 *   Accent:      orange star (#E8920B)
 *   CTA:         dark brown button (#3d2b1f / inverted in dark)
 *
 * SCALES (enforced across all components):
 *   Border-radius: 4 / 6 / 8 / 12 / 9999
 *   Font-size:     10 / 11 / 12 / 13 / 14 / 15 / 20
 *   Heights:       24 / 28 / 32 / 36 / 40 / 44 / 48
 *   Spacing:       0 / 2 / 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24 / 32 / 48
 *   Transitions:   60ms (fast) / 80ms (default) / 150ms (slow) / 250ms (layout)
 */

// ─── PRIMITIVE COLORS ────────────────────────────────────────────────────────
// Warm-toned neutrals based on Turan brand identity (beige/brown family)

export const primitive = {
  neutral: {
    0:    { hsl: "40 33% 99%",   hex: "#fdfcfa" },
    50:   { hsl: "37 25% 95%",   hex: "#f7f4ee" },
    100:  { hsl: "36 22% 92%",   hex: "#f0ebe2" },
    200:  { hsl: "35 20% 88%",   hex: "#e9e3d8" },
    300:  { hsl: "34 18% 84%",   hex: "#e3ddd2" },
    400:  { hsl: "30 12% 62%",   hex: "#a69a8c" },
    500:  { hsl: "28 12% 43%",   hex: "#7a6b5d" },
    600:  { hsl: "25 10% 34%",   hex: "#5e5148" },
    700:  { hsl: "22 30% 18%",   hex: "#3d2b1f" },
    800:  { hsl: "20 25% 11%",   hex: "#272219" },
    900:  { hsl: "20 20% 8%",    hex: "#1a1612" },
    950:  { hsl: "20 18% 7%",    hex: "#171310" },
    1000: { hsl: "20 16% 5%",    hex: "#110e0c" },
  },
  /** Turan brand orange — logo star accent */
  brand: {
    400:  { hsl: "38 92% 56%",   hex: "#F0A020" },
    500:  { hsl: "36 90% 48%",   hex: "#E8920B" },
    600:  { hsl: "33 94% 42%",   hex: "#cc7f08" },
  },
  blue: {
    50:   { hsl: "214 100% 97%", hex: "#eff6ff" },
    100:  { hsl: "214 95% 93%",  hex: "#dbeafe" },
    200:  { hsl: "213 97% 87%",  hex: "#bfdbfe" },
    300:  { hsl: "212 96% 78%",  hex: "#93bbfd" },
    400:  { hsl: "213 94% 68%",  hex: "#60a5fa" },
    500:  { hsl: "217 91% 60%",  hex: "#3b82f6" },
    600:  { hsl: "221 83% 53%",  hex: "#2563eb" },
    700:  { hsl: "224 76% 48%",  hex: "#1d4ed8" },
    800:  { hsl: "226 71% 40%",  hex: "#1e40af" },
    900:  { hsl: "224 64% 33%",  hex: "#1e3a8a" },
  },
  green: {
    400:  { hsl: "142 40% 48%",  hex: "#5ec47a" },
    500:  { hsl: "142 45% 38%",  hex: "#3a8a52" },
    600:  { hsl: "142 50% 30%",  hex: "#2d6e3f" },
  },
  emerald: {
    400:  { hsl: "160 50% 50%",  hex: "#4ecba0" },
    500:  { hsl: "160 45% 40%",  hex: "#2d8a6e" },
  },
  amber: {
    400:  { hsl: "43 85% 55%",   hex: "#f0b040" },
    500:  { hsl: "38 85% 38%",   hex: "#b37a10" },
    600:  { hsl: "33 90% 42%",   hex: "#cc7f08" },
  },
  red: {
    400:  { hsl: "6 70% 60%",    hex: "#e06050" },
    500:  { hsl: "4 65% 48%",    hex: "#c0392b" },
    600:  { hsl: "0 60% 42%",    hex: "#a82a1f" },
  },
  purple: {
    500:  { hsl: "262 83% 58%",  hex: "#8b5cf6" },
    600:  { hsl: "263 70% 50%",  hex: "#7c3aed" },
  },
} as const;

// ─── SEMANTIC TOKENS ─────────────────────────────────────────────────────────
// Turan brand: warm beige (light) / warm dark brown (dark)

export const semantic = {
  dark: {
    bg:     "#1a1612",     // page background — warm near-black
    bgS:    "#211d18",     // sidebar, panel background
    bgC:    "#272219",     // card, popover, dropdown background
    bgM:    "#332d24",     // muted, hover, secondary background
    fg:     "#e8e0d4",     // primary text — warm white
    fg2:    "#a69a8c",     // secondary text
    fg3:    "#6b6054",     // muted text, placeholders
    bd:     "#3a3328",     // primary border
    bdS:    "#2d271e",     // subtle border (table rows)
    bdH:    "#4d4436",     // hover/focus border
    accent: "#F0A020",     // brand accent star (brighter for dark bg)
    cta:    "#e8e0d4",     // CTA button bg (inverted)
    ctaFg:  "#1a1612",     // CTA button text
    ctaH:   "#f0ebe2",     // CTA button hover
  },
  light: {
    bg:     "#f0ebe2",     // page background — warm beige from Turan site
    bgS:    "#e9e3d8",     // sidebar, panel background
    bgC:    "#f7f4ee",     // card, popover, dropdown background
    bgM:    "#e3ddd2",     // muted, hover, secondary background
    fg:     "#3d2b1f",     // primary text — dark warm brown
    fg2:    "#7a6b5d",     // secondary text
    fg3:    "#a69a8c",     // muted text, placeholders
    bd:     "#d9d1c5",     // primary border
    bdS:    "#e6e0d6",     // subtle border (table rows)
    bdH:    "#c4baa8",     // hover/focus border
    accent: "#E8920B",     // brand accent star
    cta:    "#3d2b1f",     // CTA button bg — dark brown from Turan site
    ctaFg:  "#faf8f4",     // CTA button text
    ctaH:   "#2c1e14",     // CTA button hover
  },
} as const;

// ─── TYPOGRAPHY ──────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    sans:    "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono:    "'JetBrains Mono', 'Fira Code', monospace",
    display: "'Inter Display', Inter, sans-serif",
  },
  /** Font-size scale: strictly 10/11/12/13/14/15/20 — no half-pixels */
  fontSize: {
    "2xs":  10,  // section headers, badges, kbd, type labels
    xs:     11,  // nav counts, field labels, filter chips, section titles
    sm:     12,  // buttons, ghost actions, footer text, mono values
    base:   13,  // body text, table cells, nav items (sub), inputs
    md:     14,  // nav items, header title, combobox text
    lg:     15,  // page titles, empty state titles
    xl:     20,  // record page h1
  },
  fontWeight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },
  letterSpacing: {
    tighter: "-0.02em",  // h1 headings
    tight:   "-0.01em",  // sidebar name
    normal:  "0em",
    wide:    "0.04em",   // table headers
    wider:   "0.06em",   // section group titles
  },
} as const;

// ─── SPACING ─────────────────────────────────────────────────────────────────

export const spacing = {
  /** Base unit: 4px. All values on 2px sub-grid minimum. */
  0:    "0px",
  0.5:  "2px",
  1:    "4px",
  1.5:  "6px",
  2:    "8px",
  2.5:  "10px",
  3:    "12px",
  4:    "16px",
  5:    "20px",
  6:    "24px",
  8:    "32px",
  12:   "48px",
} as const;

// ─── COMPONENT SIZING ────────────────────────────────────────────────────────

export const sizing = {
  /** Height scale: 24/28/32/36/40/44/48 — all multiples of 4 */
  height: {
    xs:      24,
    sm:      28,
    md:      32,
    lg:      36,
    row:     44,
    xl:      48,
  },
  sidebar: { expanded: 252, collapsed: 56, hidden: 0 },
  header:      44,
  footer:      40,
  panel:   { default: 360, min: 300, max: 600 },
  avatar:  { xs: 16, sm: 24, md: 28, lg: 36, xl: 48 },
  checkbox: 16,
  icon:    { xs: 12, sm: 14, md: 16, lg: 18, xl: 24 },
} as const;

// ─── BORDER RADIUS ───────────────────────────────────────────────────────────

export const radius = {
  sm:   4,
  md:   6,
  lg:   8,
  xl:   12,
  full: 9999,
} as const;

// ─── SHADOWS ─────────────────────────────────────────────────────────────────
// Warm-toned shadow base (brown undertone in light, standard dark in dark)

export const shadow = {
  dark: {
    sm:  "0 1px 3px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.02)",
    md:  "0 4px 12px rgba(0,0,0,0.30)",
    lg:  "0 12px 28px rgba(0,0,0,0.40)",
    xl:  "0 20px 40px -8px rgba(0,0,0,0.45)",
  },
  light: {
    sm:  "0 1px 3px rgba(61,43,31,0.06), 0 0 0 1px rgba(61,43,31,0.04)",
    md:  "0 4px 12px rgba(61,43,31,0.08)",
    lg:  "0 12px 28px rgba(61,43,31,0.10)",
    xl:  "0 20px 40px -8px rgba(61,43,31,0.12)",
  },
} as const;

// ─── MOTION ──────────────────────────────────────────────────────────────────

export const motion = {
  duration: {
    fast:    "60ms",
    default: "80ms",
    slow:    "150ms",
    layout:  "250ms",
  },
  easing: {
    default: "cubic-bezier(0.16, 1, 0.3, 1)",
    linear:  "linear",
  },
} as const;

// ─── CRM STATUS TOKENS ──────────────────────────────────────────────────────
// Semantic colors — independent of brand accent

export const crmStatus = {
  lead:      { sc: "amber",   label: "Lead"      },
  qualified: { sc: "blue",    label: "Qualified"  },
  active:    { sc: "green",   label: "Active"     },
  won:       { sc: "emerald", label: "Won"        },
  stalled:   { sc: "red",     label: "Stalled"    },
  lost:      { sc: "red",     label: "Lost"       },
} as const;

/** Theme-aware status colors — use statusColors[theme] */
export const statusColors = {
  dark: {
    green:   { bg: "rgba(94,196,122,0.08)",   fg: "#5ec47a", dot: "#5ec47a", bd: "rgba(94,196,122,0.15)"  },
    blue:    { bg: "rgba(107,159,224,0.08)",  fg: "#6b9fe0", dot: "#6b9fe0", bd: "rgba(107,159,224,0.15)" },
    emerald: { bg: "rgba(78,203,160,0.08)",   fg: "#4ecba0", dot: "#4ecba0", bd: "rgba(78,203,160,0.15)"  },
    amber:   { bg: "rgba(240,176,64,0.08)",   fg: "#f0b040", dot: "#f0b040", bd: "rgba(240,176,64,0.15)"  },
    red:     { bg: "rgba(224,96,80,0.08)",    fg: "#e06050", dot: "#e06050", bd: "rgba(224,96,80,0.15)"   },
  },
  light: {
    green:   { bg: "rgba(58,138,82,0.08)",    fg: "#3a8a52", dot: "#3a8a52", bd: "rgba(58,138,82,0.15)"   },
    blue:    { bg: "rgba(69,113,184,0.08)",   fg: "#4571b8", dot: "#4571b8", bd: "rgba(69,113,184,0.15)"  },
    emerald: { bg: "rgba(45,138,110,0.08)",   fg: "#2d8a6e", dot: "#2d8a6e", bd: "rgba(45,138,110,0.15)"  },
    amber:   { bg: "rgba(179,122,16,0.08)",   fg: "#b37a10", dot: "#b37a10", bd: "rgba(179,122,16,0.15)"  },
    red:     { bg: "rgba(192,57,43,0.08)",    fg: "#c0392b", dot: "#c0392b", bd: "rgba(192,57,43,0.15)"   },
  },
} as const;

// ─── AVATAR PALETTE ──────────────────────────────────────────────────────────
// Warm-toned, theme-aware

export const avatarPalette = {
  dark: [
    { bg: "#2e2820", fg: "#c4b8a0" },
    { bg: "#202838", fg: "#8aaad0" },
    { bg: "#203028", fg: "#80b890" },
    { bg: "#302038", fg: "#b090c4" },
    { bg: "#302820", fg: "#c4a878" },
    { bg: "#203038", fg: "#80b0d0" },
    { bg: "#2e2028", fg: "#c4a0a0" },
    { bg: "#282e20", fg: "#a8c488" },
  ],
  light: [
    { bg: "#e6ddd0", fg: "#5c4a3a" },
    { bg: "#d6dfe8", fg: "#3a5070" },
    { bg: "#d0e2d4", fg: "#2d5a3a" },
    { bg: "#e0d6e6", fg: "#5a3a6b" },
    { bg: "#e8ddd0", fg: "#6b5030" },
    { bg: "#d0dce6", fg: "#30506b" },
    { bg: "#e6d0d6", fg: "#6b3a4a" },
    { bg: "#d6e6d0", fg: "#3a5a2d" },
  ],
} as const;

/** Deterministic avatar color from name string */
export function avatarColor(name: string, theme: "dark" | "light" = "dark") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  const palette = avatarPalette[theme];
  return palette[Math.abs(h) % palette.length];
}

// ─── Z-INDEX SCALE ───────────────────────────────────────────────────────────

export const zIndex = {
  base:      0,
  sticky:    2,
  header:    10,
  dropdown:  20,
  sidebar:   30,
  wsDropdown:50,
  panel:     5,
  context:   100,
  overlay:   200,
  modal:     999,
} as const;

// ─── CSS VARIABLES OUTPUT ────────────────────────────────────────────────────

export const cssVariables = `
:root {
  /* Backgrounds — warm dark (Turan) */
  --bg: #1a1612;
  --bg-s: #211d18;
  --bg-c: #272219;
  --bg-m: #332d24;

  /* Foregrounds */
  --fg: #e8e0d4;
  --fg2: #a69a8c;
  --fg3: #6b6054;

  /* Borders */
  --bd: #3a3328;
  --bd-s: #2d271e;
  --bd-h: #4d4436;

  /* Brand */
  --accent: #F0A020;
  --cta: #e8e0d4;
  --cta-fg: #1a1612;
  --cta-h: #f0ebe2;

  /* Typography */
  --mono: 'JetBrains Mono', monospace;

  /* Shadows */
  --sh-sm: 0 1px 3px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.02);
  --sh-md: 0 4px 12px rgba(0,0,0,0.30);
  --sh-lg: 0 12px 28px rgba(0,0,0,0.40);
  --sh-xl: 0 20px 40px -8px rgba(0,0,0,0.45);
}

[data-theme="light"] {
  --bg: #f0ebe2;
  --bg-s: #e9e3d8;
  --bg-c: #f7f4ee;
  --bg-m: #e3ddd2;
  --fg: #3d2b1f;
  --fg2: #7a6b5d;
  --fg3: #a69a8c;
  --bd: #d9d1c5;
  --bd-s: #e6e0d6;
  --bd-h: #c4baa8;
  --accent: #E8920B;
  --cta: #3d2b1f;
  --cta-fg: #faf8f4;
  --cta-h: #2c1e14;
  --sh-sm: 0 1px 3px rgba(61,43,31,0.06), 0 0 0 1px rgba(61,43,31,0.04);
  --sh-md: 0 4px 12px rgba(61,43,31,0.08);
  --sh-lg: 0 12px 28px rgba(61,43,31,0.10);
  --sh-xl: 0 20px 40px -8px rgba(61,43,31,0.12);
}
`;

// ─── COMPONENT INVENTORY ─────────────────────────────────────────────────────

export const components = {
  shell: [
    "AppShell", "Sidebar", "Header", "Content", "DetailPanel",
    "CommandPalette", "FilterBar", "ContextMenu", "NotificationDrop",
    "KbShortcuts", "EmptyState", "LoadingSkeleton", "RecordPage",
    "Tooltip", "WorkspaceSwitcher",
  ],
  tier1: [
    "DatePicker", "DateRangePicker", "Combobox", "MultiCombobox",
    "Sheet", "DropPortal",
  ],
  tier2: [
    "Accordion", "FileUpload", "Slider", "RangeSlider", "CalendarMonth",
  ],
} as const;
