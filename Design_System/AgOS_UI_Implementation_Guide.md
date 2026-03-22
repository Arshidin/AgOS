# AgOS / TURAN — UI Implementation Guide

**Scope:** Layout & Navigation  
**Version:** v11 · **Date:** March 2026  
**Prerequisites:** React 18+, Tailwind (optional), Lucide icons  

---

## 1. Setup

### 1.1 Install dependencies

```bash
npm install lucide-react
```

### 1.2 Fonts

Add to your `index.html` or `layout.tsx`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

### 1.3 CSS Variables

Paste into `globals.css`. This is the **single source of truth** for all colors:

```css
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

  /* Status (dark) */
  --blue: #6b9fe0;
  --blue-m: rgba(107,159,224,0.08);
  --green: #5ec47a;
  --amber: #f0b040;
  --red: #e06050;

  /* Typography */
  --mono: 'JetBrains Mono', monospace;

  /* Shadows */
  --sh-sm: 0 1px 3px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.02);
  --sh-md: 0 4px 12px rgba(0,0,0,0.30);
  --sh-lg: 0 12px 28px rgba(0,0,0,0.40);
  --sh-xl: 0 20px 40px -8px rgba(0,0,0,0.45);

  /* Motion */
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
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
  --blue: #4571b8;
  --blue-m: rgba(69,113,184,0.07);
  --green: #3a8a52;
  --amber: #b37a10;
  --red: #c0392b;
  --sh-sm: 0 1px 3px rgba(61,43,31,0.06), 0 0 0 1px rgba(61,43,31,0.04);
  --sh-md: 0 4px 12px rgba(61,43,31,0.08);
  --sh-lg: 0 12px 28px rgba(61,43,31,0.10);
  --sh-xl: 0 20px 40px -8px rgba(61,43,31,0.12);
}
```

### 1.4 Base styles

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  background: var(--bg);
  color: var(--fg);
}

*:focus-visible {
  outline: 2px solid var(--bd-h);
  outline-offset: 2px;
}

*:focus:not(:focus-visible) {
  outline: none;
}
```

---

## 2. AppShell — Root Layout

The entire application lives inside one CSS Grid container.

### 2.1 Grid structure

```
┌────────────┬──────────────────────────────┬──────────┐
│  Sidebar   │  Header (44px)               │          │
│  (240px)   ├──────────────────────────────┤  Panel   │
│            │                              │  (348px) │
│  bg: --bg-s│  Content (1fr)               │  bg: --bg-s
│            │  bg: --bg                    │          │
│            ├──────────────────────────────┤          │
│            │  Footer (40px)               │          │
└────────────┴──────────────────────────────┴──────────┘
```

### 2.2 Implementation

```tsx
// AppShell.tsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";

type SidebarState = "expanded" | "collapsed" | "hidden";
type Theme = "dark" | "light";

interface ShellContext {
  sidebar: SidebarState;
  setSidebar: (s: SidebarState) => void;
  cycleSidebar: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  activePage: string;
  setActivePage: (p: string) => void;
  panelOpen: boolean;
  setPanelOpen: (o: boolean) => void;
  panelRecord: any;
  openPanel: (record: any) => void;
}

