# DECISIONS LOG — AgOS

> Maintained by: Architect & Coordinator Agent
> Format: WHAT was decided → WHY (alternatives considered) → CONSEQUENCES (what becomes easy/hard)
> Source: Dok 1 §6 contains D1–D138+. This log captures decisions made AFTER Dok 1 v1.8 freeze.

---

## Index

| ID | Date | Domain | Summary |
|----|------|--------|---------|
| D-AGENT-1 | pre-2026-03 | Organization | 12 agents → 6 consolidated agents |
| D-NEW-A | pre-2026-03 | RPC Naming | SQL `rpc_name_registry` is canonical for RPC names |
| L-NEW-2 | pre-2026-03 | Concurrency | SKIP LOCKED, not advisory locks |
| C-NEW-1 | pre-2026-03 | AI Extraction | Russian codes → English DB codes mapping |
| D-COORD-1 | 2026-03-18 | Coordination | Created SPRINT_STATUS.md + DECISIONS_LOG.md |
| D-COORD-2 | 2026-03-18 | Agent Team | Full agent team audit — 10 findings fixed (FA-001..FA-010) |
| D-PROCESS-1 | 2026-03-18 | Process | 6 process improvements: vertical slices, git first, UI migration, reduced switches, navigation pointers, incremental Dok 6 |
| D-PROCESS-2 | 2026-03-18 | Slices | 5 slices → 8 slices. Membership separated. Old Slice 5 (28 screens) split into Expert + Education. |
| D-DEDUP-1 | 2026-03-18 | SQL Quality | DEF-001..008 fixed: stale V1 function definitions removed from d01, d05, d07. DEF-009 reclassified as not-a-defect. |
| D-F11-1 | 2026-03-18 | UI/RPC | F11 vet case detail: new `rpc_get_vet_case_detail` (JWT-compatible). AI Gateway RPCs (SECURITY DEFINER, service_role) cannot be called from web cabinet. |
| D-F10-1 | 2026-03-18 | UI/UX | F10: severity selector removed from farmer form. Farmer always sends null; AI determines severity from symptoms. Prevents false D57 auto-escalation. |
| D-F01-1 | 2026-03-18 | UI/UX | F01: membership application is optional (P11). Farmer uses free features first (vet, ration quick mode), applies when sees value. Higher conversion. |
| D-F01-2 | 2026-03-18 | Auth | F01: OTP auth (phone + SMS code), not phone+password. Requires Twilio. Better UX for farmers. |
| D-F01-3 | 2026-03-18 | UI/UX | F01: 4 roles (farmer, mpk, services, feed_producer). Benefit screens between steps preserved from v1. All v1 farmer fields kept (herd_size, primary_breed, ready_to_sell, how_heard). |
| D-F01-4 | 2026-03-18 | Scope | F01: full registration UI for all 4 roles in Slice 1. But only farmer path has backend+cabinet. Other roles: registration works, cabinet screens in later slices. |
| D-GATE-S1 | 2026-03-19 | Gate | Slice 1 QA + Architect sign-off. 0 critical, DEF-013 accepted tech debt. cross_check.sh false positives fixed (DEF-014/015). |
| D-S2-1 | 2026-03-19 | RPC/Admin | A01/A02: dedicated `rpc_get_membership_queue` with dual mode (list + detail by ID). Single RPC, two modes. |
| D-S2-2 | 2026-03-19 | Notification | Membership decisions require WhatsApp notification. RPC-03 inserts into `notifications` table. Minimal WA sender worker added to Slice 2 scope. |
| D-GATE-S2 | 2026-03-19 | Gate | Slice 2 QA + Architect sign-off. 0 critical. fn_is_admin() verified SQL+UI. DEF-016 accepted minor. |
| L-SCHEMA-1 | 2026-03-19 | Process | SQL column names diverge from Dok 1 entity names. DB Agent must verify against deployed schema before writing JOINs. 4 critical defects caught (DEF-017..020). |
| D-DS-1 | 2026-03-22 | UI/Design | Full migration to TURAN Design System v11. Unified AppShell for farmer + admin. Mobile adaptation deferred. |
| D-DS-2 | 2026-03-22 | UI/Design | DS v11.1: low-saturation dark theme (4-8%), surface hierarchy (Level 0-3), inputs=bg-background. |
| D-S3-1 | 2026-03-30 | RPC/Feed | Feed inventory RPC: individual fields, not batch jsonb |
| D-S3-2 | 2026-03-30 | RPC/Feed | Current ration: farm-level return (all groups in one call) |
| D-S3-3 | 2026-03-30 | Documentation | Dok 6 Slice 3 review: 8 findings fixed (4 Significant, 4 Minor) |
| D-GATE-S3 | 2026-03-30 | Gate | Slice 3 QA pass + Architect sign-off. 0 critical. DEF-023/024/025 accepted. |
| D-S4-1 | 2026-03-30 | Scope | RPC-44 + RPC-45 deferred to Slice 6 (admin-only, no farmer screens) |
| D-S4-2 | 2026-03-30 | Architecture | Proactive alerts (RPC-43) via Backend only, no farmer UI |
| D-S4-3 | 2026-03-30 | RPC | rpc_get_active_plan: single comprehensive RPC for F19/F21/F23 |
| D-GATE-S4 | 2026-03-30 | Gate | Slice 4 QA pass + Architect sign-off. 0 critical, 0 new defects. |
| D-S6-1 | 2026-03-31 | UI | Expert/Admin list screens use .from() with RLS (accepted for M/A-series) |
| D-S6-2 | 2026-03-31 | Scope | RPC-30 deferred — RPC-29 auto-generates items from protocol |
| D-S6-3 | 2026-03-31 | Scope | Slice 6b (A06-A10) deferred to after farmer feedback |
| D-GATE-S6a | 2026-03-31 | Gate | Slice 6a QA pass + Architect sign-off. 0 critical, 0 new defects. |
| D-LEGAL-1 | 2026-04-01 | Legal | Slice 5 Market: build without legal gate (CEO decision). Legal review before public launch. |
| D-GATE-S5a | 2026-04-01 | Gate | Slice 5a QA pass. 3 RPCs + 9 tools + 4 screens. Disclaimer in all price responses. |
| D-GATE-S5b | 2026-04-01 | Gate | Slice 5b QA pass + Architect sign-off. 7 RPCs. DEF-021..026 found and resolved. 0 critical at gate. |
| D-DOC-1 | 2026-04-08 | Documentation | Doc audit: CLAUDE.md outdated state fixed, Dok 6 refs updated to slice files, Docs/CLAUDE.md deleted (P4), SPRINT_STATUS updated with Slice 5. |
| D-S6a-FIX-1 | 2026-04-08 | SQL/UI | Expert screens: прямые `.from()` на M03/M04/M05/M06 заменяются READ-RPCs (`rpc_list_vaccination_plans`, `rpc_list_vaccination_plan_items`, `rpc_list_vaccines`, read RPCs для epidemic/kpi). Реализуется в d04_vet.sql + экраны. Статус: в работе (unstaged). |
| ADR-CONSULT-1 | 2026-04-08 | Architecture | Consulting module: Hybrid architecture — Python Engine standalone (Railway), DB + UI inside AGOS (Supabase + React). New d09_consulting.sql, 8 RPCs, 3 tables. |
| D-S8-1 | 2026-04-09 | Architecture | Slice 8: Унификация рационов и консалтинга — 4 самодостаточных части (Feed Справочник, NASEM Calculator, Ration Builder, Financial Integration). |
| D-S8-2 | 2026-04-09 | Architecture | feeding_model.py использует hardcoded dict (не consulting_reference_data). Исправление: fallback chain ration_versions → feed_consumption_norms → defaults. |
| D-S8-3 | 2026-04-09 | Architecture | calculate-ration Edge Function: farm_id → optional. Добавить consulting_project_id как альтернативный контекст. Новый rpc_save_consulting_ration для consulting ctx. |
| D-S8-4 | 2026-04-09 | DB | ration_versions.ration_id → NULLABLE + consulting_project_id FK. CHECK: хотя бы один контекст. Аддитивное изменение — существующие данные не затронуты. |
| D-GATE-S8 | 2026-04-09 | Gate | Slice 8 QA pass + Architect sign-off. 0 critical, 6 TS fixes (DEF-028..032). |
| D-WEIGHT-1 | 2026-04-09 | Architecture | WeightCalc модуль: динамический расчёт веса реализации. W = birth_weight + Σ(daily_gain[season] × days). Все параметры — в ProjectInput. Revenue использует расчётные веса вместо хардкод 331/267. |
| D-WEIGHT-2 | 2026-04-09 | Future/Plan | v2: вывод ожидаемого привеса из энергетического баланса NASEM-рациона (ME → ADG). Advisory layer, не автоматический пересчёт. |
| D-S9-1 | 2026-04-09 | Architecture | Стратегия реализации бычков: `steer_sale_age_months` (0/7/12/18). Когортный трекинг в herd_turnover.py. Legacy-совместимость через default=0 (декабрьская продажа). |
| D-S9-2 | 2026-04-09 | Architecture | SimpleRationEditor: табличный "простой" режим ввода рационов (кг/гол/сут × корм × сезон). NASEM остаётся как "продвинутый" режим. Оба сохраняют через rpc_save_consulting_ration. |
| D-S9-3 | 2026-04-09 | DB | `economic_parameters` добавлен в CHECK constraint `consulting_reference_data`. Seed row: feed_inflation=0.105. Engine читает через refs, fallback на константу. |
| D-S9-4 | 2026-04-09 | Architecture | feeding_model.py теперь возвращает физические объёмы кормов (тонны): `quantities.by_group`, `quantities.totals_by_feed`, `annual_feed_summary`. Backward-compatible аддиция к output. |
| D-GATE-S9 | 2026-04-09 | Gate | Slice 9 gate pass. 0 TS errors, 0 server errors. Migration applied. 7 tasks (A–I) completed. |
| D-S9-5 | 2026-04-10 | Architecture | fattening_enabled/fattening_months удалены из wizard — tech_card.py дериватирует из steer_sale_age_months. Единый источник правды. |
| D-S9-6 | 2026-04-10 | Architecture | opex.py: feed_cost отдельный массив. PnlTab: строка "Расходы на корма". feeding_model: annual_feed_cost_summary во всех 3 путях. |
| D-S9-7 | 2026-04-10 | UX | SummaryTab: детальные таблицы кормов — расходы по группам (тыс. тг) + объём по группам (тн). Работает для всех путей движка. |

