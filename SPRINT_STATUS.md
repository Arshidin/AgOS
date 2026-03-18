# SPRINT STATUS — AgOS

> Maintained by: Architect (planning/sign-off), DB Agent (after SQL), Backend Agent (after code), UI Agent (after UI)
> Last updated: 2026-03-18

---

## Current Phase: Slice 0 (Foundation)

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
| Dok 6 | F01, F02, F10, F11 | ⬜ Not started | Architect creates just-in-time |
| DB | RPC-01 `rpc_register_organization` (d01) | ⬜ Not started | |
| DB | RPC-04 `rpc_get_my_context` (d01) | ⬜ Not started | |
| DB | RPC-05/05b `rpc_upsert_farm` / `rpc_set_farm_activity_types` (d01) | ⬜ Not started | |
| DB | RPC-40 `rpc_start_ai_conversation` (d01) | ⬜ Not started | |
| DB | RPC-26 `rpc_add_vet_diagnosis` (d04) | ⬜ Not started | |
| DB | RPC-27 `rpc_add_vet_recommendation` (d04) | ⬜ Not started | |
| Backend | FastAPI scaffold, `/chat` webhook | 🟡 Scaffold exists | `ai_gateway/main.py` |
| Backend | LangGraph graph | ⬜ Not started | |
| Backend | Vet tools AI-07..10 + compliance filter | ⬜ Not started | |
| UI | F01 (Register), F02 (Farm Profile) | ⬜ Not started | |
| UI | F10 (Report Sick), F11 (Vet Case Detail) | ⬜ Not started | |
| QA | Slice 1 gate | ⬜ Not started | |

Already implemented: RPC-25 (`rpc_create_vet_case`), AI-01..AI-22.

### Slice 2 — "Сколько корма нужно?" (Feed Planning)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | F03, F04, F15–F18 | ⬜ Not started | |
| DB | RPC-07 `rpc_log_herd_event` (d01) | ⬜ Not started | |
| DB | RPC-08 `rpc_get_farm_summary` (d01) | ⬜ Not started | |
| DB | RPC-21..24 Feed RPCs (d03) | ⬜ Not started | |
| Backend | AI-03 feed tool + EXTRACTION_RULES + calculate_ration | ⬜ Not started | |
| UI | F03, F04, F15–F18 | ⬜ Not started | |
| QA | Slice 2 gate | ⬜ Not started | |

Already implemented: RPC-06 (`rpc_upsert_herd_group`).

### Slice 3 — "Мой план на сезон" (Operations)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | F19–F23 | ⬜ Not started | |
| DB | RPC-37, 43..45 (d05) | ⬜ Not started | |
| Backend | AI-04..06 ops tools + proactive + embedding | ⬜ Not started | |
| UI | F19–F23 | ⬜ Not started | |
| QA | Slice 3 gate | ⬜ Not started | |

Already implemented: RPC-33..36.

### Slice 4 — "Хочу продать бычков" (Market) — ⛔ BLOCKED by legal gate

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | F05–F09, A11–A15 | ⬜ Not started | |
| DB | RPC-11..20 (d02) | ⬜ Not started | |
| Backend | AI-16..21 market tools + disclaimer | ⬜ Not started | |
| UI | F05–F09, A11–A15 | ⬜ Not started | |
| QA | Slice 4 gate | ⬜ Not started | |

Already implemented: RPC-09, RPC-10.

### Slice 5 — Admin & Expert Console

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| Dok 6 | M01–M06, A01–A10, A16–A19, F24–F28 | ⬜ Not started | |
| DB | RPC-02, 03 (d01) | ⬜ Not started | Membership |
| DB | RPC-28..32 (d04) | ⬜ Not started | Vet close + vaccination |
| DB | RPC-38, 39, 42 (d05) | ⬜ Not started | Education |
| Backend | Remaining wiring + education | ⬜ Not started | |
| UI | M01–M06, A01–A19, F24–F28 | ⬜ Not started | 28 screens |
| QA | Slice 5 gate | ⬜ Not started | |

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
| `ai_gateway/main.py` | 🟡 Scaffold | 3 endpoint stubs |
| `ai_gateway/graph.py` | ⬜ Not started | |
| `ai_gateway/tools/*.py` | ⬜ Not started | |
| `ai_gateway/compliance.py` | ⬜ Not started | |
| `ai_gateway/proactive.py` | ⬜ Not started | |
| `ai_gateway/embedding_worker.py` | ⬜ Not started | |
| `src/` (React UI) | ⬜ Not started | Vite + React + TypeScript |

---

## Defects Found

| ID | Severity | File | Description |
|----|----------|------|-------------|
| DEF-001 | Significant | `d07_ai_gateway.sql` | `rpc_get_ai_farm_context` — 2 definitions (lines 58, 1746) |
| DEF-002 | Significant | `d07_ai_gateway.sql` | `rpc_upsert_herd_group` — 2 definitions (lines 189, 2031) |
| DEF-003 | Minor | `d01_kernel.sql` | `insert_user_message_dedup` — 2 definitions (lines 2345, 2993) |
| DEF-004 | Minor | `d01_kernel.sql` | `claim_pending_notifications` — 2 definitions (lines 2410, 2857) |
| DEF-005 | Minor | `d01_kernel.sql` | `mark_notification_failed` — 2 definitions (lines 2474, 2817) |
| DEF-006 | Significant | `d05_ops_edu.sql` | `fn_preview_cascade` — 2 definitions (lines 2901, 3660) |
| DEF-007 | Significant | `d05_ops_edu.sql` | `fn_generate_production_plan` — 2 definitions (lines 3034, 3961) |
| DEF-008 | Significant | `d05_ops_edu.sql` | `rpc_start_production_plan` — 2 definitions (lines 3529, 3811) |
| DEF-009 | Minor | `d07_ai_gateway.sql` | `fn_my_org_ids`, `fn_is_admin`, `fn_is_expert` duplicated from d01 |

---

## Gates

| Gate | Status | Blocking |
|------|--------|----------|
| **DB Gate** | ✅ PASSED (0 critical, 10 significant) | All application code |
| **Dok 6 Gate (per slice)** | ⛔ NOT PASSED | UI work for current slice |
| **Legal Gate** | ⬜ Not started | Slice 4 (Market) |
| **Slice 1 Gate** | ⬜ Not started | Merge Slice 1 to main |
| **Slice 2 Gate** | ⬜ Not started | Merge Slice 2 to main |
| **Slice 3 Gate** | ⬜ Not started | Merge Slice 3 to main |
| **Slice 4 Gate** | ⬜ Not started | Merge Slice 4 to main |
| **Slice 5 Gate** | ⬜ Not started | Merge Slice 5 to main |

---

## Slice History

_No slices completed yet._
