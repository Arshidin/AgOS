# AgOS / TURAN — UI Implementation Guide, Part 2

**Scope:** Pages, Patterns, Data  
**Version:** v11 · **Date:** March 2026  
**Prerequisite:** Part 1 (Layout & Navigation)  

---

## 13. Page Types

There are four standard page layouts in AgOS. Each reuses the same AppShell grid but configures Header and Content differently.

### 13.1 List View (Contacts, Companies, Deals)

The most common page type. Table with filters, sort, selection, and a detail panel.

```
Header:  Title + Tabs + [Filter] [Export] [+ CTA]
Content: FilterBar (optional) + DataTable + Footer
Panel:   DetailPanel (on row click)
```

**Header config:**
```tsx
<Header
  title="Contacts"
  tabs={[
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "leads", label: "Leads" },
  ]}
  activeTab={tab}
  onTabChange={setTab}
  actions={[
    { id: "filter", label: "Filter", icon: Filter, variant: "ghost" },
    { id: "export", label: "Export", icon: Download, variant: "ghost" },
  ]}
  primaryAction={{ label: "Add contact", icon: Plus, onClick: openCreate }}
/>
```

**When to show filter bar:**
- User clicks Filter → bar appears below header
- Grid rows become `auto auto 1fr` (header + filter + content)
- Filter chips: `field | operator | value | ×`
- "Clear all" ghost button on the right

### 13.2 Record View (Contact detail, Deal detail)

Full-width page for a single record. No table, no panel. Breadcrumb instead of tabs.

```
Header:  Breadcrumb + [Edit] [Delete] [⋯]
Content: RecordHeader + Tabs + TabContent
```

**Header config:**
```tsx
<Header
  breadcrumb={[
    { label: "Contacts", onClick: () => navigate("/contacts") },
    { label: "Arman Kerimov" },
  ]}
  actions={[
    { id: "edit", label: "Edit", icon: Edit3, variant: "ghost" },
  ]}
  primaryAction={{ label: "Save changes", icon: Check, onClick: save }}
/>
```

**Record header (inside content):**
```
[AK]  Arman Kerimov                              CONTACT
      arman@turantech.kz · Turan Tech
      ──────────────────────────────────────────────────
      [Overview] [Activity] [Deals] [Emails] [Files]
```

- Avatar: 48px (`avatar.xl`)
- Name: 20px / 700 weight (`fontSize.xl`)
- Type pill: 10px uppercase, `var(--bg-m)` bg
- Tabs below: 13px, active has `2px solid var(--cta)` bottom border

### 13.3 Settings Page

No sidebar panel. Simple vertical scroll. Optional section nav on the left.

```
Header:  Title + Description
Content: Sections (stacked cards)
```

**Structure:**
```
┌─────────────────────────────────────────┐
│  Settings                               │
│  Manage your workspace configuration    │
├──────────┬──────────────────────────────┤
│ General  │  ┌────────────────────────┐  │
│ Team     │  │ General Settings       │  │
│ Billing  │  │ ─────────────────────  │  │
│ API      │  │ Workspace name  [____] │  │
│ Security │  │ Timezone        [____] │  │
│          │  │ Currency        [____] │  │
│          │  └────────────────────────┘  │
│          │  ┌────────────────────────┐  │
│          │  │ Danger Zone            │  │
│          │  │ Delete workspace  [🗑] │  │
│          │  └────────────────────────┘  │
└──────────┴──────────────────────────────┘
```

- Max width: 720px, centered
- Cards: `var(--bg-c)` bg, `var(--bd)` border, r8, 20px padding
- Section nav: sticky left, 12px / 400, active has `var(--cta)` left border

### 13.4 Dashboard

Cards with charts and metrics. No table, no panel.

```
Header:  Title + DateRangePicker
Content: Metric cards + Charts (grid)
```

**Grid layout:**
```
┌─────────┬─────────┬─────────┬─────────┐
│ Revenue │ Deals   │ Win Rate│ Pipeline │  ← 4 metric cards
├─────────┴────┬────┴─────────┴─────────┤
│ Revenue chart │   Pipeline by stage    │  ← 2 chart cards
├──────────────┴────────────────────────┤
│ Recent activity                        │  ← Full-width card
└────────────────────────────────────────┘
```

Metric card:
- `var(--bg-c)` bg, `var(--bd)` border, r8
- Label: 11px / `var(--fg3)` / uppercase
- Value: 20px / 700 weight / mono font
- Trend: 11px, green up / red down with arrow

---

## 14. Forms

### 14.1 Field anatomy

```
Label              ← 11px / 600 / uppercase / 0.04em / var(--fg2)
┌──────────────┐
│ Value        │   ← 13px / var(--bg-c) bg (light) or var(--bg) bg (dark)
└──────────────┘      1px solid var(--bd), r6, padding 8px 12px
Helper text        ← 11px / var(--fg3), optional
Error message      ← 11px / var(--red), replaces helper when invalid
```

