-- ============================================================
-- d09_consulting.sql — Consulting Domain (Investment Project Packaging)
-- AGOS · Zengi Farms · ADR-CONSULT-1 (Hybrid Architecture)
-- ============================================================
-- Домен: инвестиционное проектирование животноводческих ферм
-- Пользователи: консультанты Zengi (org_type = consultant)
-- Зависимости: d01_kernel (users, organizations, platform_events, rpc_name_registry)
-- ============================================================

-- ==========================
-- SECTION 1 · TABLES
-- ==========================

-- 1.1  Consulting Projects — инвестиционные проекты
create table if not exists public.consulting_projects (
    id                  uuid        primary key default gen_random_uuid(),
    organization_id     uuid        not null references public.organizations(id),
    name                text        not null,
    farm_type           text        not null default 'beef_reproducer'
                                        check (farm_type in (
                                            'beef_reproducer',
                                            'feedlot',
                                            'sheep_goat'
                                        )),
    status              text        not null default 'draft'
                                        check (status in (
                                            'draft',
                                            'calculating',
                                            'calculated',
                                            'archived'
                                        )),
    created_by          uuid        references public.users(id),
    is_active           boolean     not null default true,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table public.consulting_projects is
    'Dok 1 §Consulting | Инвестиционные проекты для упаковки.
     FSM: draft → calculating → calculated → archived.
     Каждый проект принадлежит организации (Zengi tenant).';

-- 1.2  Project Versions — версии расчёта (иммутабельные)
create table if not exists public.consulting_project_versions (
    id                  uuid        primary key default gen_random_uuid(),
    project_id          uuid        not null references public.consulting_projects(id),
    organization_id     uuid        not null references public.organizations(id),
    version_number      int         not null,
    input_params        jsonb       not null,
    results             jsonb,
    calculated_at       timestamptz,
    created_at          timestamptz not null default now(),
    constraint uq_consulting_version unique (project_id, version_number)
);

comment on table public.consulting_project_versions is
    'Dok 1 §Consulting | Каждое изменение параметров = новая версия.
     input_params: все входные параметры wizard (20+ полей).
     results: JSON со всеми 11 модулями финмодели (120 мес × модули).
     Иммутабельная после расчёта — не обновляется, только новые версии.';

-- 1.3  Reference Data — справочники (кормовые нормы, цены, нормативы)
create table if not exists public.consulting_reference_data (
    id                  serial      primary key,
    category            text        not null
                                        check (category in (
                                            'feed_norms',
                                            'feed_prices',
                                            'infrastructure_norms',
                                            'equipment_norms',
                                            'tax_rates',
                                            'wacc_parameters',
                                            'subsidy_programs',
                                            'livestock_norms',
                                            'regional_prices'
                                        )),
    code                text        not null,
    data                jsonb       not null,
    valid_from          date        not null default current_date,
    valid_to            date,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    constraint uq_consulting_ref unique (category, code, valid_from)
);

comment on table public.consulting_reference_data is
    'Dok 1 §Consulting | Справочники для расчётного ядра.
     P8: все нормативы из БД, не из хардкода.
     Обновление справочника не требует деплоя.
     Временна́я валидность: valid_from..valid_to.';


-- ==========================
-- SECTION 2 · INDEXES
-- ==========================

create index if not exists idx_cp_org
    on public.consulting_projects (organization_id);

create index if not exists idx_cp_status
    on public.consulting_projects (status)
    where is_active = true;

create index if not exists idx_cpv_project
    on public.consulting_project_versions (project_id);

create index if not exists idx_cpv_org
    on public.consulting_project_versions (organization_id);

create index if not exists idx_crd_category
    on public.consulting_reference_data (category, code);


-- ==========================
-- SECTION 3 · RLS POLICIES
-- ==========================

alter table public.consulting_projects enable row level security;
alter table public.consulting_project_versions enable row level security;
alter table public.consulting_reference_data enable row level security;

-- 3.1  consulting_projects: org members + admins read/write own
create policy "cp_read_own"
    on public.consulting_projects for select
    using (
        organization_id = any(public.fn_my_org_ids())
        or public.fn_is_admin()
    );

create policy "cp_write_own"
    on public.consulting_projects for all
    using (
        organization_id = any(public.fn_my_org_ids())
        or public.fn_is_admin()
    );

-- 3.2  consulting_project_versions: org members + admins
create policy "cpv_read_own"
    on public.consulting_project_versions for select
    using (
        organization_id = any(public.fn_my_org_ids())
        or public.fn_is_admin()
    );

create policy "cpv_write_own"
    on public.consulting_project_versions for all
    using (
        organization_id = any(public.fn_my_org_ids())
        or public.fn_is_admin()
    );

-- 3.3  consulting_reference_data: everyone reads, admin writes
create policy "crd_read_all"
    on public.consulting_reference_data for select
    using (true);

create policy "crd_admin_write"
    on public.consulting_reference_data for all
    using (public.fn_is_admin());


-- ==========================
-- SECTION 4 · RPC FUNCTIONS
-- ==========================

-- ---- RPC-C01: Create consulting project ----
create or replace function public.rpc_create_consulting_project(
    p_organization_id   uuid,
    p_name              text,
    p_farm_type         text    default 'beef_reproducer'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid;
    v_project_id uuid;
begin
    select u.id into v_user_id
    from public.users u
    where u.auth_id = auth.uid();

    if v_user_id is null then
        raise exception 'USER_NOT_FOUND' using errcode = 'P0001';
    end if;

    insert into public.consulting_projects (
        organization_id, name, farm_type, created_by
    ) values (
        p_organization_id, p_name, p_farm_type, v_user_id
    )
    returning id into v_project_id;

    -- Event
    insert into public.platform_events (
        event_type, entity_type, entity_id, organization_id,
        actor_type, actor_id, payload, is_audit
    ) values (
        'consulting.project.created',
        'consulting_projects',
        v_project_id,
        p_organization_id,
        'farmer',
        v_user_id,
        jsonb_build_object(
            'project_id', v_project_id,
            'name', p_name,
            'farm_type', p_farm_type
        ),
        false
    );

    return v_project_id;
end;
$$;

comment on function public.rpc_create_consulting_project(uuid, text, text) is
    'RPC-C01 | Dok 3 §Consulting | Phase 0
     Creates new investment project in draft status.
     Events: consulting.project.created.';


-- ---- RPC-C02: List consulting projects ----
create or replace function public.rpc_list_consulting_projects(
    p_organization_id   uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
    v_result jsonb;
begin
    select coalesce(jsonb_agg(
        jsonb_build_object(
            'id', cp.id,
            'name', cp.name,
            'farm_type', cp.farm_type,
            'status', cp.status,
            'created_at', cp.created_at,
            'updated_at', cp.updated_at,
            'latest_version', (
                select jsonb_build_object(
                    'version_number', cpv.version_number,
                    'calculated_at', cpv.calculated_at,
                    'npv', cpv.results->'wacc'->'npv',
                    'irr', cpv.results->'wacc'->'irr'
                )
                from public.consulting_project_versions cpv
                where cpv.project_id = cp.id
                order by cpv.version_number desc
                limit 1
            )
        ) order by cp.updated_at desc
    ), '[]'::jsonb) into v_result
    from public.consulting_projects cp
    where cp.organization_id = p_organization_id
      and cp.is_active = true;

    return v_result;
end;
$$;

comment on function public.rpc_list_consulting_projects(uuid) is
    'RPC-C02 | Dok 3 §Consulting | Phase 0
     Lists all active projects for org with latest version NPV/IRR.';


-- ---- RPC-C03: Get consulting project detail ----
create or replace function public.rpc_get_consulting_project(
    p_organization_id   uuid,
    p_project_id        uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
    v_result jsonb;
begin
    select jsonb_build_object(
        'id', cp.id,
        'name', cp.name,
        'farm_type', cp.farm_type,
        'status', cp.status,
        'created_by', cp.created_by,
        'created_at', cp.created_at,
        'updated_at', cp.updated_at,
        'versions', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', cpv.id,
                    'version_number', cpv.version_number,
                    'input_params', cpv.input_params,
                    'calculated_at', cpv.calculated_at,
                    'npv', cpv.results->'wacc'->'npv',
                    'irr', cpv.results->'wacc'->'irr'
                ) order by cpv.version_number desc
            )
            from public.consulting_project_versions cpv
            where cpv.project_id = cp.id
        ), '[]'::jsonb)
    ) into v_result
    from public.consulting_projects cp
    where cp.id = p_project_id
      and cp.organization_id = p_organization_id
      and cp.is_active = true;

    if v_result is null then
        raise exception 'PROJECT_NOT_FOUND' using errcode = 'P0001';
    end if;

    return v_result;
