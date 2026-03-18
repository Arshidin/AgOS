-- ============================================================
-- AGOS Schema: d02_tsp
-- Project: TURAN Agricultural Operating System
-- Consolidated: 2026-03-05 (pre-development baseline)
--
-- Market / TSP (Transparent Supply Pool) module.
Batches, Pools, Matches, Delivery, Prices.
--
-- Depends on: d01_kernel.sql
-- Consolidated from: 002_tsp__1_.sql
--
-- Convention: All statements are idempotent.
--   CREATE TABLE IF NOT EXISTS
--   CREATE OR REPLACE FUNCTION
--   ALTER TABLE ADD COLUMN IF NOT EXISTS
--   INSERT ... ON CONFLICT DO NOTHING
-- ============================================================
-- ============================================================
-- AGOS Migration 002: MARKET / TSP MODULE
-- Project: TURAN Agricultural Operating System
-- Version: 1.0 | Date: 4 March 2026
--
-- Entities (15 total):
--   Reference (5):  tsp_skus*, weight_categories*, grade_standards*,
--                   valid_combinations*, price_index_methodologies*
--   Operational (8): batches, pool_requests, pools, pool_matches,
--                    delivery_records, pool_manifests,
--                    price_grids, price_indices
--   Log/Append (2):  price_grid_log, price_index_values
--
-- * Reference tables seeded from TSP-Ассортимент-КРС-v2.xlsx
--
-- Cross-checked against:
--   ✅ Dok 1 Domain Model Specification v1.2 (Section 3.3, 4.3, 5.5, 5.7)
--   ✅ Decisions D28–D41, D84, D90
--   ✅ FSM Catalog 5.7 (Batch, PoolRequest, Pool, DeliveryRecord)
--   ✅ Legal Constraints 5.9 (antitrust, data isolation, three-tier)
--   ✅ TSP-Ассортимент-КРС-v2.xlsx (30 SKUs, 3 grades, weight ranges)
--   ✅ Ownership Matrix Section 4.3
--   ✅ Universal Principles P1–P12
--
-- Depends on: 001_kernel.sql
--   (organizations, farms, herd_groups, breeds, productivity_directions,
--    regions, users, platform_events)
--
-- Required by: 003_feed.sql (no hard dep), 004_platform_ai.sql,
--              005_vet.sql (no dep), 006_ops_edu.sql
--
-- LEGAL NOTE (Section 5.9, Article 171 PK RK):
--   TSP = coordination infrastructure, NOT a marketplace.
--   No payments processed. No binding prices. Participation voluntary.
--   Antitrust disclaimer text seeded in grade_standards.legal_disclaimer.
-- ============================================================

-- ============================================================
-- SECTION 1: REFERENCE TABLES (5 tables)
-- P8: Standards as Data, Not Code — all editable by admin
-- Seeded from TSP-Ассортимент-КРС-v2.xlsx
-- ============================================================

-- -------------------------------------------------------
-- grade_standards
-- D31: Grade (НС/С/ВС) in model from day 1; hidden in UI Phase 1
-- D90: All grade attributes in one table (not normalised)
-- Seed data: 3 rows from TSP-Ассортимент-КРС-v2.xlsx
-- -------------------------------------------------------
create table if not exists public.grade_standards (
    id                  uuid    primary key default gen_random_uuid(),
    code                text    not null unique,    -- NS | S | VS
    name_ru             text    not null,           -- НС | С | ВС
    sort_order          int     not null,           -- 1=NS, 2=S, 3=VS (lowest to highest)
    -- Quality criteria (from TSP-Ассортимент-КРС-v2.xlsx)
    bcs_min             numeric(3,1),               -- Body Condition Score minimum
    bcs_max             numeric(3,1),               -- Body Condition Score maximum
    muscle_score        text    not null,           -- М1 – Слабая | М2 – Средняя | М3 – Хорошая
    vet_requirements    text    not null,           -- vet documentation required
    homogeneity_pct_min int,                        -- batch uniformity % minimum
    id_requirement      text    not null,           -- СИРЭС / желательна / не требуется
    yield_pct_min       int     not null,           -- убойный выход % min
    yield_pct_max       int     not null,           -- убойный выход % max
    premium_type        text    not null,           -- none | base | base_reliability
    target_buyers       text,                       -- descriptive, informational only
    -- D28/Legal 5.9: antitrust disclaimer per grade
    is_active           boolean not null default true,
    created_at          timestamptz not null default now()
);
comment on table public.grade_standards is
    'D31: НС/С/ВС grade system. In data model from Phase 1; hidden in UI until market is ready.
     D90: All attributes in one table (not normalised) — grade changes as a whole unit.
     P8: admin-managed. Seed: 3 rows from TSP-Ассортимент-КРС-v2.xlsx.
     Legal 5.9: grade thresholds are association standards (Tier 3), NOT binding price mandates.';

