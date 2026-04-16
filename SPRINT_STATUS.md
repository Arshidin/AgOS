# SPRINT STATUS — AgOS

> Maintained by: Architect (planning/sign-off), DB Agent (after SQL), Backend Agent (after code), UI Agent (after UI)
> Last updated: 2026-04-16

---

## Current Phase: TAXONOMY slice — FULLY CLOSED (2026-04-16). All post-tasks done. TAXONOMY_RPC_READ=true. Realtime wired. Next: Slice 4 proactive dispatch.

### TAXONOMY slice — Animal Ontology (ADR-ANIMAL-01)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| ADR | ADR-ANIMAL-01 in DECISIONS_LOG + Dok 1 | ✅ Approved (2026-04-15) | 4-layer architecture (L1 canonical / L2 projections / L3 operational / L4 external), 7 invariants I1–I7, 4 lifecycle types, propagation ≤60s |
| DB | M1: ALTER animal_categories + seed 6 axes (d01) | ✅ Done | purpose / physiological_state / age_band / status / deprecated_at / replaced_by_codes — 12 codes seeded |
| DB | M2: animal_category_mappings + L2 seeds (d01) | ✅ Done | feeding_group (10+2), cfc_group (11+1, valid_to=2026-12-31), turnover_key (12+2), market_sex (9), market_age_group (6). EXCLUDE gist on daterange. |
| QA | Gate audit post-M3a | ⚠️ FAIL → ✅ Fixed | 2 CRIT + 1 SIG found (non-deterministic resolve, RLS tautology, OX/MIXED unmapped). See M5 remediation. |
| DB | M5: QA remediation (is_primary, RLS fix, OX/MIXED seeds) | ✅ Done | Added `is_primary boolean` + unique partial index; backfilled primaries; fixed ecm_read; seeded 5 L2 rows for OX/MIXED. |
| DB | M3a: 6 RPCs + RLS + audit trigger (d01) | ✅ Done | rpc_list_animal_categories(date,bool), rpc_resolve_category, rpc_get_category_mappings, rpc_add/deprecate/migrate_animal_category |
| DB | M4: external_category_mappings (d01) | ✅ Done | L4 bridge: global + org-scoped mappings with 2 partial unique indexes |
| DB | DEF-TAXONOMY-01: duplicate rpc_list_animal_categories | ✅ Resolved (option D) | d01 canonical temporal overload + d03 legacy no-arg wrapper. @deprecated after M3c. Whitelist in cross_check.sh. |
| DB | cross_check.sh | ✅ 0 / 0 / 0 | 2 new whitelist entries documented |
| QA | Snapshot gate: rpc_get_category_mappings parity | ✅ PASSED (2026-04-16) | 3/3 tests: parity + I8 primary + cache invalidation. OX/MIXED gap found→fixed in CATEGORY_CODE_TO_HERD. |
| Backend | M3b: taxonomy_cache.py + test_taxonomy_snapshot.py | ✅ Done | consulting_engine: `taxonomy_rpc_read` flag + TaxonomyCache (read-through rpc_get_category_mappings/turnover_key). |
| Backend | M3b: ai_gateway/taxonomy.py wiring | ✅ Done | get_l1_codes() enum in vet tool schema; is_valid_l1_code() in extraction/rules.py; handle_platform_event() skeleton in notification_worker.py. |
| UI | M3c: SimpleRationEditor + herdCategoryMapping.ts → RPC | ✅ Done | `useAnimalCategoryMappings` hook (staleTime=60s). `useCategoryToHerd()` + `rationGroups` from feeding_group taxonomy. Static fallbacks preserved (HS-5). `useInvalidateTaxonomyCache()` ready for Realtime wiring (Slice 4). |
| Architect | Dok 3 update: add 6 RPCs to catalog | ✅ Done (2026-04-15) | RPC-T1..T6 in §1.8/§9b (lines 138-144, 569-592) |
| Architect | Dok 4 update: event `standards.animal_category.updated` | ✅ Done (2026-04-15) | Dok 4 §3.9 line 390 |
| Cleanup | TAXONOMY-CFC-DEPRECATE: remove Python CFC after valid_to (2026-12-31) | 🕒 Scheduled | 11 L2 rows auto-expire; Python code removal after |
| QA | Post-tasks audit (Realtime + flag flip) | ✅ PASSED (2026-04-16) | SIG-TAXONOMY-01 found+fixed (cd56ad8). MIN-TAXONOMY-01 accepted. cross_check 0/0/0. |

**DB Gate: ✅ PASSED** (2026-04-15) — cross_check 0/0/0 после M5 remediation.
**QA Gate: ✅ PASSED** (2026-04-15) — 2 CRIT + 1 SIG + 1 MINOR закрыты (commit `87db44b`).
**QA Post-tasks Gate: ✅ PASSED** (2026-04-16) — SIG-TAXONOMY-01 fixed. 0 critical / 0 significant. MIN-TAXONOMY-01 accepted.
**Architect sign-off: ✅** (2026-04-16) — TAXONOMY slice fully closed. No unresolved findings. Next: Backend Agent → proactive dispatch.

