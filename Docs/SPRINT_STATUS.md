# AGOS Sprint Status

> Last updated: 2026-04-01 by Architect (post-audit)

---

## Completed Slices

| Slice | Gate | Date |
|-------|------|------|
| Slice 0 — Foundation | DB Gate | 2026-03-17 |
| Slice 1 — Sick Calf | D-GATE-S1 | 2026-03-19 |
| Slice 2 — Membership | D-GATE-S2 | 2026-03-19 |
| Slice 3 — Feed Planning | D-GATE-S3 | 2026-03-30 |
| Slice 4 — Operations | D-GATE-S4 | 2026-03-30 |
| Slice 6a — Expert Console | D-GATE-S6a | 2026-03-31 |

## Deployed Infrastructure

| Component | URL/Status |
|-----------|------------|
| Frontend (Vercel) | https://ag-os.vercel.app |
| AI Gateway (Railway) | https://agos-production.up.railway.app |
| Supabase | mwtbozflyldcadypherr (ap-south-1) |
| Edge Functions | calculate-ration, get-feed-budget (ACTIVE) |

## Screens (28 total)

| Series | Count | Screens |
|--------|-------|---------|
| Farmer (F) | 16 | F01-F04, F10-F12, F15-F23 |
| Admin (A) | 6 | A01-A05, AdminDashboard |
| Expert (M) | 6 | M01-M06 |

## RPCs Deployed (26+)

Slice 1: RPC-01,02,04,05/05b,25,26,27,40 + AI-01..23
Slice 2: RPC-03, rpc_get_membership_queue
Slice 3: RPC-07,08,21-24
Slice 4: RPC-37
Slice 6a: RPC-28,29,31,32,44,45 + rpc_activate_vaccination_plan

## Blocked

| Slice | Blocker |
|-------|---------|
| Slice 5 (Market) | Legal gate (Article 171) |
| Slice 6b (Admin A06-A10) | Low priority |
| Slice 7 (Education) | Ready |

## Open Tech Debt

| ID | Severity | Description |
|----|----------|-------------|
| DEF-009 | Known | fn_my_org_ids/fn_is_admin/fn_is_expert dual defs (d01 naive + d07 JWT) |
| DEF-023 | Low | Farmer pages .from() on reference tables |
| S-1 | Significant | rpc_start_production_plan missing p_organization_id |
| S-2/S-3 | Significant | Seed ON CONFLICT without UNIQUE (nutrient_requirements, epidemic_thresholds) |