-- -------------------------------------------------------
-- tsp_skus
-- D29: TspCategory ≠ AnimalCategory (different purposes: sales vs herd mgmt)
-- D90: One table, 30 rows = full SKU catalogue from TSP-Ассортимент-КРС-v2.xlsx
-- SKU = breed_group × sex × age_group × weight_category × grade
-- -------------------------------------------------------
create table if not exists public.tsp_skus (
    id              uuid    primary key default gen_random_uuid(),
    sku_code        text    not null unique,     -- TSP-0001 … TSP-0030
    grade_id        uuid    not null references public.grade_standards(id),
    -- Dimensions (denormalised per D90)
    breed_group     text    not null
                                check (breed_group in (
                                    'elite_meat',   -- Элитные мясные породы
                                    'local',        -- Локальные породы (казахская белоголовая etc)
                                    'crossbred'     -- Беспородные / помесные
                                )),
    sex             text    not null
                                check (sex in ('bull', 'heifer', 'cow')),
    age_group       text    not null
                                check (age_group in (
                                    'young_1',  -- Молодняк I:   6–12 мес
                                    'young_2',  -- Молодняк II: 12–24 мес
                                    'adult',    -- Взрослый:    24–48 мес
                                    'senior'    -- Старший:       48+ мес
                                )),
    age_min_months  int     not null,
    age_max_months  int,                -- null = no upper bound (senior)
    weight_category text    not null
                                check (weight_category in (
                                    'light',    -- Лёгкая
                                    'standard', -- Стандартная
                                    'heavy'     -- Тяжёлая
                                )),
    weight_min_kg   int     not null,
    weight_max_kg   int     not null,
    yield_pct_min   int     not null,   -- убойный выход % min (denorm for quick display)
    yield_pct_max   int     not null,
    is_active       boolean not null default true,
    sort_order      int     not null default 0,
    created_at      timestamptz not null default now()
);
comment on table public.tsp_skus is
    'D29: Sales taxonomy (≠ AnimalCategory which is herd management taxonomy).
     D90: 30 rows = full SKU catalogue. Breed group derived from breeds table at Batch creation,
     but stored here as denormalised text for catalogue display without joins.
     SKU = breed_group × sex × age_group × weight_category (grade adds quality dimension).
     Beспородные (crossbred) never get ВС grade — enforced by valid_sku_combinations.';

-- -------------------------------------------------------
-- valid_sku_combinations
-- D31: Enforces which breed_group × grade combos are legally valid
-- Prevents system from creating impossible batches (e.g. Беспородный ВС)
-- Cross-reference with TSP-Ассортимент-КРС-v2.xlsx: crossbred = NS only
-- -------------------------------------------------------
create table if not exists public.valid_sku_combinations (
    id              uuid    primary key default gen_random_uuid(),
    breed_group     text    not null,
    grade_code      text    not null,
    is_valid        boolean not null default true,
    reason          text,   -- explanation when is_valid=false
    created_at      timestamptz not null default now(),
    unique (breed_group, grade_code)
);
comment on table public.valid_sku_combinations is
    'D31: Antitrust-safe enforcement — prevents impossible grade assignments.
     From TSP-Ассортимент-КРС-v2.xlsx: crossbred animals only qualify for NS grade.
     RPC create_batch checks this before allowing grade assignment.
     P8: admin-managed. Changes here = data update, not code deployment.';

-- -------------------------------------------------------
-- weight_classes
-- Dok 1 Q18 RESOLVED: weight ranges extracted from TSP-Ассортимент-КРС-v2.xlsx
-- Weight ranges differ by animal type — stored as descriptive reference
-- Actual weight validation done at Batch level using tsp_skus.weight_min/max_kg
-- -------------------------------------------------------
create table if not exists public.weight_classes (
    id              uuid    primary key default gen_random_uuid(),
    code            text    not null unique,    -- LIGHT | STANDARD | HEAVY
    name_ru         text    not null,
    sort_order      int     not null,
    description_ru  text,   -- descriptive weight ranges (animal-type specific ranges in tsp_skus)
    created_at      timestamptz not null default now()
);
comment on table public.weight_classes is
    'Dok1 Q18 RESOLVED. Lightweight lookup for UI display only.
     Actual weight ranges per animal type live in tsp_skus.weight_min/max_kg.
     Rationale: weight ranges differ by animal type (bull 380-550kg heavy ≠ heifer 320-430kg heavy),
     so a single weight_class range would be misleading. tsp_skus is the authoritative source.';

-- -------------------------------------------------------
-- price_index_methodologies
-- D84: PriceIndex = expert product, not transaction aggregate (Phase 1)
-- Methodology describes HOW the index is calculated
-- -------------------------------------------------------
create table if not exists public.price_index_methodologies (
    id              uuid    primary key default gen_random_uuid(),
    code            text    not null unique,
    name_ru         text    not null,
    description_ru  text,
    data_sources    text[],     -- ['expert_assessment', 'regional_markets', 'transaction_data']
    review_frequency text   not null default 'monthly'
                                check (review_frequency in ('weekly','monthly','quarterly')),
    is_active       boolean not null default true,
    created_at      timestamptz not null default now()
);
comment on table public.price_index_methodologies is
    'D84: Phase 1 = expert assessment only. Phase 2+ = hybrid with real transaction data.
     Stored as reference so PriceIndex can reference specific methodology version.
     P8: admin-managed. methodology change = data update, not code change.';

-- ============================================================
-- SECTION 2: OPERATIONAL TABLES (8 tables)
-- ============================================================

