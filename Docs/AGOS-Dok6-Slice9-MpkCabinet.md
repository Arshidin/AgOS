# Dok 6 — Interface Contracts: Slice 9 "MPK Cabinet"

> Version: 1.0
> Date: 2026-05-13
> Author: Architect Agent
> Status: ✅ **APPROVED — Dok 6 Gate PASSED (2026-05-13)**
> CEO sign-off: 2026-05-13 (all 4 wireframes + 6 MPK-INV invariants + DB Phase 1 schema delta approved)
>
> **Scope:** 4 farmer-side screens (B01–B04) — MPK cabinet for managing pool requests and tracking pools.
> **User story:** Зарегистрированный MPK (org_type='mpk') заходит в кабинет → видит свои закупки → создаёт запрос на пул → следит за наполнением → получает контакты фермеров при `executing`.
>
> **Out of scope (deferred):**
> - B05 DeliveryRecord input (Q21 Dok 1 — MPK vs admin authorship — still open, separate ADR)
> - Migration of 43 legacy `registration_applications` (separate ADR — Q1/Q2/Q3 pending CEO)
> - Edit draft pool_request before activate (Phase 2 if needed after pilot feedback)

---

## CEO Decisions Resolved (2026-05-13)

| ID | Question | Resolution |
|----|----------|------------|
| Q-A | Cabinet routing — branch farmer vs MPK how? | **Separate layout `/cabinet/mpk/*`** — own RequireMpk guard, own sidebar, isolated component tree. Cabinet/index detects org_type and redirects MPK to /cabinet/mpk. |
| Q-B | B02 CreatePoolRequest scope | **Full UX wizard** — 5 steps: volume+timing → categories → premium capacity → preferences (target_weight, preferred_breeds) → review+notes. |
| Q-C | useMpkProfile.ts dead hook | **Delete.** D39 already fixes `accepted_categories` as JSONB on pool_requests — separate `mpk_profiles` table is not in the canonical model. |
| Q-D | Start order | **Dok 6 first**, then DB → UI phases. |

---

## Design System

MPK Cabinet uses the **Farmer cabinet warm palette** (same `:root` tokens as `/cabinet/*`) — MPKs are participants of the association just like farmers, not admins. Same design language. No neutral admin palette.

```css
:root {
  --bg, --bg-c, --bg-m  /* surface hierarchy */
  --fg, --fg2, --fg3    /* text */
  --bd, --bd-s, --bd-h  /* borders */
  --red, --green, --amber  /* status */
}
```

**Layout:** Mobile-first (MPK procurement managers use phones in field) — max-width 480px on phone, expand to 720px on tablet, 960px on desktop. Same `<AppLayout>` shell as farmer cabinet.

**Language:** Russian UI. All entity field labels in Russian (technical codes never shown).

---

## Navigation Structure

```
/cabinet                                  → CabinetIndex (redirects by org_type)
  ├─ org_type='farmer' → /cabinet/dashboard (existing F02 area)
  └─ org_type='mpk'    → /cabinet/mpk

/cabinet/mpk                              → B01 MpkDashboard
  ├─ /cabinet/mpk/pools                   → B03 MyPoolsList
  │   ├─ /cabinet/mpk/pools/new           → B02 CreatePoolRequest (wizard)
  │   └─ /cabinet/mpk/pools/:poolId       → B04 PoolDetail (MPK-view)
  └─ /cabinet/mpk/profile                 → Company profile (read-only mirror of organizations row; edit via admin for MVP)
```

**Route guards:**
- `RequireAuth` (existing) — must be logged in
- `RequireMpk` (NEW) — must have at least one membership row with `org_type='mpk'`. If not → redirect to `/cabinet` with toast «Этот раздел доступен только мясокомбинатам».

**Sidebar (MPK):**
1. Главная (B01)
2. Закупки (B03 + B02)
3. Профиль компании
4. Справочные цены (read-only, reuses PriceInfo)
5. Связаться с админом (mailto / WhatsApp link)