end;
$$;

comment on function public.rpc_get_consulting_project(uuid, uuid) is
    'RPC-C03 | Dok 3 §Consulting | Phase 0
     Returns project detail with all versions (without full results).';


-- ---- RPC-C04: Update consulting project ----
create or replace function public.rpc_update_consulting_project(
    p_organization_id   uuid,
    p_project_id        uuid,
    p_name              text    default null,
    p_status            text    default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_project record;
begin
    select * into v_project
    from public.consulting_projects
    where id = p_project_id
      and organization_id = p_organization_id
      and is_active = true;

    if v_project is null then
        raise exception 'PROJECT_NOT_FOUND' using errcode = 'P0001';
    end if;

    update public.consulting_projects
    set name       = coalesce(p_name, name),
        status     = coalesce(p_status, status),
        updated_at = now()
    where id = p_project_id;

    return true;
end;
$$;

comment on function public.rpc_update_consulting_project(uuid, uuid, text, text) is
    'RPC-C04 | Dok 3 §Consulting | Phase 0
     Updates project name and/or status. Null params = no change.';


-- ---- RPC-C05: Save consulting version (called by Python engine) ----
create or replace function public.rpc_save_consulting_version(
    p_organization_id   uuid,
    p_project_id        uuid,
    p_input_params      jsonb,
    p_results           jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_version_number int;
    v_version_id uuid;
begin
    -- Verify project exists and belongs to org
    if not exists (
        select 1 from public.consulting_projects
        where id = p_project_id
          and organization_id = p_organization_id
          and is_active = true
    ) then
        raise exception 'PROJECT_NOT_FOUND' using errcode = 'P0001';
    end if;

    -- Next version number
    select coalesce(max(version_number), 0) + 1
    into v_version_number
    from public.consulting_project_versions
    where project_id = p_project_id;

    -- Insert version
    insert into public.consulting_project_versions (
        project_id, organization_id, version_number,
        input_params, results, calculated_at
    ) values (
        p_project_id, p_organization_id, v_version_number,
        p_input_params, p_results, now()
    )
    returning id into v_version_id;

    -- Update project status
    update public.consulting_projects
    set status = 'calculated', updated_at = now()
    where id = p_project_id;

    -- Event
    insert into public.platform_events (
        event_type, entity_type, entity_id, organization_id,
        actor_type, payload, is_audit
    ) values (
        'consulting.version.created',
        'consulting_project_versions',
        v_version_id,
        p_organization_id,
        'system',
        jsonb_build_object(
            'project_id', p_project_id,
            'version_number', v_version_number,
            'npv', p_results->'wacc'->'npv',
            'irr', p_results->'wacc'->'irr'
        ),
        false
    );

    return v_version_id;
end;
$$;

comment on function public.rpc_save_consulting_version(uuid, uuid, jsonb, jsonb) is
    'RPC-C05 | Dok 3 §Consulting | Phase 3a
     Called by Python engine via service_role after calculation.
     Stores version with results, updates project status to calculated.
     Events: consulting.version.created.';


-- ---- RPC-C06: Get consulting version ----
create or replace function public.rpc_get_consulting_version(
    p_organization_id   uuid,
    p_version_id        uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
    v_result jsonb;
begin
    select jsonb_build_object(
        'id', cpv.id,
        'project_id', cpv.project_id,
        'version_number', cpv.version_number,
        'input_params', cpv.input_params,
        'results', cpv.results,
        'calculated_at', cpv.calculated_at,
        'created_at', cpv.created_at
    ) into v_result
    from public.consulting_project_versions cpv
    where cpv.id = p_version_id
      and cpv.organization_id = p_organization_id;

    if v_result is null then
        raise exception 'VERSION_NOT_FOUND' using errcode = 'P0001';
    end if;

    return v_result;
end;
$$;

comment on function public.rpc_get_consulting_version(uuid, uuid) is
    'RPC-C06 | Dok 3 §Consulting | Phase 0
     Returns full version with all results (11 modules).';


-- ---- RPC-C07: List consulting versions ----
create or replace function public.rpc_list_consulting_versions(
    p_organization_id   uuid,
    p_project_id        uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
    v_result jsonb;
begin
    select coalesce(jsonb_agg(
        jsonb_build_object(
            'id', cpv.id,
            'version_number', cpv.version_number,
            'calculated_at', cpv.calculated_at,
            'npv', cpv.results->'wacc'->'npv',
            'irr', cpv.results->'wacc'->'irr',
            'created_at', cpv.created_at
        ) order by cpv.version_number desc
    ), '[]'::jsonb) into v_result
    from public.consulting_project_versions cpv
    where cpv.project_id = p_project_id
      and cpv.organization_id = p_organization_id;

    return v_result;
end;
$$;

comment on function public.rpc_list_consulting_versions(uuid, uuid) is
    'RPC-C07 | Dok 3 §Consulting | Phase 0
     Lists all versions for a project (without full results).';


-- ---- RPC-C08: Upsert consulting reference data [ADMIN] ----
create or replace function public.rpc_upsert_consulting_reference(
    p_category      text,
    p_code          text,
    p_data          jsonb,
    p_valid_from    date    default current_date
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_id int;
begin
    -- Admin-only check
    if not public.fn_is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    insert into public.consulting_reference_data (
        category, code, data, valid_from
    ) values (
        p_category, p_code, p_data, p_valid_from
    )
    on conflict (category, code, valid_from)
    do update set
        data = excluded.data,
        updated_at = now()
    returning id into v_id;

    return v_id;
end;
$$;

comment on function public.rpc_upsert_consulting_reference(text, text, jsonb, date) is
    'RPC-C08 | Dok 3 §Consulting | Phase 0
     Admin-only: upserts reference data (feed norms, prices, tax rates, etc.).
     P8: all norms from DB, not from hardcode.';


-- ==========================
-- SECTION 5 · RPC REGISTRY
-- ==========================

insert into public.rpc_name_registry (sql_name, dok3_name, dok5_tool_name, created_in, notes) values
    ('rpc_create_consulting_project',   'rpc_create_consulting_project',   null, 'd09_consulting.sql (Phase 0)', 'RPC-C01: Create investment project'),
    ('rpc_list_consulting_projects',    'rpc_list_consulting_projects',    null, 'd09_consulting.sql (Phase 0)', 'RPC-C02: List projects with latest NPV/IRR'),
    ('rpc_get_consulting_project',      'rpc_get_consulting_project',      null, 'd09_consulting.sql (Phase 0)', 'RPC-C03: Project detail + versions'),
    ('rpc_update_consulting_project',   'rpc_update_consulting_project',   null, 'd09_consulting.sql (Phase 0)', 'RPC-C04: Update name/status'),
    ('rpc_save_consulting_version',     'rpc_save_consulting_version',     null, 'd09_consulting.sql (Phase 0)', 'RPC-C05: Save version (engine → DB)'),
    ('rpc_get_consulting_version',      'rpc_get_consulting_version',      null, 'd09_consulting.sql (Phase 0)', 'RPC-C06: Full version with results'),
    ('rpc_list_consulting_versions',    'rpc_list_consulting_versions',    null, 'd09_consulting.sql (Phase 0)', 'RPC-C07: Version list per project'),
    ('rpc_upsert_consulting_reference', 'rpc_upsert_consulting_reference', null, 'd09_consulting.sql (Phase 0)', 'RPC-C08: Admin reference data upsert')
on conflict (sql_name) do update
    set dok3_name = excluded.dok3_name, notes = excluded.notes, created_in = excluded.created_in;