---

## Decisions

### D-S8-1 — Slice 8: Архитектура унификации рационов и консалтинга

**Date:** 2026-04-09  
**Domain:** Architecture / Feed + Consulting

**WHAT:** Slice 8 реализует унификацию модуля рационов и консалтинга через 4 самодостаточных части:
1. **Часть A — Feed Справочник:** `feed_consumption_norms` (новая таблица в d03_feed), admin CRUD screen `/admin/feeds`, 3 новых admin RPC. Единственный источник правды по кормам для всей системы.
2. **Часть B — NASEM Calculator:** `calculate-ration` Edge Function — `farm_id` становится optional, добавляется `consulting_project_id` как альтернативный контекст. Backward compatible.
3. **Часть C — Ration Builder:** `ration_versions.ration_id` → NULLABLE + `consulting_project_id` FK + `context_animal_category_id`. Новый RPC `rpc_save_consulting_ration`. RationTab в консалтинговом проекте.
4. **Часть D — Financial Integration:** `feeding_model.py` получает fallback chain (attached ration_versions → feed_consumption_norms → hardcoded defaults).

**WHY:** 
- `feeding_model.py` использует hardcoded Python-словари с ценами 2024 года — нет возможности обновлять без деплоя.
- Farm модуль имеет полноценный NASEM-калькулятор, Consulting — нет. Это разрыв в ценностном предложении.
- Два хранилища данных о кормах (d03 и d09) нарушают P8 (единственный источник правды).

**CONSEQUENCES:**
- Easy: Admin обновляет цены кормов в одном месте; Consulting проект может включать точный NASEM-рацион; P&L автоматически использует актуальные цены.
- Hard: Нужна миграция `ration_versions` (nullable FK) — аддитивная, не ломает данные. feeding_model.py требует рефакторинга с fallback chain.
- Deferred: LP-solver, Consulting→Farm activation (Phase 4 Dok 7).

---

### D-AGENT-1 — Agent Consolidation (12 → 6)

**Date:** Pre-2026-03 (recorded in CLAUDE.md)
**Domain:** Project Organization

**WHAT:** 12 specialized agents consolidated into 6:
1. Architect & Coordinator (absorbs PM role)
2. DB Agent (all SQL across all domains)
3. Backend Agent (Python FastAPI + TypeScript Edge Functions)
4. UI-Farmer Agent (Lovable — farmer cabinet)
5. UI-Management Agent (Lovable — expert console + admin panel)
6. QA Agent (cross_check.sh, tests)

**WHY:** Fewer context switches, clearer ownership boundaries, reduced coordination overhead. Sub-domain work handled via sessions within a single agent, not separate agents.

**CONSEQUENCES:**
- Easy: single point of responsibility per artifact type
- Hard: larger context per agent session (must load full domain slice)

---

### D-NEW-A — SQL Names Are Canonical for RPCs

**Date:** Pre-2026-03 (recorded in CLAUDE.md)
**Domain:** RPC Naming

**WHAT:** When Dok 3 or Dok 5 have RPC names that differ from what's deployed in SQL → SQL wins. The `rpc_name_registry` table in SQL is the canonical source.

**WHY:** SQL is the deployed reality. Documents can lag behind. Using SQL as source of truth prevents calling non-existent functions.

**CONSEQUENCES:**
- Easy: no ambiguity about callable function names
- Hard: Dok 3 and Dok 5 must be updated when SQL names change (manual sync)

---

### L-NEW-2 — SKIP LOCKED for Concurrency (Not Advisory Locks)

**Date:** Pre-2026-03 (recorded in CLAUDE.md)
**Domain:** Concurrency / AI Gateway

**WHAT:** Proactive dispatch and notification processing use `FOR UPDATE SKIP LOCKED`, not PostgreSQL advisory locks.

**WHY:** Advisory locks are session-scoped and can leak if connections drop. SKIP LOCKED is row-level, transactional, and self-cleaning.

**CONSEQUENCES:**
- Easy: no lock leak bugs, no cleanup needed on crash
- Hard: requires careful batch sizing (batch=50 per claim)

---

### C-NEW-1 — Russian → English Code Extraction Rules

**Date:** Pre-2026-03 (recorded in CLAUDE.md)
**Domain:** AI Gateway / Extraction

**WHAT:** AI extraction layer maps Russian animal category codes to English DB codes:
- БМ1 → BULL_CALF
- БМ2 → STEER
- ТМ → HEIFER_YOUNG
- КВ → COW

**WHY:** Farmers communicate in Russian/Kazakh. Database uses English codes for consistency and international standard compatibility.

**CONSEQUENCES:**
- Easy: LLM can extract from natural language, mapping is deterministic
- Hard: new codes require updating EXTRACTION_RULES (data-driven via P8 — should be in DB eventually)

---

### D-COORD-1 — Coordination Infrastructure Created

**Date:** 2026-03-18
**Domain:** Project Coordination

**WHAT:** Created `SPRINT_STATUS.md` and `DECISIONS_LOG.md` as coordination files maintained by Architect Agent.