**NOT in MPK sidebar:** Стадо, Корма, Рацион, План, Vet — these are farmer-only modules and irrelevant for buyers (rendering them would violate UI semantics).

---

## DB Phase 1 — Schema additions (additive, P7)

### 1.1 Schema delta to `d02_tsp.sql`

```sql
-- Add preferences column to pool_requests (additive — default '{}')
alter table public.pool_requests
  add column if not exists preferences jsonb not null default '{}'::jsonb;

comment on column public.pool_requests.preferences is
  'Slice 9 B02: soft preferences from MPK wizard.
   Shape: { target_weight_kg_min: int|null, target_weight_kg_max: int|null,
            preferred_breeds: text[]|null, notes_for_admin: text|null,
            procurement_frequency: text|null }
   D39: accepted_categories holds HARD requirements (SKU + min/max heads);
        preferences holds SOFT preferences (advisory).';
```

### 1.2 RPC authorization extension (RPC-12 / RPC-13)

Both `rpc_create_pool_request` and `rpc_activate_pool_request` currently log `actor_type='admin'` in `platform_events`. After Slice 9 they accept calls from MPK org members as well.

**Authorization rule (added):**
```sql
-- before insert, in both RPCs:
if not (
  public.fn_is_admin()
  or exists (
    select 1
    from public.user_organization_roles uor
    join public.memberships m on m.organization_id = uor.organization_id
    where uor.user_id = public.fn_current_user_id()
      and uor.organization_id = p_organization_id
      and uor.role in ('owner', 'manager')
      and m.org_type = 'mpk'
  )
) then
  raise exception 'AUTH_NOT_MPK_OWNER' using errcode = 'P0001';
end if;
```

`actor_type` in platform_events becomes `case when fn_is_admin() then 'admin' else 'mpk' end`.

### 1.3 New RPCs (3)

| RPC | Purpose | Returns |
|-----|---------|---------|
| **RPC-Mpk-01** `rpc_get_my_pool_requests(p_organization_id, p_status_filter text[] default null)` | Denormalized list for B03 MyPoolsList. Joins `pool_requests` ← `pools` ← agg from `pool_matches`. Filters by RLS + organization_id. | `jsonb` array of `{request_id, pool_id, status, target_heads, matched_heads, target_month, region_name, created_at, filling_deadline, mpk_contact_revealed_at}` |
| **RPC-Mpk-02** `rpc_get_pool_detail_for_mpk(p_organization_id, p_pool_id)` | Denormalized detail for B04 PoolDetail. Returns pool + request + matches. If `pool.status >= 'executing'`, includes farmer contact info per match; otherwise contacts are stripped (D40). | `jsonb` `{request: {...}, pool: {...}, matches: [{batch_id, head_count, tsp_sku_code, farmer_org_name, farmer_phone, farmer_contact_person, region_name, status}]}` — `farmer_*` fields null when `mpk_contact_revealed_at` is null |
| **RPC-Mpk-03** `rpc_close_pool_request(p_organization_id, p_request_id, p_reason text)` | MPK self-closes own request. Allowed only from `draft` or `active` status. Cascades pool to `closed` if pool exists. Logs `market.pool_request.closed_by_mpk` event. | `jsonb` `{request_status, pool_status}` |

**Registry entries to add (`rpc_name_registry`):**
- `rpc_get_my_pool_requests` → d02_tsp.sql (RPC-Mpk-01)
- `rpc_get_pool_detail_for_mpk` → d02_tsp.sql (RPC-Mpk-02)
- `rpc_close_pool_request` → d02_tsp.sql (RPC-Mpk-03)

### 1.4 Out of scope for DB Phase 1

- `rpc_update_draft_pool_request` (edit before activate) — deferred. MVP: MPK deletes draft via close + creates fresh.
- Backend listener for `market.pool.executing` → notification to MPK (Dok 4 Event Bus already has `pool.matched` notification template; reuse if covers MPK case, else separate Dok 4 update).