**TAXONOMY slice FULLY CLOSED (M1–M5 + M3b + M3c + all post-tasks).** Full propagation path: DB seeds → rpc_get_category_mappings → Python TaxonomyCache (consulting_engine) + ai_gateway L1 enum + React useAnimalCategoryMappings (UI). Feature flag `TAXONOMY_RPC_READ=true` (both services). Supabase Realtime wired in AppLayout.tsx.

**Remaining scheduled items:**
- TAXONOMY-CFC-DEPRECATE (2026-12-31): remove Python CFC path after cfc_group valid_to expires. Checklist in DECISIONS_LOG.md (2026-04-16 entry).

**Next sprint:** Slice 4 proactive dispatch — `handle_platform_event()` polling loop + embedding_worker.

---

## Previous Phase: Slice 9 post-gate — UI редизайн Consulting завершён. DEF-031 исправлен. QA: 0 critical.

### Slice 0 — Foundation

| Step | Action | Status | Gate |
|------|--------|--------|------|
| 1 | `git init`, initial commit | ✅ Done (688527a) | Repo exists |
| 2 | Create Supabase project (prod + staging) | ✅ Exists (`mwtbozflyldcadypherr`, Mumbai) | Project URL + anon key |
| 3 | Set env vars | ✅ `.env` created (Supabase keys set) | All vars in `.env` |
| 4 | Deploy SQL: d01→d02→d03→d04→d05→d07→d08 | ✅ Already deployed (94 tables, 22 rpc_* functions) | No FK errors |
| 5 | QA Agent: create `cross_check.sh` | ✅ Created | Script exists |
| 6 | Run `cross_check.sh` → 0 critical errors | ✅ **PASSED** (0 critical, 10 significant) | **DB GATE** |

**DB Gate: ✅ PASSED** (2026-03-18)

---

### Slice 1 — "У телёнка температура" (Sick Calf)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | F01, F02, F10, F11 | ✅ APPROVED | `Docs/AGOS-Dok6-Slice1-SickCalf.md` v2.0 — all 7 questions resolved. Dok 6 Gate PASSED. |
| DB | RPC-01 `rpc_register_organization` (d01) | ✅ Implemented | 4 org_types, p_role_data jsonb, atomic create. ⚠️ DEF-012 org_type CHECK |
| DB | RPC-02 `rpc_submit_membership_application` (d01) | ✅ Implemented | PENDING_EXISTS + ALREADY_ACTIVE checks |
| DB | RPC-04 `rpc_get_my_context` (d01) | ✅ Implemented | Stable read: orgs, farms, memberships, restrictions |
| DB | RPC-05/05b `rpc_upsert_farm` / `rpc_set_farm_activity_types` (d01) | ✅ Implemented | Upsert + delta activity types |
| DB | RPC-40 `rpc_start_ai_conversation` (d01) | ✅ Implemented | 24h session reuse (D64) |
| DB | RPC-26 `rpc_add_vet_diagnosis` (d04) | ✅ Implemented | Added to d04_vet.sql + rpc_name_registry |
| DB | RPC-27 `rpc_add_vet_recommendation` (d04) | ✅ Implemented | Added to d04_vet.sql + rpc_name_registry. D98 health_restriction via trigger. |
| DB | `rpc_get_vet_case_detail` (d04) | ✅ Implemented | D-F11-1: New RPC for F11 screen. Full case detail in one call. |
| Backend | FastAPI `/chat` webhook | ✅ Implemented | P-AI-8: save msg first → graph.invoke() → response |
| Backend | LangGraph graph | ✅ Implemented | D116 stateless, D117 one-run. 6 nodes: load_context→route→process→tools→compliance→save |
| Backend | Vet tools AI-07..10 | ✅ Implemented | `ai_gateway/tools/vet.py` — all 4 tools via supabase.rpc() |
| Backend | Compliance filter (P-AI-4) | ✅ Implemented | `ai_gateway/compliance.py` — dosage regex + antitrust + legal |
| Backend | ⚠️ DEF-013: 3x .table() in nodes.py | 🟡 Known | ai_conversations direct read/write — needs RPCs (rpc_update_confirmation, rpc_sync_conversation_role) |
| UI | F01 (Register), F02 (Farm Profile) | ✅ Implemented | 8-step conversational registration (4 roles), farm profile with herd groups |
| UI | F10 (Report Sick), F11 (Vet Case Detail) | ✅ Implemented | Vet case creation (severity=null, CEO decision), realtime detail view, P-AI-4 dosage compliance |
| QA | Slice 1 gate | ✅ **PASSED** (2026-03-19) | 0 critical, 0 significant in scope. DEF-013 accepted tech debt. cross_check.sh fixed (DEF-014/015). |