**WHY:** No coordination infrastructure existed. CLAUDE.md references these files but they were not created. Without them:
- No way to track what's done vs. what's blocked
- No traceability for post-Dok1 decisions
- No gate verification possible

**CONSEQUENCES:**
- Easy: all agents can check current state before starting work
- Easy: decisions are traceable with rationale
- Hard: Architect Agent must keep these files updated after every session

---

### D-COORD-2 — Agent Team Audit: 10 Findings Fixed

**Date:** 2026-03-18
**Domain:** Agent Team / Skills Infrastructure

**WHAT:** Full audit of 4 SKILL.md files against CLAUDE.md. Found 15 issues (3 Critical, 7 Significant, 5 Minor). Fixed all 10 Critical + Significant:

| ID | Severity | Fix Applied |
|----|----------|-------------|
| FA-001 | Critical | `backend-SKILL.md` → renamed to `SKILL.md` (command `/backend` now works) |
| FA-002 | Critical | `qa-SKILL.md` → renamed to `SKILL.md` (command `/qa` now works) |
| FA-003 | Critical | QA SKILL: added "What You OWN" section — `cross_check.sh` + `tests/*` |
| FA-004 | Significant | Architect SKILL: "SQL wins, fix Dok" → "Flag as defect, both must agree" |
| FA-005 | Significant | **REJECTED by CEO.** Backend SKILL intentionally does NOT duplicate P-AI constraints — agent reads Dok 5 itself. Reverted. |
| FA-006 | Significant | **REJECTED by CEO.** Backend SKILL intentionally does NOT duplicate session table — agent reads CLAUDE.md §Roadmap. Reverted. |
| FA-007 | Significant | Backend SKILL: expanded "What to Read" to all SQL files d01–d05 + d07 |
| FA-008 | Significant | Architect SKILL: added Dok 6, CLAUDE.md to "What You Produce" |
| FA-009 | Significant | Clarified gate ownership: QA runs checks → Architect signs off |
| FA-010 | Significant | Architect SKILL: removed phantom `DO_NOT_TOUCH.md` reference → replaced with `CLAUDE.md §Prohibited Actions` |

**Remaining Minor (not fixed — low priority):**
- FA-011: Architect SKILL frontmatter → ✅ Actually fixed as part of FA-008
- FA-012..FA-015: Minor improvements, can be done opportunistically

**WHY:** Skills are the operational prompts for each agent session. Incorrect skills = agents that violate architectural principles, miss dependencies, or produce defective output. Critical findings meant `/backend` and `/qa` commands would fail entirely.

**CONSEQUENCES:**
- Easy: all 4 Claude Code agents now have consistent, correct skill files
- Easy: gate ownership is unambiguous (QA checks, Architect signs off)
- Hard: UI agents (Lovable) still rely on CLAUDE.md paste, no skill automation possible

---

## Defects Found (2026-03-18)

> These are findings from the initial project audit. Classified by severity.
> CEO confirmation required before fixes are applied.

| ID | Severity | Finding | Recommended Action |
|----|----------|---------|-------------------|
| DEF-001 | ✅ Fixed | `d07_ai_gateway.sql`: `rpc_get_ai_farm_context` — V1 removed, V2 (C-AUDIT-2b/3) kept |
| DEF-002 | ✅ Fixed | `d07_ai_gateway.sql`: `rpc_upsert_herd_group` — V1 removed, V2 (L-AUDIT-5) kept |
| DEF-003 | ✅ Fixed | `d01_kernel.sql`: `insert_user_message_dedup` — V1 removed, V2 (L-NEW-1 atomic) kept |
| DEF-004 | ✅ Fixed | `d01_kernel.sql`: `claim_pending_notifications` — V1 removed, V2 (L-NEW-4) kept |
| DEF-005 | ✅ Fixed | `d01_kernel.sql`: `mark_notification_failed` — V1 removed, V2 (L-NEW-4 max_retry) kept |
| DEF-006 | ✅ Fixed | `d05_ops_edu.sql`: `fn_preview_cascade` — V1 removed, V2 (L-7 security) kept |
| DEF-007 | ✅ Fixed | `d05_ops_edu.sql`: `fn_generate_production_plan` — V1 removed, V2 (D-NEW-4 batch) kept |
| DEF-008 | ✅ Fixed | `d05_ops_edu.sql`: `rpc_start_production_plan` — V1 removed, V2 (C-NEW-7 p_actor_id) kept |
| DEF-009 | ⚪ Not a defect | `fn_my_org_ids/fn_is_admin/fn_is_expert`: d01 basic (needed for RLS at deploy) + d07 JWT fast path (upgrade). Intentional. |
| DEF-010 | ✅ Fixed | `cross_check.sh` created |
| DEF-011 | ✅ Planned | `Dok 6` — created incrementally per slice (D-PROCESS-1) |

---

### D-PROCESS-1 — Process Restructuring: 6 Improvements

**Date:** 2026-03-18
**Domain:** Development Process

**WHAT:** 6 process changes applied simultaneously:

| # | Change | Severity | Effect |
|---|--------|----------|--------|
| 1 | Reduce context switches | Significant | DB/Backend/UI agents self-update SPRINT_STATUS.md. Architect only at slice start/end. |
| 2 | Vertical slices | **Critical** | Horizontal sprints → vertical slices. Each slice = one complete user scenario (DB→Backend→UI→QA→Deploy). First farmer feedback after Slice 1, not after 7 weeks. |
| 3 | Incremental Dok 6 | Significant | Monolithic Sprint 0 (53 screens) → just-in-time per slice. Dok 6 Gate = "current slice's screens", not "all 53 screens". |
| 4 | Navigation pointers | Significant | Per-session Dok section references in all skills. Agents read specific sections, not entire Dok files. Navigation, not content duplication. |
| 5 | UI migration | Significant | Lovable → Claude Code (Vite + React + TypeScript). UI code in git. QA can verify. UI-Farmer + UI-Management merged into one UI Agent. **5 agents total (was 6).** |
| 6 | Git first | **Critical** | Git init = step 1 (before Supabase). Branching: `main` + `slice-N`. Every agent session = commit. |

**Slice structure:**
- Slice 0: Foundation (env setup + cross_check.sh)
- Slice 1: "У телёнка температура" (Sick Calf) — first farmer contact
- Slice 2: "Сколько корма нужно?" (Feed Planning)
- Slice 3: "Мой план на сезон" (Operations)
- Slice 4: "Хочу продать бычков" (Market) — blocked by legal gate
- Slice 5: Admin & Expert Console