---

## Screen B01 — MpkDashboard

**Route:** `/cabinet/mpk`
**Guard:** `RequireAuth` + `RequireMpk`
**Topbar:** `useSetTopbar({ title: 'Главная', titleIcon: <Factory size={15} /> })`

### User Story
MPK заходит в кабинет → видит сводку: сколько запросов открыто, сколько пулов в работе, сколько закрыто за последние 90 дней. Хочет быстро создать новый запрос — большая CTA «Создать закупку».

### Data Requirements
Single call: `rpc_get_my_pool_requests(organization_id, null)` — returns all. UI агрегирует на клиенте.

### Wireframe (mobile portrait)

```
┌─────────────────────────────────┐
│ Главная                      🏭 │  ← Topbar
├─────────────────────────────────┤
│                                 │
│ ИП «WestKaz Agro»               │  ← org name
│ Мясокомбинат                    │
│                                 │
│ ┌─────────┐ ┌─────────┐        │
│ │ Активн. │ │ В испол.│        │  ← 2-column KPI tiles
│ │   3     │ │   1     │        │
│ │ запроса │ │  пул    │        │
│ └─────────┘ └─────────┘        │
│ ┌─────────┐ ┌─────────┐        │
│ │ Завер.  │ │ Голов   │        │
│ │ за 90д  │ │ закуп.  │        │
│ │   5     │ │  1240   │        │
│ └─────────┘ └─────────┘        │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ + Создать новый запрос  →  │ │  ← Primary CTA
│ └─────────────────────────────┘ │
│                                 │
│ Последние пулы                  │
│ ┌─────────────────────────────┐ │
│ │ № PR-2026-04-12             │ │  ← 3 latest from list
│ │ 200 голов · апр 2026        │ │
│ │ ● Наполняется 156/200    🟡 │ │
│ └─────────────────────────────┘ │
│ ... (2 more)                    │
│                                 │
│ Все закупки →                  │  ← Link to B03
└─────────────────────────────────┘
```

### Components
- `<MpkKpiTile label, value, sublabel>` × 4
- `<CreatePoolRequestCTA />` — large rounded button, navigates to `/cabinet/mpk/pools/new`
- `<PoolListItem pool>` — same component reused on B03

### Empty state
If `rpc_get_my_pool_requests` returns 0 rows: show illustration + «Создайте первый запрос на закупку. AGOS подберёт партии от фермеров.» + CTA.

### Edge cases
- isContextLoading: Skeleton placeholders for 4 KPI tiles + 3 pool items
- Network error: toast «Не удалось загрузить данные» + retry button

---

## Screen B02 — CreatePoolRequest (Wizard)

**Route:** `/cabinet/mpk/pools/new`
**Guard:** `RequireAuth` + `RequireMpk`
**Topbar:** `useSetTopbar({ title: 'Новый запрос', titleIcon: <Plus size={15} /> })`

### User Story
MPK хочет купить N голов в конкретный месяц. Идёт через wizard, отвечает на вопросы → отправляет → запрос активируется (статус `active`) → авто-создаётся pool (D33).

### Wizard Steps (5)

#### Step 1 — Объём и сроки
- `total_heads` int input (min 50, max 5000 — validate client + RPC)
- `target_month` month picker (must be `>= current month + 1`, max `current + 12 months`)
- `region_id` select from `regions` (drives matching priority — see D34)

#### Step 2 — Категории скота (hard requirements)
- Multi-row SKU selector: для каждой строки `tsp_sku_id` + `min_heads` + `max_heads` + `priority` (1=high)
- ≥ 1 row required
- Sum of `min_heads` ≤ `total_heads`; sum of `max_heads` ≥ `total_heads`