Already implemented: RPC-25 (`rpc_create_vet_case`), AI-01..AI-22.

### Slice 2 — Членство (Membership)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | A01, A02 | ✅ APPROVED | `Docs/AGOS-Dok6-Slice2-Membership.md` v1.0 — 3 CEO decisions resolved |
| DB | `rpc_get_membership_queue` (NEW, dual-mode) | ✅ Implemented | Admin read: list + detail. fn_is_admin() guard. Joins orgs+memberships+farms+herd_groups. |
| DB | RPC-03 `rpc_process_membership_application` (d01) | ✅ Implemented | FSM: submitted/under_review→approved/rejected. Notifications (WA+in_app). Events emitted. |
| Backend | WhatsApp notification sender (minimal worker) | ✅ Implemented | `ai_gateway/notification_worker.py` + `/notifications/process` endpoint. Claims via SKIP LOCKED, sends WA Cloud API, marks sent/failed via RPCs. |
| UI | A01 (Membership Queue), A02 (Decision) | ✅ Implemented | Admin palette, `fn_is_admin()` guard, RequireAdmin, confirmation dialog, WA notification mention. TypeScript clean. |
| QA | Slice 2 gate | ✅ **PASSED** (2026-03-19) | 0 critical, 0 significant in scope. fn_is_admin() verified SQL+UI. DEF-016 minor accepted. |

### Slice 3 — "Сколько корма нужно?" (Feed Planning)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | F03, F04, F15–F18 | ✅ APPROVED | `Docs/AGOS-Dok6-Slice3-Feed.md` v1.0 — 4 CEO decisions. F18 dual-view: per-head + total. |
| DB | RPC-07 (d01) + RPC-08 (d01) + RPC-21..24 (d03) | ⬜ Not started | 6 RPCs to implement |
| Backend | AI-03 feed tool + calculate_ration + get_feed_budget Edge Functions | ⬜ Not started | |
| UI | F03, F04, F15–F18 | ⬜ Not started | 6 screens |
| QA | Slice 3 gate | ⬜ Not started | |

Already implemented: RPC-06 (`rpc_upsert_herd_group`).

### Slice 4 — "Мой план на сезон" (Operations)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | F19–F23 | ⬜ Not started | |
| DB | RPC-37, 43..45 (d05) | ⬜ Not started | |
| Backend | proactive dispatch + embedding + platform_events polling | ✅ Done (a06e0de) | /proactive/dispatch ✅ (main.py). embedding_worker.py ✅. poll_platform_events() ✅. |
| UI | F19–F23 | ⬜ Not started | 5 screens |
| QA | Slice 4 gate | ⬜ Not started | |

Already implemented: RPC-33..36.

### Slice 5a — Market Farmer (F05–F09) — ✅ Gate PASSED (2026-04-01)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | F05–F09 | ✅ APPROVED | `Docs/AGOS-Dok6-Slice5a-Market-Farmer.md` |
| DB | RPC-11, RPC-17, RPC-18 (d02) | ✅ Implemented | rpc_cancel_batch, rpc_get_price_for_sku, rpc_get_market_summary |
| Backend | AI-16..21 market tools + disclaimer | ✅ Implemented | D-LEGAL-1: built without legal gate |
| UI | F05–F09 (farmer market: dashboard, batch, prices) | ✅ Implemented | Antitrust disclaimer in all price views |
| QA | Slice 5a gate | ✅ **PASSED** (2026-04-01) | D-GATE-S5a |

### Slice 5b — Market Admin (A11–A15) — 🔧 UI fixes applied, pending QA

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | A11–A15 | ✅ APPROVED | `Docs/AGOS-Dok6-Slice5b-Market-Admin.md` |
| DB | RPC-12..16, 19, 20 (d02) | ✅ Implemented | All 7 RPCs in d02_tsp.sql + registry. DEF-026 fixed (2026-04-01) |
| Backend | — | ✅ n/a | No new AI tools for admin screens |
| UI | A11 (PoolQueue), A12-A14 (PoolDetail), A15 (PriceGridManagement) | 🔧 Fixed | DEF-021..024 resolved by UI Agent (2026-04-01) |
| QA | Slice 5b gate | ⬜ Pending | Awaiting QA gate |

✅ DEF-026 (Fixed 2026-04-01): RPC-20 `rpc_publish_price_index_value` — corrected INSERT column names (`price_index_id` → `index_id`, `avg_price_per_kg` → `value_per_kg`), added required `data_source='expert_assessment'`, `published_by`, `published_at`.

Already implemented: RPC-09, RPC-10.