**RPC redistribution decisions:**
- RPC-02, RPC-03 (membership) → Slice 5 (not needed for farmer's first day)
- RPC-07 (herd events) → Slice 2 (logically tied to farm summary)
- UI Framework: Vite + React + TypeScript (CTO decision — no SSR needed behind auth)

**WHY:** Process was optimized for discipline, not for speed of learning. P9 (Farmer-Centric) requires early farmer feedback. 7 weeks without any user contact = unacceptable risk.

**CONSEQUENCES:**
- Easy: first farmer feedback after ~1 week (Slice 1), not ~7 weeks
- Easy: each slice is independently deployable and testable
- Easy: UI in git, QA-verifiable, one unified UI Agent
- Hard: slices cut across domains (d01+d04 in one session), requires careful dependency tracking
- Hard: Dok 6 creation is distributed across slices, not front-loaded

---

### D-DEDUP-1 — SQL Deduplication: 8 Stale Function Definitions Removed

**Date:** 2026-03-18
**Domain:** SQL Quality / Regression Prevention

**WHAT:** Removed 8 stale V1 function definitions from 3 SQL files. Each file had both the original definition and a later fix — PostgreSQL silently took the last one. V1 blocks removed (~1100 lines total):

| File | Removed | Lines removed |
|------|---------|--------------|
| `d07_ai_gateway.sql` | V1 of `rpc_get_ai_farm_context`, `rpc_upsert_herd_group` | ~267 |
| `d01_kernel.sql` | V1 of `insert_user_message_dedup`, `claim_pending_notifications`, `mark_notification_failed` | ~100 |
| `d05_ops_edu.sql` | V1 of `fn_preview_cascade`, `fn_generate_production_plan`, `rpc_start_production_plan` | ~754 |

**DEF-009 reclassified:** `fn_my_org_ids`/`fn_is_admin`/`fn_is_expert` in both d01 and d07 is NOT a defect. d01 needs basic versions for RLS policies at deploy time. d07 upgrades them with JWT fast path after full deployment. Removing from d01 would break deployment order.

**WHY:** Stale definitions are a regression time bomb. If anyone reorders code within a consolidated file, the stale V1 silently wins and reverts critical fixes (L-AUDIT-5 confidence, L-7 security, L-NEW-1 race condition, L-NEW-4 infinite retry). This pattern caused ~6 regression cycles in project history (see CLAUDE.md §Lessons Learned).

**CONSEQUENCES:**
- Easy: each function has exactly one definition — no silent override risk
- Easy: `cross_check.sh` significant errors reduced from 10 to 7
- Easy: files are shorter and more readable
- Neutral: zero runtime behavior change (PostgreSQL already used the last definition)

---

### D-GATE-S1 — Slice 1 Gate: QA Pass + Architect Sign-Off

**Date:** 2026-03-19
**Domain:** Gate / Quality

**WHAT:** Slice 1 "У телёнка температура" passed QA gate and received Architect sign-off.

**QA Results:**
- `cross_check.sh`: 0 critical, 1 significant (Slice 4 scope, not blocking)
- P-AI-4 dosage compliance: PASS across all layers (backend regex + UI rendering)
- P-AI-1 RPC-only access: PASS (UI clean, backend DEF-013 accepted)
- P-AI-2 organization_id: PASS
- All 10 Slice 1 RPCs verified in SQL
- No duplicate function definitions

**Accepted tech debt:**
- DEF-013: 3x `.table("ai_conversations")` in `nodes.py` — service_role key, no RLS risk. Must be resolved before Slice 3 (confirmation flow).

**Script fixes applied:** DEF-014 (CHECK 3 window 10→25), DEF-015 (CHECK 4 comment filter).

**WHY:** All gate checklist items verified. No unresolved CRITICAL findings. Slice 1 delivers the complete "sick calf" scenario: register → create farm → report sick → see AI diagnosis.

**CONSEQUENCES:**
- Easy: Slice 1 code is on main, deployable
- Easy: first farmer feedback possible
- Next: Slice 2 (Membership — admin approves applications)

---

### D-S2-1 — Dual-Mode Membership Queue RPC

**Date:** 2026-03-19
**Domain:** RPC / Admin

**WHAT:** Single `rpc_get_membership_queue` serves both A01 (list) and A02 (detail):
- Without `p_application_id`: returns paginated list with `p_status_filter`, `p_page`, `p_page_size`
- With `p_application_id`: returns full detail for one application (org + farm + herd + membership history)

**WHY:** Two alternatives considered:
1. Separate `rpc_get_membership_queue` + `rpc_get_application_detail` — more RPCs, more maintenance
2. Direct query via admin RLS — breaks "all data via RPC" rule

Dual-mode is simplest: one function, admin check inside, conditional logic based on whether ID is provided.

**CONSEQUENCES:**
- Easy: one RPC to maintain, consistent with RPC-only rule
- Easy: UI needs only one `useRpc` hook for both screens
- Hard: function is slightly more complex (two code paths)

---

### D-S2-2 — WhatsApp Notification for Membership Decisions

**Date:** 2026-03-19
**Domain:** Notification / Scope

**WHAT:** RPC-03 (`rpc_process_membership_application`) inserts a row into `notifications` table with `channel='whatsapp'` and template from Dok 4 §5:
- `application_approved`: *"Заявка одобрена! Ваш статус: {new_level}. Откройте кабинет."*
- `application_rejected`: *"Заявка отклонена. Причина: {reject_reason}. Контакт: {contact_info}."*

A minimal WhatsApp sender worker is added to Slice 2 Backend scope. Uses existing DB infrastructure: `claim_pending_notifications` (SKIP LOCKED) → WhatsApp Cloud API → `mark_notification_sent/failed`.

**WHY:** CEO requirement — farmer must know immediately when membership decision is made. "Next login" is not acceptable for a decision the farmer is waiting for. WhatsApp is the primary channel for Kazakh farmers (P9 Farmer-Centric).

**CONSEQUENCES:**
- Easy: farmer gets instant feedback on membership decision
- Easy: notification DB pipeline already exists (d01), only the sender worker is new
- Hard: Slice 2 scope expanded — Backend Agent must build minimal WA sender
- Hard: requires `WHATSAPP_TOKEN` env var to be set and WhatsApp Business API configured
- Reuse: the WA sender worker will be reused by all future slices (proactive dispatch, alerts, etc.)

---

### D-DS-1 — Full Migration to TURAN Design System v11

**Date:** 2026-03-22
**Domain:** UI/Design

**WHAT:** Complete UI migration from ad-hoc warm palette to TURAN Design System v11. Unified AppShell layout replaces separate CabinetLayout + AdminLayout.

Changes:
1. CSS variables: TURAN v11 tokens scoped to `[data-shell]` (landing/registration untouched)
2. AppShell: CSS Grid (Sidebar + Header + Content + DetailPanel), replaces bottom nav + top nav
3. Sidebar: 3 states (expanded/collapsed/hidden), role-aware nav, theme toggle, Cmd+B
4. All hardcoded hex colors in cabinet/admin replaced with CSS variables
5. StatusBadge + SeverityBadge components (semantic colors, not Tailwind hardcodes)
6. PageHeader component for consistent page titles
7. shadcn components updated: input/textarea/select bg, button shadow, checkbox radius
8. Global focus-visible ring inside [data-shell]
9. Inter + JetBrains Mono fonts added (landing keeps PT Serif/Source Sans)

**Alternatives considered:**
- A. Unified AppShell for all (chosen) — single layout, mobile adaptation later
- B. Two layouts, one DS — farmer keeps mobile bottom-nav, admin gets AppShell
- C. AppShell with farmer-mode — conditional bottom-nav inside AppShell

**WHY:** Variant A chosen by CEO. Single codebase, consistent UX. Mobile adaptation is a separate task after core DS is stable.

**CONSEQUENCES:**
- Easy: one layout system to maintain, consistent token usage
- Easy: theme switching (dark/light) works across all screens
- Easy: new screens automatically get DS styling via AppShell
- Hard: farmer on mobile phone sees desktop sidebar (mobile adaptation deferred)
- Hard: landing/registration use separate color system (`:root` = original, `[data-shell]` = DS v11)

---

### D-DS-2 — DS v11.1: Low-Saturation Dark + Surface Hierarchy

**Date:** 2026-03-22
**Domain:** UI/Design

**WHAT:** Dark theme saturation reduced from 14-20% to 4-8%. Surface hierarchy formalized as 4 levels.

Surface Hierarchy:
| Level | Token | Dark Hex | Components |
|-------|-------|----------|------------|
| 0 | `--bg` | `#141312` | Page background, input/select/textarea |
| 1 | `--bg-s` | `#1b1a18` | Sidebar, panels |
| 2 | `--bg-c` | `#222120` | Cards, popovers, modals, sections |
| 3 | `--bg-m` | `#2c2b28` | Hover, active, muted |

Key rule: Input = Level 0 (always darker than card Level 2). Border adds definition.

Component rules documented in tokens.ts:
- Button CTA: `--cta` bg, `--cta-fg` text. NEVER orange/accent text.
- Checkbox checked: `--cta` bg. Border: `--input`.
- Focus ring: `--bd-h` (warm brown). NEVER blue. NEVER accent.
- Nav active: `rgba(fg, 0.05)` neutral. NEVER brand color.

**WHY:** Previous dark theme was too warm/brown (muddy). Low saturation = cleaner, more professional. Surface hierarchy prevents inputs from blending into cards.

**CONSEQUENCES:**
- Easy: clear visual depth on dark backgrounds
- Easy: inputs always visible inside cards (darker than card bg)
- Easy: documented rules prevent future inconsistency

---

### D-S3-1 — Feed Inventory RPC: Individual Fields (Not Batch)

**Date:** 2026-03-30
**Domain:** RPC / Feed

**WHAT:** `rpc_upsert_feed_inventory` (RPC-21) accepts individual fields per call: `(p_organization_id, p_farm_id, p_feed_item_id, p_quantity_kg, p_price_per_kg?, p_data_source)`. NOT a jsonb array of items.

**WHY:** Two options:
- (A) Individual fields — simpler UI, one form submit = one call, P-AI-3 confirmation flow per-item ✅ CHOSEN
- (B) jsonb array — batch update, fewer round-trips, better for AI bulk extraction

Option A chosen. Slice 3 is farmer manual entry (one feed item at a time). Batch mode can be added as a separate `rpc_upsert_feed_inventory_batch` later (P7 additive, not breaking).

**CONSEQUENCES:**
- Easy: simple UI hook, clear error per item
- Easy: AI confirmation flow works naturally (one confirmation = one item)
- Hard: AI bulk extraction from "у меня 5 тонн сена и 2 тонны ячменя" requires multiple RPC calls (acceptable for Slice 3)

---

### D-S3-2 — Current Ration: Farm-Level Return

**Date:** 2026-03-30
**Domain:** RPC / Feed

**WHAT:** `rpc_get_current_ration` (RPC-24) takes `(p_organization_id, p_farm_id)` and returns ALL active rations for the farm as jsonb array. One element per herd group that has an active ration.

**WHY:** Two options:
- (A) Farm-level return (all groups) — one call, F17 shows everything ✅ CHOSEN
- (B) Per-group return — UI calls N times, or needs wrapper

F17 page shows all groups' rations on one screen. Dataset is small (farmer has 3-5 groups typically). One call is cleaner.

**CONSEQUENCES:**
- Easy: F17 loads with one RPC call
- Easy: small payload (3-5 groups × 5-10 feed items each)
- Neutral: client-side filtering trivial if needed

---

### D-S3-3 — Dok 6 Slice 3 Review: 8 Findings Fixed

**Date:** 2026-03-30
**Domain:** Documentation / Quality

**WHAT:** Architect review of Dok 6 Slice 3 found 8 issues (4 Significant, 4 Minor). All fixed in v1.1:

| # | Sev | Fix |
|---|-----|-----|
| F-1 | Significant | F04: `p_animal_category_code` (text), not `_id` (uuid) — matches deployed SQL |
| F-2 | Significant | F04: added `p_actor_id` param — required by deployed `rpc_upsert_herd_group` |
| F-3 | Significant | F16: confirmed individual fields (D-S3-1), not jsonb batch |
| F-4 | Significant | F17: confirmed farm-level return (D-S3-2), `p_farm_id` not `p_herd_group_id` |
| F-5 | Minor | F15: added confidence badge (D45 Layered Truth) |
| F-6 | Minor | F16: documented confidence=75 for platform data source |
| F-7 | Minor | F17: documented ration FSM transition ownership |
| F-8 | Minor | F18: documented Edge Function endpoint path and I/O schema |

**WHY:** F-1 and F-2 were blocking — UI Agent would have called RPC with wrong param types. Caught by cross-referencing Dok 6 against deployed SQL in d07.

**CONSEQUENCES:**
- Easy: UI Agent can now implement F04 without hitting type mismatch
- Easy: DB Agent has clear spec for RPC-21 and RPC-24 signatures
- Lesson reinforced: always verify Dok 6 contracts against SQL before handing off to implementation agents

---

### D-GATE-S3 — Slice 3 Gate: QA Pass + Architect Sign-Off

**Date:** 2026-03-30
**Domain:** Gate / Quality

**WHAT:** Slice 3 "Сколько корма нужно?" passed QA gate and received Architect sign-off.

**QA Results:**
- `cross_check.sh`: 0 critical, 1 significant (d05 pre-existing, Slice 4 scope)
- 6 RPCs verified: signatures, SECURITY DEFINER, org_id, registry entries
- Ration FSM: CHECK constraint + auto-activate trigger + archive validation
- P-AI-1..5 compliance: all pass
- TypeScript build: 0 errors
- Events: 4 Dok 4 event types emitted correctly

**Accepted tech debt:**
- DEF-023: UI pages use `.from()` for reference table lookups (animal_categories, feed_items). No security risk. Refactor in cleanup pass.
- DEF-024: Backend feed.py `.table("feed_items")` for code→id resolution (read-only).
- DEF-025: Minor query optimization in rpc_get_current_ration.

**Deliverables:**
- DB: 6 RPCs (RPC-07, 08, 21-24) in d01 + d03
- Backend: 5 feed tools, extraction rules (C-NEW-1), 2 Edge Functions
- UI: 6 screens (F03, F04, F15-F18) with 8 routes
- Dok 6: v1.1 with 8 review fixes
- Decisions: D-S3-1, D-S3-2, D-S3-3

**CONSEQUENCES:**
- Easy: Slice 3 code is on main, deployable
- Easy: farmer can manage herd groups, feed inventory, view rations, check budget
- Next: Slice 4 (Operations) — or Slice 2-style quick slice if needed

---

### D-S4-1 — RPC-44, RPC-45 Deferred to Slice 6

**Date:** 2026-03-30
**Domain:** Scope / Operations

**WHAT:** `rpc_add_knowledge_chunk` (RPC-44) and `rpc_restrict_organization` (RPC-45) moved from Slice 4 to Slice 6 (Admin/Expert).

**WHY:** Both are admin-only operations. Slice 4 farmer screens (F19–F23) don't need them. Implementing them now adds scope without farmer value.

**CONSEQUENCES:**
- Easy: Slice 4 DB scope reduced to 1 new RPC (RPC-37)
- Easy: faster delivery to farmers
- Hard: proactive alerts and restrictions deferred — but farmer doesn't manage these anyway

---

### D-S4-2 — Proactive Alerts via Backend Only

**Date:** 2026-03-30
**Domain:** Architecture / Operations

**WHAT:** `rpc_create_proactive_alert` (RPC-43) implemented by Backend Agent as part of SKIP LOCKED proactive dispatch pipeline. No farmer-facing UI — alerts arrive as WhatsApp notifications.

**WHY:** Farmer doesn't create alerts. System/AI creates them based on events (feed.inventory.low, ops.task.overdue). Farmer receives notification, not a management screen.

---

### D-S4-3 — Single RPC for Plan Screens

**Date:** 2026-03-30
**Domain:** RPC / Operations

**WHAT:** `rpc_get_active_plan` (RPC-37) returns comprehensive jsonb: plan + phases[] (with task/KPI counts) + tasks_summary + kpis_summary. One RPC serves F19, F21, F23.

**WHY:** Farmer plan screens are read-heavy, write-light. One round-trip for all data. Small payload (1 plan, ~10 phases, summary counts).

---

### D-GATE-S4 — Slice 4 Gate: QA Pass + Architect Sign-Off

**Date:** 2026-03-30
**Domain:** Gate / Quality

**WHAT:** Slice 4 "Мой план на сезон" passed QA gate and received Architect sign-off.

**QA Results:**
- `cross_check.sh`: 0 critical, 1 significant (pre-existing d05, not Slice 4 scope)
- RPC-37 verified: SECURITY DEFINER, org_id, registry entry
- L-NEW-2: 0 advisory locks in ai_gateway, SKIP LOCKED in claim_pending_notifications
- P-AI-1: ops tools use only supabase.rpc(), 0 direct table access
- UI: 0 `.from()` calls in plan pages (clean — no DEF-023 regression)
- FSM: farm_phases (4 states), farm_tasks (6 states), farm_kpis (3 states) verified
- TypeScript: 0 errors
- No new defects found

**Deliverables:**
- DB: 1 RPC (RPC-37 rpc_get_active_plan) in d05
- Backend: 4 ops tools + proactive dispatch endpoint
- UI: 5 screens (F19–F23) with 5 routes
- Dok 6: v1.0 with CTO decisions D-S4-1..D-S4-3

**CONSEQUENCES:**
- Easy: Slice 4 on main, deployable
- Easy: farmer can view plan, manage tasks, check timeline, shift dates, track KPIs
- Next: Slice 6 (Expert) or deploy + feedback

---

### D-S6-1 — Expert/Admin List Screens Use .from() with RLS

**Date:** 2026-03-31
**Domain:** UI / Architecture

**WHAT:** M01, M03, M05, A03, A04, A05 use `.from('table')` with admin/expert RLS policies instead of dedicated list RPCs.

**WHY:** These are data-dense admin tables where creating 6 list RPCs adds boilerplate without security benefit. RLS policies already exist for expert/admin SELECT. Pattern accepted for M/A-series screens (not F-series farmer screens).

---

### D-S6-2 — RPC-30 Deferred

**Date:** 2026-03-31
**Domain:** Scope

**WHAT:** `rpc_add_vaccination_plan_item` (RPC-30) deferred. RPC-29 generates items from protocol automatically.

---

### D-S6-3 — Slice 6b Deferred

**Date:** 2026-03-31
**Domain:** Scope

**WHAT:** A06–A10 (user management, settings, role assignment) deferred to after farmer feedback. Slice 6a = Expert core (9 screens).

---

### D-GATE-S6a — Slice 6a Gate: QA Pass + Architect Sign-Off

**Date:** 2026-03-31
**Domain:** Gate / Quality

**WHAT:** Slice 6a "Эксперт-консоль" passed QA gate.

**QA Results:**
- cross_check.sh: 0 critical
- 6 new RPCs: all unique, SECURITY DEFINER, org_id
- TypeScript: 0 errors
- No new defects

**Deliverables:**
- DB: 6 RPCs (RPC-28,29,31,32 in d04 + RPC-44 d05 + RPC-45 d01)
- Backend: 3 expert tools (AI-11..13)
- UI: 9 screens (M01–M06 + A03–A05)

---

### D-GW-1 — AI Gateway User Resolution: Org Owner Fallback

**Date:** 2026-03-31
**Domain:** Architecture / AI Gateway

**WHAT:** `rpc_start_ai_conversation` now has 3-tier user resolution:
1. JWT (`fn_current_user_id()`) — for direct Supabase calls
2. Phone (`resolve_user_by_phone`) — for WhatsApp webhook
3. Org owner fallback — for Web Cabinet when JWT not forwarded

**WHY:** Web Cabinet calls Gateway via plain `fetch` without forwarding Supabase JWT. Gateway uses `service_role` key, so `fn_current_user_id()` returns null. Org owner fallback is safe because `organization_id` comes from authenticated context.

**Correct long-term fix:** UI sends Supabase session JWT in Authorization header → Gateway validates and extracts `user_id`. This is a Slice 7+ task.

**CONSEQUENCES:**
- Easy: AI Gateway works for Web Cabinet immediately
- Safe: org_id is from authenticated context, owner lookup is deterministic
- Tech debt: JWT forwarding deferred — must implement before multi-user organizations

---

### D-LEGAL-1 — Slice 5 Market: Build Without Legal Gate

**Date:** 2026-04-01
**Domain:** Legal / Scope

**WHAT:** CEO decision to build Slice 5 (Market) technical functionality without waiting for Article 171 legal review. Legal review will happen separately before public launch of market features.

**WHY:** Legal review timeline unknown. Technical work can proceed in parallel. Market screens can be built with disclaimer placeholders.

**RISK:** If market features go live to real users without legal sign-off, Article 171 violation is possible. Mitigation: market screens are behind admin/farmer auth, not public. Disclaimer fields exist in architecture (`disclaimer_text` in price RPCs). Legal review adds the actual text.

**CONSEQUENCES:**
- Easy: Market development unblocked, parallel with legal process
- Risk: Must NOT launch market features to public without legal sign-off
- Tech: disclaimer_text will be placeholder until legal provides text

---

### D-GATE-S5a — Slice 5a Gate: QA Pass + Architect Sign-Off

**Date:** 2026-04-01
**Domain:** Gate / Quality

**WHAT:** Slice 5a "Хочу продать бычков" (farmer part) passed QA gate.

**QA:** cross_check.sh 0 critical. TypeScript 0 errors. 3 RPCs unique. Disclaimer in all price responses.

**Deliverables:** 3 RPCs (RPC-11,17,18), 9 market tools, 4 screens (F05,F06,F08,F09).

---

### D-GATE-S5b — Slice 5b Gate: Deployed

**Date:** 2026-04-01
**Domain:** Gate

**WHAT:** Slice 5b Market Admin deployed. 7 RPCs + 3 screens.
D-S5-4: A12/13/14 merged into Pool Detail lifecycle screen.

---

### D-S8-2 — feeding_model.py Fallback Chain

**Date:** 2026-04-09
**Domain:** Architecture / Consulting Engine

**WHAT:** `feeding_model.py` was using hardcoded Python dictionaries (FEED_PRICES_BASE, 2024 prices). Replaced with a 3-level fallback chain:
1. **Priority 1** — `consulting_rations`: if `rpc_get_consulting_rations` returns NASEM-computed ration_versions attached to the project, use `total_cost_per_day × heads × days / 1000` directly.
2. **Priority 2** — `feed_consumption_norms` + `feed_prices_d03`: use d03_feed normative tables with live prices via Supabase REST.
3. **Priority 3** — Hardcoded defaults (existing CFC-verified Python dicts) — fallback of last resort.

Helper functions added: `_calc_from_consulting_rations()`, `_calc_from_norms()`.

**WHY:** Hardcoded 2024 prices cannot be updated without code deploy. Priority 1 gives exact NASEM accuracy when a consultant has computed rations. Priority 2 uses admin-managed norms. Priority 3 preserved for backward compat and zero-configuration operation.

**CONSEQUENCES:**
- Easy: once consultant runs NASEM ration builder, P&L uses exact feed costs.
- Easy: feed price updates via admin UI immediately flow into all future calculations.
- Hard: Priority 2 `_calc_from_norms` uses `farm_type` hint for group matching (since norms carry `animal_category_id`, not code). This is best-effort until a category_id→herd_group resolver is added.

---

### D-S8-3 — calculate-ration Edge Function: Dual Context

**Date:** 2026-04-09
**Domain:** Architecture / Edge Function

**WHAT:** `calculate-ration` Edge Function updated:
- `farm_id` becomes optional (was required).
- `consulting_project_id` added as alternative context.
- Validation: must provide exactly one of `farm_id` or `consulting_project_id`.
- Farm context: loads feed from `farm_feed_inventory` → saves via `rpc_save_ration` (unchanged).
- Consulting context: loads feed from `feed_items` by `feed_item_ids[]` array → saves via `rpc_save_consulting_ration` (new C-RPC-09).

**WHY:** Farm and consulting NASEM calculations are identical mathematically. Sharing one Edge Function avoids duplicating the greedy LP-solver and nutrient calculation logic.

**CONSEQUENCES:**
- Easy: backward compat — all existing farm `Calculator.tsx` calls continue working (farm_id path unchanged).
- Easy: consulting projects get full NASEM capability without new solver code.
- Hard: `feed_item_ids` must be explicitly provided for consulting context (no inventory lookup). This is by design — consultant selects feeds manually.

---

### D-S8-4 — ration_versions: Context-Independent Schema

**Date:** 2026-04-09
**Domain:** DB / Schema Design

**WHAT:** `ration_versions.ration_id` column changed from NOT NULL to NULLABLE. Two new columns added:
- `consulting_project_id UUID REFERENCES consulting_projects(id)`
- `context_animal_category_id UUID REFERENCES animal_categories(id)`

New CHECK constraint: `ration_id IS NOT NULL OR consulting_project_id IS NOT NULL` — at least one context required.

RLS policy `rv_read_own` updated to include consulting context: reader's org must own the consulting_project OR the parent ration.

**WHY:** `ration_versions` stores NASEM calculation results. The results are identical whether from farm or consulting context — no reason to duplicate the storage structure. Nullable FK is the minimal additive change.

**ALTERNATIVES CONSIDERED:**
1. Separate `consulting_ration_versions` table — rejected: duplicates entire schema + solver output structure.
2. Single `context` JSONB — rejected: loses FK integrity.
3. Nullable FK + CHECK (chosen) — minimal change, FK integrity preserved, additive.

**CONSEQUENCES:**
- Easy: NASEM output stored uniformly regardless of context.
- Easy: `rpc_get_current_ration` (farm RPC) unchanged — it filters by `ration_id IS NOT NULL`.
- Safe: existing farm ration data not affected (ration_id still populated, consulting_project_id NULL).

---

### D-GATE-S8 — Slice 8 Gate: QA Pass + Architect Sign-Off

**Date:** 2026-04-09
**Domain:** Gate / Quality

**WHAT:** Slice 8 "Унификация рационов и консалтинга" passed QA gate and received Architect sign-off.

**QA Results:**
- Duplicate function check: PASS (0 new duplicates)
- rpc_name_registry: PASS (all 9 Slice 8 RPCs registered)
- Dok 3 ↔ SQL: PASS (all signatures match)
- ration_versions migration: PASS (nullable FK + CHECK + RLS)
- Edge Function dual-context: PASS (validates farm_id OR consulting_project_id)
- SECURITY DEFINER + search_path: PASS (all 9 RPCs confirmed)
- TypeScript build: PASS (0 errors after 6 fixes)
- Python fallback chain: PASS (herd keys correct, 3-level chain wired)

**Defects resolved:** DEF-027 (rpc_list_feed_items/rpc_list_animal_categories missing in SQL), DEF-028..032 (TypeScript build errors), +1 `noUncheckedIndexedAccess` fix.

**Deliverables:**
- DB: 9 new RPCs (RPC-F01..F07 in d03_feed.sql, C-RPC-09/10 in d09_consulting.sql)
- DB: `feed_consumption_norms` table, `ration_versions` migration (nullable FK + CHECK + RLS)
- Backend: `calculate-ration` Edge Function — dual context (farm + consulting)
- Backend: `_load_feed_reference()` in `calculate.py`, 3-level fallback chain in `feeding_model.py`
- UI: `FeedReferenceAdmin.tsx` (/admin/feeds — 3 tabs), `RationTab.tsx` (/admin/consulting/:id/ration)
- Docs: SPRINT_STATUS.md, DECISIONS_LOG.md (D-S8-1..4), Dok 3 (section 13b)

**CONSEQUENCES:**
- Easy: Admin updates feed prices once → flows to both Farm ration calculator and Consulting P&L
- Easy: Consultant builds NASEM ration per animal category → P&L uses exact feed COGS
- Easy: New projects fall back to feed_consumption_norms → hardcoded defaults (zero-config)
- Next: D-S6a-FIX-1 (Expert screens .from() → READ-RPCs, status: unstaged), then Slice 7 (Education)

---

### ADR-CONSULT-1 — Consulting Module: Hybrid Architecture

**Date:** 2026-04-08
**Domain:** Architecture

**WHAT:** New consulting module for investment project packaging (Zengi Farms).
Architecture: Hybrid — Python calculation engine as standalone FastAPI on Railway,
database (d09_consulting.sql) and UI within existing AGOS Supabase + React.

**WHY:** Python engine needs numpy/pandas/numpy-financial (can't run in Supabase Edge Functions).
UI and data should live inside AGOS for unified UX and standard RLS/audit/event patterns.
AI Gateway on Railway already proves this pattern works.

**Alternatives considered:**
1. Fully standalone (Next.js + FastAPI + Docker Compose) — rejected: duplicate auth, separate UI, maintenance burden
2. Fully inside AGOS (Edge Function for calculation) — rejected: Edge Functions can't run numpy/pandas, 2-10s calculation time exceeds limits
3. Hybrid (chosen): best of both worlds

**CONSEQUENCES:**
- Easy: standard AGOS patterns (RPC, RLS, events) work for data layer
- Easy: single auth flow (Supabase JWT) for both AGOS and engine
- Easy: unified UI in existing React app
- Hard: two Railway services to maintain (AI Gateway + Consulting Engine)
- Hard: CORS and JWT verification in engine
- New: d09_consulting.sql (3 tables, 8 RPCs), consulting_engine/ directory

**Deliverables:**
- `d09_consulting.sql`: consulting_projects, consulting_project_versions, consulting_reference_data
- `consulting_engine/`: FastAPI + 11 calculation modules (timeline through NPV/IRR)
- `src/pages/admin/consulting/`: 3 UI pages (Dashboard, Wizard, Results)
- 8 RPCs: RPC-C01..C08
- Events: consulting.project.created, consulting.version.created, consulting.project.calculated

---

### D-WEIGHT-1 — WeightCalc: Динамический расчёт веса реализации

**Date:** 2026-04-09
**Domain:** Architecture

**WHAT:** Новый модуль `weight_model.py` в consulting engine. Заменяет захардкоженные
константы веса (STEER_WEIGHT=331, HEIFER_WEIGHT=267, COW_CULLED=600, BULL_CULLED=750)
на динамический расчёт:

```
W_sale = birth_weight + Σ(daily_gain[season] × days_in_month)
```

Привесы зависят от сезона: пастбище (май-октябрь) выше, стойло (ноябрь-апрель) ниже.
Все параметры вынесены в ProjectInput с defaults из зоотехнических норм:
- birth_weight_kg = 30 кг
- daily_gain_steer: pasture=0.850, stall=0.650 кг/день
- daily_gain_heifer: pasture=0.810, stall=0.600 кг/день
- cow_culled_weight_kg = 600 кг, bull_culled_weight_kg = 750 кг

**WHY:** Хардкоженные 331/267 были приблизительными оценками из Excel-шаблона.
Динамический расчёт:
1. Математически корректен (вес зависит от длительности откорма и сезона)
2. Показывает разницу между зимним и летним отёлом (11 мес vs 5 мес роста до первого декабря)
3. Позволяет инвестору подбирать параметры привеса через ProjectInput
4. Revenue меняется — это ожидаемо и правильно

**Alternatives considered:**
1. Калибровать defaults под 331/267 (backward compat) — отвергнуто: нецелевое,
   подгонка под неточные данные вместо корректного расчёта
2. Привязать привес к рациону (ME → ADG) — отложено на v2 (D-WEIGHT-2):
   создаёт циклическую зависимость Рацион → ME → Привес → Вес → Потребность → Рацион

**Files:**
- NEW: `consulting_engine/app/engine/weight_model.py`
- MOD: `consulting_engine/app/models/schemas.py` (7 новых полей в ProjectInput)
- MOD: `consulting_engine/app/engine/input_params.py` (weight_params структура)
- MOD: `consulting_engine/app/engine/orchestrator.py` (weight в pipeline: herd → weight → ... → revenue)
- MOD: `consulting_engine/app/engine/revenue.py` (динамические веса + fallback к константам)

**Pipeline order:** timeline → input → herd → **weight** → capex → staff → wacc → feeding → revenue → opex → pnl → cashflow

**CONSEQUENCES:**
- Easy: инвестор подбирает привесы под свою породу/регион через параметры проекта
- Easy: разница зимнего vs летнего отёла видна в P&L автоматически
- Easy: вес при выбраковке коров/быков настраивается (не хардкод 600/750)
- Changed: revenue отличается от предыдущих расчётов — это корректно
- Next: D-WEIGHT-2 (advisory привес из рациона), UI для параметров привеса

---

### D-WEIGHT-2 — Future: Вывод привеса из энергетического баланса рациона

**Date:** 2026-04-09
**Domain:** Future/Plan
**Status:** PLANNED (не реализовано)

**WHAT:** В будущей версии (v2) — вывод ожидаемого суточного привеса из
энергетического баланса NASEM-рациона и показ рекомендации пользователю.

**Формула:**
```
ME_available = ME_рациона - ME_поддержания
ME_поддержания ≈ 0.322 × W^0.75 МДж/день (NASEM Beef 8th ed.)
ADG_expected = ME_available / 34 МДж/кг (конверсия для молодняка)
```

**Пример рекомендации в UI:**
```
"Ваш рацион для бычков (стойло) обеспечивает ~48 МДж ОЭ/день.
 При весе 200кг поддержание = 32 МДж → на рост 16 МДж → ≈0.47 кг/день.
 Текущая настройка привеса: 0.650 кг/день — рацион может быть недостаточным."
```

**WHY:** Привес зависит от рациона, но прямая привязка создаёт циклическую
зависимость. Advisory layer решает проблему без цикла:
- WeightCalc использует статичные привесы из ProjectInput
- Отдельный advisory блок сравнивает настроенный привес с расчётным из рациона
- Показывает предупреждение если рацион не обеспечивает заданный привес
- Пользователь решает сам: изменить рацион или скорректировать привес

**Integration points:**
- Данные: `ration_versions.results.nutrient_values.me_mj` (ОЭ из NASEM solver)
- Данные: `enriched_input.weight_params.daily_gains` (настроенные привесы)
- UI: advisory badge/alert в RationTab CalcDialog или в отдельной секции ProjectWizard
- Trigger: пересчитывается при изменении рациона или параметров привеса

**CONSEQUENCES:**
- Easy: зоотехник видит соответствие между рационом и целевым привесом
- Easy: не ломает существующий flow (advisory, не imperative)
- Hard: нужны точные коэффициенты конверсии ME→привес по категориям и возрастам
- Dependency: требует прикреплённые NASEM-рационы по категориям в consulting project

---

### D-S9-1 — Стратегия реализации бычков (GAP-1 критичный)

**Date:** 2026-04-09  
**Domain:** Architecture / Consulting Engine

**WHAT:** Добавлен параметр `steer_sale_age_months: int` (0/7/12/18) в `ProjectInput`.
Когортный трекинг `steer_cohorts: list[list]` в `herd_turnover.py` — продажа бычков
по достижении целевого возраста вместо хардкодированной продажи в декабре.

**WHY:** До этого бычки всегда продавались в декабре (legacy). Эксперт должен
моделировать три стратегии: ранняя реализация (7 мес.), лёгкое доращивание
(12 мес.), глубокое доращивание (18 мес.). Это наиболее влиятельный параметр
для P&L — разница в весе при реализации и длительности кормления.

**Backward compatibility:** `steer_sale_age_months=0` → декабрьская продажа
(точный legacy-поведение). Все существующие расчёты дают идентичный результат.

**Edge cases решены:**
- Смертность бычков: применяется пропорционально ко всем когортам
- Перевод в быки: вычитается из старейшей когорты первой
- Когорты с count < 0.01 обрезаются после каждой операции

**Files:** `schemas.py`, `herd_turnover.py`, `ProjectWizard.tsx`  
**Downstream (автоматически):** `weight_model.py`, `revenue.py`, `feeding_model.py`

**CONSEQUENCES:**
- Easy: эксперт выбирает стратегию из wizard — P&L пересчитывается автоматически
- Easy: backward-compatible, не ломает существующие расчёты
- Hard: когортный трекинг усложняет herd_turnover — нужен тест на regression

---

### D-S9-2 — SimpleRationEditor: табличный режим ввода рационов

**Date:** 2026-04-09  
**Domain:** UX / Consulting

**WHAT:** Новый компонент `SimpleRationEditor.tsx` — таблица "корм × сезон (кг/гол/сут)"
для 5 групп (COW, SUCKLING_CALF, HEIFER_YOUNG, STEER, BULL_BREEDING).
Toggle "Простой / NASEM" в `RationTab.tsx`. Оба режима сохраняют через
`rpc_save_consulting_ration` — единый формат хранения.

**WHY:** NASEM-калькулятор оптимизирует по нутриентам — это слишком сложно для
базового сценария. Эксперт хочет просто задать "сено 8 кг, силос 17 кг" без
решения оптимизационной задачи. SimpleRationEditor покрывает 80% use cases быстрее.

**CONSEQUENCES:**
- Easy: базовые сценарии решаются за секунды
- Easy: DEFAULT_RATIONS = CFC Excel defaults — нет необходимости вводить с нуля
- No change: NASEM остаётся для advanced scenarios. Один источник хранения данных.

---

### D-S9-3 — economic_parameters в consulting_reference_data

**Date:** 2026-04-09  
**Domain:** DB / Configuration

**WHAT:** Категория `'economic_parameters'` добавлена в CHECK constraint таблицы
`consulting_reference_data`. Seed row: `feed_inflation → {"rate": 0.105}`.
`feeding_model.py` читает ставку инфляции из БД, fallback на `FEED_INFLATION_DEFAULT = 0.105`.

**WHY:** Инфляция кормов была хардкодирована в Python — обновление требовало деплоя.
P8 требует: все нормативы из БД. Теперь ставку можно обновить через admin UI.

**CONSEQUENCES:**
- Easy: обновление инфляции без деплоя engine
- Easy: разные значения для разных периодов (valid_from/valid_to)
- No change: fallback обеспечивает backward compat если seed не загружен

---

### D-S9-4 — Физические объёмы кормов в output feeding_model

**Date:** 2026-04-09  
**Domain:** Architecture / Engine Output

**WHAT:** `feeding_model.py` теперь возвращает помимо денежных значений физические
объёмы в тоннах: `quantities.by_group` (по группам животных), `quantities.totals_by_feed`
(суммарно по видам корма, 120 мес.), `annual_feed_summary` (10 лет × вид корма).
`SummaryTab.tsx` отображает `annual_feed_summary` в виде таблицы.

**WHY:** Бизнес-план требует раздел "Кормовая база" в тоннах — для проверки
мощности хранилищ и планирования закупок. Денежная модель этого не даёт.
`annual_feed_summary` = ключевая таблица экспертного сценария Zengi.

**CONSEQUENCES:**
- Easy: SummaryTab показывает тонны/год — готово к экспорту в бизнес-план
- Easy: аддитивный output — существующие потребители output не ломаются
- Future: основа для автоматической генерации раздела "Кормовая база" в Word/PDF