UI: a list of cards, "+ Добавить категорию" button. Each row:
```
┌─────────────────────────────────┐
│ TSP-0012 · Бычок 12–24м, лёгкий │
│ Мин: [50]  Макс: [120]          │
│ Приоритет: ●●○ Высокий          │
│                            🗑    │
└─────────────────────────────────┘
```

This populates `accepted_categories` JSONB:
```json
[
  {"tsp_sku_id": "uuid", "min_heads": 50, "max_heads": 120, "priority": 1},
  ...
]
```

#### Step 3 — Премиум капасити (optional)
Three numeric inputs:
- `premium_bulls` int default 0
- `premium_heifers` int default 0
- `premium_cows` int default 0

Каждый ≥ 0. Hint: «Премиум — головы повышенного качества с надбавкой. Оставьте 0, если не требуется.»

#### Step 4 — Предпочтения (soft)
- `target_weight_kg_min` + `target_weight_kg_max` (optional pair, both or neither)
- `preferred_breeds` multi-select chip (read from `breeds` reference table — show only `breed_group in ('elite_meat','local')`)
- `procurement_frequency` chip select: `one-time | monthly | seasonal | annual`

Stored in `preferences` JSONB (see Phase 1 §1.1).

#### Step 5 — Заметки + Review
- `notes_for_admin` textarea (optional, max 500 chars) — stored in `preferences.notes_for_admin`
- Read-only summary of all previous steps
- "Отправить запрос" submit button
- Footer disclaimer: «Запрос — выражение намерения рассмотреть, не обязательство (ст. 171 ПК РК).»

### Submit Flow
On final submit (single transaction client-side: 2 sequential RPC calls):
1. `rpc_create_pool_request(...)` → returns `request_id`
2. `rpc_activate_pool_request(p_organization_id, request_id)` → returns `{request_id, pool_id}`
3. Navigate to `/cabinet/mpk/pools/:pool_id` (B04)

On error at step 2: keep request in `draft` state, show toast «Запрос сохранён как черновик», navigate to B03.

### Validation
- Server-side via RPC raises (`INVALID_TARGET_MONTH`, `INVALID_HEAD_COUNT`, `INVALID_CATEGORIES_JSON`)
- Client-side: each step validates before allowing "Далее"
- Wizard state persisted to `sessionStorage` (key `mpk_create_pool_form`) — same pattern as Registration

### Edge cases
- User reloads mid-wizard → restores from sessionStorage with confirmation toast
- User navigates away → "Сохранить как черновик?" prompt (creates request in `draft` without auto-activate)
- `accepted_categories` violates math (sum min > total) → inline error before "Далее"

---

## Screen B03 — MyPoolsList

**Route:** `/cabinet/mpk/pools`
**Guard:** `RequireAuth` + `RequireMpk`
**Topbar:** `useSetTopbar({ title: 'Мои закупки', titleIcon: <Package size={15} />, actions: <CreatePoolButton /> })`

### User Story
MPK хочет видеть все свои запросы и пулы в одном списке, фильтровать по статусу, переходить в детали.

### Data Requirements
- `rpc_get_my_pool_requests(organization_id, p_status_filter)` — supports `['draft','active','closed','expired']` filter array
- Tab bar at top: «Все» · «Активные» · «В исполнении» · «Завершённые»
  - Все: null filter
  - Активные: `['draft','active']` + pool.status='filling'
  - В исполнении: pool.status in ('filled','executing','dispatched','delivered')
  - Завершённые: pool.status in ('executed','closed') OR request.status='expired'

### Wireframe