### Slice 6 — Эксперт-консоль (Expert)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | M01–M06, A03–A10 | ⬜ Not started | |
| DB | RPC-28..32 (d04) | ⬜ Not started | |
| Backend | Remaining vet/ops wiring | ⬜ Not started | |
| UI | M01–M06, A03–A10 | ⬜ Not started | 14 screens |
| QA | Slice 6 gate | ⬜ Not started | |

### Slice 7 — Образование (Education)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | F24–F28, A16–A19 | ⬜ Not started | |
| DB | RPC-38, 39, 42, 44 (d05) | ⬜ Not started | |
| Backend | Education tools, E2E smoke test | ⬜ Not started | |
| UI | F24–F28, A16–A19 | ⬜ Not started | 9 screens |
| QA | Slice 7 gate | ⬜ Not started | |

### Slice 8 — Унификация Рационов и Консалтинга

> **Решение:** D-S8-1 (2026-04-09) · **Архитектура:** Dok 7 v1.0

#### Часть A — Feed Справочник (самодостаточная)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| DB | `feed_consumption_norms` table in d03_feed.sql | ✅ Done | + RLS, index. DEF-027 fixed (rpc_list_feed_items + rpc_list_animal_categories created). |
| DB | `rpc_list_feed_items` (RPC-F01), `rpc_list_animal_categories` (RPC-F02) | ✅ Done | Created in d03_feed.sql. Fixes DEF-027. |
| DB | `rpc_upsert_feed_item` (RPC-F03), `rpc_upsert_feed_price` (RPC-F04), `rpc_upsert_feed_consumption_norm` (RPC-F05) | ✅ Done | Admin write RPCs in d03_feed.sql |
| DB | `rpc_list_feed_categories` (RPC-F06), `rpc_list_feed_consumption_norms` (RPC-F07) | ✅ Done | Read RPCs for FeedReferenceAdmin UI in d03_feed.sql |
| DB | d09_consulting.sql: убрать `feed_prices`/`feed_norms` из CHECK | ✅ Done | ADR-FEED-01. Аддитивное изменение. |
| UI | `/admin/feeds` — `FeedReferenceAdmin.tsx` | ✅ Done | 3 tabs: Каталог / Цены / Нормы. CRUD + dialogs. Sidebar entry added. |
| QA | Часть A gate | ⬜ Pending QA | |

#### Часть B — NASEM Calculator (самодостаточная)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Backend | `calculate-ration` Edge Function: `farm_id` optional, `consulting_project_id` support | ✅ Done | D-S8-3. Backward compatible. Dual-context save logic. |
| QA | Часть B gate | ⬜ Pending QA | |

#### Часть C — Ration Builder in Consulting (зависит от B)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| DB | `ration_versions`: ration_id → NULLABLE + consulting_project_id + context_animal_category_id + CHECK | ✅ Done | D-S8-4. Миграция в d03_feed.sql. RLS rv_read_own обновлён. |
| DB | `rpc_save_consulting_ration` (C-RPC-09), `rpc_get_consulting_rations` (C-RPC-10) | ✅ Done | В d09_consulting.sql. rpc_name_registry записи добавлены. |
| UI | `RationTab.tsx` в `/admin/consulting/:id/ration` | ✅ Done | Per-category NASEM calculator, CalcDialog, feed multi-select. |
| UI | `ProjectPage.tsx`: + 8-й таб "Рационы" | ✅ Done | Добавлен в TABS array. |
| UI | `App.tsx`: route `/admin/consulting/:id/ration` | ✅ Done | Import + Route добавлены. |
| QA | Часть C gate | ⬜ Pending QA | |

#### Часть D — Финансовая интеграция (зависит от A + C)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Backend | `calculate.py`: `_load_feed_reference()` — feed_prices_d03, feed_consumption_norms, consulting_rations | ✅ Done | Supabase REST + rpc_get_consulting_rations. extra_refs kwarg added to run_calculation. |
| Backend | `feeding_model.py`: fallback chain Priority 1→2→3. `_calc_from_consulting_rations()`, `_calc_from_norms()` | ✅ Done | D-S8-2. Hardcoded defaults remain as Priority 3. `_source` key added to output. |
| QA | Часть D gate | ⬜ Pending QA | |

**Slice 8 Gate: ✅ PASSED (2026-04-09)** — D-GATE-S8

> **DEF-027** (Fixed 2026-04-09): `rpc_list_feed_items` and `rpc_list_animal_categories` called from `Calculator.tsx` and `RationTab.tsx` but did not exist in any SQL file. Created in d03_feed.sql as RPC-F01 and RPC-F02.

---

### Slice 9 — Expert Scenario Enhancement (Consulting Engine v2)

> **Reference:** Архитектурный анализ ZENGI_EXPERT_SCENARIO_v1.1 · **Plan:** swirling-waddling-catmull.md · **Completed:** 2026-04-09