const ShellCtx = createContext<ShellContext>(null!);
export const useShell = () => useContext(ShellCtx);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebar, setSidebar] = useState<SidebarState>("expanded");
  const [theme, setTheme] = useState<Theme>("dark");
  const [activePage, setActivePage] = useState("contacts");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelRecord, setPanelRecord] = useState(null);

  const cycleSidebar = useCallback(() => {
    setSidebar(s =>
      s === "expanded" ? "collapsed" :
      s === "collapsed" ? "hidden" : "expanded"
    );
  }, []);

  const openPanel = (record: any) => {
    setPanelRecord(record);
    setPanelOpen(true);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "b") { e.preventDefault(); cycleSidebar(); }
      if (mod && e.key === "]") { e.preventDefault(); setPanelOpen(p => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cycleSidebar]);

  // Persist theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Sidebar width
  const sw = sidebar === "expanded" ? 240
           : sidebar === "collapsed" ? 56 : 0;

  const ctx: ShellContext = {
    sidebar, setSidebar, cycleSidebar,
    theme, setTheme,
    activePage, setActivePage,
    panelOpen, setPanelOpen,
    panelRecord, openPanel,
  };

  return (
    <ShellCtx.Provider value={ctx}>
      <div
        data-theme={theme}
        style={{
          display: "grid",
          gridTemplateColumns: `${sw}px 1fr ${panelOpen ? "348px" : "0px"}`,
          gridTemplateRows: "44px 1fr",
          height: "100vh",
          width: "100%",
          background: "var(--bg)",
          color: "var(--fg)",
          transition: "grid-template-columns 250ms var(--ease)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </ShellCtx.Provider>
  );
}
```

### 2.3 Page assembly

```tsx
// app/layout.tsx (Next.js example)
import { AppShell } from "@/components/AppShell";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { DetailPanel } from "@/components/DetailPanel";
import { CommandPalette } from "@/components/CommandPalette";

export default function Layout({ children }) {
  return (
    <AppShell>
      <Sidebar />
      <Header />
      <main style={{ overflow: "auto" }}>
        {children}
      </main>
      <DetailPanel />
      <CommandPalette />
    </AppShell>
  );
}
```

---

## 3. Sidebar

### 3.1 Three states

| State | Width | Shows | Toggle |
|-------|-------|-------|--------|
| **expanded** | 240px | Logo + search + nav labels + counts + favorites + user | `⌘B` or collapse button |
| **collapsed** | 56px | Icon rail only, tooltips on hover | `⌘B` |
| **hidden** | 0px | Nothing. Expand button appears in Header | `⌘B` |

### 3.2 Structure (expanded)

```
┌──────────────────────────┐
│ [★ star] AgOS            │  ← Workspace header
│          TURAN · Pro     │     Turan star logo (28×28)
│                    [◀]   │     Collapse button
├──────────────────────────┤
│ 🔍 Search…        ⌘K    │  ← Opens Command Palette
├──────────────────────────┤
│ ◻ Dashboard              │
│ ◼ Contacts         248   │  ← Active: subtle bg, white text
│ ◻ Companies         67   │     Neutral, NOT brand-colored
│ ◻ Deals              34  │
│ ◻ Activities             │
│ ◻ Reports               │
├──────────────────────────┤
│ FAVORITES            +   │  ← Section title (10px, uppercase)
│ ★ Q1 Pipeline            │     Star filled with semantic color
│ ★ Astana Enterprise      │
│ ★ Stalled deals          │
├──────────────────────────┤
│ [AR] arshidin            │  ← User footer
│      Admin         [☀]   │     Avatar uses --cta bg
└──────────────────────────┘
```

### 3.3 Key specs

**Workspace header:**
- Turan star SVG logo: 28×28, orange `#E8920B`
- Name: 13px / 600 weight / `-0.01em` letter-spacing
- Plan badge: 10px / `var(--fg3)`
- Collapse button: 28×28, icon-only, `var(--fg3)`

**Search trigger:**
- Full-width button (not input)
- Background: `var(--bg-c)` + border `var(--bd)`
- Click opens Command Palette
- ⌘K badge: 10px, `var(--bg)` bg + `var(--bd)` border

**Nav items:**
- 13px / 400 weight (500 when active)
- Padding: `7px 10px`, border-radius: 6px
- Icon: 16px, strokeWidth 1.5 (1.8 active)
- Active state: `rgba(255,255,255,0.04)` bg + `rgba(255,255,255,0.06)` border (dark)
- Active state: `rgba(0,0,0,0.04)` bg + `rgba(0,0,0,0.06)` border (light)
- **NOT brand-colored.** Navigation is always neutral.
- Count: 11px / 500 weight / `var(--fg3)`
- Hover: `var(--bg-m)` bg

**Favorites:**
- Section title: 10px / 600 / uppercase / `0.06em` letter-spacing / `var(--fg3)`
- Star icons: filled with semantic color (blue/green/red), NOT brand amber
- Items: 12px / 400 weight / `var(--fg2)`

**User footer:**
- Avatar: 28×28, `var(--cta)` bg, `var(--cta-fg)` text (brand-colored — only the current user)
- Name: 12px / 500 weight
- Role: 10px / `var(--fg3)`
- Theme toggle: Sun/Moon icon button

### 3.4 Collapsed state

```
┌──────┐
│  ★   │  ← Logo only (24×24)
├──────┤
│  🔍  │  ← Search icon, tooltip "Search ⌘K"
├──────┤
│  ◻   │  ← Nav icons only (16px)
│  ◼   │     Active: same bg as expanded
│  ◻   │     Tooltip shows label on hover
│  ◻   │
├──────┤
│ [AR] │  ← Avatar only
└──────┘
```

All items: `justify-content: center`, padding `7px`.

### 3.5 Transitions

- Width change: `250ms var(--ease)` on parent grid
- Content opacity: no transition (instant swap to prevent layout jank)
- Persist state in `localStorage`:

```tsx
useEffect(() => {
  localStorage.setItem("agos-sidebar", sidebar);
}, [sidebar]);
```

---

## 4. Header

### 4.1 Structure

```
┌──────────────────────────────────────────────────────┐
│ [▶] Contacts    [All] [Active] [Leads]   [Filter] [Export] [+ Add contact] │
│  ↑                ↑                         ↑           ↑          ↑       │
│  Show sidebar   Page tabs               Ghost btns   Ghost btn  CTA btn   │
│  (only when     bg-m on active           bd border    bd border  --cta bg  │
│   sidebar                                                                   │
│   hidden)                                                                   │
└──────────────────────────────────────────────────────┘
```

### 4.2 Specs

- Height: 44px (fixed)
- Padding: `0 20px`
- Border: `1px solid var(--bd)` bottom
- Background: `var(--bg)`
- Grid column: spans from sidebar edge to panel edge

**Page title:** 14px / 600 weight

**Tabs:**
- 12px / 400 weight (500 active)
- Padding: `4px 10px`, border-radius: 5px
- Active: `var(--bg-m)` bg, `var(--fg)` color
- Normal: transparent bg, `var(--fg3)` color

**Ghost buttons (Filter, Export):**
- `transparent` bg + `1px solid var(--bd)` border
- `var(--fg2)` color, 11px / 500 weight
- Icon: 13px
- Hover: `var(--bd-h)` border, `var(--fg)` color

**CTA button (Add contact):**
- `var(--cta)` background (dark brown in light / cream in dark)
- `var(--cta-fg)` text
- 12px / 600 weight, border-radius: 6px
- Hover: `var(--cta-h)`
- This is the PRIMARY brand element on the page

### 4.3 Show sidebar button

When sidebar is hidden, show `PanelLeft` icon button in the leftmost position of Header:

```tsx
{sidebar === "hidden" && (
  <button className="icon-btn" onClick={cycleSidebar} title="Show sidebar">
    <PanelLeft size={15} />
  </button>
)}
```

---

## 5. Content Area

### 5.1 Grid behavior

Content spans columns 2 to either column 3 (panel closed) or column 2 only (panel open):

```tsx
<main style={{
  gridColumn: panelOpen ? "2 / 3" : "2 / -1",
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
}}>
```

### 5.2 Table structure

```
┌────────────────────────────────────────────────────┐
│ ☐  NAME ↕        COMPANY    STAGE    VALUE   OWNER │ ← Sticky header
├────────────────────────────────────────────────────┤
│ ☑ [AK] Arman…   Turan T.   • Active  $45K   [AK] │ ← Selected row
│ ☐ [SN] Saule…   KazFin.    • Qualif. $128K  [JS] │
│ ☑ [MP] Maria…   Astana…    • Won     $67K   [MP] │ ← Selected row
│ ☐ …                                               │
├────────────────────────────────────────────────────┤
│ 2 selected · 6 of 248 results     Prev [1] 2 3 Next│ ← Footer
└────────────────────────────────────────────────────┘
```

**Header row:** `var(--bg-s)` bg, sticky `top: 0`, 36px height, 10px / 600 / uppercase / `0.04em` spacing, `var(--fg3)` color.

**Data rows:** 44px height, 13px text. Hover: `var(--bg-m)`. Selected: `var(--blue-m)`. Click opens detail panel.

**Checkboxes:** 16px, border-radius 4px. Checked: `var(--blue)` fill (NOT brand amber — selection is neutral blue).

**Badges:** Pill shape (r9999), 11px / 500, dot (5px) + text. Theme-aware colors from `statusColors`.

**Footer:** 11px / `var(--fg3)`. Selected count in `var(--blue)`. Pagination: active page has `var(--bg-m)` + `var(--bd-h)` border.

---

## 6. Detail Panel

### 6.1 Behavior

- Width: 348px (fixed)
- Appears in grid column 3 (rightmost)
- Slide-in animation: `translateX(10px)` → `translateX(0)`, 250ms
- Close: X button or `⌘]`
- Opens when: user clicks a table row

### 6.2 Structure

```
┌──────────────────────────────┐
│ [AK]  Arman Kerimov      [×]│  ← Header (avatar + name + close)
│        Turan Tech            │
├──────────────────────────────┤
│ [✉ Email] [📞 Call] [📅 Meeting] │  ← Quick actions (pill buttons)
├──────────────────────────────┤
│ Email     arman@turan.kz     │  ← Fields (label + value grid)
│ Company   Turan Tech         │     Grid: 110px label + 1fr value
│ Stage     • Active           │     Hover on value → bg-m (editable hint)
│ Value     $45,200            │     Mono font for numbers
│ Source    Referral            │
│ Created   Mar 15, 2026       │
├──────────────────────────────┤
│ RECENT ACTIVITY              │  ← Section title (10px, uppercase)
│ [✉] Email sent      2h ago  │     Colored icon circles
│ [📞] Call logged     1d ago  │
│ [⚡] Deal updated   3d ago  │
└──────────────────────────────┘
```

### 6.3 Quick action buttons

```css
.quick-action {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--bg-m);
  border: 1px solid var(--bd);
  color: var(--fg2);
  font-size: 11px;
  font-weight: 500;
}
.quick-action:hover {
  border-color: var(--bd-h);
  color: var(--fg);
}
```

---

## 7. Command Palette

### 7.1 Activation

- `⌘K` (global shortcut)
- Click on sidebar search trigger
- ESC closes

### 7.2 Structure

```
┌─────────────────────────────────────────┐
│ 🔍  Type a command or search…      ESC │  ← Search input (14px)
├─────────────────────────────────────────┤
│ PAGES                                    │  ← Section title
│   ◻ Dashboard                       ⌘1 │  ← Item + shortcut badge
│   ◻ Contacts                        ⌘2 │
│   ◻ Companies                       ⌘3 │
│   ◻ Deals                           ⌘4 │
├─────────────────────────────────────────┤
│ ACTIONS                                  │
│   + New contact                         │
│   🔍 Search deals                       │
└─────────────────────────────────────────┘
```

### 7.3 Specs

- Width: 520px, max-height: 400px
- Border-radius: 12px
- Background: `var(--bg-c)` + `var(--bd)` border
- Shadow: `var(--sh-xl)`
- Backdrop: `rgba(0,0,0,0.4)` + `backdrop-filter: blur(6px)`
- Animation: scale(0.97) + translateY(-6px) → normal, 180ms spring

---

## 8. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘B` | Cycle sidebar: expanded → collapsed → hidden → expanded |
| `⌘K` | Open Command Palette |
| `⌘]` | Toggle Detail Panel |
| `ESC` | Close topmost overlay (command palette, sheet, dropdown) |
| `↑ ↓` | Navigate items in command palette, dropdowns |
| `Enter` | Select active item |
| `⌘1-4` | Jump to page (Dashboard, Contacts, Companies, Deals) |

---

## 9. Theme Switching

### 9.1 Mechanism

Theme is controlled by `data-theme` attribute on the root element:

```tsx
// Set theme
document.documentElement.setAttribute("data-theme", theme);

// Or via React state in AppShell
<div data-theme={theme}>
```

### 9.2 Persistence

```tsx
// Read on mount
const [theme, setTheme] = useState<Theme>(() => {
  if (typeof window !== "undefined") {
    return (localStorage.getItem("agos-theme") as Theme) || "dark";
  }
  return "dark";
});

// Save on change
useEffect(() => {
  localStorage.setItem("agos-theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
}, [theme]);
```

### 9.3 System preference detection

```tsx
useEffect(() => {
  const saved = localStorage.getItem("agos-theme");
  if (!saved) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }
}, []);
```

---

## 10. Routing (Next.js example)

### 10.1 File structure

```
app/
  layout.tsx          ← AppShell wraps everything
  (app)/
    layout.tsx        ← Sidebar + Header + Panel
    dashboard/
      page.tsx
    contacts/
      page.tsx        ← List view
      [id]/
        page.tsx      ← Record page (full-width)
    companies/
      page.tsx
    deals/
      page.tsx
    settings/
      page.tsx        ← No sidebar? Optional
```

### 10.2 Route ↔ Sidebar sync

```tsx
// In Sidebar component
import { usePathname, useRouter } from "next/navigation";

const pathname = usePathname();
const router = useRouter();

// Determine active page from route
const activePage = pathname.split("/")[1] || "dashboard";

// Navigate on click
const handleNav = (id: string) => {
  router.push(`/${id}`);
};
```

### 10.3 Panel routing

The detail panel can be URL-driven using a query param:

```tsx
// URL: /contacts?panel=123
const searchParams = useSearchParams();
const panelId = searchParams.get("panel");

useEffect(() => {
  if (panelId) {
    // Fetch record and open panel
    fetchContact(panelId).then(openPanel);
  }
}, [panelId]);
```

---

## 11. Color Usage Rules

| Element | Token | Note |
|---------|-------|------|
| Page background | `--bg` | Warm beige (light) / warm black (dark) |
| Sidebar background | `--bg-s` | One step darker/lighter than page |
| Cards, dropdowns | `--bg-c` | Elevated surface |
| Hover states | `--bg-m` | Muted background |
| CTA button | `--cta` + `--cta-fg` | **Only** primary action buttons |
| Brand accent | `--accent` | **Only** logo star. Never on nav, badges, or backgrounds |
| Selection | `--blue` / `--blue-m` | Checkboxes, selected rows — neutral blue |
| Nav active | `rgba(fg, 0.04-0.06)` | Neutral — NOT brand-colored |
| Status badges | `--green/blue/amber/red` | Semantic — independent of brand |
| Focus ring | `--bd-h` | Warm brown, not blue |

**Principle: "Quiet interface, loud action"** — the CTA button is the single most prominent UI element. Everything else stays neutral and calm.

---

## 12. File Reference

| File | What it contains |
|------|------------------|
| `tokens.ts` | All design tokens (primitives, semantic, typography, spacing, sizing, shadows, motion, status colors, avatar palette) |
| `types.ts` | TypeScript interfaces for all components |
| `index.ts` | Public API exports |
| `AgOS_AppShell_v11.jsx` | Working shell: sidebar, header, table, panel, command palette |
| `AgOS_Components_Tier1.jsx` | DatePicker, Combobox, MultiCombobox, Sheet |
| `AgOS_Components_Tier2.jsx` | Accordion, FileUpload, Slider, RangeSlider, Calendar |
| `AgOS_Design_System_Docs.md` | Component specs and token tables |
| `README.md` | Quick start guide |

---

## Next Guides (planned)

- **Pages:** List view, Record view, Settings, Dashboard — layout patterns for each page type
- **Patterns:** Forms, validation, loading states, empty states, error handling, bulk actions
- **Data:** Table configuration, sorting, filtering, pagination, column resize
- **Overlays:** Modals, sheets, dropdowns, context menus, tooltips, notifications