```
┌─────────────────────────────────┐
│ Мои закупки      [+ Новый]   📦 │
├─────────────────────────────────┤
│ [Все][Активные][В исп.][Завер.] │  ← TabBar (Topbar tabs)
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ № PR-2026-04-12  ●Активный  │ │  ← pool row card
│ │ 200 голов · апр 2026         │ │
│ │ Карагандинская обл.          │ │
│ │ Наполнение: 156/200    78%   │ │
│ │ ──── progress bar ──         │ │
│ │ Срок: до 2026-04-30      →   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ № PR-2026-03-22  ●В исп.    │ │
│ │ 100 голов · мар 2026         │ │
│ │ ✓ Контакты раскрыты          │ │
│ │ 4 фермера, 100/100 голов  →  │ │
│ └─────────────────────────────┘ │
│ ...                             │
└─────────────────────────────────┘
```

### Components
- `<PoolListItem pool>` (also used on B01)
- `<StatusBadge status>` — colors: draft=fg3, active=amber, filling=amber, filled=green, executing=green, executed=fg3, closed=fg3, expired=red
- `<ProgressBar matched, target>` reused from Slice 4

### Empty state
Per-tab empty: «Здесь будут отображаться [запросы / пулы в исполнении / завершённые закупки]» + CTA «Создать новый запрос» if «Все» or «Активные» tab.

### Edge cases
- Pool with `matched_heads = 0`: progress = 0%, статус «Ожидает партий»
- Expired (`target_month` < сегодня + pool.status='filling'): show red badge «Истёк срок», disable click into detail (read-only B04)

---

## Screen B04 — PoolDetail (MPK-view)

**Route:** `/cabinet/mpk/pools/:poolId`
**Guard:** `RequireAuth` + `RequireMpk` + ownership check (RPC returns 404 if not own pool)
**Topbar:** `useSetTopbar({ title: 'Запрос на закупку', titleIcon: <Package size={15} /> })`

### User Story
MPK хочет видеть всё про свой пул: статус, насколько он наполнен, какие SKU подобраны, и — после `executing` — контакты фермеров для логистики.

### Data Requirements
Single call: `rpc_get_pool_detail_for_mpk(organization_id, poolId)`

Returns:
```typescript
{
  request: { id, total_heads, target_month, region_name, status, accepted_categories, preferences, premium_*, notes, ... },
  pool: { id, status, matched_heads, target_heads, filling_deadline, mpk_contact_revealed_at, ... },
  matches: Array<{
    batch_id, head_count, tsp_sku_code, tsp_sku_label, status,
    farmer_org_name?: string | null,        // null if mpk_contact_revealed_at is null
    farmer_phone?: string | null,
    farmer_contact_person?: string | null,
    region_name?: string | null,            // shown anonymously even before reveal
  }>
}
```

### Wireframe — pre-executing (D40: contacts hidden)

```
┌─────────────────────────────────┐
│ Запрос PR-2026-04-12        📦  │
├─────────────────────────────────┤
│ Статус: ●Наполняется             │
│ 156 / 200 голов  ──── 78%       │
│ Срок наполнения: до 2026-04-30  │
│                                 │
│ ⓘ Контакты фермеров будут       │  ← prominent D40 notice
│   раскрыты после подтверждения  │
│   администратором                │
│                                 │
│ Параметры запроса               │
│ ─────────────────────           │
│ Цель: 200 голов · Карагандинск. │
│ Месяц поставки: апрель 2026     │
│ Категории:                      │
│   • TSP-0012 50–120 голов · ⭐  │
│   • TSP-0015 30–80 голов        │
│ Премиум: 10 бычков              │
│ Породы: Казахская белоголовая   │
│                                 │
│ Подобранные партии (5)          │
│ ─────────────────────           │
│ ┌─────────────────────────────┐ │
│ │ Партия №1                    │ │
│ │ TSP-0012 · 45 голов          │ │
│ │ Регион: Карагандинская обл.  │ │
│ │ Фермер: ●●●●●●●  (скрыт)     │ │
│ └─────────────────────────────┘ │
│ ... (4 more)                   │
│                                 │
│ [Закрыть запрос]   ← if active  │
│                                 │
│ Антитраст-дисклеймер ст. 171… │  ← footer
└─────────────────────────────────┘
```

