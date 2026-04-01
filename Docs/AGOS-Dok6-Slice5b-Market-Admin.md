# Dok 6 — Interface Contracts: Slice 5b "Market Admin"

> Version: 1.0 | Date: 2026-04-01
> Author: Architect Agent
> Status: DRAFT — D-LEGAL-1 applies
>
> **Scope:** 5 admin screens (A11–A15) — pool management, batch matching, pricing.

---

## Navigation

```
/admin
├── /admin/pools              → A11 (Pool Requests Queue)
├── /admin/pools/:poolId      → A12+A13+A14 (Pool Detail — activate, match, advance)
└── /admin/pricing            → A15 (Price Grid Management)
```

## CTO Decision D-S5-4: Merge A12+A13+A14 into single Pool Detail screen. Pool lifecycle (activate → match → advance) is one continuous workflow, not 3 separate pages.

---

## A11 — Очередь пул-запросов

| Field | Value |
|-------|-------|
| Route | `/admin/pools` |
| Auth | `fn_is_admin()` |
| RPCs | `rpc_create_pool_request` (RPC-12) for create; `.from('pool_requests')` for list (D-S6-1) |

## A12/A13/A14 — Pool Detail (lifecycle)

| Field | Value |
|-------|-------|
| Route | `/admin/pools/:poolId` |
| Auth | `fn_is_admin()` |
| RPCs | `rpc_activate_pool_request` (RPC-13), `rpc_match_batch_to_pool` (RPC-14), `rpc_advance_pool_status` (RPC-15), `rpc_rollback_batch_match` (RPC-16) |

### Pool FSM displayed:
```
filling → filled → executing → dispatched → delivered → executed → closed
```
D40: contacts revealed ONLY at executing transition.

## A15 — Управление ценами

| Field | Value |
|-------|-------|
| Route | `/admin/pricing` |
| Auth | `fn_is_admin()` |
| RPCs | `rpc_set_price_grid` (RPC-19), `rpc_publish_price_index_value` (RPC-20); `.from('price_grids')` for list |

---

## RPC Plan (7 new in d02)

| RPC | Function | Notes |
|-----|----------|-------|
| RPC-12 | `rpc_create_pool_request` | MPK creates demand request |
| RPC-13 | `rpc_activate_pool_request` | Admin activates → auto-creates Pool |
| RPC-14 | `rpc_match_batch_to_pool` | Admin matches batch → pool, price snapshot |
| RPC-15 | `rpc_advance_pool_status` | FSM transition with D40 contact reveal |
| RPC-16 | `rpc_rollback_batch_match` | Remove match, revert pool counts |
| RPC-19 | `rpc_set_price_grid` | Upsert price + audit log trigger |
| RPC-20 | `rpc_publish_price_index_value` | Append price index value |