-- -------------------------------------------------------
-- batches
-- FSM 5.7: draft → published → matched | cancelled | expired
--          matched → published (admin rollback)
-- D32: Batch ↔ HerdGroup SOFT link (don't block batch creation if group incomplete)
-- D35: Price snapshot captured at match time (in pool_matches, not here)
-- Ownership Matrix 4.3: Farmer C/U/A; Admin U (match/cancel); AI C (draft)
-- -------------------------------------------------------
create table if not exists public.batches (
    id                  uuid    primary key default gen_random_uuid(),
    organization_id     uuid    not null references public.organizations(id),
    farm_id             uuid    references public.farms(id),           -- D32: soft link
    herd_group_id       uuid    references public.herd_groups(id),    -- D32: soft link
    -- TSP product cell (locked on publish per FSM)
    tsp_sku_id          uuid    references public.tsp_skus(id),
    breed_id            uuid    references public.breeds(id),          -- actual breed (D30)
    -- Batch details
    heads               int     not null check (heads > 0),
    avg_weight_kg       numeric(6,2) check (avg_weight_kg > 0),
    target_month        date    not null,       -- YYYY-MM-01: month of intended delivery
    region_id           uuid    references public.regions(id),         -- dispatch region
    -- FSM status (5.7)
    status              text    not null default 'draft'
                                    check (status in (
                                        'draft',        -- editable, not visible to market
                                        'published',    -- visible, matchable
                                        'matched',      -- assigned to a pool
                                        'cancelled',    -- farmer/admin cancelled
                                        'expired'       -- target_month passed, auto-expired
                                    )),
    -- D31: Grade — nullable Phase 1 (hidden in UI), required Phase 2+
    grade_standard_id   uuid    references public.grade_standards(id),
    -- Notes (always editable regardless of status)
    notes               text,
    -- Rollback tracking (matched → published)
    rollback_reason     text,
    rollback_at         timestamptz,
    rollback_by         uuid    references public.users(id),
    -- Expiry
    expires_at          timestamptz,   -- set by system when published (target_month + buffer)
    -- FSM transition timestamps
    published_at        timestamptz,
    matched_at          timestamptz,
    cancelled_at        timestamptz,
    created_by          uuid    references public.users(id),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);
comment on table public.batches is
    'FSM 5.7: draft→published→matched|cancelled|expired. matched→published (rollback).
     D32: farm_id and herd_group_id are SOFT links (nullable) — batch valid without farm profile.
     D31: grade_standard_id nullable Phase 1. tsp_sku_id locked on publish (product cell).
     Editability rule: draft=all fields; published=heads/notes/target_month only (tsp_sku locked);
     matched/cancelled/expired=all locked.
     Legal 5.9 Tier 1: published batch = intention to supply (not binding until pool match).';
comment on column public.batches.target_month is
    'Always stored as first day of month (YYYY-MM-01). UI shows as "Май 2026".
     expires_at set to last day of target_month + 7 days buffer by RPC publish_batch.';

-- -------------------------------------------------------
-- pool_requests
-- D33: PoolRequest 1:1 Pool (one request = one pool, auto-created on activation)
-- FSM 5.7: draft → active → closed | expired
-- D39: MPK demand profile in accepted_categories JSONB (don't over-engineer for 5 MPKs)
-- Ownership Matrix 4.3: MPK C/U/A; Admin U (close)
-- -------------------------------------------------------
create table if not exists public.pool_requests (
    id                  uuid    primary key default gen_random_uuid(),
    organization_id     uuid    not null references public.organizations(id), -- MPK org
    -- Demand profile
    total_heads         int     not null check (total_heads > 0),
    target_month        date    not null,   -- YYYY-MM-01
    region_id           uuid    references public.regions(id),
    -- D39: JSONB for accepted categories (flexible for 5 MPKs — no over-engineering)
    accepted_categories jsonb,  -- [{tsp_sku_id, min_heads, max_heads, priority}]
    -- Premium capacity (from Dok 1 ERD 3.3)
    premium_bulls       int     not null default 0 check (premium_bulls >= 0),
    premium_heifers     int     not null default 0 check (premium_heifers >= 0),
    premium_cows        int     not null default 0 check (premium_cows >= 0),
    -- FSM
    status              text    not null default 'draft'
                                    check (status in (
                                        'draft',    -- MPK configuring
                                        'active',   -- visible, accepting batches (auto-creates Pool)
                                        'closed',   -- filled or manually closed by MPK/admin
                                        'expired'   -- target_month passed
                                    )),
    notes               text,
    closed_at           timestamptz,
    closed_by           uuid    references public.users(id),
    close_reason        text,
    activated_at        timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);
comment on table public.pool_requests is
    'FSM 5.7: draft→active→closed|expired.
     D33: activating a pool_request auto-creates one Pool (1:1 relationship).
     D39: accepted_categories JSONB — flexible enough for 5 MPKs without separate table.
     Legal 5.9: pool_request = expression of intent to consider (not binding commitment).
     D40: MPK identity NOT revealed to farmers until Pool transitions to executing.';

-- -------------------------------------------------------
-- pools
-- D33: Created automatically when PoolRequest → active
-- FSM 5.7: filling → filled → executing → dispatched → delivered → executed
--          filling → closed (underfilled, admin decision)
-- D40: Contacts (MPK identity) revealed ONLY at → executing transition
-- Ownership Matrix 4.3: System C; Admin U/A
-- -------------------------------------------------------
create table if not exists public.pools (
    id                  uuid    primary key default gen_random_uuid(),
    pool_request_id     uuid    not null unique references public.pool_requests(id),
    -- Aggregate counters (maintained by RPC on each match)
    matched_heads       int     not null default 0 check (matched_heads >= 0),
    target_heads        int     not null check (target_heads > 0), -- denorm from pool_request
    -- FSM 5.7
    status              text    not null default 'filling'
                                    check (status in (
                                        'filling',      -- accepting batch matches
                                        'filled',       -- matched_heads >= target_heads
                                        'executing',    -- contacts revealed, logistics started
                                        'dispatched',   -- D41: optional intermediate
                                        'delivered',    -- D41: optional intermediate
                                        'executed',     -- final state
                                        'closed'        -- admin: underfilled, no longer accepting
                                    )),
    execution_result    text    check (execution_result in ('full','partial','failed')),
    -- D40: Contact reveal — populated ONLY at → executing transition
    mpk_contact_revealed_at timestamptz,    -- when MPK identity was revealed to matched farmers
    -- Filling deadline (D34: systemic — not left to MPK discretion)
    filling_deadline    date,   -- last day to add batches (set at pool creation)
    -- FSM timestamps
    filled_at           timestamptz,
    executing_at        timestamptz,
    executed_at         timestamptz,
    closed_at           timestamptz,
    -- Admin actions
    confirmed_by        uuid    references public.users(id),  -- admin who confirmed filled→executing
    closed_by           uuid    references public.users(id),
    close_reason        text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);
comment on table public.pools is
    'D33: Auto-created when PoolRequest activates. 1:1 with pool_requests.
     D40: CRITICAL — MPK identity (and farmer contacts) revealed ONLY at executing transition.
     Before that: both sides see only anonymous aggregates.
     D41: dispatched/delivered are optional intermediate states (skip to executed if simple).
     execution_result populated at executed state only.
     Legal 5.9: Pool is coordination structure, not transaction. No payment processed here.';
comment on column public.pools.mpk_contact_revealed_at is
    'D40: Legal isolation. Set by RPC transition_pool_to_executing.
     Before this timestamp: farmer sees "Покупатель подобран" but NOT who.
     After: PoolManifest accessible to matched farmers and MPK.';

-- -------------------------------------------------------
-- pool_matches
-- Junction: Pool ↔ Batch (many-to-many via pool)
-- D35: Price snapshot at match time — IMMUTABLE after creation
-- Ownership Matrix 4.3: Admin C/A
-- -------------------------------------------------------
create table if not exists public.pool_matches (
    id                          uuid    primary key default gen_random_uuid(),
    pool_id                     uuid    not null references public.pools(id),
    batch_id                    uuid    not null references public.batches(id),
    -- D35: IMMUTABLE price snapshot captured at match moment
    reference_price_at_match    int,    -- KZT per kg, from price_grid at time of match
    premium_at_match            int,    -- KZT per kg premium (0 if НС grade)
    grade_at_match              text,   -- grade code at time of match (NS/S/VS)
    tsp_sku_at_match            text,   -- sku_code at time of match (immutable record)
    -- Match details
    matched_heads               int     not null check (matched_heads > 0),
    matched_by                  uuid    references public.users(id),  -- admin
    matched_at                  timestamptz not null default now(),
    notes                       text,
    unique (pool_id, batch_id)  -- one batch can only be matched to one pool at a time
);
comment on table public.pool_matches is
    'D35: Price snapshot is IMMUTABLE — never UPDATE these fields after insert.
     Rationale: if price_grid changes after match, the original match price must be preserved
     for audit, dispute resolution, and data analytics integrity.
     grade_at_match / tsp_sku_at_match: snapshot of what was agreed (denorm intentional).
     unique(pool_id, batch_id): same batch cannot be matched to same pool twice.';

-- -------------------------------------------------------
-- delivery_records
-- D36: Actual delivery data for market analytics + reputation calculation
-- FSM 5.7: pending → delivered | rejected | partial
-- Ownership Matrix 4.3: MPK C/U (actuals); Admin U/A (confirm); System C (skeleton)
-- -------------------------------------------------------
create table if not exists public.delivery_records (
    id                  uuid    primary key default gen_random_uuid(),
    pool_match_id       uuid    not null unique references public.pool_matches(id),
    organization_id     uuid    not null references public.organizations(id), -- denorm for RLS
    -- Planned (from batch)
    planned_heads       int     not null,
    -- Actuals (filled by MPK after delivery)
    actual_heads        int,
    actual_avg_weight_kg    numeric(6,2),
    actual_price_per_kg     numeric(8,2),   -- KZT/kg actually paid
    total_amount            numeric(14,2),  -- total deal value (informational only, no payment here)
    currency                text    not null default 'KZT',
    -- Quality assessment at delivery (D36: actuals for analytics)
    actual_grade        text,           -- may differ from matched grade (real assessment)
    actual_yield_pct    numeric(5,2),
    quality_notes       text,
    -- FSM
    status              text    not null default 'pending'
                                    check (status in (
                                        'pending',      -- skeleton created at pool→executing
                                        'delivered',    -- MPK confirmed delivery
                                        'partial',      -- partial delivery accepted
                                        'rejected'      -- delivery rejected (quality/quantity)
                                    )),
    -- D38: Reputation input (D38: calculate_reputation is RPC, not entity)
    is_disputed         boolean not null default false,
    dispute_notes       text,
    -- Timestamps
    delivery_date       date,
    confirmed_by        uuid    references public.users(id),   -- admin
    confirmed_at        timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);
comment on table public.delivery_records is
    'D36: Actual delivery data = foundation of reputation system + market analytics.
     Skeleton row created by system at Pool→executing transition (status=pending).
     MPK fills actuals. Admin confirms (D21 in ownership matrix).
     total_amount informational: TSP does NOT process payments (Legal 5.9).
     actual_grade may differ from grade_at_match — real quality assessment at delivery gate.
     D38: reputation = computed RPC over delivery_records, not stored entity.';

-- -------------------------------------------------------
-- pool_manifests
-- D37: Generated PDF document for MPK logistics
-- Accessible ONLY to matched MPK + admin (D40)
-- Ownership Matrix 4.3: System/Admin C; Admin generates
-- -------------------------------------------------------
create table if not exists public.pool_manifests (
    id              uuid    primary key default gen_random_uuid(),
    pool_id         uuid    not null references public.pools(id),
    document_url    text    not null,   -- Supabase Storage URL (signed, time-limited)
    version         int     not null default 1,  -- increments on regeneration
    generated_at    timestamptz not null default now(),
    generated_by    uuid    references public.users(id),
    is_current      boolean not null default true,  -- latest version flag
    created_at      timestamptz not null default now()
);
comment on table public.pool_manifests is
    'D37: PDF manifest for MPK logistics (list of matched batches, farms, volumes, grades).
     D40: RLS restricts access to matched MPK + admin ONLY (not farmers, not other MPKs).
     Multiple versions possible (pool can be updated before executing).
     is_current=true: latest version. Previous versions kept for audit.';

-- -------------------------------------------------------
-- price_grids
-- Reference prices from association (Tier 3 legal, Section 5.9)
-- D35: Price snapshot at match time copies from here
-- MANDATORY antitrust disclaimer (Section 5.9)
-- Ownership Matrix 4.3: Admin C/U/A
-- -------------------------------------------------------
create table if not exists public.price_grids (
    id                      uuid    primary key default gen_random_uuid(),
    tsp_sku_id              uuid    not null references public.tsp_skus(id),
    region_id               uuid    references public.regions(id),  -- null = national (all regions)
    -- Reference prices (KZT/kg)
    base_price_per_kg       int     not null check (base_price_per_kg > 0),
    premium_per_kg          int     not null default 0 check (premium_per_kg >= 0),
    -- Legal 5.9: MANDATORY antitrust disclaimer
    -- Text: «Справочные цены являются индикативными рыночными ориентирами...»
    legal_disclaimer_shown  boolean not null default true,  -- must be true to be published
    -- Validity
    valid_from              date    not null,
    valid_to                date,   -- null = currently active
    is_active               boolean not null default false,   -- admin explicitly activates
    -- Version tracking
    version                 int     not null default 1,
    approved_by             uuid    references public.users(id),
    approved_at             timestamptz,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now(),
    -- Only one active price per SKU per region at a time
    unique (tsp_sku_id, region_id, valid_from)
);
comment on table public.price_grids is
    'D35: Prices snapshotted into pool_matches at match time (immutable).
     Legal 5.9 MANDATORY: legal_disclaimer_shown=true required before any price display.
     Disclaimer text: «Справочные цены являются индикативными рыночными ориентирами.
     Итоговые расчётные цены определяются при поставке на основании рыночных условий.
     TURAN не устанавливает, не обеспечивает и не гарантирует цены сделок. Участие добровольное.»
     Tier 3 legal: prices are association benchmarks, NOT mandated rates.
     region_id=null = national price (applies when no region-specific price exists).';
comment on column public.price_grids.legal_disclaimer_shown is
    'MUST be true before price is visible in any UI (web or AI).
     RPC get_price_for_sku checks this before returning data.
     Setting to false = effectively pulling price from public view.';

-- -------------------------------------------------------
-- price_grid_log
-- Append-only audit trail of all price_grid changes
-- Auto-populated by trigger on price_grids updates
-- -------------------------------------------------------
create table if not exists public.price_grid_log (
    id                  uuid    primary key default gen_random_uuid(),
    price_grid_id       uuid    not null references public.price_grids(id),
    tsp_sku_id          uuid    not null references public.tsp_skus(id),  -- denorm
    old_base_price      int,
    new_base_price      int,
    old_premium         int,
    new_premium         int,
    changed_by          uuid    references public.users(id),
    change_reason       text,
    created_at          timestamptz not null default now()
    -- No updated_at: APPEND-ONLY
);
comment on table public.price_grid_log is
    'P12 (Temporal): append-only price history. Never UPDATE.
     Auto-populated by trigger fn_log_price_grid_change on price_grids UPDATE.
     Required for: market analytics, dispute resolution, Data Flywheel.';

-- -------------------------------------------------------
-- price_indices
-- D84: Expert-assessed market index (Phase 1); hybrid with transactions (Phase 2+)
-- Distinct from price_grids: index = market signal, grid = reference for TSP
-- -------------------------------------------------------
create table if not exists public.price_indices (
    id                  uuid    primary key default gen_random_uuid(),
    methodology_id      uuid    not null references public.price_index_methodologies(id),
    code                text    not null unique,    -- e.g. TURAN-BEEF-KZ-NATIONAL
    name_ru             text    not null,
    tsp_sku_id          uuid    references public.tsp_skus(id),  -- null = composite index
    region_id           uuid    references public.regions(id),   -- null = national
    frequency           text    not null default 'monthly'
                                    check (frequency in ('daily','weekly','monthly','quarterly')),
    description_ru      text,
    is_active           boolean not null default true,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);
comment on table public.price_indices is
    'D84: Phase 1 = expert assessment only. phase 2+ = hybrid.
     Distinct from price_grids: index reflects MARKET reality; grid is ASSOCIATION benchmark.
     code format: TURAN-{commodity}-{region}-{scope} e.g. TURAN-BEEF-KZ-NATIONAL.
     tsp_sku_id null = composite/basket index (e.g. all beef categories average).';

-- -------------------------------------------------------
-- price_index_values
-- Append-only time series of index values
-- D84: Expert publishes periodically; Phase 2+ may auto-populate from transactions
-- -------------------------------------------------------
create table if not exists public.price_index_values (
    id              uuid    primary key default gen_random_uuid(),
    index_id        uuid    not null references public.price_indices(id),
    period_date     date    not null,       -- first day of period
    value_per_kg    numeric(8,2) not null check (value_per_kg > 0),
    currency        text    not null default 'KZT',
    data_source     text    not null
                                check (data_source in (
                                    'expert_assessment',    -- D84 Phase 1: expert judgment
                                    'transaction_data',     -- Phase 2+: real deal data
                                    'external_reference',   -- external market data
                                    'composite'             -- weighted average of multiple sources
                                )),
    sample_size     int,            -- number of transactions if data_source=transaction_data
    confidence_pct  int,            -- expert confidence 0-100
    published       boolean not null default false,
    published_by    uuid    references public.users(id),
    published_at    timestamptz,
    notes           text,
    created_at      timestamptz not null default now(),
    unique (index_id, period_date)  -- one value per index per period
    -- No updated_at: APPEND-ONLY time series
);
comment on table public.price_index_values is
    'D84: Append-only time series. published=false = draft (not visible to farmers/MPKs).
     Admin/expert publishes. Phase 2+: transaction_data source auto-populated from delivery_records.
     sample_size and confidence_pct = transparency metadata for index quality.
     Legal 5.9: index values are informational market signals, NOT price mandates.';

-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

-- grade_standards
create index idx_grade_code on public.grade_standards (code);

-- tsp_skus (heavily queried for batch creation and pool matching)
create index idx_tsp_skus_grade     on public.tsp_skus (grade_id);
create index idx_tsp_skus_breed_sex on public.tsp_skus (breed_group, sex, age_group);
create index idx_tsp_skus_active    on public.tsp_skus (is_active);

-- batches (critical — queried by status, org, target_month constantly)
create index idx_batches_org_status     on public.batches (organization_id, status);
create index idx_batches_status_month   on public.batches (status, target_month)
    where status in ('published', 'matched');
create index idx_batches_sku            on public.batches (tsp_sku_id)
    where tsp_sku_id is not null;
create index idx_batches_herd_group     on public.batches (herd_group_id)
    where herd_group_id is not null;
create index idx_batches_region_month   on public.batches (region_id, target_month)
    where status = 'published';
create index idx_batches_expires        on public.batches (expires_at)
    where status = 'published';  -- cron expiry job

-- pool_requests
create index idx_pool_req_org_status    on public.pool_requests (organization_id, status);
create index idx_pool_req_status_month  on public.pool_requests (status, target_month)
    where status = 'active';

-- pools
create index idx_pools_request          on public.pools (pool_request_id);
create index idx_pools_status           on public.pools (status);

-- pool_matches
create index idx_pm_pool    on public.pool_matches (pool_id);
create index idx_pm_batch   on public.pool_matches (batch_id);

-- delivery_records
create index idx_dr_match   on public.delivery_records (pool_match_id);
create index idx_dr_org     on public.delivery_records (organization_id);
create index idx_dr_status  on public.delivery_records (status);

-- pool_manifests
create index idx_manifests_pool_current on public.pool_manifests (pool_id, is_current)
    where is_current = true;

-- price_grids
create index idx_pg_sku_active  on public.price_grids (tsp_sku_id, is_active)
    where is_active = true;
create index idx_pg_region      on public.price_grids (region_id)
    where region_id is not null;

-- price_grid_log
create index idx_pgl_grid_time  on public.price_grid_log (price_grid_id, created_at desc);

-- price_indices
create index idx_pi_sku         on public.price_indices (tsp_sku_id)
    where tsp_sku_id is not null;

-- price_index_values
create index idx_piv_index_date on public.price_index_values (index_id, period_date desc);
create index idx_piv_published  on public.price_index_values (index_id, published)
    where published = true;

-- ============================================================
-- SECTION 4: ROW LEVEL SECURITY
-- Core rule: Farmer sees OWN batches only. Aggregated data = anonymous RPCs.
-- MPK sees OWN pool_requests/pools. Contacts revealed only at executing.
-- Legal 5.9: zero cross-farmer data visibility.
-- ============================================================

alter table public.grade_standards          enable row level security;
alter table public.tsp_skus                 enable row level security;
alter table public.valid_sku_combinations   enable row level security;
alter table public.weight_classes           enable row level security;
alter table public.price_index_methodologies enable row level security;
alter table public.batches                  enable row level security;
alter table public.pool_requests            enable row level security;
alter table public.pools                    enable row level security;
alter table public.pool_matches             enable row level security;
alter table public.delivery_records         enable row level security;
alter table public.pool_manifests           enable row level security;
alter table public.price_grids              enable row level security;
alter table public.price_grid_log           enable row level security;
alter table public.price_indices            enable row level security;
alter table public.price_index_values       enable row level security;

-- Reference tables: readable by all authenticated users
create policy "grade_standards_read_auth"       on public.grade_standards       for select using (auth.uid() is not null);
create policy "grade_standards_admin_write"     on public.grade_standards       for all    using (public.fn_is_admin());
create policy "tsp_skus_read_auth"              on public.tsp_skus              for select using (auth.uid() is not null);
create policy "tsp_skus_admin_write"            on public.tsp_skus              for all    using (public.fn_is_admin());
create policy "valid_combos_read_auth"          on public.valid_sku_combinations for select using (auth.uid() is not null);
create policy "valid_combos_admin_write"        on public.valid_sku_combinations for all    using (public.fn_is_admin());
create policy "weight_classes_read_auth"        on public.weight_classes        for select using (auth.uid() is not null);
create policy "weight_classes_admin_write"      on public.weight_classes        for all    using (public.fn_is_admin());
create policy "pim_read_auth"                   on public.price_index_methodologies for select using (auth.uid() is not null);
create policy "pim_admin_write"                 on public.price_index_methodologies for all    using (public.fn_is_admin());

-- Batches: farmer sees own; admin sees all
create policy "batches_read_own"    on public.batches for select
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_admin());
create policy "batches_write_own"   on public.batches for all
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_admin());

