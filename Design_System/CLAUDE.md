# CLAUDE.md — AgOS/TURAN Design System Migration

## Role

Ты Senior Frontend Engineer. Твоя задача — мигрировать существующий UI проекта на корпоративную дизайн-систему TURAN v11. 

## Контекст проекта

**Стек:** React 18.3 + TypeScript 5.7 + Vite 6.0 + Tailwind 3.4 + shadcn/ui (Radix) + React Router DOM 6.30 + TanStack Query + React Hook Form + Zod + Lucide React + i18next + Sonner + Recharts + Supabase

**Существующие экраны:**
- Кабинет фермера: F01 (регистрация), F02 (профиль фермы), F10 (болезнь), F11 (вет-случай)
- Админка: A01 (очередь членства), A02 (решение)
- Лендинг, логин, регистрация

**Дизайн-система:** все файлы в папке `Design_system/`

## Критически важные файлы дизайн-системы

Перед началом работы ОБЯЗАТЕЛЬНО прочитай ВСЕ эти файлы целиком:

```
Design_system/
├── tokens.ts                          # Цвета, шрифты, отступы, тени, статусы, аватары
├── types.ts                           # TypeScript интерфейсы всех компонентов
├── AgOS_Design_System_Docs.md         # Спеки компонентов и token tables
├── AgOS_UI_Implementation_Guide.md    # Part 1: Layout, Sidebar, Header, Panel, Routing
├── AgOS_UI_Implementation_Guide_Part2.md  # Part 2: Pages, Forms, States, Patterns
├── AgOS_AppShell_v11.jsx              # Референс: Shell layout, Sidebar, Header, Table
├── AgOS_Components_Tier1.jsx          # Референс: DatePicker, Combobox, Sheet
├── AgOS_Components_Tier2.jsx          # Референс: Accordion, FileUpload, Slider, Calendar
└── README.md                          # Quick start
```

## Главные принципы бренда TURAN

