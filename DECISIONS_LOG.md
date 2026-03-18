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
| DEF-001 | Significant | `d07_ai_gateway.sql`: `rpc_get_ai_farm_context` has 2 definitions (lines 58, 1746) — last one wins silently | DB Agent: audit both definitions, remove the stale one |
| DEF-002 | Significant | `d07_ai_gateway.sql`: `rpc_upsert_herd_group` has 2 definitions (lines 189, 2031) | Same as DEF-001 |
| DEF-003 | Minor | `d01_kernel.sql`: `insert_user_message_dedup` has 2 definitions (lines 2345, 2993) | Audit and deduplicate |
| DEF-004 | Minor | `d01_kernel.sql`: `claim_pending_notifications` has 2 definitions (lines 2410, 2857) | Audit and deduplicate |
| DEF-005 | Minor | `d01_kernel.sql`: `mark_notification_failed` has 2 definitions (lines 2474, 2817) | Audit and deduplicate |
| DEF-006 | Significant | `d05_ops_edu.sql`: `fn_preview_cascade` has 2 definitions (lines 2901, 3660) | Audit and deduplicate |
| DEF-007 | Significant | `d05_ops_edu.sql`: `fn_generate_production_plan` has 2 definitions (lines 3034, 3961) | Audit and deduplicate |
| DEF-008 | Significant | `d05_ops_edu.sql`: `rpc_start_production_plan` has 2 definitions (lines 3529, 3811) | Audit and deduplicate |
| DEF-009 | Minor | `d07_ai_gateway.sql`: `fn_my_org_ids`, `fn_is_admin`, `fn_is_expert` duplicated from d01 — d07 loaded last, so d07 version wins | Verify both versions are identical |
| DEF-010 | Critical | `cross_check.sh` does not exist | Must be created before DB Gate can pass |
| DEF-011 | Critical | `Dok 6` does not exist | Created incrementally per slice (D-PROCESS-1) |

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
