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

---

## Decisions

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