### Wireframe — after executing (D40: contacts revealed)

```
│ Статус: ●В исполнении            │
│ ✓ Контакты раскрыты 2026-04-18  │
│                                 │
│ Партии (5)                      │
│ ┌─────────────────────────────┐ │
│ │ Партия №1                    │ │
│ │ TSP-0012 · 45 голов          │ │
│ │ КХ «Беркут», Караганда       │ │  ← farmer_org_name visible
│ │ ☎ +7 (777) 123-45-67  📱 WA │ │  ← farmer_phone visible
│ │ Аскар Кенжебеков             │ │  ← contact person
│ └─────────────────────────────┘ │
```

### Components
- `<PoolStatusHeader pool>` with progress bar + deadline
- `<RequestParamsCard request>` showing read-only summary
- `<MatchedBatchCard match, isRevealed>` — conditionally renders contact info
- `<ContactRevealedBanner mpk_contact_revealed_at>` — green pill «✓ Контакты раскрыты [date]»
- `<CloseRequestDialog>` — confirmation prompt before calling `rpc_close_pool_request`
- `<AntitrustFooter />` — reuses existing component from F09

### Actions available to MPK
| Status | Allowed action | RPC |
|--------|---------------|-----|
| `draft` | Activate (manual) | `rpc_activate_pool_request` — but normally auto-called on B02 submit |
| `draft`, `active` (pool filling) | Close request | `rpc_close_pool_request` |
| `active` (pool filled/executing/dispatched/...) | None (admin-driven FSM) | — |

### Edge cases
- Pool not owned by MPK org → RPC returns 404 → page shows «Запрос не найден» + back link
- `matched_heads = 0` and `filling_deadline` passed → show red banner «Пул не наполнен — обратитесь к админу»
- Reveal happened mid-session: realtime subscription to `pools` row by `pool_id` (`postgres_changes` channel) — auto-refreshes on `mpk_contact_revealed_at` update (Slice 4 pattern)

### Legal invariants (must be tested in QA)
- **D40:** При `mpk_contact_revealed_at IS NULL`, никакое поле `farmer_org_name / farmer_phone / farmer_contact_person` НЕ должно быть в DOM (тест: `expect(getByText(/farmer_phone/)).toBeNull()`).
- **Article 171:** На любом view с ценами антитраст-дисклеймер виден без скролла (или sticky footer).
- **RLS:** MPK A открывает URL `/cabinet/mpk/pools/<pool_of_MPK_B>` → 404, не 200.

---

## Invariants & Compliance

### MPK Cabinet invariants (must hold across all 4 screens)

| ID | Invariant | Verification |
|----|-----------|--------------|
| MPK-INV-1 | MPK видит только свои pool_requests/pools (RLS + RPC ownership check) | E2E test: 2 MPK orgs, A не видит данных B |
| MPK-INV-2 | Контакты фермеров появляются ТОЛЬКО при `pools.mpk_contact_revealed_at IS NOT NULL` | RPC test: returns null contacts pre-executing |
| MPK-INV-3 | Антитраст-дисклеймер виден на B04 (содержит цены/SKU) | UI test: getByText match |
| MPK-INV-4 | Создание pool_request возможно только для org_type='mpk' с ролью owner/manager | RPC test: farmer attempts call → AUTH_NOT_MPK_OWNER |
| MPK-INV-5 | `total_heads` и `accepted_categories` math непротиворечивы (sum min ≤ total ≤ sum max) | RPC validation in create |
| MPK-INV-6 | sidebar НЕ показывает farmer-only пункты (Стадо, Корм, Рацион, План, Vet) | UI test on /cabinet/mpk |

### Dual-membership case (D1: один org = farmer + mpk)
Один user может иметь membership и farmer, и MPK на той же org. UX:
- Sidebar показывает разделитель «Как фермер» / «Как мясокомбинат» с двумя navigation секциями
- Все RPC принимают `p_organization_id` — user сам выбирает контекст
- **Не в scope Slice 9** — обработать вертикалью: сейчас если org_type both, по умолчанию идёт в farmer view, MPK раздел доступен через ручной URL `/cabinet/mpk`. Sidebar dual-mode — отдельный sub-slice 9.5 if needed.