1. **Цвета:** тёплый бежевый фон (#f0ebe2 light / #1a1612 dark), тёмно-коричневый текст (#3d2b1f), НЕ холодный серый
2. **CTA кнопки:** `--cta` (#3d2b1f light / #e8e0d4 dark) — тёмно-коричневые, НЕ синие
3. **Акцент:** оранжевая звезда `--accent` (#E8920B) — ТОЛЬКО для лого. Не использовать в навигации, кнопках, бейджах
4. **Навигация:** нейтральная (серый/белый), БЕЗ брендового цвета
5. **Selection:** голубой (`--blue`), не бренд-цвет
6. **Статусы CRM:** семантические (green/blue/amber/red), независимые от бренда
7. **Тени в light mode:** тёплый коричневый rgba(61,43,31,...) вместо чёрного
8. **Принцип:** "Quiet Interface, Loud Action" — акцент ≤5% экрана

## Порядок миграции

### Фаза 0 — Подготовка (НЕ ломай существующий код)

```bash
# Создай новую ветку
git checkout -b feat/turan-design-system
```

1. Прочитай ВСЮ папку `Design_system/` — tokens.ts, оба Implementation Guide, Docs
2. Изучи текущую структуру проекта: `find src -name "*.tsx" -o -name "*.css" | head -50`
3. Найди globals.css / index.css: `find src -name "globals.css" -o -name "index.css"`
4. Найди tailwind.config: `find . -name "tailwind.config*" -maxdepth 2`
5. Найди shadcn theme: `find src -path "*/components/ui/*" | head -20`
6. Покажи мне структуру и жди подтверждения перед началом изменений

### Фаза 1 — CSS Variables (globals.css)

Замени CSS переменные в globals.css. **НЕ удаляй** shadcn переменные — добавь маппинг:

```css
@layer base {
  :root {
    /* ── TURAN v11 tokens ── */
    --bg: #1a1612;
    --bg-s: #211d18;
    --bg-c: #272219;
    --bg-m: #332d24;
    --fg: #e8e0d4;
    --fg2: #a69a8c;
    --fg3: #6b6054;
    --bd: #3a3328;
    --bd-s: #2d271e;
    --bd-h: #4d4436;
    --accent: #F0A020;
    --cta: #e8e0d4;
    --cta-fg: #1a1612;
    --cta-h: #f0ebe2;
    --blue: #6b9fe0;
    --blue-m: rgba(107,159,224,0.08);
    --green: #5ec47a;
    --amber: #f0b040;
    --red: #e06050;
    --mono: 'JetBrains Mono', monospace;
    --ease: cubic-bezier(0.16, 1, 0.3, 1);

    /* ── shadcn/ui compatibility mapping ── */
    --background: 20 20% 8%;          /* #1a1612 */
    --foreground: 30 18% 88%;         /* #e8e0d4 */
    --card: 25 18% 12%;               /* #272219 */
    --card-foreground: 30 18% 88%;    /* #e8e0d4 */
    --popover: 25 18% 12%;            /* #272219 */
    --popover-foreground: 30 18% 88%; /* #e8e0d4 */
    --primary: 30 18% 88%;            /* #e8e0d4 — CTA bg (dark theme) */
    --primary-foreground: 20 20% 8%;  /* #1a1612 — CTA text */
    --secondary: 28 16% 17%;          /* #332d24 */
    --secondary-foreground: 30 18% 88%;
    --muted: 28 16% 17%;              /* #332d24 */
    --muted-foreground: 30 10% 40%;   /* #6b6054 */
    --accent: 38 90% 53%;             /* #F0A020 */
    --accent-foreground: 20 20% 8%;
    --destructive: 6 70% 60%;         /* #e06050 */
    --destructive-foreground: 30 18% 96%;
    --border: 28 14% 19%;             /* #3a3328 */
    --input: 28 14% 19%;              /* #3a3328 */
    --ring: 28 14% 26%;               /* #4d4436 */
    --radius: 0.5rem;

    /* Sidebar (если используется shadcn sidebar) */
    --sidebar-background: 25 14% 11%; /* #211d18 */
    --sidebar-foreground: 30 18% 88%;
    --sidebar-primary: 30 18% 88%;
    --sidebar-primary-foreground: 20 20% 8%;
    --sidebar-accent: 28 16% 17%;
    --sidebar-accent-foreground: 30 18% 88%;
    --sidebar-border: 28 14% 19%;
    --sidebar-ring: 28 14% 26%;

    /* Chart colors (Recharts) */
    --chart-1: #6b9fe0;   /* blue */
    --chart-2: #5ec47a;   /* green */
    --chart-3: #f0b040;   /* amber */
    --chart-4: #e06050;   /* red */
    --chart-5: #b090c4;   /* purple */
  }

  .light, [data-theme="light"] {
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

    --background: 36 22% 92%;         /* #f0ebe2 */
    --foreground: 22 30% 18%;         /* #3d2b1f */
    --card: 37 25% 95%;               /* #f7f4ee */
    --card-foreground: 22 30% 18%;
    --popover: 37 25% 95%;
    --popover-foreground: 22 30% 18%;
    --primary: 22 30% 18%;            /* #3d2b1f — CTA bg (light) */
    --primary-foreground: 37 40% 97%; /* #faf8f4 */
    --secondary: 34 18% 84%;          /* #e3ddd2 */
    --secondary-foreground: 22 30% 18%;
    --muted: 34 18% 84%;
    --muted-foreground: 30 12% 62%;   /* #a69a8c */
    --accent: 36 90% 48%;             /* #E8920B */
    --accent-foreground: 22 30% 18%;
    --destructive: 4 65% 48%;         /* #c0392b */
    --destructive-foreground: 37 40% 97%;
    --border: 34 12% 80%;             /* #d9d1c5 */
    --input: 34 12% 80%;
    --ring: 30 12% 72%;               /* #c4baa8 */

    --sidebar-background: 35 20% 88%;
    --sidebar-foreground: 22 30% 18%;
    --sidebar-primary: 22 30% 18%;
    --sidebar-primary-foreground: 37 40% 97%;
    --sidebar-accent: 34 18% 84%;
    --sidebar-accent-foreground: 22 30% 18%;
    --sidebar-border: 34 12% 80%;
    --sidebar-ring: 30 12% 72%;

    --chart-1: #4571b8;
    --chart-2: #3a8a52;
    --chart-3: #b37a10;
    --chart-4: #c0392b;
    --chart-5: #6b21a8;
  }
}
```

### Фаза 2 — Tailwind config

Обнови `tailwind.config.ts` — добавь тёплые нейтральные цвета:

```ts
// В extend.colors добавь:
colors: {
  turan: {
    bg: "var(--bg)",
    "bg-s": "var(--bg-s)",
    "bg-c": "var(--bg-c)",
    "bg-m": "var(--bg-m)",
    fg: "var(--fg)",
    fg2: "var(--fg2)",
    fg3: "var(--fg3)",
    bd: "var(--bd)",
    "bd-s": "var(--bd-s)",
    "bd-h": "var(--bd-h)",
    accent: "var(--accent)",
    cta: "var(--cta)",
    "cta-fg": "var(--cta-fg)",
  },
},
fontFamily: {
  sans: ["Inter", ...defaultTheme.fontFamily.sans],
  mono: ["JetBrains Mono", "Fira Code", ...defaultTheme.fontFamily.mono],
},
```

### Фаза 3 — Шрифты

В `index.html` добавь (если ещё нет):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

### Фаза 4 — Компоненты shadcn/ui (миграция стилей)

shadcn компоненты уже используют CSS variables через `--primary`, `--border` и т.д. После Фазы 1 они автоматически подхватят новые цвета. Но проверь и поправь вручную:

**Button:** 
- `default` вариант должен использовать `bg-primary text-primary-foreground` → это теперь тёмно-коричневый (light) / кремовый (dark)
- Проверь что нет hardcoded `bg-blue-*` или `bg-slate-*`

**Badge:**
- CRM статусы используют кастомные цвета. Создай компонент `StageBadge`:

```tsx
// src/components/ui/stage-badge.tsx
const stageStyles = {
  active:    "bg-[rgba(58,138,82,0.08)] text-[var(--green)]",
  qualified: "bg-[rgba(69,113,184,0.08)] text-[var(--blue)]",
  won:       "bg-[rgba(45,138,110,0.08)] text-[#2d8a6e]",
  lead:      "bg-[rgba(179,122,16,0.08)] text-[var(--amber)]",
  stalled:   "bg-[rgba(192,57,43,0.08)] text-[var(--red)]",
  lost:      "bg-[rgba(192,57,43,0.08)] text-[var(--red)]",
};
```

**Input focus ring:**
- Должен быть тёплый коричневый `ring-[var(--bd-h)]`, не синий
- Обнови `input.tsx`: замени `focus-visible:ring-ring` на корректный

**Sonner (тосты):**
```tsx
// В Toaster конфиге
<Sonner
  toastOptions={{
    style: {
      background: "var(--bg-c)",
      border: "1px solid var(--bd)",
      color: "var(--fg)",
    },
  }}
/>
```

### Фаза 5 — Layout (AppShell)

Используя `AgOS_UI_Implementation_Guide.md` и `AgOS_AppShell_v11.jsx` как референс, создай:

```
src/
  components/
    layout/
      AppShell.tsx        # CSS Grid root, ShellContext
      Sidebar.tsx         # 3 состояния, nav, favorites, user
      Header.tsx          # Title, tabs, actions, CTA
      DetailPanel.tsx     # Slide-in panel для записей
      CommandPalette.tsx  # ⌘K
```

**ВАЖНО:** Не создавай с нуля — адаптируй СУЩЕСТВУЮЩИЙ layout если он есть. Посмотри `src/components/layout/` или `src/layouts/` в проекте. Измени цвета и структуру, но сохрани логику routing и авторизации.

### Фаза 6 — Экраны (миграция существующих)

Для каждого существующего экрана:

1. **НЕ переписывай логику** — бизнес-логику, формы, API-запросы, валидацию оставь как есть
2. **Замени только UI:** hardcoded цвета → CSS variables, холодные серые → тёплые Turan
3. Найди все `bg-slate-*`, `bg-gray-*`, `bg-zinc-*`, `text-slate-*` → замени на `bg-turan-*` или Tailwind classes с новыми HSL-переменными
4. Найди все `bg-blue-*` на кнопках → замени на `bg-primary` (теперь это коричневый CTA)
5. Найди все hardcoded `#` цвета в inline styles → замени на `var(--*)` 

**Порядок экранов:**
1. Layout (sidebar, header) — основа для всех страниц
2. Login / Registration — первое впечатление
3. Landing page — публичное лицо
4. F01, F02 (кабинет фермера) — основной flow
5. A01, A02 (админка) — внутренний
6. F10, F11 — специализированные

### Фаза 7 — Тёмная тема

Проверь что переключатель тем работает. В Turan:
- Dark = default (`:root`)
- Light = `[data-theme="light"]` или `.light`

Если проект использует `class="dark"` от Tailwind, добавь маппинг:
```css
.dark { /* уже :root — тёмная по умолчанию */ }
.light, :root:not(.dark) { /* light variables */ }
```

Или адаптируй под существующую логику переключения в проекте.

## Чеклист качества

После каждой фазы проверяй:

- [ ] `npm run build` проходит без ошибок
- [ ] Нет hardcoded цветов (#hex) в компонентах — только CSS variables или Tailwind classes
- [ ] CTA кнопки используют `--cta` / `--cta-fg` (коричневый/кремовый), НЕ синий
- [ ] Оранжевый `--accent` (#E8920B) НЕ появляется нигде кроме лого
- [ ] Light тема: фон тёплый бежевый (#f0ebe2), НЕ холодный белый (#ffffff)
- [ ] Dark тема: фон тёплый тёмный (#1a1612), НЕ холодный чёрный (#09090b)  
- [ ] Тени в light mode используют rgba(61,43,31,...) а не rgba(0,0,0,...)
- [ ] Навигация нейтральная — без брендового цвета на активном пункте
- [ ] Все формы работают как до миграции (валидация, submit, ошибки)
- [ ] i18n работает (переключение ru/kz/en)
- [ ] Supabase auth flow не сломан
- [ ] Sonner тосты используют Turan цвета
- [ ] Recharts графики используют `--chart-1..5` цвета

## Что НЕ менять

- Бизнес-логику (API запросы, RPC calls, валидацию, routing guards)
- Структуру данных и типы (Supabase types)
- i18n строки и конфиг
- React Query ключи и конфиг
- Form schemas (Zod)
- Файловую структуру (если нет необходимости)
- Тесты (если есть)

## Коммуникация

- После каждой фазы: покажи что изменилось (список файлов + diff summary)
- Если не уверен в подходе — спроси, не угадывай
- Если видишь конфликт между DS и существующей логикой — опиши, предложи решение
- При работе с экранами: сначала покажи что нашёл (текущее состояние), потом предложи план