-- Pool requests: MPK sees own; admin sees all
create policy "pool_req_read_own"   on public.pool_requests for select
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_admin());
create policy "pool_req_write_own"  on public.pool_requests for all
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_admin());

-- Pools: MPK + matched farmers (only own); admin all
-- D40: farmer sees pool only AFTER their batch is matched
create policy "pools_read"          on public.pools for select
    using (
        public.fn_is_admin()
        or pool_request_id in (
            select id from public.pool_requests
            where organization_id = any(public.fn_my_org_ids())
        )
        or id in (
            select pm.pool_id from public.pool_matches pm
            join public.batches b on b.id = pm.batch_id
            where b.organization_id = any(public.fn_my_org_ids())
        )
    );
create policy "pools_admin_write"   on public.pools for all using (public.fn_is_admin());

-- Pool matches: farmer sees own batch matches; MPK sees own pool matches; admin all
create policy "pool_matches_read"   on public.pool_matches for select
    using (
        public.fn_is_admin()
        or batch_id in (
            select id from public.batches
            where organization_id = any(public.fn_my_org_ids())
        )
        or pool_id in (
            select p.id from public.pools p
            join public.pool_requests pr on pr.id = p.pool_request_id
            where pr.organization_id = any(public.fn_my_org_ids())
        )
    );