Scope: стратегия реализации бычков (GAP-1 КРИТИЧНО), простой редактор рационов, физические объёмы кормов, годовая сводка кормовой потребности. Все изменения backward-compatible.

| Task | Layer | Component | Status | Notes |
|------|-------|-----------|--------|-------|
| A | UI | `ProjectWizard.tsx`: подсказки min/max для привесов | ✅ Done | hint prop в WizardField. Диапазоны: 0.70–1.10 кг/день бычки, 0.60–1.00 тёлки. |
| B | UI | `ProjectWizard.tsx`: клиентский калькулятор веса реализации | ✅ Done | `estimateSaleWeight()`. Live preview "~XXX кг" прямо в wizard step 3. |
| C | DB+BE | `d09_consulting.sql`: `'economic_parameters'` в CHECK + seed row | ✅ Done | Migration applied (2026-04-09). feed_inflation = 0.105. |
| C | BE | `feeding_model.py`: читать `FEED_INFLATION` из `refs["economic_parameters"]` | ✅ Done | `FEED_INFLATION_DEFAULT = 0.105`. Fallback на константу. |
| D | BE | `schemas.py`: `steer_sale_age_months: int` (0/7/12/18) | ✅ Done | `Field(default=0, ge=0, le=24)`. Backward-compatible default=0. |
| D | BE | `herd_turnover.py`: когортный трекинг бычков → продажа по возрасту | ✅ Done | `steer_cohorts: list[list]`. Legacy December sale при default=0. Mortaliy + bull transfer по когортам. |
| D | UI | `ProjectWizard.tsx`: select стратегии бычков (В декабре / 7 / 12 / 18 мес.) | ✅ Done | `STEER_SALE_OPTIONS`. Step 3 + Step 6 confirmation. |
| E | UI | `SimpleRationEditor.tsx`: табличный ввод рционов (5 групп × корма × сезон) | ✅ Done | Новый компонент. DEFAULT_RATIONS = CFC Excel defaults. Save → `rpc_save_consulting_ration`. |
| E | UI | `RationTab.tsx`: toggle "Простой" / "NASEM" | ✅ Done | `mode` state. SimpleRationEditor рендерится при mode='simple'. |
| F | BE | `feeding_model.py`: физические объёмы кормов (тонны) в output | ✅ Done | `_calc_group()` → `tuple[costs, quantities]`. `quantities.by_group`, `quantities.totals_by_feed`. |
| I | UI | `SummaryTab.tsx`: таблица "Кормовая потребность по годам, тн" | ✅ Done | Читает `results.feeding.annual_feed_summary`. Рендерит условно (прогрессивный). |

**Downstream impact (Task D):** `weight_model.py`, `revenue.py`, `feeding_model.py` адаптируются автоматически — читают обновлённые `steers_sold[]` / `steers_avg[]` массивы из herd_turnover.

**Slice 9 Gate: ✅ PASSED (2026-04-09)** — D-GATE-S9  
0 TS errors (`npx tsc --noEmit`). Dev server: 0 errors. Migration applied. Backward compat verified (steer_sale_age_months=0 → идентичный legacy output).

#### Post-gate fixes (2026-04-10)

| Commit | Fix | Notes |
|--------|-----|-------|
| `e534361` | `fattening_enabled/fattening_months` удалены из wizard — дериватируются из `steer_sale_age_months` | D-S9-5. tech_card.py консистентен с herd_turnover.py. |
| `d7bce9e` | `opex.feed_cost` отдельный массив; "Расходы на корма" строка в PnlTab; `annual_feed_cost_summary` во всех 3 путях движка | D-S9-6. |
| `81699aa` | SummaryTab: детальные таблицы кормов по группам (тыс. тг + тн) вместо одной строки итого | D-S9-7. |
| `e024ac4` | **DEF-028**: SimpleRationEditor передавал `p_animal_category_code` (строку) вместо `p_animal_category_id` (UUID) | Critical bug fix. Сохранение рационов теперь работает. |

#### Post-gate fixes (2026-04-11)

| Commit | Fix | Notes |
|--------|-----|-------|
| `5a3f6d9` | **UI**: Параметры page первый редизайн — двухколоночный layout (1fr + 260px), inline param inputs | Первый вариант отклонён пользователем |
| `0405cc0` | **UI**: Параметры page второй редизайн — карточные секции, hero IRR 28px, CoeffRow с растяжными барами, empty state правой панели | D-PARAMS-1. Принят. |
| `0d10389` | **QA infra**: cross_check.sh CHECK 1 — фикс BSD sed `\s+` → `[[:space:]]+`; whitelist fn_is_admin/fn_is_expert/fn_my_org_ids | DEF-029. Ранее cross-file дубли не детектировались на macOS |
| `e5a17c5` | **UX**: skeleton shimmer + tab fade animation (key={pathname}) + Loader2 на кнопке Рассчитать | D-UX-1. Вводит 3 бага — см. ниже. |
| `f46c425` | **fix**: blank header title (nameLoading бесконечный) + blank Тех.карта (tab-content height:100%) + skeleton shimmer контраст | DEF-032..034 |
| `04f2ab5` | **fix(ts)**: PromiseLike не имеет .catch() → обработка error через деструктуризацию в .then() | DEF-035. Build error на Vercel. |
| `eaa6b42` | **fix(ux)**: skeleton во всех 7 вкладках — h-48 w-full → table-like rows с .page padding; убран titleLoading из хедера | DEF-036 |
| `d05ae0b` | **fix(ts)**: удалён неиспользуемый nameLoading state — TS6133 build error | DEF-037. Последний build fix. |

