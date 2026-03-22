# AgOS / TURAN Design System Documentation

**Version:** v11 · **Date:** March 2026 · **Status:** Production-ready prototype

---

## Brand Identity

Turan corporate identity (source: turan.kz):
- **Background:** warm beige `#f0ebe2`
- **Text:** dark brown `#3d2b1f`
- **Accent:** orange star `#E8920B` (logo mark only)
- **CTA button:** dark brown `#3d2b1f` (light) / warm white `#e8e0d4` (dark)
- **Principle:** "Quiet interface, loud action" — accent at ≤5% screen surface

---

## Token Architecture

Three-layer token system: **Primitive → Semantic → Component**.

### Color Tokens

| Variable | Dark | Light | Usage |
|----------|------|-------|-------|
| `--bg` | `#1a1612` | `#f0ebe2` | Page background |
| `--bg-s` | `#211d18` | `#e9e3d8` | Sidebar, panel bg |
| `--bg-c` | `#272219` | `#f7f4ee` | Cards, popovers, dropdowns |
| `--bg-m` | `#332d24` | `#e3ddd2` | Hover states, muted bg |
| `--fg` | `#e8e0d4` | `#3d2b1f` | Primary text |
| `--fg2` | `#a69a8c` | `#7a6b5d` | Secondary text |
| `--fg3` | `#6b6054` | `#a69a8c` | Muted text, placeholders |
| `--bd` | `#3a3328` | `#d9d1c5` | Primary borders |
| `--bd-s` | `#2d271e` | `#e6e0d6` | Subtle borders (table rows) |
| `--bd-h` | `#4d4436` | `#c4baa8` | Hover/focus borders |
| `--accent` | `#F0A020` | `#E8920B` | Brand accent (logo star) |
| `--cta` | `#e8e0d4` | `#3d2b1f` | CTA button background |
| `--cta-fg` | `#1a1612` | `#faf8f4` | CTA button text |
| `--cta-h` | `#f0ebe2` | `#2c1e14` | CTA button hover |

Theme selector: `[data-theme="dark"]` / `[data-theme="light"]`.

### Shadow System

| Variable | Dark | Light |
|----------|------|-------|
| `--sh-sm` | `0 1px 3px rgba(0,0,0,0.30)` | `...rgba(61,43,31,0.06)` |
| `--sh-md` | `0 4px 12px rgba(0,0,0,0.30)` | `...rgba(61,43,31,0.08)` |
| `--sh-lg` | `0 12px 28px rgba(0,0,0,0.40)` | `...rgba(61,43,31,0.10)` |
| `--sh-xl` | `0 20px 40px -8px rgba(0,0,0,0.45)` | `...rgba(61,43,31,0.12)` |

Light shadows use warm brown base `rgba(61,43,31,...)` instead of pure black.

Usage: tooltips = `--sh-md`, dropdowns = `--sh-lg`, modals = `--sh-xl`, segmented control active = `--sh-sm`.

### Status Colors (theme-aware)

Status colors are now theme-aware. Use `statusColors[theme]` to get the correct palette.

| Status | Light fg | Dark fg | Usage |
|--------|----------|---------|-------|
| green | `#3a8a52` | `#5ec47a` | Active |
| blue | `#4571b8` | `#6b9fe0` | Qualified |
| emerald | `#2d8a6e` | `#4ecba0` | Won |
| amber | `#b37a10` | `#f0b040` | Lead |
| red | `#c0392b` | `#e06050` | Stalled, Lost |

### Avatar Palette (theme-aware)

Avatars are now theme-aware with warm-toned palettes. Use `avatarColor(name, theme)`.

---

## Scales

### Font Size (px) — no half-pixels

| Token | Size | Usage |
|-------|------|-------|
| `2xs` | 10 | Section headers, badges, kbd, type labels |
| `xs` | 11 | Nav counts, field labels, filter chips, section titles |
| `sm` | 12 | Buttons, ghost actions, footer, mono values |
| `base` | 13 | Body text, table cells, inputs, sub-nav |
| `md` | 14 | Nav items, header title, combobox |
| `lg` | 15 | Page titles, empty state |
| `xl` | 20 | Record page headings |

### Border Radius (px)

| Token | Size | Usage |
|-------|------|-------|
| `sm` | 4 | Checkboxes, kbd, type labels, resize handles |
| `md` | 6 | Buttons, icon buttons, context menu items |
| `lg` | 8 | Nav items, cards, search bar, dropdowns, marks |
| `xl` | 12 | Modals, command palette, sheets |
| `full` | 9999 | Pill badges, avatars |