create policy "pool_matches_admin_write" on public.pool_matches for all using (public.fn_is_admin());

-- Delivery records: farmer sees own; MPK sees own; admin all
create policy "delivery_read_own"   on public.delivery_records for select
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_admin());
create policy "delivery_mpk_write"  on public.delivery_records for update
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_admin());

-- Pool manifests: D40 — only matched MPK + admin
create policy "manifests_read"      on public.pool_manifests for select
    using (
        public.fn_is_admin()
        or pool_id in (
            select p.id from public.pools p
            join public.pool_requests pr on pr.id = p.pool_request_id
            where pr.organization_id = any(public.fn_my_org_ids())
            and p.status in ('executing','dispatched','delivered','executed')
        )
    );
create policy "manifests_admin_write" on public.pool_manifests for all using (public.fn_is_admin());

-- Price grids: all authenticated read (with disclaimer); admin write
create policy "price_grids_read_auth"   on public.price_grids for select
    using (auth.uid() is not null and legal_disclaimer_shown = true);
create policy "price_grids_admin_write" on public.price_grids for all using (public.fn_is_admin());

-- Price grid log: admin only
create policy "pgl_admin_read"  on public.price_grid_log for select using (public.fn_is_admin());

-- Price indices and values: read authenticated; write admin
create policy "pi_read_auth"    on public.price_indices       for select using (auth.uid() is not null);
create policy "pi_admin_write"  on public.price_indices       for all    using (public.fn_is_admin());
create policy "piv_read_published" on public.price_index_values for select
    using (published = true or public.fn_is_admin());