**Build status: ✅ PASSING** (d05ae0b — все TS ошибки устранены)

#### Post-gate UI redesign (2026-04-12)

| Commit | Change | Notes |
|--------|--------|-------|
| — | **UI**: ConsultingDashboard → Attio-style grid table (3-level header, grid rows, footer) | D-UI-CONSULTING-01 |
| — | **UI**: ProjectPage → 3-row header (nav / title / tabs) via `headerContent` TopbarConfig extension | D-LAYOUT-01 |
| — | **Layout**: TopbarContext + Header.tsx + AppLayout.tsx — `headerContent?: ReactNode`, dynamic `gridTemplateRows` | D-LAYOUT-01 |
| — | **QA**: cross_check.sh → 0 critical. tsc --noEmit → 0 errors. All useSetTopbar callers regression-free | QA PASS |

#### ⚠️ Открытые дефекты

| DEF | Severity | Finding | File | Action needed |
|-----|----------|---------|------|---------------|
| DEF-031 | Significant | ~~`rpc_list_feed_prices` не зарегистрирована в `rpc_name_registry`~~ | `d03_feed.sql:2029` | ✅ **Fixed** (DB Agent 2026-04-12): INSERT добавлен в Slice 8 registry block d03_feed.sql |

---

## SQL Files — Implementation Inventory

### Already Implemented (confirmed in SQL)

**AI Gateway RPCs (d07_ai_gateway.sql) — 22 functions:**

| AI-ID | Function | Status |
|-------|----------|--------|
| AI-01 | `rpc_get_ai_farm_context` | ✅ (2 defs — DEF-001) |
| AI-02 | `rpc_upsert_herd_group` | ✅ (2 defs — DEF-002) |
| AI-03 | `rpc_get_feeding_plan` | ✅ |
| AI-04 | `rpc_get_farm_tasks` | ✅ |
| AI-05 | `rpc_complete_farm_task` | ✅ |
| AI-06 | `rpc_get_production_plan` | ✅ |
| AI-07 | `rpc_create_vet_case` | ✅ |
| AI-08 | `rpc_add_vet_symptoms` | ✅ |
| AI-09 | `rpc_get_vet_diagnosis` | ✅ |
| AI-10 | `rpc_get_treatment_protocols` | ✅ |
| AI-11 | `rpc_get_vaccination_schedule` | ✅ |
| AI-12 | `rpc_complete_vaccination_item` | ✅ |
| AI-13 | `rpc_create_consultation_request` | ✅ |
| AI-14 | `rpc_search_knowledge_chunks` | ✅ |
| AI-15 | `rpc_get_membership_status` | ✅ |
| AI-16 | `rpc_get_price_grid` | ✅ |
| AI-17 | `rpc_get_aggregated_supply` | ✅ |
| AI-18 | `rpc_get_aggregated_demand` | ✅ |
| AI-19 | `rpc_get_org_batches` | ✅ |
| AI-20 | `rpc_create_batch` | ✅ |
| AI-21 | `rpc_publish_batch` | ✅ |
| AI-22 | `rpc_update_conversation_language` | ✅ |

### Application Code

| Component | Status | Notes |
|-----------|--------|-------|
| `ai_gateway/main.py` | ✅ Slice 1 done | FastAPI `/chat` webhook, P-AI-8 save-first |
| `ai_gateway/graph.py` | ✅ Slice 1 done | LangGraph StateGraph, D116 stateless, D117 one-run |
| `ai_gateway/nodes.py` | ✅ Slice 1 done | 7 nodes: load_context→check_confirm→route→process→tools→compliance→save. ⚠️ DEF-013 |
| `ai_gateway/tools/vet.py` | ✅ Slice 1 done | AI-07..10 via supabase.rpc(), P-AI-2 org_id injection |
| `ai_gateway/compliance.py` | ✅ Slice 1 done | P-AI-4 dosage regex (14 patterns), CF-01 antitrust, CF-05 legal |
| `ai_gateway/prompts.py` | ✅ Slice 1 done | System prompt builder from ai_prompts table (D133) |
| `ai_gateway/proactive.py` | ✅ Implemented in main.py | POST /proactive/dispatch (lines 220-241): INTERNAL_API_KEY guard + SKIP LOCKED via notification_worker.process_notification_batch(). No separate file needed. |
| `ai_gateway/embedding_worker.py` | ✅ Done (a06e0de) | Dok 5 §15: voyage-3 primary / OpenAI httpx fallback. WORKER_ID per hostname. SKIP LOCKED. FSM retry. lifespan asyncio.Task in main.py. |
| `src/` (React UI) | ✅ Slice 1 done | F01 (8-step reg), F02 (farm profile), F10 (report sick), F11 (vet case detail). AuthContext, useRpc hook, Supabase client. All data via supabase.rpc(). P-AI-4 dosage compliance verified. |