### Height (px) — all on 4px grid

| Token | Size | Usage |
|-------|------|-------|
| `xs` | 24 | Mini avatar, inline elements |
| `sm` | 28 | Icon buttons, ghost buttons, tags |
| `md` | 32 | Primary button |
| `lg` | 36 | Large buttons (empty state CTA) |
| `row` | 44 | Table rows, header, skeleton rows |
| `xl` | 48 | Large inputs |

### Transition Duration

| Token | Duration | Usage |
|-------|----------|-------|
| `fast` | 60ms | Hover bg, dropdown open, focus ring |
| `default` | 80ms | Color change, border, general interactions |
| `slow` | 150ms | Modal open, command palette appear |
| `layout` | 250ms | Sidebar collapse, panel slide, grid reflow |

Single easing: `cubic-bezier(0.16, 1, 0.3, 1)` — spring-like, used everywhere except shimmer (linear).

---

## Layout

```
┌─────────────┬──────────────────────────────┬──────────┐
│  Sidebar    │  Header (44px)               │          │
│  (252px)    ├──────────────────────────────┤  Panel   │
│             │  Filter Bar (if active)      │  (360px) │
│  bg: --bg-s ├──────────────────────────────┤  bg: --bg-s
│             │  Content (1fr)               │          │
│             │  bg: --bg                    │          │
│             ├──────────────────────────────┤          │
│             │  Footer (40px)               │          │
└─────────────┴──────────────────────────────┴──────────┘
```

Grid: `grid-template-columns: var(--sw) 1fr var(--pw)`
Rows: `auto 1fr` (no filters) / `auto auto 1fr` (with filters)

Sidebar states: expanded (252px) → collapsed (56px) → hidden (0px). Toggle: `⌘B`.

---

## Component Reference

### Sidebar

**Workspace header:** Turan star logo (orange 8-point star, `--accent`) + workspace name + plan badge. Click → dropdown with workspace list.

**Search bar:** bg-c + bd border (light) / transparent + bd border (dark), 8px 12px padding, r6. Shows `⌘K` kbd badge.

**Nav items:** 13px/500, 7px 10px padding, r6. Icon 16px / strokeWidth 1.5 (1.8 active). Active: neutral `rgba(fg, 0.06)` fill — no brand color on nav. Counts: 11px, fg3.

**Sections:** Favorites (star icons, semantic colors), Lists (hash icons + counts). Collapse/expand with chevron rotation 150ms.

**Footer:** User row (avatar 28px with dark brown bg + name 12px/500) + settings icon. User avatar uses `--cta` bg color.

### Header

Height: 44px. Padding: 0 20px. Bottom border: 1px `--bd`.

**Left:** Page title (14px/600) + tabs (12px, bg-m on active).
**Right:** Ghost buttons (transparent bg + bd border) + primary CTA button.

**Primary CTA button:** 32px height, r6, `--cta` bg, `--cta-fg` text, 12px/600. This is the primary brand-colored action element.
**Ghost button:** transparent bg, 1px `--bd` border, fg2 text.

### Table

**Header row:** 10px/600, uppercase, letter-spacing 0.04em, fg3. Padding: 0 16px. Height: 36px. bg: `--bg-s`. Sticky top.
**Data rows:** 44px height, 13px text, 16px padding. Hover: `rgba(fg, 0.02)`. Selected: `rgba(blue, 0.05)` — selection uses subtle blue, not brand color.
**Name column:** 500 weight. Click name = open record page. Click row = open panel.
**Value column:** Mono font, right-aligned, tabular-nums.
**Checkboxes:** 16px, r4, 1.5px border. Checked: blue fill (selection color, not brand).
**Column resize:** 4px invisible handle on right edge, hover → accent line.
**Context menu:** Right-click → 180px dropdown with grouped items.

### Detail Panel

Width: 360px default, resize 300-600px. Slide-in: 250ms translateX(10px).

**Header:** Avatar 36px + name 14px/600 + type label ("CONTACT" pill) + company.
**Quick actions:** Email / Call / Meeting / Note — pill buttons with bg-m + bd border.
**Fields:** 112px label column + value. Click non-badge field → inline edit (bd-h border + warm ring).
**Activity:** Colored icon circles + timeline. "View all →" link.

### Command Palette (⌘K)

500px wide, r12, sh-xl shadow. Backdrop: rgba(0,0,0,0.35) + blur(8px).

