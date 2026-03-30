# AGOS Sprint Status

> Last updated: 2026-03-30 by Backend Agent (Slice 3 session)

---

## Slice 0 — Foundation ✅ COMPLETE
- SQL files deployed (d01→d08)
- cross_check.sh operational
- DB Gate: PASSED

## Slice 1 — "У телёнка температура" (Sick Calf) ✅ COMPLETE
- Gate: D-GATE-S1 (2026-03-19)
- All RPCs: RPC-01, 02, 04, 05/05b, 40, 25 (d01) + AI-01..22 (d07)
- Backend: /chat + LangGraph + vet tools + compliance ✅
- UI: F01, F02, F10, F11 ✅
- Tech debt: DEF-013 (3x .table() in nodes.py — resolve before Slice 3 confirmation flow)

## Slice 2 — Членство (Membership) ✅ COMPLETE
- Gate: D-GATE-S2 (2026-03-19)
- RPCs: rpc_get_membership_queue, RPC-03 (d01) ✅
- Backend: WhatsApp notification worker ✅
- UI: A01, A02 ✅

## Slice 3 — "Сколько корма нужно?" (Feed Planning) 🔄 IN PROGRESS

### Dok 6 Contracts ✅
- AGOS-Dok6-Slice3-Feed.md v1.1 — F03, F04, F15–F18 (6 screens)
- D-S3-1 (individual fields), D-S3-2 (farm-level return), D-S3-3 (8 review fixes)

### DB Agent — d01_kernel.sql ✅ COMPLETE

| RPC | Function | Status | Notes |
|-----|----------|--------|-------|
| RPC-07 | `rpc_log_herd_event` | ✅ Implemented | Append-only INSERT into herd_events (D25). Event: farm.herd_event.logged. |
| RPC-08 | `rpc_get_farm_summary` | ✅ Implemented | Cross-domain read: farm + herd_groups + feed_inventory + vet_cases + tasks. STABLE. |

### DB Agent — d03_feed.sql ✅ COMPLETE

| RPC | Function | Status | Notes |
|-----|----------|--------|-------|
| RPC-21 | `rpc_upsert_feed_inventory` | ✅ Implemented | D-S3-1: individual fields. D45 Layered Truth confidence auto-set. Event: feed.inventory.updated. |
| RPC-22 | `rpc_save_ration` | ✅ Implemented | Create ration + append-only version (D51). Triggers: is_current flag, auto-activate. Event: feed.ration.created. |
| RPC-23 | `rpc_archive_ration` | ✅ Implemented | FSM: draft|active → archived. Idempotent. Event: feed.ration.archived. |
| RPC-24 | `rpc_get_current_ration` | ✅ Implemented | D-S3-2: farm-level return. All active rations with current version. STABLE. |

### cross_check.sh Results (2026-03-30)
- **Critical: 0**
- Significant: 1 (d05 `rpc_start_production_plan` missing org_id — Slice 4 scope)
- All new functions: SECURITY DEFINER ✅, organization_id ✅, no duplicates ✅

### Backend Agent — AI Gateway (Slice 3) ✅ COMPLETE

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Feed tools (5 tools) | `ai_gateway/tools/feed.py` | ✅ Implemented | get_feeding_plan, get_farm_summary, get_current_ration, update_feed_inventory, log_herd_event |
| EXTRACTION_RULES (C-NEW-1) | `ai_gateway/extraction/rules.py` | ✅ Implemented | Animal category + feed item mapping (RU/KK → EN DB codes) |
| `calculate_ration` Edge Function | `supabase/functions/calculate-ration/index.ts` | ✅ Implemented | Greedy cost-minimization with NASEM nutrient constraints. Saves via rpc_save_ration. |
| `get_feed_budget` Edge Function | `supabase/functions/get-feed-budget/index.ts` | ✅ Implemented | Per-head + total budget with deficit tracking. Uses rpc_get_current_ration. |
| Zootechnician role signals | `ai_gateway/nodes.py` | ✅ Implemented | Feed/ration/herd keywords (RU+KK) trigger zootechnician role |
| Feed tool dispatch | `ai_gateway/nodes.py` | ✅ Implemented | 5 feed tools wired into execute_tools_node |

### P-AI Principle Verification (Slice 3)

| Principle | Status | How |
|-----------|--------|-----|
| P-AI-1 | ✅ | All writes via supabase.rpc(). Feed tools call rpc_upsert_feed_inventory, rpc_log_herd_event. Edge Functions call rpc_save_ration. |
| P-AI-2 | ✅ | organization_id injected from state in every RPC call. |
| P-AI-3 | ✅ | update_feed_inventory marked as confirmation-required. Extraction rules build confirmation payloads. |
| P-AI-5 | ✅ | Compliance filter runs on all responses (unchanged from Slice 1). |

### UI Agent — Screens (Slice 3) 📋 NOT STARTED
- F03 (Herd Overview), F04 (Add/Edit Herd Group)
- F15 (Feed Inventory), F16 (Add/Edit Feed)
- F17 (Ration Viewer), F18 (Feed Budget)

---

## Open Defects

| ID | Severity | Status | Description |
|----|----------|--------|-------------|
| DEF-013 | Minor | Open | 3x `.table()` in nodes.py — must fix before Slice 3 confirmation flow |
| D-F01-3 | Minor | Pending CEO | org_type CHECK mismatch (services/feed_producer vs supplier/consultant/other) |
| Defect 3 | Minor | Unverified | `rpc_get_active_prompt` existence in deployed schema |
| Defect 4 | Minor | Unverified | `rpc_update_confirmation_payload` missing |

---

## Next Steps (Slice 3 inner flow)
1. ~~Architect: Dok 6 contracts~~ ✅
2. ~~DB Agent: RPC-07, 08, 21–24~~ ✅
3. ~~Backend Agent: AI-03 + Edge Functions~~ ✅
4. **UI Agent: 6 screens** ← NEXT
5. QA Agent: gate check