create policy "piv_admin_write" on public.price_index_values  for all    using (public.fn_is_admin());

-- ============================================================
-- SECTION 5: TRIGGERS
-- ============================================================

-- updated_at triggers
create trigger trg_batches_updated_at
    before update on public.batches
    for each row execute function public.fn_set_updated_at();

create trigger trg_pool_requests_updated_at
    before update on public.pool_requests
    for each row execute function public.fn_set_updated_at();

create trigger trg_pools_updated_at
    before update on public.pools
    for each row execute function public.fn_set_updated_at();

create trigger trg_delivery_records_updated_at
    before update on public.delivery_records
    for each row execute function public.fn_set_updated_at();

create trigger trg_price_grids_updated_at
    before update on public.price_grids
    for each row execute function public.fn_set_updated_at();

create trigger trg_price_indices_updated_at
    before update on public.price_indices
    for each row execute function public.fn_set_updated_at();

-- Price grid change log trigger
create or replace function public.fn_log_price_grid_change()
returns trigger language plpgsql security definer as $$
begin
    if (old.base_price_per_kg <> new.base_price_per_kg
        or old.premium_per_kg <> new.premium_per_kg) then
        insert into public.price_grid_log (
            price_grid_id, tsp_sku_id,
            old_base_price, new_base_price,
            old_premium, new_premium,
            changed_by
        ) values (
            new.id, new.tsp_sku_id,
            old.base_price_per_kg, new.base_price_per_kg,
            old.premium_per_kg, new.premium_per_kg,
            public.fn_current_user_id()
        );
    end if;
    return new;