**Search:** 14px input + spinner during debounce (200ms).
**Sections:** Pages (with ⌘1-4 shortcuts), Actions (including theme toggle), Recent records.
**Navigation:** ↑↓ arrows, Enter select, Tab stays in input (focus trap), Esc closes.
**Active item:** bg-m background, scrollIntoView on change.

### Filter Bar

Below header when filters active. Chips: `field | op | value | ×`. Three parts with different bg/color.
"+ Add filter" — dashed border pill. "Clear all" — ghost text button.

### Badges (Stage)

Pill shape (r9999). 11px/500. Colored dot (5px) + text. Theme-aware colors from `statusColors[theme]`:
- **Lead:** amber
- **Qualified:** blue
- **Active:** green
- **Won:** emerald
- **Stalled/Lost:** red

Each has bg (8% opacity), fg (theme-appropriate), dot (solid), border (15% opacity).

### Avatars

Theme-aware palette via `avatarColor(name, theme)`. 8 warm-toned color pairs per theme. Initials: first letter of each word, max 2 chars. Sizes: 16/24/28/36/48px. Current user avatar uses `--cta` bg with `--cta-fg` text (brand-colored).

---

## Tier-1 Components

### DatePicker

Trigger: calendar icon + date string + clear X. Dropdown: 280px, r8.
Calendar: 7×6 grid. Today: `--cta` circle + dot. Selected: `--cta` fill. Focus: inset warm ring.
Keyboard: ← → ↑ ↓ navigate days (cross months), Enter selects, Esc closes.
"Today" button in footer.

### Combobox (Single)

Trigger: icon + label + chevrons. Dropdown: full width, r8.
Search input at top. Options: icon/dot + label + subtitle + checkmark.
`allowCreate`: "Create {query}" option with Plus icon.
Keyboard: ↑↓ + Enter + Esc. Mouse: hover highlights.

### MultiCombobox

Trigger: tag chips + inline input + chevrons.
Tags: colored dot + label + × remove. Backspace removes last tag.
Dropdown: checkboxes (selection blue fill on checked) + labels.
`allowCreate`: type new tag name, Enter to create.

### Sheet

Sizes: SM (400) / MD (520) / LG (680) / XL (860).
Slide-in from right: 250ms spring easing.
Backdrop: dark overlay + blur. Focus trap (Tab stays inside). Esc closes.
Slots: header (title + desc + X), body (scrollable), footer (actions).

### DropPortal

Shared utility for all dropdowns. `position: fixed` with `getBoundingClientRect()`.
Flip logic: if not enough space below, opens above.
Tracks scroll and resize events. Escapes `overflow: auto` containers.

---

## Tier-2 Components

### Accordion

Single mode: one section at a time. Multi mode: any number open.
Chevron rotation: 200ms spring. Content height: JS-measured `scrollHeight`.
Items: trigger (13px/500) + optional badge + expandable body.

### FileUpload

Drag-and-drop zone: dashed border, accent tint on drag-over.
File list: type icon + name + size + progress bar + status indicator.
States: uploading (spinner + progress), done (green check), error (red alert).

### Slider

Custom thumb: 18px `--cta` circle with bg border + shadow.
Track: 4px, bg-m base, `--cta` fill.
Focus ring: warm ring shadow. Hover/active: scale 1.15/1.3.
Range variant: two thumbs, fill between them.

### Calendar (Month)

7-column grid. Today: `--cta` number circle. Events: colored dots + mini text preview.
Detail panel on day click: event list with time + colored left border.
Month nav: ← → arrows + "Today" button.

---

## Accessibility

- All interactive elements have `aria-*` attributes
- `role="grid"` on table, `role="tablist"` on tabs, `role="dialog"` on modals
- `aria-sort` on sortable columns, `aria-selected` on rows/tabs
- `aria-expanded` on accordions and sections
- Global `*:focus-visible` ring: 2px `--bd-h`, offset 2px (warm brown tone)
- Focus trap in Command Palette and Sheet
- Keyboard navigation: ↑↓ in lists, Enter to select, Esc to close
- Indeterminate checkbox state for partial selection
- Screen reader labels on all icon buttons

---

## Files

| File | Description |
|------|-------------|
| `tokens.ts` | Design tokens v11 (Turan brand colors, spacing, typography, shadows, motion) |
| `AgOS_AppShell_v10.jsx` | Complete shell with all P0-P3 features |
| `AgOS_Components_Tier1.jsx` | DatePicker, Combobox, Sheet, DropPortal |
| `AgOS_Components_Tier2.jsx` | Accordion, FileUpload, Slider, Calendar |
| `AgOS_TURAN_Color_v3.jsx` | Color concept prototype (interactive preview) |