### 14.2 Input states

| State | Border | Background | Shadow |
|-------|--------|------------|--------|
| Default | `var(--bd)` | `var(--bg-c)` or `var(--bg)` | none |
| Hover | `var(--bd-h)` | same | none |
| Focus | `var(--bd-h)` | same | `0 0 0 3px rgba(61,43,31,0.06)` |
| Error | `var(--red)` | same | `0 0 0 3px rgba(red, 0.06)` |
| Disabled | `var(--bd-s)` | `var(--bg-m)` | none, opacity 0.5 |

**Focus ring uses warm brown tone**, not brand amber. This keeps inputs neutral.

### 14.3 Field types

| Type | Component | Notes |
|------|-----------|-------|
| Text | `<input>` | Single-line, 13px |
| Textarea | `<textarea>` | Multi-line, min-height 80px |
| Select | `Combobox` | Search + dropdown |
| Multi-select | `MultiCombobox` | Tags + dropdown |
| Date | `DatePicker` | Calendar dropdown |
| Date range | `DateRangePicker` | Two pickers |
| Number | `<input type="text">` | Formatted with mono font, right-aligned |
| Currency | `<input>` | Prefix "$" slot, mono font |
| Toggle | Switch | For boolean on/off |
| File | `FileUpload` | Drag-and-drop zone |

### 14.4 Validation strategy

**Validate on blur + show on submit:**

1. User fills a field and tabs away → validate that field silently
2. If invalid, show error immediately below that field
3. User clicks Submit → validate ALL fields, scroll to first error
4. After submit attempt, switch to real-time validation (validate on change)

```tsx
const [touched, setTouched] = useState<Set<string>>(new Set());
const [submitted, setSubmitted] = useState(false);

// Show error if: (field was touched OR form was submitted) AND field is invalid
const showError = (field: string) =>
  (touched.has(field) || submitted) && errors[field];
```

### 14.5 Form layout

**Two-column for short forms (≤6 fields):**
```tsx
<div style={{
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px 24px",
}}>
```

**Single-column for long forms or mobile:**
```tsx
<div style={{
  display: "flex",
  flexDirection: "column",
  gap: 16,
  maxWidth: 480,
}}>
```

**Form in Sheet:**
- Sheet size: MD (520px) for standard forms, LG (680px) for complex
- Footer: Cancel (ghost) + Save (CTA), right-aligned
- Scroll: body scrolls, header and footer fixed

---

## 15. States

### 15.1 Loading

**Table skeleton:**
```
┌────────────────────────────────────────┐
│ ░░░░░░░░░░░░  ░░░░░░░  ░░░░  ░░░░░░ │  ← Shimmer rows
│ ░░░░░░░░░░    ░░░░░░░  ░░░░  ░░░░░░ │     Match column widths
│ ░░░░░░░░░░░░  ░░░░░░░  ░░░░  ░░░░░░ │     6 rows default
│ ░░░░░░░░░░    ░░░░░░░  ░░░░  ░░░░░░ │     44px row height
└────────────────────────────────────────┘
```

- Skeleton bars: `var(--bg-m)` bg, r4, shimmer animation (linear gradient sweep)
- Show for at least 300ms to prevent flash

**Button loading:**
```tsx
<button disabled className="cta-btn">
  <Loader2 size={14} className="spin" />  // Spinning icon replaces Plus
  Saving…                                  // Text changes to action
</button>
```

