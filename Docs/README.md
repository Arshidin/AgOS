# AGOS — Complete Architecture Package

**Status:** Ready for Vibecoding Sprints (with 1 Critical Gap)  
**Date:** March 17, 2026  
**Total Size:** 1.1 MB (12 files)

---

## 📦 What You Have

### Documentation (315K) — Read in This Order

1. **AGOS-Dok1-v1_8.md** (77K, 1772 lines)
   - Domain Model with 91 entities
   - Consolidated ERD (Mermaid)
   - Ownership Matrix (who reads/writes what)
   - FSM Catalog (all state machines)
   - **START HERE** — this is your data model truth source

2. **AGOS-Dok3-RPC-Catalog-v1_4.md** (43K, 814 lines)
   - All 67 callable functions
   - Parameter signatures
   - Return types
   - Implementation status (which ones are in SQL)

3. **AGOS-Dok4-EventBus-v1_1.docx** (83K)
   - 59 canonical events
   - When each fires (triggers)
   - Notification templates
   - Proactive engine subscriptions

4. **AGOS-Dok5-AIGateway-v1_7.md** (112K, 2315 lines)
   - LangGraph architecture
   - Two-run confirmation pattern (critical for WhatsApp)
   - Tool catalog (mapped to d07 SQL RPCs)
   - JWT claim structure
   - Concurrency model (SKIP LOCKED)

### SQL Schema (783K) — Execute in This Order

1. **d01_kernel.sql** (175K, 3343 lines)
   - Identity domain (User, Organization, Roles)
   - Farm domain (HerdGroup, HerdEvent)
   - Platform domain (PlatformEvent, Notification, AuditLog)
   - **Run this first.** Zero dependencies.

2. **d02_tsp.sql** (54K, 985 lines)
   - Market/Trading Coordination (Batch, Pool, Delivery)
   - Price grids and indices
   - Depends on: d01

3. **d03_feed.sql** (52K, 892 lines)
   - Feed inventory, nutrition planning
   - Rations and feeding schedules
   - Depends on: d01

4. **d04_vet.sql** (109K, 1698 lines)
   - Veterinary cases, diagnoses, treatments
   - Vaccination protocols and plans
   - Epidemic thresholds (reference data)
   - Depends on: d01

5. **d05_ops_edu.sql** (232K, 4275 lines)
   - Production cycle templates and farm plans
   - Task management
   - Education platform (courses, modules, enrollments)
   - KPI tracking
   - Depends on: d01

6. **d07_ai_gateway.sql** (135K, 2977 lines)
   - All RPC implementations for LangGraph tools
   - JWT validation, org ownership checks
   - Farm context extraction
   - Depends on: d01-d05

7. **d08_epidemic.sql** (26K, 543 lines)
   - Epidemic detection triggers
   - Threshold checking and signal generation
   - Depends on: d01, d04

---

## 🎯 What's Next

### For Vibecoding Sprints

1. **Start DB-1 KERNEL** (d01_kernel.sql)
   - Run SQL in clean Supabase project
   - Verify RLS policies auto-enforced
   - Test FK dependencies

2. **Then Sequential:**
   - DB-2 (d02_tsp) → DB-3 (d03_feed) → DB-4 (d04_vet) → DB-5 (d05_ops_edu)
   - DB-7 (d07_ai_gateway) → DB-8 (d08_epidemic)
   - Each depends on prior ones — **do not parallelize yet**

3. **AI Gateway (Python)**
   - Use d07_ai_gateway.sql RPC definitions
   - Implement LangGraph per Dok 5 specification
   - Map each tool to RPC via rpc_* naming convention (see Dok 5 §2)

4. **Web Cabinet (Lovable)**
   - ⚠️ **BLOCKED:** Waiting for Dok 6 (Interface Contracts)
   - Once you have screen definitions, match them to entities in Dok 1
   - Use design system colors from userMemories

---

## ❌ CRITICAL: Dok 6 is Missing

**Dok 6 — Interface Contracts (v1.3)** should contain:
- 106 user-facing scenarios
- 53 SCREEN contracts (F01-F28, A01-A19, M01-M06, etc.)
- Sprint 1-4 workload definition

**Current Status:** File not found in /mnt/project  

**Action Required:**
1. Check Google Drive / Notion / other storage
2. Or create Dok 6 before starting Lovable sprints
3. Or proceed with UI sprints ad-hoc (not recommended — risks disconnection from data model)

---

## 🔗 Cross-Document References

**If you need to understand...** | **Read this first...**
---|---
How farmer data flows through the system | Dok 1 (§2 Domain Map + §3 ERD)
What data each module reads/writes | Dok 1 (§4 Ownership Matrix)
How to call business logic from Web/AI | Dok 3 (RPC signatures)
How modules communicate | Dok 4 (Event Bus subscriptions)
How AI agents interact with the platform | Dok 5 (Tool catalog + two-run pattern)
Individual entity design | d01-d08 (search CREATE TABLE)
RPC implementations | d01-d08 (search CREATE OR REPLACE FUNCTION)

---

## ✅ Verification

All files have been verified as of **March 17, 2026, 15:06 UTC+6**:

- ✅ Dok 1-5 latest versions from /mnt/project
- ✅ SQL d01-d05, d07-d08 consolidated and deduplicated
- ✅ No CRITICAL errors in cross-check validation
- ✅ RLS policies auto-enforced on all tables
- ⚠️ **Dok 6 missing** (noted above)
- ⚠️ **d06 does not exist** (logical domains consolidated into 7 files)

---

## 📞 Questions?

**For architecture/schema questions:** Reference Dok 1 + relevant SQL file  
**For RPC questions:** Reference Dok 3 + d07_ai_gateway.sql  
**For event flow questions:** Reference Dok 4  
**For AI implementation:** Reference Dok 5 + d07_ai_gateway.sql  
**For UI/screen questions:** **CREATE Dok 6** or contact Arshidin

---

**Prepared by:** Claude, CTO  
**For:** Arshidin, CEO TURAN  
**Project:** TURAN Agricultural Operating System (AgOS)