---

## Defects Found

| ID | Severity | File | Description | Status |
|----|----------|------|-------------|--------|
| DEF-001 | Significant | `d07_ai_gateway.sql` | `rpc_get_ai_farm_context` — 2 definitions | ✅ Fixed (2026-03-18) — V1 removed, V2 kept |
| DEF-002 | Significant | `d07_ai_gateway.sql` | `rpc_upsert_herd_group` — 2 definitions | ✅ Fixed (2026-03-18) — V1 removed, V2 kept |
| DEF-003 | Minor | `d01_kernel.sql` | `insert_user_message_dedup` — 2 definitions | ✅ Fixed (2026-03-18) — V1 removed, V2 kept |
| DEF-004 | Minor | `d01_kernel.sql` | `claim_pending_notifications` — 2 definitions | ✅ Fixed (2026-03-18) — V1 removed, V2 kept |
| DEF-005 | Minor | `d01_kernel.sql` | `mark_notification_failed` — 2 definitions | ✅ Fixed (2026-03-18) — V1 removed, V2 kept |
| DEF-006 | Significant | `d05_ops_edu.sql` | `fn_preview_cascade` — 2 definitions | ✅ Fixed (2026-03-18) — V1 removed, V2 kept |
| DEF-007 | Significant | `d05_ops_edu.sql` | `fn_generate_production_plan` — 2 definitions | ✅ Fixed (2026-03-18) — V1 removed, V2 kept |
| DEF-008 | Significant | `d05_ops_edu.sql` | `rpc_start_production_plan` — 2 definitions | ✅ Fixed (2026-03-18) — V1 removed, V2 kept |
| DEF-009 | ~~Minor~~ | `d07_ai_gateway.sql` | `fn_my_org_ids`, `fn_is_admin`, `fn_is_expert` in d01+d07 | ⚪ Not a defect — intentional deploy-order dependency |
| DEF-012 | Significant | `d01_kernel.sql` | `rpc_register_organization` org_type CHECK constraint | 🟡 Known — verify against Dok 1 valid org_types |
| DEF-013 | Significant | `ai_gateway/nodes.py` | 3x `.table("ai_conversations")` direct access (lines 155, 320, 633) — violates P-AI-1 | 🟡 Accepted tech debt — must resolve before Slice 3 |
| DEF-014 | Minor | `cross_check.sh` | CHECK 3 window too narrow (10 lines) for multi-param functions | ✅ Fixed (2026-03-19) — expanded to 25 lines |
| DEF-015 | Minor | `cross_check.sh` | CHECK 4 matched advisory lock in SQL comments | ✅ Fixed (2026-03-19) — filter comment lines |
| DEF-016 | Minor | `ai_gateway/notification_worker.py` | `.table("users").select("phone")` direct read (line 179) — service_role, read-only | 🟡 Accepted — minor, phone lookup |
| DEF-017 | **Critical** | `d01_kernel.sql` | `o.name` → `o.legal_name` in rpc_get_membership_queue + rpc_process_membership_application | ✅ Fixed (2026-03-19) — tested on Supabase |
| DEF-018 | **Critical** | `d01_kernel.sql` | `o.org_type` doesn't exist — need JOIN on `organization_type_assignments` | ✅ Fixed (2026-03-19) — tested on Supabase |
| DEF-019 | **Critical** | `d01_kernel.sql` | `hg.animal_category_code` → `hg.animal_category_id` (uuid), join on `ac.id` not `ac.code` | ✅ Fixed (2026-03-19) — tested on Supabase |
| DEF-020 | Significant | `d01_kernel.sql` | `activity_types` table doesn't exist — `fat.activity_type` is plain text | ✅ Fixed (2026-03-19) — tested on Supabase |
| DEF-021 | Significant | `PoolQueue.tsx` (A11) | Create button was stub — not wired to `rpc_create_pool_request` | ✅ Fixed (2026-04-01) — dialog + RPC-12 call |
| DEF-022 | Significant | `PoolQueue.tsx` (A11) | `rpc_activate_pool_request` (RPC-13) never called — draft requests couldn't start pipeline | ✅ Fixed (2026-04-01) — Activate button per draft request |
| DEF-023 | Significant | `PriceGridManagement.tsx` (A15) | `rpc_publish_price_index_value` (RPC-20) not implemented — price index section absent | ✅ Fixed (2026-04-01) — index form + history table added |
| DEF-024 | **Critical** | `PoolDetail.tsx`, `PriceGridManagement.tsx` | Antitrust disclaimer missing on price screens (Article 171) | ✅ Fixed (2026-04-01) — amber disclaimer card added |
| DEF-025 | Minor | `d02_tsp.sql` RPC-19 | ON CONFLICT `(tsp_sku_id, region_id, valid_from)` — NULL region_id won't trigger constraint | 🟡 Known — verify deployed constraint |
| DEF-026 | **Critical** | `d02_tsp.sql` RPC-20 | `rpc_publish_price_index_value` INSERT uses `price_index_id`/`avg_price_per_kg` but table has `index_id`/`value_per_kg`; missing required `data_source` | ✅ Fixed (2026-04-01) |
| DEF-027 | Significant | `Calculator.tsx`, `RationTab.tsx` | `rpc_list_feed_items` and `rpc_list_animal_categories` called from UI but did not exist in any SQL file | ✅ Fixed (2026-04-09) — created as RPC-F01 + RPC-F02 in d03_feed.sql |
| DEF-028 | **Critical** | `SimpleRationEditor.tsx` | `rpc_save_consulting_ration` called with `p_animal_category_code` (string) instead of `p_animal_category_id` (UUID) — RPC failed for every group | ✅ Fixed (2026-04-10) — load `rpc_list_animal_categories`, resolve code→UUID before call |

