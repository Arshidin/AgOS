# Dok 6 — Interface Contracts: Slice 6b "Admin Settings"

> Version: 1.0 | Date: 2026-04-01
> Scope: 5 admin screens (A06–A10)

## Navigation
```
/admin
├── /admin/users         → A06 (User Management)
├── /admin/roles         → A07 (Role Assignment)
├── /admin/orgs          → A08 (Organization Management)
├── /admin/regions       → A09 (Region Directory)
└── /admin/settings      → A10 (System Settings)
```

## CTO Decision D-S6b-1: All screens use `.from()` with admin RLS. No new RPCs — pure CRUD. One RPC for role assignment (`rpc_assign_role`).

---

## A06 — Пользователи
| Route | `/admin/users` | Auth | `fn_is_admin()` |
Table: users + user_organization_roles. Search by name/phone/email. View org membership.

## A07 — Роли
| Route | `/admin/roles` | Auth | `fn_is_admin()` |
Assign/revoke admin_roles and expert_profiles. RPC: `rpc_assign_role` (new).

## A08 — Организации
| Route | `/admin/orgs` | Auth | `fn_is_admin()` |
Table: organizations. Edit legal_name, bin_iin, region. View farms + members.

## A09 — Регионы
| Route | `/admin/regions` | Auth | `fn_is_admin()` |
Table: regions. Reference data. View/search only (P8: admin edits via dashboard).

## A10 — Настройки
| Route | `/admin/settings` | Auth | `fn_is_admin()` |
System info: deployed version, env status, feature summary. Read-only.