---

## Out of scope (deferred to later slices)

| Item | Reason | Owner |
|------|--------|-------|
| B05 DeliveryRecord input | Q21 Dok 1 still open (MPK vs admin authorship) | Architect (next ADR) |
| Migration of 43 legacy `registration_applications` | Q1/Q2/Q3 still pending CEO | Architect + DB Agent |
| Edit draft pool_request | Pilot first; MPK can close+recreate for MVP | Backlog |
| Push notifications (mobile) when pool fills | Dok 4 has `pool.matched` event; reuse existing notification_worker | Backend (post-Slice 9 if needed) |
| MPK-side document upload (DPA, NDA) | Not in any Dok 1 entity; new entity required | Backlog |
| Multi-MPK comparison view (admin tool) | Admin scope, not MPK cabinet | Slice 10 if needed |

---

## Acceptance criteria (Dok 6 Gate) — ✅ PASSED 2026-05-13

- [x] CEO signs off this Dok 6 file
- [x] All 4 wireframes match CEO's expectations
- [x] All 6 MPK-INV invariants explicitly understood and agreed
- [x] Phase 1 DB schema delta (preferences column + 3 RPCs + auth extension) approved
- [x] No conflict with D39 / D40 / Q21 / D1

**Status:** DB Agent is unblocked for Phase 1 implementation. UI Agent may start Phase 2 (routing + layout) in parallel — Phase 3 (screens) waits for Phase 1 RPC delivery.

---

## File deliverables (when Slice 9 ships)

| Phase | Owner | Files (planned) |
|-------|-------|-----------------|
| Phase 1 — DB | DB Agent | `d02_tsp.sql` (delta), `rpc_name_registry` updates, `cross_check.sh` whitelist if needed |
| Phase 2 — Layout | UI Agent | `src/components/guards/RequireMpk.tsx`, `src/components/layout/MpkSidebar.tsx`, `src/pages/cabinet/MpkLayout.tsx`, route changes in `src/App.tsx`. **Delete** `src/hooks/cabinet/useMpkProfile.ts`. |
| Phase 3 — Screens | UI Agent | `src/pages/cabinet/mpk/MpkDashboard.tsx` (B01), `src/pages/cabinet/mpk/CreatePoolRequest.tsx` + 5 step components (B02), `src/pages/cabinet/mpk/MyPoolsList.tsx` (B03), `src/pages/cabinet/mpk/PoolDetail.tsx` (B04) |
| Phase 4 — QA | QA Agent | RLS tests, D40 invariant tests, Article 171 disclaimer presence test, RPC auth tests |
| Phase 5 — Sign-off | Architect | DECISIONS_LOG `D-GATE-S9`, SPRINT_STATUS update, Dok 6 v1.0 → v1.1 if amendments |

---

## Open architectural notes (for Architect log)

1. **D1 dual-membership UX** is deferred — current MVP assumes 1 org = 1 role. Pilot real data will tell if dual-role is actually requested.
2. **Reveal timing:** MPK currently learns of `mpk_contact_revealed_at` via realtime subscription. If realtime is unreliable, fallback = polling every 30s on B04. Decide during Phase 3 implementation.
3. **Notification on pool fill:** event `pool.matched` exists (Dok 4). Need to verify the notification template targets MPK org_type. If not — separate Dok 4 update before Phase 4.
4. **Dok 1 update:** post-Slice 9, append to D40 comment: «MPK sees contacts via `rpc_get_pool_detail_for_mpk` only after `mpk_contact_revealed_at IS NOT NULL`.»

---

**END OF DOK 6 SLICE 9 (DRAFT v1.0)**