**Page loading:**
- Sidebar and header render immediately (they're static)
- Content area shows skeleton
- Never block the entire page with a spinner

### 15.2 Empty state

```
┌────────────────────────────────────────┐
│                                        │
│           [icon: Users, 48px]          │
│                                        │
│        No contacts yet                 │  ← 15px / 600
│   Add your first contact to get        │  ← 13px / var(--fg2)
│   started with your CRM.              │
│                                        │
│        [+ Add contact]                 │  ← CTA button (--cta)
│         Import CSV                     │  ← Ghost link (var(--fg2))
│                                        │
└────────────────────────────────────────┘
```

- Icon: 48px, `var(--fg3)` color
- Title: 15px / 600 weight
- Description: 13px / `var(--fg2)`, max-width 320px, centered
- Primary action: CTA button (`var(--cta)`)
- Secondary: ghost text link

### 15.3 Error state

```
┌────────────────────────────────────────┐
│                                        │
│        [icon: AlertCircle, 48px]       │  ← var(--red)
│                                        │
│     Something went wrong               │
│   We couldn't load your contacts.      │
│   Please try again.                    │
│                                        │
│          [Try again]                   │  ← CTA button
│        Contact support                 │  ← Ghost link
│                                        │
└────────────────────────────────────────┘
```

### 15.4 Inline field error

```
Label
┌──────────────┐
│ bad value    │   ← 1px solid var(--red), focus ring red
└──────────────┘
⚠ Email is required    ← 11px / var(--red), icon 12px
```

---

## 16. Filter Bar

### 16.1 Structure

Appears below header when filters are active. Each filter is a chip with three visual parts:

```
[Stage | is | Active  ×]  [Value | > | $50K  ×]  [+ Add filter]  Clear all
  ↑       ↑     ↑    ↑
 field   op   value  remove
```

### 16.2 Filter chip CSS

```css
.filter-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  font-size: 12px;
  overflow: hidden;
  border: 1px solid var(--bd);
}
.filter-field {
  padding: 4px 8px;
  background: var(--bg-m);
  color: var(--fg2);
  font-weight: 500;
}
.filter-op {
  padding: 4px 6px;
  color: var(--fg3);
  border-left: 1px solid var(--bd);
  border-right: 1px solid var(--bd);
}
.filter-value {
  padding: 4px 8px;
  color: var(--fg);
  font-weight: 500;
}
.filter-remove {
  padding: 4px 6px;
  color: var(--fg3);
  cursor: pointer;
  border-left: 1px solid var(--bd);
}
.filter-remove:hover {
  background: var(--bg-m);
  color: var(--red);
}
```

### 16.3 "Add filter" button

Dashed border pill: `border: 1px dashed var(--bd)`, `var(--fg3)` text, Plus icon 12px. Clicking opens a dropdown with available fields.

---

## 17. Bulk Actions

When one or more rows are selected, the footer transforms into an action bar:

```
Normal:   2 selected · 6 of 248 results              Prev [1] 2 3 Next
Bulk:     2 selected  [✉ Email] [👤 Assign] [📤 Export] [🗑 Delete]    ×
```

- Bulk action buttons: ghost style, same as header ghost buttons
- Delete: `var(--red)` color (destructive variant)
- × clear selection button on the right
- Animation: cross-fade 150ms between normal footer and bulk bar

---

## 18. Context Menu

Right-click on a table row opens a floating menu:

```
┌──────────────────┐
│ 👁 View record   │
│ ✏️ Edit          │
│ ✉ Send email     │
│ ─────────────── │
│ 🗑 Delete        │  ← var(--red) color
└──────────────────┘
```

- Width: 180px, r8, `var(--bg-c)` bg, `var(--bd)` border
- Shadow: `var(--sh-lg)`
- Items: 13px, padding `8px 12px`, icon 14px
- Hover: `var(--bg-m)` bg
- Separator: `1px solid var(--bd-s)`, margin `4px 0`
- Destructive item: `var(--red)` color on text and icon
- Position: `position: fixed`, follows mouse, flips if near edge

---

## 19. Notifications

### 19.1 Bell trigger

In the header, bell icon with red dot badge when unread count > 0:

```tsx
<div style={{ position: "relative" }}>
  <Bell size={16} />
  {unreadCount > 0 && (
    <span style={{
      position: "absolute", top: -2, right: -2,
      width: 8, height: 8, borderRadius: 9999,
      background: "var(--red)",
      border: "2px solid var(--bg)",
    }} />
  )}
</div>
```

### 19.2 Dropdown

```
┌──────────────────────────────────┐
│ Notifications          Mark all  │  ← Header
├──────────────────────────────────┤
│ ● New deal assigned              │  ← Unread (dot + bold title)
│   Saule assigned "KazFinance"    │
│   2 minutes ago                  │
├──────────────────────────────────┤
│   Call logged                    │  ← Read (no dot, normal weight)
│   Arman logged a 15min call      │
│   1 hour ago                     │
├──────────────────────────────────┤
│   Pipeline updated               │
│   Q1 pipeline crossed $500K      │
│   3 hours ago                    │
└──────────────────────────────────┘
```

- Width: 360px, max-height: 400px, r12
- Background: `var(--bg-c)`, border: `var(--bd)`
- Shadow: `var(--sh-xl)`
- Unread dot: 6px, `var(--blue)`
- Timestamp: 10px / `var(--fg3)`
- "Mark all" button: 12px / `var(--fg2)`, ghost

---

## 20. Overlays

### 20.1 Layer order (z-index)

| Layer | z-index | Example |
|-------|---------|---------|
| Base | 0 | Page content |
| Sticky | 2 | Table header |
| Header | 10 | Page header |
| Dropdown | 20 | Filter menu, notifications |
| Sidebar | 30 | Sidebar |
| Context | 100 | Right-click menu |
| Overlay | 200 | Sheet backdrop |
| Modal | 999 | Command palette, confirm dialogs |

### 20.2 Backdrop

All overlays (Sheet, Command Palette, confirm dialogs) use:

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
  animation: fadeIn 120ms;
}
```

Click on backdrop = close overlay. ESC = close topmost overlay only.

### 20.3 ESC key priority

When multiple overlays are open, ESC closes the topmost one:

1. Dropdown (if open) → close
2. Command Palette → close
3. Sheet → close
4. Detail Panel → close (via `⌘]`)

Implementation: each overlay registers/unregisters its close handler. Use a stack:

```tsx
const overlayStack = useRef<(() => void)[]>([]);