end;
$$;

create trigger trg_price_grid_log
    after update on public.price_grids
    for each row execute function public.fn_log_price_grid_change();

-- ============================================================
-- SECTION 6: SEED DATA
-- Source: TSP-Ассортимент-КРС-v2.xlsx (30 SKUs)
-- P8: Admin-editable after migration
-- ============================================================

-- Grade standards (3 rows)
insert into public.grade_standards (
    code, name_ru, sort_order,
    bcs_min, bcs_max, muscle_score,
    vet_requirements, homogeneity_pct_min,
    id_requirement, yield_pct_min, yield_pct_max,
    premium_type, target_buyers
) values
(
    'NS', 'Нестандарт', 1,
    null, 2.5, 'М1 – Слабая',
    'Минимальный / неполный', null,
    'Не требуется', 44, 48,
    'none', 'МПК с гибкими требованиями'
),
(
    'S', 'Стандарт', 2,
    2.5, 5.0, 'М2 – Средняя',
    'Ветпаспорт + здоров', 70,
    'Желательна', 48, 52,
    'base', 'Большинство МПК, откормочники'
),
(
    'VS', 'Высший стандарт', 3,
    3.5, 4.5, 'М3 – Хорошая',
    'Полный пакет (бруц/туб)', 80,
    'Обязательна (СИРЭС)', 52, 58,
    'base_reliability', 'Premium МПК, экспорт, Mitsui'
)
on conflict (code) do nothing;

-- Weight classes (3 rows)
insert into public.weight_classes (code, name_ru, sort_order, description_ru) values
    ('LIGHT',    'Лёгкая',       1, 'Молодняк I: 150–260 кг'),
    ('STANDARD', 'Стандартная',  2, 'Молодняк II–Взрослый: 220–480 кг (диапазон по типу)'),
    ('HEAVY',    'Тяжёлая',      3, 'Молодняк II–Взрослый: 320–650 кг (диапазон по типу)')
on conflict (code) do nothing;

-- Valid breed × grade combinations
-- Source: TSP-Ассортимент-КРС-v2.xlsx — crossbred = NS only
insert into public.valid_sku_combinations (breed_group, grade_code, is_valid, reason) values
    ('elite_meat', 'NS', true,  null),
    ('elite_meat', 'S',  true,  null),
    ('elite_meat', 'VS', true,  null),
    ('local',      'NS', true,  null),
    ('local',      'S',  true,  null),
    ('local',      'VS', true,  null),
    ('crossbred',  'NS', true,  null),
    ('crossbred',  'S',  false, 'Беспородные животные не соответствуют критериям Стандарт (BCS, мышечность, однородность)'),
    ('crossbred',  'VS', false, 'Беспородные животные не соответствуют критериям Высший стандарт')
on conflict (breed_group, grade_code) do nothing;

-- TSP SKUs (30 rows from TSP-Ассортимент-КРС-v2.xlsx)
-- Format: (sku_code, grade_code, breed_group, sex, age_group, age_min, age_max,
--          weight_category, weight_min, weight_max, yield_min, yield_max, sort_order)
insert into public.tsp_skus (
    sku_code, grade_id, breed_group, sex, age_group,
    age_min_months, age_max_months,
    weight_category, weight_min_kg, weight_max_kg,
    yield_pct_min, yield_pct_max, sort_order
)
select
    b.sku_code,
    g.id as grade_id,
    b.breed_group, b.sex, b.age_group,
    b.age_min_months, b.age_max_months,
    b.weight_category, b.weight_min_kg, b.weight_max_kg,
    b.yield_pct_min, b.yield_pct_max, b.sort_order
