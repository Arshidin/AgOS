# @agos/ui

AgOS / TURAN CRM Design System — React component library.

## Install

```bash
npm install @agos/ui lucide-react
```

## Usage

### Types
```tsx
import type { ComboboxProps, ComboboxOption, DatePickerProps } from "@agos/ui";
```

### Tokens
```tsx
import { colors, fontSize, radius, statusColors, avatarColor } from "@agos/ui";

// Get avatar color from name (theme-aware)
const { bg, fg } = avatarColor("Arman Kerimov", "light");

// Access status colors (theme-aware)
const won = statusColors.light.emerald; // { bg, fg, dot, bd }
```

### CSS Variables
Add to your `globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

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
```

## Brand

| Element | Value | Usage |
|---------|-------|-------|
| Background | `#f0ebe2` (light) / `#1a1612` (dark) | Warm beige / warm black |
| Text | `#3d2b1f` (light) / `#e8e0d4` (dark) | Dark brown / warm white |
| Accent | `#E8920B` / `#F0A020` | Orange star logo only |
| CTA | `#3d2b1f` (light) / `#e8e0d4` (dark) | Primary action button |

## Design Scales

| Scale | Values |
|-------|--------|
| Font size | 10 · 11 · 12 · 13 · 14 · 15 · 20 |
| Border radius | 4 · 6 · 8 · 12 · 9999 |
| Height | 24 · 28 · 32 · 36 · 40 · 44 · 48 |
| Spacing | 0 · 2 · 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 32 · 48 |
| Transition | 60ms · 80ms · 150ms · 250ms |

## Storybook

```bash
npm run dev
```

## Components

### AppShell (v10)
Sidebar · Header · Content · DetailPanel · CommandPalette · FilterBar · ContextMenu · Notifications · KbShortcuts · EmptyState · LoadingSkeleton · RecordPage · Tooltip · WorkspaceSwitcher

### Tier-1
DatePicker · DateRangePicker · Combobox · MultiCombobox · Sheet · DropPortal

### Tier-2
Accordion · FileUpload · Slider · RangeSlider · CalendarMonth
