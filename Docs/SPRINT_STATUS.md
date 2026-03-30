# AGOS Sprint Status

> Last updated: 2026-03-30 by Architect (post-deploy)

---

## Slice 0 — Foundation ✅ COMPLETE (2026-03-17)
## Slice 1 — "У телёнка температура" ✅ COMPLETE (D-GATE-S1, 2026-03-19)
## Slice 2 — Членство ✅ COMPLETE (D-GATE-S2, 2026-03-19)
## Slice 3 — "Сколько корма нужно?" ✅ COMPLETE (D-GATE-S3, 2026-03-30)
## Slice 4 — "Мой план на сезон" ✅ COMPLETE (D-GATE-S4, 2026-03-30)

---

## Deployed to Production (2026-03-30)

### Supabase RPCs (7 new)
| RPC | Function | Deployed |
|-----|----------|----------|
| RPC-07 | `rpc_log_herd_event` | ✅ |
| RPC-08 | `rpc_get_farm_summary` | ✅ |
| RPC-21 | `rpc_upsert_feed_inventory` | ✅ |
| RPC-22 | `rpc_save_ration` | ✅ |
| RPC-23 | `rpc_archive_ration` | ✅ |
| RPC-24 | `rpc_get_current_ration` | ✅ |
| RPC-37 | `rpc_get_active_plan` | ✅ |

### Supabase Edge Functions (2 new)
| Function | Deployed |
|----------|----------|
| `calculate-ration` | ✅ ACTIVE |
| `get-feed-budget` | ✅ ACTIVE |

### Frontend (Vercel, auto-deploy)
| Screen | Route | Deployed |
|--------|-------|----------|
| F03 Herd Overview | `/cabinet/herd` | ✅ |
| F04 Herd Group Form | `/cabinet/herd/add` | ✅ |
| F15 Feed Inventory | `/cabinet/feed` | ✅ |
| F16 Feed Item Form | `/cabinet/feed/add` | ✅ |
| F17 Ration Viewer | `/cabinet/ration` | ✅ |
| F18 Feed Budget | `/cabinet/ration/budget` | ✅ |
| F19 Production Plan | `/cabinet/plan` | ✅ |
| F20 Task List | `/cabinet/plan/tasks` | ✅ |
| F21 Timeline | `/cabinet/plan/timeline` | ✅ |
| F22 Cascade Preview | `/cabinet/plan/cascade/:id` | ✅ |
| F23 KPI Dashboard | `/cabinet/plan/kpi` | ✅ |

---

## Cumulative Stats

| Metric | Count |
|--------|-------|
| Slices complete | 5 (0–4) |
| Farmer screens (F-series) | 15 |
| Admin screens (A-series) | 3 |
| RPCs deployed | 20+ |
| AI tools (Gateway) | 14 (4 vet + 5 feed + 4 ops + 1 context) |
| Edge Functions | 2 |
| Gate passes | 4 (S1–S4) |

---

## Open Tech Debt

| ID | Severity | Description |
|----|----------|-------------|
| DEF-013 | Minor | 3x `.table()` in nodes.py |
| DEF-023 | Significant | UI `.from()` on reference tables (Slice 3) |
| DEF-024 | Minor | Backend feed.py `.table("feed_items")` for code→id |
| D-F01-3 | Minor | org_type CHECK mismatch — pending CEO |

---

## Next Slices

| Slice | Status | Blocked By |
|-------|--------|------------|
| **Slice 5 (Market)** | ⛔ BLOCKED | Legal gate (Article 171) |
| **Slice 6 (Expert)** | READY | Nothing — can start |
| **Slice 7 (Education)** | READY after Slice 6 | Slice 6 DB |

**Recommended:** Deploy → farmer feedback → Slice 6 (Expert Console)