// Register
useEffect(() => {
  if (open) {
    overlayStack.current.push(onClose);
    return () => {
      overlayStack.current = overlayStack.current.filter(fn => fn !== onClose);
    };
  }
}, [open, onClose]);

// Global ESC handler (in AppShell)
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && overlayStack.current.length > 0) {
      overlayStack.current[overlayStack.current.length - 1]();
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
```

---

## 21. Table Configuration

### 21.1 Column definition

```tsx
const columns: ColumnDef<Contact>[] = [
  {
    key: "name",
    label: "Name",
    width: 260,
    sortable: true,
    isNameColumn: true,  // clickable, opens record page
    render: (val, row) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={row.name} size="sm" />
        <div>
          <div style={{ fontWeight: 500 }}>{row.name}</div>
          <div style={{ fontSize: 11, color: "var(--fg3)" }}>{row.email}</div>
        </div>
      </div>
    ),
  },
  { key: "company", label: "Company", width: 160 },
  {
    key: "stage",
    label: "Stage",
    width: 120,
    render: (val, row) => <StageBadge stage={row.stage} />,
  },
  {
    key: "value",
    label: "Value",
    width: 120,
    align: "right",
    sortable: true,
    render: (val) => (
      <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500 }}>
        ${val.toLocaleString()}
      </span>
    ),
  },
  {
    key: "owner",
    label: "Owner",
    width: 60,
    render: (val) => <Avatar name={val} size="xs" />,
  },
];
```

### 21.2 Sort

Click column header → toggle asc/desc. Active sort shows chevron:

```tsx
// Sort icon in header
{sort?.key === col.key && (
  sort.direction === "asc"
    ? <ChevronUp size={11} />
    : <ChevronDown size={11} />
)}
```

Only one column sorted at a time. Default: no sort (server order).

### 21.3 Column resize

- 4px invisible handle on the right edge of each header cell
- Hover → `var(--accent)` line appears (2px wide)
- Drag → column resizes, minimum 80px
- Cursor: `col-resize`
- Store widths in state, persist to localStorage per page

### 21.4 Pagination

```tsx
interface PaginationState {
  page: number;       // 1-based
  pageSize: number;   // 25 | 50 | 100
  total: number;      // total records
}
```

Footer shows: `{selected} selected · {showing} of {total} results` + page buttons.

Active page button: `var(--bg-m)` bg + `var(--bd-h)` border + 600 weight.

---

## 22. Responsive Behavior

### 22.1 Breakpoints

| Breakpoint | Width | Sidebar | Panel | Table |
|------------|-------|---------|-------|-------|
| Desktop | ≥1280px | expanded | open if clicked | all columns |
| Laptop | 1024-1279px | collapsed | open if clicked | hide 1-2 columns |
| Tablet | 768-1023px | hidden | sheet overlay | hide 2-3 columns |
| Mobile | <768px | hidden | full-screen sheet | card layout |

### 22.2 Auto-collapse logic

```tsx
useEffect(() => {
  const handleResize = () => {
    const w = window.innerWidth;
    if (w < 768) setSidebar("hidden");
    else if (w < 1024) setSidebar("collapsed");
    // Don't auto-expand — user may have manually collapsed
  };
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
```

---

## 23. Checklist — Before Shipping a Page

For each new page, verify:

- [ ] Header configured: title, tabs/breadcrumb, actions, CTA
- [ ] Empty state designed with icon + title + description + CTA
- [ ] Loading state: skeleton matching the content structure
- [ ] Error state: retry button + support link
- [ ] Keyboard navigation works: Tab through interactive elements
- [ ] ⌘K, ⌘B, ⌘], ESC all work correctly
- [ ] Theme toggle: verify both light and dark look correct
- [ ] Sidebar collapsed: content reflows correctly
- [ ] Panel open + sidebar collapsed: no layout overflow
- [ ] Filters: apply, clear, persist across navigation
- [ ] Table: sort, select, bulk actions, context menu
- [ ] Mobile: sidebar hidden, table readable or card layout
- [ ] All text uses CSS variables (no hardcoded colors)
- [ ] All interactive elements have hover + focus states
- [ ] Status badges use semantic colors from `statusColors[theme]`
- [ ] CTA button uses `--cta` / `--cta-fg` (never `--accent`)
- [ ] Avatars use `avatarColor(name, theme)` for deterministic colors
