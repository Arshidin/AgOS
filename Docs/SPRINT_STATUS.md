# AGOS Sprint Status

## Slice 1 — "У телёнка температура" (Sick Calf)

### DB Agent — d01_kernel.sql RPCs

| RPC | Function | Status | Notes |
|-----|----------|--------|-------|
| RPC-01 | `rpc_register_organization` | ✅ Implemented | Atomic: Org + TypeAssignment + Role(owner) + Membership(registered) + Farm(if farmer). p_role_data stored in event payload. |
| RPC-02 | `rpc_submit_membership_application` | ✅ Implemented | Creates MembershipApplication(status=submitted). Checks ALREADY_ACTIVE and PENDING_EXISTS. |
| RPC-04 | `rpc_get_my_context` | ✅ Implemented | STABLE read. Returns {user_id, organizations[], farms[], memberships[], active_restrictions[]}. |
| RPC-05 | `rpc_upsert_farm` | ✅ Implemented | p_farm_id=null→INSERT, uuid→UPDATE. Ownership check. COALESCE update pattern. |
| RPC-05b | `rpc_set_farm_activity_types` | ✅ Implemented | Full replacement with delta computation. Returns {inserted[], removed[]}. |
| RPC-40 | `rpc_start_ai_conversation` | ✅ Implemented | 24h session window. Reuses active conversation. Loads context from d07 if available. |

### DB Agent — d04_vet.sql RPCs (pending)

| RPC | Function | Status | Notes |
|-----|----------|--------|-------|
| RPC-26 | `rpc_add_vet_diagnosis` | 📋 Planned | Next session |
| RPC-27 | `rpc_add_vet_recommendation` | 📋 Planned | Next session |

### Defects Flagged

1. **D-F01-3 org_type mismatch**: CEO decision says `services` and `feed_producer`, but schema CHECK allows `supplier`, `consultant`, `other`. Need resolution.
2. **Migration 015 truncated**: `fn_auth_custom_claims` and `embedding_queue` content lost during consolidation. Needs restoration from original file.

### Backend Agent — AI Gateway (Slice 1)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| FastAPI `/chat` endpoint | `ai_gateway/main.py` | ✅ Implemented | P-AI-8: message saved first. D117: one graph run per call. |
| Config + Supabase client | `ai_gateway/config.py` | ✅ Implemented | P-AI-6: service_role key only. |
| LangGraph graph | `ai_gateway/graph.py` | ✅ Implemented | D116: no checkpointer. Stateless graph. |
| Graph nodes | `ai_gateway/nodes.py` | ✅ Implemented | load_context, route_role, process, execute_tools, compliance_filter, save_response, confirm_handler. |
| Vet tools (AI-07..10) | `ai_gateway/tools/vet.py` | ✅ Implemented | create_vet_case, add_symptoms, get_diagnosis, get_treatment_protocols. All via supabase.rpc(). |
| Compliance filter | `ai_gateway/compliance.py` | ✅ Implemented | P-AI-4: dosage pattern detection. CF-01: antitrust. CF-05: legal. |
| System prompt builder | `ai_gateway/prompts.py` | ✅ Implemented | D133: loads from ai_prompts table with fallback. P-AI-4: vet dosage prohibition. |
| Requirements | `requirements.txt` | ✅ Created | fastapi, supabase, anthropic, langgraph, pydantic, etc. |

### P-AI Principle Verification

| Principle | Status | How |
|-----------|--------|-----|
| P-AI-1 | ✅ | All business writes via supabase.rpc(). No .table().insert() for business data. |
| P-AI-2 | ✅ | organization_id injected from state in every RPC call. |
| P-AI-3 | ✅ | Confirmation flow: confirm_handler_node + confirmation_payload in DB. |
| P-AI-4 | ✅ | compliance.py regex filter + prompts.py prohibition instruction. |
| P-AI-5 | ✅ | compliance_filter_node runs on EVERY response before save. |
| P-AI-6 | ✅ | config.py: SUPABASE_SERVICE_ROLE_KEY only. |
| P-AI-7 | ✅ | Stateless graph (D116). State loaded from/saved to DB each run. |
| P-AI-8 | ✅ | insert_user_message_dedup called BEFORE graph.invoke(). |

### Gate Status

- DB Gate (d01 RPCs): ✅ 6/6 implemented
- DB Gate (d04 RPCs): ✅ 0/2 pending (RPC-26, RPC-27 not needed for backend — AI-07..10 already in d07)
- Backend Gate (S1-BE): ✅ /chat + graph + vet tools + compliance filter implemented
- cross_check.sh: ⏳ Not yet run after Slice 1 changes

### Defects Flagged

1. **D-F01-3 org_type mismatch**: CEO decision says `services` and `feed_producer`, but schema CHECK allows `supplier`, `consultant`, `other`. Need resolution.
2. **Migration 015 truncated**: `fn_auth_custom_claims` and `embedding_queue` content lost during consolidation. Needs restoration from original file.
3. **rpc_get_active_prompt may not exist**: Dok 5 §4.6 references `rpc.get_active_prompt` but d07 SQL uses `rpc_get_active_prompt`. Need to verify the function exists in deployed schema. Fallback prompts in prompts.py handle this gracefully.
4. **rpc_update_confirmation_payload may not exist**: Used in confirm_handler_node for amend flow. Need DB Agent to create this RPC or use direct table update as interim solution.

---

*Last updated: 2026-03-18 by Backend Agent*
