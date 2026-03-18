# SPRINT STATUS — AgOS

> Maintained by: Architect (planning/sign-off), DB Agent (after SQL), Backend Agent (after code), UI Agent (after UI)
> Last updated: 2026-03-19

---

## Current Phase: Slice 2 (Membership)

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
| QA | Slice 2 gate | ⬜ Not started | |

### Slice 3 — "Сколько корма нужно?" (Feed Planning)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | F03, F04, F15–F18 | ⬜ Not started | |
| DB | RPC-07, 08 (d01) + RPC-21..24 (d03) | ⬜ Not started | |
| Backend | AI-03 feed tool + EXTRACTION_RULES + calculate_ration | ⬜ Not started | |
| UI | F03, F04, F15–F18 | ⬜ Not started | 6 screens |
| QA | Slice 3 gate | ⬜ Not started | |

Already implemented: RPC-06 (`rpc_upsert_herd_group`).

### Slice 4 — "Мой план на сезон" (Operations)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | F19–F23 | ⬜ Not started | |
| DB | RPC-37, 43..45 (d05) | ⬜ Not started | |
| Backend | AI-04..06 ops tools + proactive + embedding | ⬜ Not started | |
| UI | F19–F23 | ⬜ Not started | 5 screens |
| QA | Slice 4 gate | ⬜ Not started | |

Already implemented: RPC-33..36.

### Slice 5 — "Хочу продать бычков" (Market) — ⛔ BLOCKED by legal gate

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | F05–F09, A11–A15 | ⬜ Not started | |
| DB | RPC-11..20 (d02) | ⬜ Not started | |
| Backend | AI-16..21 market tools + disclaimer | ⬜ Not started | |
| UI | F05–F09, A11–A15 | ⬜ Not started | 10 screens |
| QA | Slice 5 gate | ⬜ Not started | |

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
| `ai_gateway/proactive.py` | ⬜ Not started | Slice 4 |
| `ai_gateway/embedding_worker.py` | ⬜ Not started | Slice 4 |
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

---

## Gates

| Gate | Status | Blocking |
|------|--------|----------|
| **DB Gate** | ✅ PASSED (0 critical, 7 significant) | All application code |
| **Dok 6 Gate (Slice 1)** | ✅ PASSED (2026-03-18) | F01, F02, F10, F11 contracts approved |
| **Legal Gate** | ⬜ Not started | Slice 5 (Market) |
| **Slice 1 Gate** | ✅ **PASSED** (2026-03-19) | QA pass + Architect sign-off. DEF-013 accepted. |
| **Slice 2 Gate** | ⬜ Not started | Merge Slice 2 to main |
| **Slice 3 Gate** | ⬜ Not started | Merge Slice 3 to main |
| **Slice 4 Gate** | ⬜ Not started | Merge Slice 4 to main |
| **Slice 5 Gate** | ⬜ Not started | Merge Slice 5 to main |
| **Slice 6 Gate** | ⬜ Not started | Merge Slice 6 to main |
| **Slice 7 Gate** | ⬜ Not started | Merge Slice 7 to main |

---

## Slice History

| Slice | Completed | Duration | Notes |
|-------|-----------|----------|-------|
| Slice 0 (Foundation) | 2026-03-18 | 1 day | DB Gate passed, cross_check.sh created |
| Slice 1 (Sick Calf) | 2026-03-19 | 2 days | 9 RPCs, AI Gateway, 4 screens, QA passed |