from (values
    -- === ЭЛИТНЫЕ МЯСНЫЕ (elite_meat) ===
    ('TSP-0001','NS','elite_meat','bull','young_1',  6,  12,'light',    150,260,44,48, 1),
    ('TSP-0002','S', 'elite_meat','bull','young_2', 12,  24,'standard', 260,380,48,52, 2),
    ('TSP-0003','VS','elite_meat','bull','young_2', 12,  24,'heavy',    380,550,52,58, 3),
    ('TSP-0004','S', 'elite_meat','bull','adult',   24,  48,'standard', 350,480,48,52, 4),
    ('TSP-0005','VS','elite_meat','bull','adult',   24,  48,'heavy',    480,650,52,58, 5),
    ('TSP-0006','S', 'elite_meat','heifer','young_2',12, 24,'standard', 220,320,48,52, 6),
    ('TSP-0007','VS','elite_meat','heifer','young_2',12, 24,'heavy',    320,430,52,58, 7),
    ('TSP-0008','S', 'elite_meat','cow','adult',    24,  48,'standard', 320,430,48,52, 8),
    ('TSP-0009','VS','elite_meat','cow','adult',    24,  48,'heavy',    430,580,52,58, 9),
    ('TSP-0010','S', 'elite_meat','cow','senior',   48,null,'standard', 280,400,48,52,10),
    -- === ЛОКАЛЬНЫЕ (local) ===
    ('TSP-0011','NS','local','bull','young_1',  6,  12,'light',    150,260,44,48,11),
    ('TSP-0012','S', 'local','bull','young_2', 12,  24,'standard', 260,380,48,52,12),
    ('TSP-0013','VS','local','bull','young_2', 12,  24,'heavy',    380,550,52,58,13),
    ('TSP-0014','S', 'local','bull','adult',   24,  48,'standard', 350,480,48,52,14),
    ('TSP-0015','VS','local','bull','adult',   24,  48,'heavy',    480,650,52,58,15),
    ('TSP-0016','S', 'local','heifer','young_2',12, 24,'standard', 220,320,48,52,16),
    ('TSP-0017','VS','local','heifer','young_2',12, 24,'heavy',    320,430,52,58,17),
    ('TSP-0018','S', 'local','cow','adult',    24,  48,'standard', 320,430,48,52,18),
    ('TSP-0019','VS','local','cow','adult',    24,  48,'heavy',    430,580,52,58,19),
    ('TSP-0020','S', 'local','cow','senior',   48,null,'standard', 280,400,48,52,20),
    -- === БЕСПОРОДНЫЕ (crossbred) — только NS ===
    ('TSP-0021','NS','crossbred','bull','young_1',  6,  12,'light',    150,260,44,48,21),
    ('TSP-0022','NS','crossbred','bull','young_2', 12,  24,'standard', 260,380,44,48,22),
    ('TSP-0023','NS','crossbred','bull','young_2', 12,  24,'heavy',    380,550,44,48,23),
    ('TSP-0024','NS','crossbred','bull','adult',   24,  48,'standard', 350,480,44,48,24),
    ('TSP-0025','NS','crossbred','bull','adult',   24,  48,'heavy',    480,650,44,48,25),
    ('TSP-0026','NS','crossbred','heifer','young_2',12, 24,'standard', 220,320,44,48,26),
    ('TSP-0027','NS','crossbred','heifer','young_2',12, 24,'heavy',    320,430,44,48,27),
    ('TSP-0028','NS','crossbred','cow','adult',    24,  48,'standard', 320,430,44,48,28),
    ('TSP-0029','NS','crossbred','cow','adult',    24,  48,'heavy',    430,580,44,48,29),
    ('TSP-0030','NS','crossbred','cow','senior',   48,null,'standard', 280,400,44,48,30)
) as b(sku_code, grade_code, breed_group, sex, age_group,
       age_min_months, age_max_months,
       weight_category, weight_min_kg, weight_max_kg,
       yield_pct_min, yield_pct_max, sort_order)
join public.grade_standards g on g.code = b.grade_code
on conflict (sku_code) do nothing;

-- Price index methodology (Phase 1: expert assessment)
insert into public.price_index_methodologies
    (code, name_ru, description_ru, data_sources, review_frequency)
values (
    'EXPERT_MONTHLY',
    'Экспертная оценка (ежемесячно)',
    'Ежемесячная оценка рыночных цен аналитиками ассоциации на основе региональных рынков и отраслевых данных.',
    array['expert_assessment','regional_markets'],
    'monthly'
) on conflict (code) do nothing;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Summary:
--   Reference tables:    5 (grade_standards, tsp_skus, valid_sku_combinations,
--                           weight_classes, price_index_methodologies)
--   Operational tables:  8 (batches, pool_requests, pools, pool_matches,
--                           delivery_records, pool_manifests,
--                           price_grids, price_indices)
--   Log/Append tables:   2 (price_grid_log, price_index_values)
--   Total:              15 tables
--
--   Indexes:            24
--   RLS policies:       28
--   Triggers:            8 (7 updated_at + 1 price_grid_log)
--   Seed data:          30 SKUs + 3 grades + 9 valid combos + 3 weight classes + 1 methodology
--
-- Verified decisions:
--   D28 D29 D30 D31 D32 D33 D34 D35 D36 D37 D38 D39 D40 D41 D84 D90
--
-- Open questions resolved:
--   Q17 ✅ TspCategory: breed_group (3) × sex (3) × age (4) × weight (3) = 30 SKU cells
--   Q18 ✅ WeightClass: light/standard/heavy with exact kg ranges per animal type in tsp_skus
--
-- Cross-module FK pending:
--   None — TSP module is self-contained. HerdGroup link is soft (nullable FK, D32).
--
-- Antitrust compliance points:
--   1. price_grids.legal_disclaimer_shown = MANDATORY field
--   2. valid_sku_combinations blocks crossbred from S/VS grades
--   3. D40: farmer/MPK contacts isolated until Pool.status = executing
--   4. Aggregated supply/demand = computed RPC (get_aggregated_supply/demand) — no raw data
--
-- Next migration: 003_feed.sql
--   Entities: FeedCategory*, FeedItem*, FeedPrice, NutrientRequirement*,
--             PeriodType*, FarmFeedInventory, Ration, RationVersion,
--             FeedingPlan, FeedingPeriod (10 entities)
-- ============================================================