---

## Gates

| Gate | Status | Blocking |
|------|--------|----------|
| **DB Gate** | ✅ PASSED (0 critical, 7 significant) | All application code |
| **Dok 6 Gate (Slice 1)** | ✅ PASSED (2026-03-18) | F01, F02, F10, F11 contracts approved |
| **Legal Gate** | 🟡 D-LEGAL-1: review before public launch | Slice 5 public deploy |
| **Slice 1 Gate** | ✅ **PASSED** (2026-03-19) | QA pass + Architect sign-off. DEF-013 accepted. |
| **Slice 2 Gate** | ✅ **PASSED** (2026-03-19) | QA pass + Architect sign-off. |
| **Slice 3 Gate** | ✅ **PASSED** (2026-03-30) | D-GATE-S3 |
| **Slice 4 Gate** | ✅ **PASSED** (2026-03-30) | D-GATE-S4 |
| **Slice 5a Gate** | ✅ **PASSED** (2026-04-01) | D-GATE-S5a. 3 RPCs + 9 tools + 4 farmer screens. |
| **Slice 5b Gate** | ✅ **PASSED** (2026-04-01) | D-GATE-S5b. DEF-021..026 resolved. QA 0 critical. |
| **Slice 6a Gate** | ✅ **PASSED** (2026-03-31) | D-GATE-S6a |
| **Slice 6b Gate** | ⏸ Deferred | D-S6-3: after farmer feedback |
| **Slice 7 Gate** | ⬜ Not started | Merge Slice 7 to main |
| **Slice 8 Gate** | ✅ **PASSED** (2026-04-09) | D-GATE-S8. 9 RPCs, 4 parts, 0 TS errors. DEF-027..032 resolved. |

---

## Slice History

| Slice | Completed | Duration | Notes |
|-------|-----------|----------|-------|
| Slice 0 (Foundation) | 2026-03-18 | 1 day | DB Gate passed, cross_check.sh created |
| Slice 1 (Sick Calf) | 2026-03-19 | 2 days | 9 RPCs, AI Gateway, 4 screens, QA passed |
| Slice 2 (Membership) | 2026-03-19 | 1 day | 2 RPCs, WA notification worker, 2 admin screens, QA passed |
| Slice 3 (Feed) | 2026-03-30 | ~10 days | 6 RPCs, feed tools, 6 screens, QA passed |
| Slice 4 (Operations) | 2026-03-30 | 1 day | 4 RPCs, ops tools + proactive, 5 screens, QA passed |
| Slice 5a (Market Farmer) | 2026-04-01 | 2 days | 3 RPCs, 9 AI tools, 4 screens, QA passed. D-LEGAL-1 |
| Slice 5b (Market Admin) | 2026-04-01 | 1 day | 7 RPCs, 3 admin screens. DEF-021..026 found+fixed. |
| Slice 6a (Expert Console) | 2026-03-31 | 1 day | RPCs 28..32, M01–M06 + A03–A05, QA passed |
| Slice 8 (Ration+Consulting) | ✅ **Done** | 2026-04-09 | 4 части: Feed Справочник (A), NASEM Calculator (B), Ration Builder (C), Financial Integration (D). QA gate PASSED. |
