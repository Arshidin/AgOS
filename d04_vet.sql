-- ============================================================
-- AGOS Schema: d04_vet
-- Project: TURAN Agricultural Operating System
-- Consolidated: 2026-03-05 (pre-development baseline)
--
-- Veterinary module.
Cases, Diagnoses, Treatments, Vaccinations, Epidemic Intelligence.
--
-- Depends on: d01_kernel.sql
-- Consolidated from: 004_vet.sql
--
-- Convention: All statements are idempotent.
--   CREATE TABLE IF NOT EXISTS
--   CREATE OR REPLACE FUNCTION
--   ALTER TABLE ADD COLUMN IF NOT EXISTS
--   INSERT ... ON CONFLICT DO NOTHING
-- ============================================================
-- ============================================================
-- AGOS Migration 004: VETERINARY MODULE
-- Project: TURAN Agricultural Operating System
-- Version: 1.0 | Date: 4 March 2026
--
-- Entities (18 total):
--   Reference (7):  vet_products*, diseases*, symptoms*,
--                   disease_symptoms*, treatments*,
--                   vaccination_protocols*, epidemic_thresholds*
--   Operational (11): vet_cases, symptom_evidence, vet_diagnoses,
--                     vet_recommendations, treatment_logs,
--                     health_restrictions, vaccination_plans,
--                     vaccination_plan_items, vaccination_records,
--                     epidemic_signals, proactive_alerts
--
-- Decisions implemented:
--   D55  VetCase auto-created from AI dialogue
--   D56  Two-level: AI 24/7 + Expert escalation
--   D57  Critical severity auto-escalates → ConsultationRequest
--   D58  vet_case_id FK on consultation_requests (CLOSED here)
--   D59  Epidemic intelligence: aggregation + thresholds + AI + expert
--   D60  VaccinationPlan: Protocol → Plan → Item
--   D61  Treatment dosages ONLY from validated reference
--   D62  ProactiveAlert requires expert approval for epidemic_warning
--   D63  withdrawal_period_days → health_restrictions → TSP safety gate
--   D91  epidemic_thresholds as data (P8), not hardcoded (NEW)
--   D92  dosage_info = immutable snapshot in vet_recommendations (NEW)
--   D93  Disease/Treatment FSM: draft→validated→active→deprecated (NEW)
--   D94  KnowledgeChunk auto-created on disease status→validated (NEW)
--   D95  Symptoms: structured taxonomy + free-text both (NEW)
--   D96  CHECK: medication type requires treatment_id (NEW)
--   D97  VaccinationPlan generated at membership observer activation (NEW)
--         FSM change from Dok 1: draft → pending_review (D97 override)
--   D98  health_restrictions: TSP safety gate (NEW, from Gemini)
--   D99  symptom_evidence: photo/audio evidence trail (NEW, from Gemini)
--   D100 vet_products separate from treatments (NEW, from Gemini)
--   D101 vaccination_records with vaccine batch_number (NEW, from Gemini)
--   D102 treatment_logs without medical_inventory (NEW, from Gemini)
--
-- FSMs implemented:
--   diseases/treatments/vaccination_protocols:
--     draft → validated → active → deprecated            (D93)
--   vet_cases:
--     open → in_progress → resolved | escalated          (Dok 1 5.7)
--   vaccination_plans:
--     pending_review → active → completed | expired      (D97 override)
--   vaccination_plan_items:
--     scheduled → reminded → completed | skipped | overdue (Dok 1 5.7)
--   epidemic_signals:
--     detected → confirmed | false_positive → resolved   (Dok 1 5.7)
--   proactive_alerts:
--     draft → approved → sent                            (Dok 1 5.7)
--
-- Event Bus (Dok 1 Section 5.5, events 12–17):
--   12: vet.case.created       → AI Gateway → epidemic signal aggregation
--   13: vet.case.escalated     → System/AI  → ConsultationRequest + Notification
--   14: vet.signal.detected    → System     → Expert review queue + Notification
--   15: vet.signal.confirmed   → Expert     → ProactiveAlert draft + Notification
--   16: vet.vaccination.reminded → System(cron) → Notification via AI WhatsApp
--   17: vet.vaccination.overdue  → System(cron) → Notification farmer + expert
--
-- Cross-domain integration:
--   D63+D98: health_restrictions → TSP batch creation blocked via RPC (Dok 3)
--            NOT a FK — TSP RPC checks health_restrictions before creating Batch
--   D57+D58: VetCase escalation → ConsultationRequest (001_kernel.sql)
--            Deferred FK consultation_requests.vet_case_id CLOSED here
--   D75:     VaccinationPlan ↔ FarmPhase: coordinate by dates, NOT FK
--
-- Depends on: 001_kernel.sql (organizations, farms, herd_groups,
--             animal_categories, users, expert_profiles,
--             regions, consultation_requests, knowledge_chunks)
--             003_feed.sql (no direct FK, but D48 boundary noted)
--
-- Open questions (do NOT block this migration):
--   Q42: 50 curated diseases — data entry by vet expert (seeded as draft)
--   Q43: Symptom taxonomy — seeded with 25 common symptoms as draft
--   Q44: VaccinationProtocol initial data — seeded with 8 KZ protocols as draft
--   Q45: Photo diagnosis via Claude Vision — AI Gateway scope (Dok 5)
--   Q47: Expert capacity at launch, SLA — operational, not schema
--   Q71: medical_inventory — deferred (D102: treatment_logs without inventory)
-- ============================================================

-- ============================================================
-- SECTION 1: CLOSE DEFERRED FK FROM 001_kernel.sql
-- D58: consultation_requests.vet_case_id → vet_cases
-- This was intentionally deferred to avoid forward reference.
-- ============================================================

-- (Executed after vet_cases table is created — see end of this file Section 7)
-- Placeholder comment; actual ALTER TABLE is in Section 7.

-- ============================================================
-- SECTION 2: REFERENCE TABLES (7 tables)
-- P8: All reference tables managed by vet expert via Expert Console.
-- D93: Lifecycle FSM for disease knowledge: draft→validated→active→deprecated
-- ============================================================

-- -------------------------------------------------------
-- vet_products
-- D100: Препараты отдельно от протоколов лечения.
-- Один препарат (Окситетрациклин) → много протоколов.
-- withdrawal_period_days здесь — canonical source для D63/D98.
-- Вакцины тоже хранятся здесь (product_type='vaccine').
-- Нет отдельного справочника вакцин (решение Аршидина).
-- -------------------------------------------------------
create table if not exists public.vet_products (
    id                      uuid    primary key default gen_random_uuid(),
    code                    text    not null unique,   -- 'OXYTET_20PCT', 'IVERMECTIN_1PCT'
    brand_name              text    not null,
    generic_name            text,                      -- МНН (международное непатентованное)
    active_substance        text    not null,          -- 'oxytetracycline', 'ivermectin'
    product_type            text    not null
                                        check (product_type in (
                                            'antibiotic',
                                            'antiparasitic',
                                            'anti_inflammatory',
                                            'antifungal',
                                            'vaccine',
                                            'vitamin_mineral',
                                            'supportive',
                                            'other'
                                        )),
    concentration           text,                      -- '20%', '1% w/v'
    form                    text,                      -- 'injectable_solution', 'oral_bolus', 'pour_on'
    -- D63: Ключевое поле для TSP safety gate (D98)
    withdrawal_period_meat_days     int     not null default 0
                                        check (withdrawal_period_meat_days >= 0),
    withdrawal_period_milk_days     int     not null default 0
                                        check (withdrawal_period_milk_days >= 0),
    is_prescription_only    boolean not null default true,
    -- D100: dosage_logic — формулы для AI (не жёсткие значения, т.к. зависят от болезни)
    -- Например: {"base_dose_ml_per_10kg": 0.5, "max_dose_ml": 20, "route": "IM"}
    -- Конкретные дозировки — в treatments.dosage_* полях
    dosage_reference_jsonb  jsonb,
    manufacturer            text,
    registration_number     text,                      -- номер регистрации в КЗ
    notes                   text,
    -- D93: lifecycle
    status                  text    not null default 'draft'
                                        check (status in (
                                            'draft',        -- загружен из справочника, не проверен
                                            'validated',    -- ветеринар проверил
                                            'active',       -- используется в системе
                                            'deprecated'    -- устарел
                                        )),
    reviewed_by             uuid    references public.expert_profiles(id),
    reviewed_at             timestamptz,
    source_reference        text,                      -- 'РГП КазАгроИнновация 2023' / 'WOAH'
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);
comment on table public.vet_products is
    'D100: Препараты и вакцины в одной таблице. Вакцины = product_type=vaccine.
     D63: withdrawal_period_meat_days — canonical source для TSP safety gate.
     D93: status=active → AI может рекомендовать. draft/validated → только Expert Console.
     dosage_reference_jsonb: справочные формулы. Точные дозировки — в treatments.
     Seed: ключевые КЗ препараты как draft, ветеринар валидирует.';

-- -------------------------------------------------------
-- diseases
-- D93: Lifecycle draft→validated→active→deprecated.
-- Q42: 50 топ-болезней КЗ мясного скотоводства.
-- D94: При validated → auto-create KnowledgeChunk (триггер).
-- AI читает только active болезни.
-- -------------------------------------------------------
create table if not exists public.diseases (
    id                      uuid    primary key default gen_random_uuid(),
    code                    text    not null unique,   -- 'FMD', 'BRUCELLOSIS', 'LSD'
    name_ru                 text    not null,
    name_kz                 text,
    name_en                 text,
    category                text    not null
                                        check (category in (
                                            'infectious',   -- инфекционные
                                            'parasitic',    -- паразитарные
                                            'metabolic',    -- обменные
                                            'reproductive', -- репродуктивные
                                            'neonatal',     -- болезни новорождённых
                                            'respiratory',  -- респираторные
                                            'digestive',    -- пищеварительные
                                            'traumatic',    -- травмы
                                            'other'
                                        )),
    -- Клинические параметры
    incubation_period_days_min  int,
    incubation_period_days_max  int,
    -- Какие категории животных поражает (uuid[] ссылается на animal_categories.id)
    -- P7: Additive — новые категории добавляются без изменения схемы
    affected_animal_category_ids    uuid[]  default '{}',
    -- Правовой статус (КЗ НПА)
    is_notifiable           boolean not null default false,  -- обязательное уведомление МСХ РК
    is_quarantine_required  boolean not null default false,
    quarantine_days         int,
    -- D94: связь с RAG (заполняется триггером при validated)
    knowledge_chunk_id      uuid    references public.knowledge_chunks(id),
    -- Быстрое описание для RAG без JOIN (D94, auto-populated)
    -- Структура: {description, symptoms_summary, treatment_summary, prevention}
    rag_summary_jsonb       jsonb,
    -- D93: lifecycle
    status                  text    not null default 'draft'
                                        check (status in (
                                            'draft',
                                            'validated',
                                            'active',
                                            'deprecated'
                                        )),
    reviewed_by             uuid    references public.expert_profiles(id),
    reviewed_at             timestamptz,
    source_reference        text,
    notes                   text,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);
comment on table public.diseases is
    'Q42: Кюрированный набор 50 болезней КЗ мясного скотоводства.
     D93: AI читает только status=active. draft = данные из справочника, pending review.
     D94: Триггер fn_disease_create_knowledge_chunk срабатывает при status→validated.
     affected_animal_category_ids: uuid[] вместо junction table.
     Обоснование: 50 болезней × 12 категорий = простой массив достаточен (нет сложных запросов).
     is_notifiable: особо опасные → EpidemicSignal автоматически создаёт уведомление МСХ.';

-- -------------------------------------------------------
-- symptoms
-- D95: Структурированная таксономия для матчинга + ai_question для диалога.
-- -------------------------------------------------------
create table if not exists public.symptoms (
    id              uuid    primary key default gen_random_uuid(),
    code            text    not null unique,   -- 'FEVER_HIGH', 'DIARRHEA_BLOODY'
    name_ru         text    not null,
    name_en         text,
    body_system     text    not null
                                check (body_system in (
                                    'general',      -- общее состояние: вялость, температура
                                    'digestive',    -- ЖКТ: понос, вздутие, рвота
                                    'respiratory',  -- дыхание: кашель, выделения
                                    'nervous',      -- нервная: судороги, парезы
                                    'reproductive', -- репродуктивная: аборт, задержание
                                    'skin',         -- кожные: узлы, язвы, облысение
                                    'locomotor',    -- опорно-двигательная: хромота
                                    'ocular',       -- глаза: слезотечение, помутнение
                                    'other'
                                )),
    description_ru          text,  -- для Expert Console
    -- D95: как AI задаёт уточняющий вопрос фермеру в WhatsApp
    ai_question_ru          text,  -- 'Понос с кровью или без?'
    -- Для сортировки и отображения
    sort_order              int     not null default 0,
    is_active               boolean not null default true,
    created_at              timestamptz not null default now()
    -- Симптомы: no lifecycle, нет approval flow. Ветеринар добавляет по мере необходимости.
);
comment on table public.symptoms is
    'D95: Структурированная таксономия. Нет lifecycle (в отличие от diseases/treatments).
     ai_question_ru: AI задаёт это в WhatsApp диалоге для уточнения симптома.
     body_system: для структурирования диалога — AI группирует вопросы по системам.
     Seed: 25 наиболее частых симптомов КРС.';

-- -------------------------------------------------------
-- disease_symptoms
-- Junction: disease ↔ symptom с весами для диагностического матчинга.
-- D95: weight = вклад симптома в confidence диагноза.
-- -------------------------------------------------------
create table if not exists public.disease_symptoms (
    id                  uuid    primary key default gen_random_uuid(),
    disease_id          uuid    not null references public.diseases(id) on delete cascade,
    symptom_id          uuid    not null references public.symptoms(id),
    -- Вес симптома: насколько характерен для этой болезни
    weight              numeric(3,2) not null default 0.5
                                        check (weight between 0 and 1),
    -- Патогномоничный: если true → практически 100% диагноз одним симптомом
    -- Пример: пузыри на дёснах + лихорадка → ящур (FMD)
    is_pathognomonic    boolean not null default false,
    -- Когда симптом появляется в течении болезни
    onset_timing        text    check (onset_timing in (
                                    'early',        -- первые 1-3 дня
                                    'mid',          -- разгар болезни
                                    'late',         -- осложнения
                                    'throughout'    -- весь период
                                )),
    unique (disease_id, symptom_id),
    created_at          timestamptz not null default now()
);
comment on table public.disease_symptoms is
    'D95: Матрица для диагностического матчинга.
     Алгоритм: score(disease) = SUM(symptom_weight × extracted_confidence).
     Если max_score >= 0.5 → VetDiagnosis создаётся AI.
     Если max_score < 0.5 → escalate to expert (D56 комбо сценарий).
     is_pathognomonic=true: один симптом даёт confidence=1.0 (пример: skin nodules → LSD).';

-- -------------------------------------------------------
-- treatments
-- D61: Дозировки ТОЛЬКО из валидированного справочника.
-- D92: VetRecommendation.dosage_info = snapshot этих полей.
-- D100: Ссылается на vet_products (препарат) + disease (болезнь).
-- -------------------------------------------------------
create table if not exists public.treatments (
    id                      uuid    primary key default gen_random_uuid(),
    code                    text    not null unique,   -- 'OXYTET_RESP_CATTLE_IM'
    disease_id              uuid    not null references public.diseases(id),
    vet_product_id          uuid    not null references public.vet_products(id),
    name_ru                 text    not null,
    treatment_type          text    not null
                                        check (treatment_type in (
                                            'antibiotic',
                                            'antiparasitic',
                                            'anti_inflammatory',
                                            'supportive',
                                            'vaccination',
                                            'quarantine',
                                            'other'
                                        )),
    -- Дозировка (D61: только отсюда, D92: snapshot в VetRecommendation)
    dosage_per_kg           numeric(8,4),              -- мг/кг или мл/кг
    dosage_unit             text    check (dosage_unit in (
                                        'mg_per_kg', 'ml_per_kg',
                                        'iu_per_kg', 'ml_fixed',
                                        'g_per_day', 'per_protocol'
                                    )),
    administration_route    text    check (administration_route in (
                                        'IM',           -- внутримышечно
                                        'IV',           -- внутривенно
                                        'SC',           -- подкожно
                                        'PO',           -- перорально
                                        'topical',      -- наружно
                                        'intranasal',
                                        'other'
                                    )),
    frequency_hours         int,                       -- каждые N часов
    duration_days           int,                       -- курс N дней
    min_dose_ml             numeric(8,4),              -- минимальная доза (безопасность)
    max_dose_ml             numeric(8,4),              -- максимальная доза
    -- D63: withdrawal period берётся из vet_products как canonical source.
    -- Здесь дублируется для удобства snapshot (D92) — должно совпадать с vet_products.
    withdrawal_period_days  int     not null default 0
                                        check (withdrawal_period_days >= 0),
    -- Применимость (дополнительные ограничения помимо болезни)
    applicable_animal_category_ids  uuid[]  default '{}',
    min_weight_kg           numeric(6,2),
    max_weight_kg           numeric(6,2),
    contraindications       text,
    special_instructions    text,
    -- D93: lifecycle
    status                  text    not null default 'draft'
                                        check (status in (
                                            'draft',
                                            'validated',
                                            'active',
                                            'deprecated'
                                        )),
    reviewed_by             uuid    references public.expert_profiles(id),
    reviewed_at             timestamptz,
    source_reference        text,
    notes                   text,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);
comment on table public.treatments is
    'D61: ЕДИНСТВЕННЫЙ источник дозировок для AI. AI читает только status=active.
     D92: При создании VetRecommendation делается immutable snapshot этих полей.
     D100: vet_product_id → препарат; disease_id → болезнь.
     withdrawal_period_days: дублирует vet_products для snapshot удобства.
     INVARIANT: withdrawal_period_days должен быть >= vet_products.withdrawal_period_meat_days.
     Нарушение = ошибка данных, не архитектурная проблема.';

-- -------------------------------------------------------
-- vaccination_protocols
-- D60: Базовые протоколы → VaccinationPlan → VaccinationPlanItem.
-- product_type='vaccine' в vet_products.
-- -------------------------------------------------------
create table if not exists public.vaccination_protocols (
    id                      uuid    primary key default gen_random_uuid(),
    code                    text    not null unique,   -- 'FMD_ANNUAL_KZ', 'BRU_RING_KZ'
    name_ru                 text    not null,
    disease_id              uuid    not null references public.diseases(id),
    vet_product_id          uuid    not null references public.vet_products(id),
    -- Схема вакцинации
    dose_count              int     not null default 1 check (dose_count in (1, 2, 3)),
    interval_between_doses_days int,                   -- null если одна доза
    annual_revaccination    boolean not null default true,
    -- Сезонность (КЗ специфика: весна / осень)
    -- [3, 4] = март-апрель; null = круглогодично
    seasonal_months         int[]   default '{}',
    -- Применимость
    applicable_category_ids uuid[]  default '{}',      -- из animal_categories
    min_age_days            int,                       -- null = любой возраст
    max_age_days            int,
    -- D63: вакцина тоже имеет период ожидания (esp. живые вакцины)
    withdrawal_period_days  int     not null default 0,
    -- Обязательность
    is_mandatory_kz         boolean not null default false,  -- обязательна по НПА КЗ
    -- D93: lifecycle
    status                  text    not null default 'draft'
                                        check (status in (
                                            'draft', 'validated', 'active', 'deprecated'
                                        )),
    reviewed_by             uuid    references public.expert_profiles(id),
    reviewed_at             timestamptz,
    source_reference        text,                      -- 'МСХ РК Приказ №126, 2021'
    notes                   text,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);
comment on table public.vaccination_protocols is
    'D60: Шаблон для генерации VaccinationPlan.
     D97: fn_generate_vaccination_plan читает active протоколы + farm.region + herd_groups.
     seasonal_months[]: КЗ ящур — март-апрель. Бруцеллёз — кольцевой тест spring.
     is_mandatory_kz=true: Ящур, бруцеллёз, сибирская язва (обязательно по МСХ РК).
     Seed: 8 ключевых протоколов КЗ как draft.';

-- -------------------------------------------------------
-- epidemic_thresholds
-- D91: P8 — пороги как данные, не код.
-- Ветеринар меняет без деплоя через Expert Console.
-- -------------------------------------------------------
create table if not exists public.epidemic_thresholds (
    id                  uuid    primary key default gen_random_uuid(),
    -- null disease_id = default threshold для любой болезни
    disease_id          uuid    references public.diseases(id),
    case_count_threshold    int     not null check (case_count_threshold > 0),
    days_window         int     not null check (days_window > 0),
    -- Уровень тревоги при превышении порога
    severity_level      text    not null
                                    check (severity_level in (
                                        'watch',        -- наблюдение
                                        'warning',      -- предупреждение
                                        'alert',        -- тревога
                                        'emergency'     -- чрезвычайная ситуация
                                    )),
    -- Дополнительное условие: только для особо опасных болезней
    applies_to_notifiable_only  boolean not null default false,
    is_active           boolean not null default true,
    notes               text,
    created_by          uuid    references public.expert_profiles(id),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);
comment on table public.epidemic_thresholds is
    'D91: Пороги обнаружения эпидемии как данные (P8 Standards as Data).
     Дефолтный порог (disease_id IS NULL): 3 случая за 14 дней → watch.
     Особо опасные (is_notifiable=true): 1 случай за 7 дней → emergency.
     Система: SELECT threshold WHERE disease_id = $1 OR disease_id IS NULL
              ORDER BY disease_id NULLS LAST LIMIT 1
     (специфичный порог болезни приоритетнее дефолтного).
     Seed: дефолтный порог + усиленные для is_notifiable болезней.';

-- ============================================================
-- SECTION 3: OPERATIONAL TABLES (11 tables)
-- ============================================================

-- -------------------------------------------------------
-- vet_cases
-- D55: Создаётся AI из каждого ветеринарного диалога.
-- D57: severity=critical → auto-escalates → ConsultationRequest.
-- Центральный hub ветеринарного модуля.
-- -------------------------------------------------------
create table if not exists public.vet_cases (
    id                      uuid    primary key default gen_random_uuid(),
    -- Ownership & RLS
    organization_id         uuid    not null references public.organizations(id), -- denorm для RLS
    farm_id                 uuid    not null references public.farms(id),
    herd_group_id           uuid    references public.herd_groups(id), -- nullable: может не знать
    affected_head_count     int     check (affected_head_count > 0),   -- nullable: "несколько"
    -- Симптомы: два уровня (D95)
    symptoms_text           text,                      -- сырой ввод фермера WhatsApp
    symptoms_structured     jsonb   default '[]',      -- AI-extracted:
                                                       -- [{symptom_id, symptom_code,
                                                       --   confidence, extracted_from_text}]
    -- FSM (Dok 1 Section 5.7)
    severity                text    not null default 'moderate'
                                        check (severity in (
                                            'mild',     -- не опасно, наблюдение
                                            'moderate', -- требует лечения
                                            'severe',   -- срочно
                                            'critical'  -- D57: auto-escalate
                                        )),
    status                  text    not null default 'open'
                                        check (status in (
                                            'open',         -- создан AI, диагноз не выставлен
                                            'in_progress',  -- диагноз добавлен, лечение идёт
                                            'resolved',     -- рекомендации выполнены
                                            'escalated'     -- передан ветеринарному эксперту
                                        )),
    -- D55: как создан
    created_via             text    not null default 'ai_whatsapp'
                                        check (created_via in (
                                            'ai_whatsapp',
                                            'ai_web',
                                            'expert_manual'
                                        )),
    -- D57: escalation link (deferred FK в Section 7)
    consultation_request_id uuid,                      -- → consultation_requests(id)
    -- Timestamps
    resolved_at             timestamptz,
    resolution_notes        text,
    created_by              uuid    references public.users(id),
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);
comment on table public.vet_cases is
    'D55: Каждый ветеринарный запрос от фермера создаёт VetCase.
     D57: Триггер fn_vet_case_auto_escalate: severity=critical → status=escalated +
          creates ConsultationRequest автоматически.
     symptoms_structured: DRAFT данные от AI. Ветеринар может override через VetDiagnosis.
     organization_id denorm: RLS — фермер A не видит VetCase фермера B (Legal 5.9).
     FSM: open→in_progress (при VetDiagnosis INSERT) →resolved/escalated.';

-- -------------------------------------------------------
-- symptom_evidence
-- D99: Фото, аудио, видео — доказательная база (от Gemini).
-- Ссылка на исходное ai_messages для "цифрового вскрытия".
-- -------------------------------------------------------
create table if not exists public.symptom_evidence (
    id                  uuid    primary key default gen_random_uuid(),
    vet_case_id         uuid    not null references public.vet_cases(id) on delete cascade,
    -- Ссылка на исходное сообщение фермера
    ai_message_id       uuid    references public.ai_messages(id),  -- null если загружено вручную
    evidence_type       text    not null
                                    check (evidence_type in (
                                        'photo',    -- фото животного
                                        'audio',    -- голосовое описание (уже транскрибировано)
                                        'video',    -- видео (будущее)
                                        'text',     -- текстовое описание
                                        'lab_result'  -- результат анализа (PDF/фото)
                                    )),
    storage_url         text,                          -- Supabase Storage URL (фото/видео/аудио)
    -- Что AI увидел/извлёк из этого доказательства
    -- [{finding: 'skin_nodules', confidence: 0.85, location: 'neck', notes: 'approx 3cm'}]
    extracted_findings  jsonb   default '[]',
    -- Ветеринар-эксперт просмотрел это доказательство
    reviewed_by         uuid    references public.users(id),
    reviewed_at         timestamptz,
    expert_notes        text,
    created_at          timestamptz not null default now()
    -- No updated_at: append-only (доказательства не редактируются)
);
comment on table public.symptom_evidence is
    'D99: Доказательная база для "цифрового вскрытия" (от Gemini).
     Ссылка ai_message_id → исходное сообщение фермера.
     Если животное погибло — можно восстановить: фото + диалог + диагноз + рекомендации.
     APPEND-ONLY: нет updated_at. Доказательства нельзя редактировать после создания.
     storage_url: Supabase Storage. AI видит URL, Claude Vision анализирует изображение.
     Q45: Photo diagnosis via Claude Vision — реализуется в AI Gateway (Dok 5).';

-- -------------------------------------------------------
-- vet_diagnoses
-- D56: AI создаёт предварительный, эксперт подтверждает/меняет.
-- confidence: результат symptom matching algorithm.
-- -------------------------------------------------------
create table if not exists public.vet_diagnoses (
    id                  uuid    primary key default gen_random_uuid(),
    vet_case_id         uuid    not null references public.vet_cases(id) on delete cascade,
    disease_id          uuid    references public.diseases(id), -- nullable: неизвестная болезнь
    -- D95: какие симптомы совпали (объяснение для фермера и эксперта)
    matched_symptoms    jsonb   default '[]',           -- [{symptom_code, weight, confidence}]
    confidence          numeric(3,2)
                                check (confidence between 0 and 1),
    -- D56: source диагноза
    source              text    not null
                                    check (source in (
                                        'ai_analysis',      -- D95 matching algorithm
                                        'ai_rag',           -- RAG fallback (низкий structured confidence)
                                        'expert_confirmed', -- эксперт подтвердил AI диагноз
                                        'expert_override'   -- эксперт заменил на другой
                                    )),
    is_final            boolean not null default false, -- эксперт подтвердил как итоговый
    diagnosed_by        uuid    references public.users(id), -- null = AI
    diagnosed_at        timestamptz not null default now(),
    notes               text,
    created_at          timestamptz not null default now()
    -- No updated_at: диагнозы не редактируются, только добавляются
);
comment on table public.vet_diagnoses is
    'D56: Многоуровневая диагностика: AI первый, эксперт финальный.
     source=ai_rag: confidence structured matching < 0.5 → AI использовал RAG вместо матрицы.
     source=expert_override: эксперт заменил диагноз. Старый AI диагноз остаётся (история).
     is_final=true: только один финальный диагноз per vet_case.
     APPEND-ONLY: диагнозы не редактируются. Новый override = новая строка.';

-- -------------------------------------------------------
-- vet_recommendations
-- D61: medication ТОЛЬКО с treatment_id (CHECK constraint).
-- D92: dosage_info = immutable snapshot полей treatment на момент создания.
-- D96: source=ai_generated → treatment_id IS NOT NULL (второй CHECK).
-- -------------------------------------------------------
create table if not exists public.vet_recommendations (
    id                  uuid    primary key default gen_random_uuid(),
    vet_case_id         uuid    not null references public.vet_cases(id) on delete cascade,
    recommendation_type text    not null
                                    check (recommendation_type in (
                                        'medication',       -- лечение препаратом
                                        'isolation',        -- изоляция животных
                                        'nutrition_change', -- смена рациона (D48: vet↔feed граница)
                                        'monitoring',       -- наблюдение + повторный осмотр
                                        'notify_authorities', -- уведомить МСХ (is_notifiable)
                                        'expert_visit',     -- вызов ветврача
                                        'lab_test',         -- направление на анализы
                                        'culling'           -- вынужденный забой
                                    )),
    priority            int     not null default 2
                                    check (priority in (1, 2, 3)),  -- 1=срочно, 2=важно, 3=обычное
    text_ru             text    not null,
    source              text    not null
                                    check (source in (
                                        'ai_generated',     -- D61: обязан иметь treatment_id
                                        'expert_created',   -- эксперт создал вручную
                                        'protocol_auto'     -- из VaccinationProtocol
                                    )),
    -- D61 + D96: для medication ОБЯЗАТЕЛЕН treatment_id
    treatment_id        uuid    references public.treatments(id),
    -- D92: IMMUTABLE SNAPSHOT дозировки на момент создания рекомендации.
    -- Даже если ветеринар потом изменит Treatment — здесь хранится то что было актуально.
    -- Структура:
    -- {
    --   drug_name: text,             vet_products.brand_name
    --   active_substance: text,      vet_products.active_substance
    --   dosage_per_kg: numeric,
    --   dosage_unit: text,
    --   administration_route: text,
    --   frequency_hours: int,
    --   duration_days: int,
    --   withdrawal_period_days: int,  ← критично для D98 health_restrictions
    --   snapshot_date: date,
    --   treatment_status_at_snapshot: text,  ← 'active' должен быть
    --   treatment_id: uuid            ← для трейсабельности
    -- }
    dosage_info         jsonb,
    -- Статус выполнения
    is_completed        boolean not null default false,
    completed_at        timestamptz,
    completed_by        uuid    references public.users(id),
    created_by          uuid    references public.users(id),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    -- D61: medication требует treatment_id
    constraint chk_medication_requires_treatment
        check (recommendation_type != 'medication' or treatment_id is not null),
    -- D96: AI-generated medication ОБЯЗАН иметь treatment_id
    -- (эксперт может создать без treatment_id в крайнем случае)
    constraint chk_ai_medication_requires_treatment
        check (
            not (source = 'ai_generated' and recommendation_type = 'medication'
                 and treatment_id is null)
        )
);
comment on table public.vet_recommendations is
    'D61: Дозировки только из справочника treatments (status=active).
     D92: dosage_info = immutable snapshot. Treatment.dosage_per_kg изменится — snapshot не изменится.
     D96: двойная защита через CHECK constraints.
     Триггер fn_vet_rec_create_health_restriction: если recommendation_type=medication
     И dosage_info.withdrawal_period_days > 0 → создаёт health_restriction для herd_group.
     D48: nutrition_change — граница с Feed модулем. AI создаёт, не берёт на себя Feed логику.';

-- -------------------------------------------------------
-- treatment_logs
-- D102: Журнал манипуляций. Без medical_inventory (Q71 отложено).
-- Кто, когда, какой препарат.
-- -------------------------------------------------------
create table if not exists public.treatment_logs (
    id                  uuid    primary key default gen_random_uuid(),
    vet_case_id         uuid    not null references public.vet_cases(id),
    organization_id     uuid    not null references public.organizations(id), -- denorm RLS
    vet_recommendation_id uuid  references public.vet_recommendations(id), -- null если вне рекомендации
    treatment_id        uuid    references public.treatments(id),
    vet_product_id      uuid    references public.vet_products(id),
    -- Факт манипуляции
    administered_by     uuid    references public.users(id),
    administered_at     timestamptz not null default now(),
    actual_dose_given   numeric(8,4),
    dose_unit           text,
    animals_treated_count   int,
    -- Q71: без auto-списания из inventory
    -- inventory_item_id FK deferred → Q71 medical_inventory
    notes               text,
    created_at          timestamptz not null default now()
    -- APPEND-ONLY: нет updated_at. Журнал манипуляций не редактируется.
);
comment on table public.treatment_logs is
    'D102: Журнал манипуляций без medical_inventory (Q71 отложено).
     Доказательная база: кто и что ввёл, когда.
     vet_recommendation_id nullable: фермер мог применить лечение вне системы.
     APPEND-ONLY: нет updated_at.
     Связь с health_restrictions: при INSERT → проверить нужно ли продлить restriction.
     Q71: в будущем добавить FK inventory_item_id для auto-списания.';

-- -------------------------------------------------------
-- health_restrictions
-- D98: TSP safety gate (от Gemini, реализует D63).
-- is_active — GENERATED COLUMN: вычисляется из ends_at.
-- TSP RPC create_batch проверяет эту таблицу перед созданием Batch.
-- -------------------------------------------------------
create table if not exists public.health_restrictions (
    id                  uuid    primary key default gen_random_uuid(),
    herd_group_id       uuid    not null references public.herd_groups(id),
    organization_id     uuid    not null references public.organizations(id), -- denorm RLS
    -- Почему ограничение
    vet_case_id         uuid    references public.vet_cases(id),
    vet_recommendation_id uuid  references public.vet_recommendations(id),
    treatment_log_id    uuid    references public.treatment_logs(id),
    restriction_type    text    not null
                                    check (restriction_type in (
                                        'medication_withdrawal', -- D63: период ожидания препарата
                                        'quarantine',            -- карантин (EpidemicSignal)
                                        'disease_suspected',     -- подозрение на болезнь
                                        'lab_pending'            -- ожидание результатов анализа
                                    )),
    starts_at           timestamptz not null,
    ends_at             timestamptz not null,
    check (ends_at > starts_at),
    -- D98: GENERATED COLUMN — TSP RPC проверяет этот флаг
    -- Производительность: STORED = вычислен один раз при INSERT/UPDATE
    is_active           boolean generated always as (now() < ends_at) stored,
    reason_text         text,
    created_by          uuid    references public.users(id),
    created_at          timestamptz not null default now()
    -- No updated_at: append-only, новое ограничение = новая строка
);
comment on table public.health_restrictions is
    'D98: TSP Safety Gate. Реализует D63 (withdrawal_period_days).
     GENERATED COLUMN is_active: TSP RPC запрос:
       SELECT 1 FROM health_restrictions
       WHERE herd_group_id = $1 AND is_active = true LIMIT 1
     Если найдено → RPC create_batch возвращает ошибку с restriction_type и ends_at.
     APPEND-ONLY: нет updated_at. Окончание restriction = ends_at наступает само.
     Источник: vet_recommendation (medication) → withdrawal_period_days → ends_at.
     Карантин: EpidemicSignal.confirmed + is_quarantine_required → quarantine restriction.
     Фермер видит в UI: "Группа заблокирована для продажи до {ends_at}. Причина: {reason}."';

-- -------------------------------------------------------
-- vaccination_plans
-- D60: Protocol → Plan → Item.
-- D97: Генерируется при membership observer activation.
-- FSM ИЗМЕНЁН от Dok 1: draft → pending_review (D97 override).
-- -------------------------------------------------------
create table if not exists public.vaccination_plans (
    id                  uuid    primary key default gen_random_uuid(),
    farm_id             uuid    not null references public.farms(id) on delete cascade,
    organization_id     uuid    not null references public.organizations(id), -- denorm RLS
    name                text    not null,   -- 'План вакцинации 2026 — Ферма Казыбек'
    plan_year           int     not null,
    -- D97: кто и что инициировало генерацию
    generated_trigger   text    not null default 'expert_manual'
                                    check (generated_trigger in (
                                        'observer_activation', -- D97: автоматически при membership
                                        'annual_renewal',      -- ежегодное обновление
                                        'expert_manual'        -- эксперт создал вручную
                                    )),
    membership_level_at_generation  text,  -- snapshot: какой уровень членства при создании
    -- FSM: ИЗМЕНЁН от Dok 1 (D97 override)
    -- Dok 1 original: draft → active → completed
    -- D97 change: pending_review → active → completed | expired
    status              text    not null default 'pending_review'
                                    check (status in (
                                        'pending_review',   -- создан системой, ждёт ветеринара
                                        'active',           -- ветеринар одобрил
                                        'completed',        -- все пункты выполнены/пропущены
                                        'expired'           -- membership упал / год прошёл
                                    )),
    -- D97: флаг готовности к review (false если нет HerdGroup при генерации)
    is_ready_for_review boolean not null default false,
    -- Expert review
    expert_profile_id   uuid    references public.expert_profiles(id),
    reviewed_at         timestamptz,
    -- D75: координируется с FarmPhase по датам, не FK
    notes               text,
    created_by          uuid    references public.users(id),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);
comment on table public.vaccination_plans is
    'D60: Уровень 2 иерархии Protocol→Plan→Item.
     D97: FSM изменён: pending_review вместо draft.
     Изменение от Dok 1: "draft" = система ещё не готова (нет HerdGroup).
     "pending_review" = готово для ветеринара. Это конверсионный момент.
     is_ready_for_review=false → Expert Console не показывает план.
     Триггер: HerdEvent group_created → fn_check_vaccination_plan_readiness()
              → если есть план is_ready_for_review=false → ставит true.
     D75: VaccinationPlan ↔ FarmPhase: дата-оверлап, не FK.';

-- -------------------------------------------------------
-- vaccination_plan_items
-- D60: Конкретные пункты плана для каждой HerdGroup × Protocol.
-- FSM: scheduled → reminded → completed | skipped | overdue (Dok 1 5.7)
-- -------------------------------------------------------
create table if not exists public.vaccination_plan_items (
    id                      uuid    primary key default gen_random_uuid(),
    vaccination_plan_id     uuid    not null references public.vaccination_plans(id) on delete cascade,
    organization_id         uuid    not null references public.organizations(id), -- denorm RLS
    vaccination_protocol_id uuid    not null references public.vaccination_protocols(id),
    herd_group_id           uuid    not null references public.herd_groups(id),
    -- Плановые параметры
    scheduled_date          date    not null,
    head_count_planned      int     not null check (head_count_planned > 0),
    dose_number             int     not null default 1, -- 1-я, 2-я, ревакцинация
    -- FSM (Dok 1 Section 5.7)
    status                  text    not null default 'scheduled'
                                        check (status in (
                                            'scheduled',    -- запланировано
                                            'reminded',     -- напоминание отправлено
                                            'completed',    -- выполнено
                                            'skipped',      -- фермер пропустил с причиной
                                            'overdue'       -- срок прошёл без выполнения
                                        )),
    skip_reason             text,  -- почему пропустили
    -- Reminder timestamps (Dok 1 5.7: 14d → 3d → day_of → +7d=overdue)
    reminded_14d_at         timestamptz,
    reminded_3d_at          timestamptz,
    reminded_day_at         timestamptz,
    overdue_notified_at     timestamptz,
    notes                   text,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);
comment on table public.vaccination_plan_items is
    'D60: Уровень 3 иерархии. Один item = одна вакцинация одной группы.
     FSM: 4-шаговый reminder flow (Dok 1 5.7).
     Cron events: vet.vaccination.reminded (event #16), vet.vaccination.overdue (#17).
     dose_number: если протокол требует 2 дозы → 2 строки с dose_number=1 и dose_number=2.
     Completion: через vaccination_records (отдельная таблица, D101).';

-- -------------------------------------------------------
-- vaccination_records
-- D101: Факт вакцинации с серийным номером для сертификации экспорта.
-- Отдельно от vaccination_plan_items (план ≠ факт, D51 аналогия).
-- -------------------------------------------------------
create table if not exists public.vaccination_records (
    id                          uuid    primary key default gen_random_uuid(),
    vaccination_plan_item_id    uuid    references public.vaccination_plan_items(id),
    organization_id             uuid    not null references public.organizations(id),
    herd_group_id               uuid    not null references public.herd_groups(id),
    vet_product_id              uuid    not null references public.vet_products(id),
    -- D101: серийный номер для сертификации
    vaccine_batch_number        text,                      -- номер серии (партии)
    vaccine_expiry_date         date,                      -- срок годности серии
    -- Факт
    administered_by             uuid    references public.users(id),
    administered_at             timestamptz not null default now(),
    actual_heads_vaccinated     int     not null check (actual_heads_vaccinated > 0),
    -- Документальное подтверждение (Supabase Storage)
    certificate_url             text,                      -- ветсвидетельство PDF
    notes                       text,
    created_at                  timestamptz not null default now()
    -- APPEND-ONLY: нет updated_at
);
comment on table public.vaccination_records is
    'D101: Факт вакцинации с серийным номером (для сертификации экспорта).
     vaccine_batch_number: обязателен при экспорте. null = внутреннее использование.
     vaccination_plan_item_id nullable: вакцинация могла быть проведена вне плана.
     APPEND-ONLY: доказательный документ.
     При INSERT → fn_vaccination_record_complete_plan_item():
       UPDATE vaccination_plan_items SET status=completed WHERE id = item_id.
     D63: vaccination с withdrawal_period > 0 → создать health_restriction.';

-- -------------------------------------------------------
-- epidemic_signals
-- D59: Система обнаруживает, эксперт подтверждает.
-- D91: Порог из epidemic_thresholds.
-- FSM: detected → confirmed | false_positive → resolved (Dok 1 5.7)
-- -------------------------------------------------------
create table if not exists public.epidemic_signals (
    id                  uuid    primary key default gen_random_uuid(),
    region_id           uuid    not null references public.regions(id),
    disease_id          uuid    references public.diseases(id), -- nullable: болезнь ещё не определена
    -- Статистика сигнала
    case_count          int     not null check (case_count > 0),
    time_window_days    int     not null,
    first_case_date     date,
    last_case_date      date,
    -- Применённый порог (snapshot D91)
    threshold_id        uuid    references public.epidemic_thresholds(id),
    -- FSM (Dok 1 5.7)
    severity            text    not null
                                    check (severity in (
                                        'watch', 'warning', 'alert', 'emergency'
                                    )),
    status              text    not null default 'detected'
                                    check (status in (
                                        'detected',     -- система обнаружила
                                        'confirmed',    -- ветеринар подтвердил
                                        'false_positive', -- ветеринар опроверг
                                        'resolved'      -- ситуация нормализовалась
                                    )),
    detected_at         timestamptz not null default now(),
    confirmed_by        uuid    references public.expert_profiles(id),
    confirmed_at        timestamptz,
    resolved_at         timestamptz,
    -- Уведомление МСХ РК (если болезнь is_notifiable)
    msh_notified_at     timestamptz,
    notes               text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);
comment on table public.epidemic_signals is
    'D59: Гибридная эпидемическая разведка.
     Источник: fn_check_epidemic_thresholds() — вызывается при каждом VetCase INSERT.
     Алгоритм: SELECT COUNT(*) FROM vet_cases WHERE disease_id = $1
               AND region_id = $2 AND created_at > now() - (threshold.days_window || days)::interval
     Если COUNT >= threshold.case_count_threshold → INSERT epidemic_signals.
     Event #14: vet.signal.detected → Expert Console + admin notification.
     D62: confirmed → ProactiveAlert (draft) для epidemic_warning.
     msh_notified_at: если disease.is_notifiable = true, ветеринар обязан уведомить МСХ.';

-- -------------------------------------------------------
-- proactive_alerts
-- D62: epidemic_warning ОБЯЗАН пройти через expert approval.
-- Seasonal prevention / vaccination reminder — auto-approved.
-- FSM: draft → approved → sent (Dok 1 5.7)
-- -------------------------------------------------------
create table if not exists public.proactive_alerts (
    id                  uuid    primary key default gen_random_uuid(),
    -- Источник (не обязательно epidemic_signal)
    epidemic_signal_id  uuid    references public.epidemic_signals(id),
    alert_type          text    not null
                                    check (alert_type in (
                                        'epidemic_warning',     -- D62: MUST be expert approved
                                        'seasonal_prevention',  -- auto-approved
                                        'vaccination_reminder', -- auto-approved
                                        'disease_watch',        -- watch level, auto-approved
                                        'withdrawal_expiry'     -- health_restriction ends soon
                                    )),
    -- Таргетинг
    target_region_id    uuid    references public.regions(id), -- null = вся база
    severity            text    check (severity in (
                                    'watch', 'warning', 'alert', 'emergency'
                                )),
    title_ru            text    not null,
    message_ru          text    not null,
    -- D62: epidemic_warning требует одобрения (чтобы не было false alarm)
    requires_expert_approval    boolean not null default false,
    -- FSM (Dok 1 5.7)
    status              text    not null default 'draft'
                                    check (status in (
                                        'draft',    -- создан системой
                                        'approved', -- эксперт одобрил (или auto-approved)
                                        'sent'      -- отправлен фермерам
                                    )),
    approved_by         uuid    references public.expert_profiles(id),
    approved_at         timestamptz,
    sent_at             timestamptz,
    recipient_count     int,                           -- сколько фермеров получили
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    -- D62: epidemic_warning ОБЯЗАН иметь requires_expert_approval=true
    constraint chk_epidemic_warning_requires_approval
        check (alert_type != 'epidemic_warning' or requires_expert_approval = true)
);
comment on table public.proactive_alerts is
    'D62: False alarm = фермер блокирует WhatsApp номер ТУРАН → катастрофа.
     epidemic_warning: requires_expert_approval=true ENFORCED через CHECK.
     Auto-approved types: seasonal_prevention, vaccination_reminder, disease_watch, withdrawal_expiry.
     Expert Console: ветеринар видит draft epidemic_warning, нажимает Approve/Reject.
     sent_at + recipient_count: аналитика охвата (сколько фермеров предупреждено).';

-- ============================================================
-- SECTION 4: INDEXES
-- ============================================================

-- vet_products
create index idx_vp_type_status    on public.vet_products (product_type, status);
create index idx_vp_active         on public.vet_products (status) where status = 'active';
create index idx_vp_substance      on public.vet_products (active_substance);

-- diseases
create index idx_dis_status        on public.diseases (status);
create index idx_dis_active        on public.diseases (status) where status = 'active';
create index idx_dis_category      on public.diseases (category);
create index idx_dis_notifiable    on public.diseases (is_notifiable) where is_notifiable = true;
create index idx_dis_knowledge     on public.diseases (knowledge_chunk_id) where knowledge_chunk_id is not null;

-- symptoms
create index idx_sym_body_system   on public.symptoms (body_system);
create index idx_sym_active        on public.symptoms (is_active) where is_active = true;

-- disease_symptoms
create index idx_ds_disease        on public.disease_symptoms (disease_id);
create index idx_ds_symptom        on public.disease_symptoms (symptom_id);
create index idx_ds_pathognomonic  on public.disease_symptoms (disease_id, is_pathognomonic)
    where is_pathognomonic = true;

-- treatments
create index idx_trmt_disease      on public.treatments (disease_id);
create index idx_trmt_product      on public.treatments (vet_product_id);
create index idx_trmt_active       on public.treatments (status) where status = 'active';

-- vaccination_protocols
create index idx_vp_disease        on public.vaccination_protocols (disease_id);
create index idx_vp_active_prot    on public.vaccination_protocols (status) where status = 'active';
create index idx_vp_mandatory      on public.vaccination_protocols (is_mandatory_kz) where is_mandatory_kz = true;

-- epidemic_thresholds
create index idx_et_disease        on public.epidemic_thresholds (disease_id);
create index idx_et_active         on public.epidemic_thresholds (is_active) where is_active = true;

-- vet_cases
create index idx_vc_org_status     on public.vet_cases (organization_id, status);
create index idx_vc_farm           on public.vet_cases (farm_id);
create index idx_vc_herd_group     on public.vet_cases (herd_group_id) where herd_group_id is not null;
create index idx_vc_severity       on public.vet_cases (severity) where severity = 'critical';
create index idx_vc_status         on public.vet_cases (status);
create index idx_vc_created_at     on public.vet_cases (created_at desc); -- epidemic signal aggregation
create index idx_vc_region_disease on public.vet_cases (farm_id, created_at); -- epidemic queries

-- symptom_evidence
create index idx_se_vet_case       on public.symptom_evidence (vet_case_id);
create index idx_se_message        on public.symptom_evidence (ai_message_id) where ai_message_id is not null;

-- vet_diagnoses
create index idx_vd_case           on public.vet_diagnoses (vet_case_id);
create index idx_vd_disease        on public.vet_diagnoses (disease_id) where disease_id is not null;
create index idx_vd_final          on public.vet_diagnoses (vet_case_id, is_final) where is_final = true;

-- vet_recommendations
create index idx_vr_case           on public.vet_recommendations (vet_case_id);
create index idx_vr_treatment      on public.vet_recommendations (treatment_id) where treatment_id is not null;
create index idx_vr_pending        on public.vet_recommendations (vet_case_id, is_completed)
    where is_completed = false;

-- treatment_logs
create index idx_tl_case           on public.treatment_logs (vet_case_id);
create index idx_tl_org            on public.treatment_logs (organization_id);
create index idx_tl_product        on public.treatment_logs (vet_product_id);

-- health_restrictions
create index idx_hr_herd_active    on public.health_restrictions (herd_group_id, is_active);
-- Главный индекс для TSP RPC: WHERE herd_group_id = $1 AND is_active = true
create index idx_hr_org            on public.health_restrictions (organization_id);
create index idx_hr_ends_at        on public.health_restrictions (ends_at);

-- vaccination_plans
create index idx_vplan_org         on public.vaccination_plans (organization_id, status);
create index idx_vplan_farm        on public.vaccination_plans (farm_id);
create index idx_vplan_review      on public.vaccination_plans (status, is_ready_for_review)
    where status = 'pending_review' and is_ready_for_review = true; -- Expert Console queue

-- vaccination_plan_items
create index idx_vpi_plan          on public.vaccination_plan_items (vaccination_plan_id);
create index idx_vpi_org           on public.vaccination_plan_items (organization_id);
create index idx_vpi_herd          on public.vaccination_plan_items (herd_group_id);
create index idx_vpi_scheduled     on public.vaccination_plan_items (scheduled_date, status)
    where status in ('scheduled', 'reminded'); -- cron reminder queries
create index idx_vpi_overdue       on public.vaccination_plan_items (status)
    where status = 'overdue';

-- vaccination_records
create index idx_vrec_org          on public.vaccination_records (organization_id);
create index idx_vrec_herd         on public.vaccination_records (herd_group_id);
create index idx_vrec_item         on public.vaccination_records (vaccination_plan_item_id)
    where vaccination_plan_item_id is not null;

-- epidemic_signals
create index idx_es_region_status  on public.epidemic_signals (region_id, status);
create index idx_es_disease        on public.epidemic_signals (disease_id) where disease_id is not null;
create index idx_es_active         on public.epidemic_signals (status)
    where status in ('detected', 'confirmed');

-- proactive_alerts
create index idx_pa_status         on public.proactive_alerts (status);
create index idx_pa_pending        on public.proactive_alerts (status, requires_expert_approval)
    where status = 'draft' and requires_expert_approval = true; -- Expert Console approval queue
create index idx_pa_region         on public.proactive_alerts (target_region_id)
    where target_region_id is not null;

-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY
-- Core rule: VetCase фермера A не виден фермеру B (Legal 5.9)
-- Reference tables: читают все authenticated, пишет эксперт/admin
-- ============================================================

alter table public.vet_products             enable row level security;
alter table public.diseases                 enable row level security;
alter table public.symptoms                 enable row level security;
alter table public.disease_symptoms         enable row level security;
alter table public.treatments               enable row level security;
alter table public.vaccination_protocols    enable row level security;
alter table public.epidemic_thresholds      enable row level security;
alter table public.vet_cases               enable row level security;
alter table public.symptom_evidence         enable row level security;
alter table public.vet_diagnoses            enable row level security;
alter table public.vet_recommendations      enable row level security;
alter table public.treatment_logs           enable row level security;
alter table public.health_restrictions      enable row level security;
alter table public.vaccination_plans        enable row level security;
alter table public.vaccination_plan_items   enable row level security;
alter table public.vaccination_records      enable row level security;
alter table public.epidemic_signals         enable row level security;
alter table public.proactive_alerts         enable row level security;

-- Reference tables: read = all authenticated; write = expert + admin
-- D93: все могут читать active записи; эксперт видит draft/validated тоже
create policy "vp_read_active"         on public.vet_products          for select
    using (status = 'active' or public.fn_is_expert() or public.fn_is_admin());
create policy "vp_expert_write"        on public.vet_products          for all
    using (public.fn_is_expert() or public.fn_is_admin());

create policy "dis_read_active"        on public.diseases              for select
    using (status = 'active' or public.fn_is_expert() or public.fn_is_admin());
create policy "dis_expert_write"       on public.diseases              for all
    using (public.fn_is_expert() or public.fn_is_admin());

create policy "sym_read_auth"          on public.symptoms              for select
    using (auth.uid() is not null);
create policy "sym_expert_write"       on public.symptoms              for all
    using (public.fn_is_expert() or public.fn_is_admin());

create policy "ds_read_auth"           on public.disease_symptoms      for select
    using (auth.uid() is not null);
create policy "ds_expert_write"        on public.disease_symptoms      for all
    using (public.fn_is_expert() or public.fn_is_admin());

create policy "trmt_read_active"       on public.treatments            for select
    using (status = 'active' or public.fn_is_expert() or public.fn_is_admin());
create policy "trmt_expert_write"      on public.treatments            for all
    using (public.fn_is_expert() or public.fn_is_admin());

create policy "vproto_read_active"     on public.vaccination_protocols for select
    using (status = 'active' or public.fn_is_expert() or public.fn_is_admin());
create policy "vproto_expert_write"    on public.vaccination_protocols for all
    using (public.fn_is_expert() or public.fn_is_admin());

create policy "et_read_auth"           on public.epidemic_thresholds   for select
    using (auth.uid() is not null);
create policy "et_expert_write"        on public.epidemic_thresholds   for all
    using (public.fn_is_expert() or public.fn_is_admin());

-- Operational: фермер видит только своё
create policy "vc_read_own"            on public.vet_cases             for select
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_expert() or public.fn_is_admin());
create policy "vc_write_own"           on public.vet_cases             for all
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_expert() or public.fn_is_admin());

create policy "se_read_own"            on public.symptom_evidence      for select
    using (
        vet_case_id in (
            select id from public.vet_cases
            where organization_id = any(public.fn_my_org_ids())
        ) or public.fn_is_expert() or public.fn_is_admin()
    );
create policy "se_insert_own"          on public.symptom_evidence      for insert
    with check (public.fn_is_admin()); -- service_role через AI Gateway

create policy "vd_read_own"            on public.vet_diagnoses         for select
    using (
        vet_case_id in (
            select id from public.vet_cases
            where organization_id = any(public.fn_my_org_ids())
        ) or public.fn_is_expert() or public.fn_is_admin()
    );
create policy "vd_write_own"           on public.vet_diagnoses         for all
    using (
        vet_case_id in (
            select id from public.vet_cases
            where organization_id = any(public.fn_my_org_ids())
        ) or public.fn_is_expert() or public.fn_is_admin()
    );

create policy "vr_read_own"            on public.vet_recommendations   for select
    using (
        vet_case_id in (
            select id from public.vet_cases
            where organization_id = any(public.fn_my_org_ids())
        ) or public.fn_is_expert() or public.fn_is_admin()
    );
create policy "vr_write_own"           on public.vet_recommendations   for all
    using (
        vet_case_id in (
            select id from public.vet_cases
            where organization_id = any(public.fn_my_org_ids())
        ) or public.fn_is_expert() or public.fn_is_admin()
    );

create policy "tl_read_own"            on public.treatment_logs        for select
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_expert() or public.fn_is_admin());
create policy "tl_insert_own"          on public.treatment_logs        for insert
    with check (organization_id = any(public.fn_my_org_ids()) or public.fn_is_admin());

create policy "hr_read_own"            on public.health_restrictions   for select
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_expert() or public.fn_is_admin());
create policy "hr_insert_system"       on public.health_restrictions   for insert
    with check (public.fn_is_admin()); -- только через RPC (service_role)

create policy "vplan_read_own"         on public.vaccination_plans     for select
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_expert() or public.fn_is_admin());
create policy "vplan_write_own"        on public.vaccination_plans     for all
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_expert() or public.fn_is_admin());

create policy "vpi_read_own"           on public.vaccination_plan_items for select
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_expert() or public.fn_is_admin());
create policy "vpi_write_own"          on public.vaccination_plan_items for all
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_expert() or public.fn_is_admin());

create policy "vrec_read_own"          on public.vaccination_records   for select
    using (organization_id = any(public.fn_my_org_ids()) or public.fn_is_expert() or public.fn_is_admin());
create policy "vrec_insert_own"        on public.vaccination_records   for insert
    with check (organization_id = any(public.fn_my_org_ids()) or public.fn_is_admin());

-- Epidemic signals: admin + expert view; no farmer access (aggregate data)
create policy "es_read_expert"         on public.epidemic_signals      for select
    using (public.fn_is_expert() or public.fn_is_admin());
create policy "es_write_system"        on public.epidemic_signals      for all
    using (public.fn_is_admin()); -- только через RPC

-- Proactive alerts: expert/admin manage; farmer reads sent only
create policy "pa_read_sent"           on public.proactive_alerts      for select
    using (
        (status = 'sent' and (
            target_region_id is null  -- all regions
            -- or target_region_id in farmer's region: handled at app level
        ))
        or public.fn_is_expert()
        or public.fn_is_admin()
    );
create policy "pa_write_expert"        on public.proactive_alerts      for all
    using (public.fn_is_expert() or public.fn_is_admin());

-- ============================================================
-- SECTION 6: TRIGGERS
-- ============================================================

-- updated_at для mutable таблиц
create trigger trg_vet_products_upd         before update on public.vet_products             for each row execute function public.fn_set_updated_at();
create trigger trg_diseases_upd             before update on public.diseases                 for each row execute function public.fn_set_updated_at();
create trigger trg_treatments_upd           before update on public.treatments               for each row execute function public.fn_set_updated_at();
create trigger trg_vacc_protocols_upd       before update on public.vaccination_protocols    for each row execute function public.fn_set_updated_at();
create trigger trg_epidemic_thresh_upd      before update on public.epidemic_thresholds      for each row execute function public.fn_set_updated_at();
create trigger trg_vet_cases_upd            before update on public.vet_cases                for each row execute function public.fn_set_updated_at();
create trigger trg_vet_recs_upd             before update on public.vet_recommendations      for each row execute function public.fn_set_updated_at();
create trigger trg_epidemic_signals_upd     before update on public.epidemic_signals         for each row execute function public.fn_set_updated_at();
create trigger trg_proactive_alerts_upd     before update on public.proactive_alerts         for each row execute function public.fn_set_updated_at();
create trigger trg_vacc_plans_upd           before update on public.vaccination_plans        for each row execute function public.fn_set_updated_at();
create trigger trg_vacc_plan_items_upd      before update on public.vaccination_plan_items   for each row execute function public.fn_set_updated_at();

-- -------------------------------------------------------
-- D57: VetCase critical severity → auto-escalate
-- -------------------------------------------------------
create or replace function public.fn_vet_case_auto_escalate()
returns trigger language plpgsql security definer as $$
begin
    -- Только для новых critical случаев или при апдейте severity на critical
    if new.severity = 'critical' and
       (tg_op = 'INSERT' or old.severity != 'critical') then
        -- FSM: любой статус → escalated
        new.status := 'escalated';
        -- ConsultationRequest создаётся через RPC в Dok 3
        -- Здесь только логируем намерение через PlatformEvent
        insert into public.platform_events (
            event_type, entity_type, entity_id,
            organization_id, actor_type, payload
        ) values (
            'vet.case.escalated',
            'vet_case',
            new.id,
            new.organization_id,
            'system',
            jsonb_build_object(
                'severity', new.severity,
                'farm_id', new.farm_id,
                'auto_escalated', true
            )
        );
    end if;
    return new;
end;
$$;
comment on function public.fn_vet_case_auto_escalate() is
    'D57: severity=critical → status=escalated автоматически.
     Публикует vet.case.escalated (event #13).
     ConsultationRequest создаётся отдельным RPC в Dok 3 (не здесь — нужна бизнес-логика).';

create trigger trg_vet_case_auto_escalate
    before insert or update on public.vet_cases
    for each row execute function public.fn_vet_case_auto_escalate();

-- -------------------------------------------------------
-- D94: Disease validated → auto-create KnowledgeChunk
-- -------------------------------------------------------
create or replace function public.fn_disease_create_knowledge_chunk()
returns trigger language plpgsql security definer as $$
declare
    v_chunk_id uuid;
    v_content  text;
begin
    -- Только при переходе статуса в validated или active
    if new.status in ('validated', 'active') and
       (tg_op = 'INSERT' or old.status not in ('validated', 'active')) then
        -- Формируем текст для RAG из имеющихся данных болезни
        v_content := format(
            'Болезнь: %s (%s). Категория: %s. ' ||
            'Инкубационный период: %s-%s дней. ' ||
            'Особо опасная: %s. Карантин: %s дней. ' ||
            'Источник: %s',
            new.name_ru,
            coalesce(new.code, ''),
            new.category,
            coalesce(new.incubation_period_days_min::text, '?'),
            coalesce(new.incubation_period_days_max::text, '?'),
            case when new.is_notifiable then 'да' else 'нет' end,
            coalesce(new.quarantine_days::text, '0'),
            coalesce(new.source_reference, 'справочник')
        );
        -- Создаём или обновляем KnowledgeChunk
        if new.knowledge_chunk_id is null then
            insert into public.knowledge_chunks (
                source_domain, title, content, metadata
            ) values (
                'veterinary',
                new.name_ru,
                v_content,
                jsonb_build_object(
                    'disease_id', new.id,
                    'disease_code', new.code,
                    'category', new.category,
                    'is_notifiable', new.is_notifiable
                )
            ) returning id into v_chunk_id;
            new.knowledge_chunk_id := v_chunk_id;
        else
            -- Обновляем существующий chunk (болезнь была уже validated, теперь active)
            update public.knowledge_chunks
            set content = v_content,
                title = new.name_ru,
                metadata = jsonb_build_object(
                    'disease_id', new.id,
                    'disease_code', new.code,
                    'category', new.category,
                    'is_notifiable', new.is_notifiable
                )
            where id = new.knowledge_chunk_id;
        end if;
        -- Обновляем rag_summary для быстрого доступа без JOIN
        new.rag_summary_jsonb := jsonb_build_object(
            'description', v_content,
            'knowledge_chunk_id', new.knowledge_chunk_id
        );
    end if;
    return new;
end;
$$;
comment on function public.fn_disease_create_knowledge_chunk() is
    'D94: При Disease status→validated автоматически создаётся KnowledgeChunk для RAG.
     Embedding вычисляется отдельно Edge Function (pgvector требует vector computation).
     Этот триггер создаёт текстовый контент. Edge Function потом добавляет embedding.
     Один источник правды → два слоя: structured tables + RAG.';

create trigger trg_disease_create_knowledge_chunk
    before insert or update on public.diseases
    for each row execute function public.fn_disease_create_knowledge_chunk();

-- -------------------------------------------------------
-- D98: VetRecommendation medication → create health_restriction
-- -------------------------------------------------------
create or replace function public.fn_create_health_restriction_from_rec()
returns trigger language plpgsql security definer as $$
declare
    v_withdrawal_days int;
    v_herd_group_id   uuid;
    v_org_id          uuid;
begin
    -- Только для medication с withdrawal_period
    if new.recommendation_type = 'medication' and
       new.dosage_info is not null and
       (new.dosage_info->>'withdrawal_period_days')::int > 0 then

        v_withdrawal_days := (new.dosage_info->>'withdrawal_period_days')::int;

        -- Получаем herd_group_id и organization_id из vet_case
        select herd_group_id, organization_id
        into v_herd_group_id, v_org_id
        from public.vet_cases
        where id = new.vet_case_id;

        -- Создаём ограничение только если есть herd_group
        if v_herd_group_id is not null then
            insert into public.health_restrictions (
                herd_group_id,
                organization_id,
                vet_case_id,
                vet_recommendation_id,
                restriction_type,
                starts_at,
                ends_at,
                reason_text,
                created_by
            ) values (
                v_herd_group_id,
                v_org_id,
                new.vet_case_id,
                new.id,
                'medication_withdrawal',
                now(),
                now() + (v_withdrawal_days || ' days')::interval,
                format('Период ожидания: %s (%s дней)',
                    new.dosage_info->>'drug_name',
                    v_withdrawal_days),
                new.created_by
            );
        end if;
    end if;
    return new;
end;
$$;
comment on function public.fn_create_health_restriction_from_rec() is
    'D98+D63: medication рекомендация с withdrawal_period > 0 →
     автоматически создаёт health_restriction для herd_group.
     TSP RPC create_batch проверит этот record до создания партии на продажу.
     ends_at = now() + withdrawal_period_days. is_active = GENERATED (expires automatically).';

create trigger trg_health_restriction_from_rec
    after insert on public.vet_recommendations
    for each row execute function public.fn_create_health_restriction_from_rec();

-- -------------------------------------------------------
-- D97: VaccinationPlanItem completed → update plan_item status
-- -------------------------------------------------------
create or replace function public.fn_vaccination_record_complete_plan_item()
returns trigger language plpgsql security definer as $$
begin
    if new.vaccination_plan_item_id is not null then
        update public.vaccination_plan_items
        set status = 'completed', updated_at = now()
        where id = new.vaccination_plan_item_id
          and status in ('scheduled', 'reminded', 'overdue');
    end if;
    return new;
end;
$$;
comment on function public.fn_vaccination_record_complete_plan_item() is
    'D60: Факт вакцинации (vaccination_records INSERT) → закрывает plan_item.
     Также: если vaccination_protocol.withdrawal_period_days > 0, Edge Function
     создаёт health_restriction отдельным вызовом (сложная логика → Dok 3 RPC).';

create trigger trg_vacc_record_complete_item
    after insert on public.vaccination_records
    for each row execute function public.fn_vaccination_record_complete_plan_item();

-- -------------------------------------------------------
-- D97: HerdGroup created → check if vaccination_plan needs readiness update
-- -------------------------------------------------------
create or replace function public.fn_check_vaccination_plan_readiness()
returns trigger language plpgsql security definer as $$
begin
    -- Если у фермы есть pending vaccination_plan — отмечаем как готовый к review
    update public.vaccination_plans
    set is_ready_for_review = true, updated_at = now()
    where farm_id = new.farm_id
      and is_ready_for_review = false
      and status = 'pending_review';
    return new;
end;
$$;
comment on function public.fn_check_vaccination_plan_readiness() is
    'D97: При первом HerdGroup на ферме → vaccination_plan.is_ready_for_review = true.
     Expert Console начинает показывать план ветеринару для проверки.
     Триггер на herd_groups INSERT.';

create trigger trg_vacc_plan_readiness_on_herd
    after insert on public.herd_groups
    for each row execute function public.fn_check_vaccination_plan_readiness();

-- -------------------------------------------------------
-- VetDiagnosis INSERT → update VetCase status to in_progress
-- -------------------------------------------------------
create or replace function public.fn_vet_case_progress_on_diagnosis()
returns trigger language plpgsql security definer as $$
begin
    update public.vet_cases
    set status = 'in_progress', updated_at = now()
    where id = new.vet_case_id
      and status = 'open';
    return new;
end;
$$;

create trigger trg_vet_case_progress
    after insert on public.vet_diagnoses
    for each row execute function public.fn_vet_case_progress_on_diagnosis();

-- ============================================================
-- SECTION 7: CLOSE DEFERRED FK FROM 001_kernel.sql
-- D58: consultation_requests.vet_case_id → vet_cases(id)
-- Был намеренно отложен в 001_kernel.sql (forward reference).
-- ============================================================
alter table public.consultation_requests
    add constraint fk_consultation_request_vet_case
    foreign key (vet_case_id)
    references public.vet_cases(id)
    on delete set null;

comment on constraint fk_consultation_request_vet_case
    on public.consultation_requests is
    'D58: Deferred FK closed in 004_vet.sql.
     ON DELETE SET NULL: если VetCase удалён (редко) — ConsultationRequest остаётся.';

-- ============================================================
-- SECTION 8: SEED DATA
-- D93: Все данные сидятся как status=draft (Q42/Q43/Q44 pending).
-- Ветеринарный эксперт валидирует через Expert Console.
-- ============================================================

-- epidemic_thresholds: дефолтный + усиленный для особо опасных (D91)
insert into public.epidemic_thresholds
    (disease_id, case_count_threshold, days_window, severity_level, applies_to_notifiable_only, is_active, notes)
values
    -- Дефолт для любой болезни: 3 случая за 14 дней → watch
    (null, 3, 14, 'watch', false, true,
     'Дефолтный порог. Применяется если нет специфичного порога для болезни.'),
    -- Усиленный для особо опасных: 1 случай за 7 дней → emergency
    (null, 1, 7, 'emergency', true, true,
     'Особо опасные болезни (is_notifiable=true): один случай = экстренная ситуация. МСХ РК уведомляется.'),
    -- Предупреждение: 5 случаев за 30 дней → warning
    (null, 5, 30, 'warning', false, true,
     'Предупреждение при накоплении случаев. Эксперт решает: вспышка или случайность.')
on conflict do nothing;

-- symptoms seed: 25 наиболее частых симптомов КРС (draft, Q43)
insert into public.symptoms (code, name_ru, body_system, description_ru, ai_question_ru, sort_order) values
    -- General
    ('FEVER_HIGH',          'Высокая температура (>40°C)',  'general',      'Ректальная температура выше 40°C', 'Вы измеряли температуру? Сколько градусов?', 1),
    ('LETHARGY',            'Вялость, угнетение',           'general',      'Животное малоподвижно, не реагирует на раздражители', 'Животное вялое, лежит больше обычного?', 2),
    ('ANOREXIA',            'Отказ от корма',               'general',      'Животное не ест или ест значительно меньше', 'Животное отказывается от корма? Сколько дней?', 3),
    ('WEIGHT_LOSS_RAPID',   'Быстрая потеря веса',          'general',      'Заметная потеря живой массы за короткий срок', 'Животное заметно похудело за последние дни?', 4),
    ('DEATH_SUDDEN',        'Внезапная гибель',             'general',      'Животное погибло без явных предшествующих признаков', null, 5),
    -- Digestive
    ('DIARRHEA_WATERY',     'Понос водянистый',             'digestive',    'Жидкий стул без крови', 'Понос — жидкий как вода, или есть слизь/кровь?', 10),
    ('DIARRHEA_BLOODY',     'Понос с кровью',               'digestive',    'Жидкий стул с кровью — признак тяжёлого поражения ЖКТ', 'В поносе есть кровь (красная или тёмная)?', 11),
    ('BLOAT',               'Вздутие рубца',                'digestive',    'Левый бок увеличен, животное беспокоится', 'Левый бок раздут? Животное беспокоится?', 12),
    ('DROOLING_EXCESS',     'Обильное слюнотечение',        'digestive',    'Слюна вытекает непрерывно — признак ящура или стоматита', 'Из рта обильно течёт слюна?', 13),
    ('MOUTH_LESIONS',       'Язвы/пузыри в ротовой полости','digestive',    'Афты, эрозии, пузыри на языке, дёснах, губах', 'Видны ранки или пузыри во рту, на языке?', 14),
    -- Respiratory
    ('COUGH_CHRONIC',       'Кашель хронический',           'respiratory',  'Кашель более 3 дней', 'Кашель есть? Давно? Сухой или влажный?', 20),
    ('NASAL_DISCHARGE',     'Выделения из носа',            'respiratory',  'Слизь или гной из носа', 'Из носа течёт? Прозрачное или гнойное?', 21),
    ('LABORED_BREATHING',   'Тяжёлое дыхание',              'respiratory',  'Учащённое, поверхностное или затруднённое дыхание', 'Животное тяжело дышит? Считали дыхание?', 22),
    -- Skin
    ('SKIN_NODULES',        'Кожные узлы/бугры',            'skin',         'Твёрдые возвышения на коже — характерны для нодулярного дерматита', 'На коже есть бугры или узлы? Где именно, сколько?', 30),
    ('SKIN_LESIONS_HOOF',   'Язвы на копытах',              'skin',         'Эрозии, пузыри между копытами или венчике — ящур, копытная гниль', 'На ногах, между копытами есть ранки или пузыри?', 31),
    ('HAIR_LOSS',           'Облысение, перхоть',           'skin',         'Выпадение шерсти, зуд — признак микроза, чесотки', 'Шерсть выпадает? Животное чешется?', 32),
    -- Reproductive
    ('ABORTION',            'Аборт/выкидыш',                'reproductive', 'Гибель плода до срока — признак бруцеллёза, лептоспироза', 'Корова/тёлка потеряла телёнка раньше срока?', 40),
    ('RETAINED_PLACENTA',   'Задержание последа',           'reproductive', 'Послед не отделился в течение 12 часов после отёла', 'После отёла послед не вышел сам?', 41),
    -- Locomotor
    ('LAMENESS',            'Хромота',                      'locomotor',    'Животное хромает на одну или несколько конечностей', 'Животное хромает? На какую ногу?', 50),
    ('CANNOT_RISE',         'Не может подняться',           'locomotor',    'Животное лежит и не поднимается — пастереллёз, родильный парез', 'Животное лежит и не встаёт? Сколько времени?', 51),
    -- Nervous
    ('SEIZURES',            'Судороги',                     'nervous',      'Непроизвольные мышечные сокращения', 'Были судороги или подёргивания мышц?', 60),
    ('CIRCLING',            'Движение по кругу',            'nervous',      'Животное ходит по кругу — нервная форма листериоза', 'Животное ходит по кругу и не может остановиться?', 61),
    -- Ocular
    ('EYE_DISCHARGE',       'Выделения из глаз',            'ocular',       'Слёзотечение, гной — инфекционный кератоконъюнктивит, ящур', 'Из глаз течёт? Слёзы или гной?', 70),
    ('EYE_OPACITY',         'Помутнение роговицы',          'ocular',       'Белое помутнение — инфекционный кератоконъюнктивит', 'Роговица глаза помутнела, стала белой?', 71),
    -- General additional
    ('MULTIPLE_ANIMALS',    'Болеют несколько животных',    'general',      'Признаки у нескольких голов одновременно — признак инфекции', 'Сколько животных больны? Только одно или несколько?', 72)
on conflict (code) do nothing;

-- vet_products seed: ключевые препараты КЗ (draft, Q44 pending)
insert into public.vet_products
    (code, brand_name, generic_name, active_substance, product_type,
     concentration, form, withdrawal_period_meat_days, withdrawal_period_milk_days,
     is_prescription_only, status, source_reference, notes)
values
    ('OXYTET_20PCT',    'Окситетрациклин 20%',  'Oxytetracycline LA',   'oxytetracycline',
     'antibiotic', '20% w/v', 'injectable_solution', 28, 7, true, 'draft',
     'ГОСТ / ВГС КЗ', 'Широкое применение в КЗ. Длительного действия (LA). Каренция 28 дней.'),
    ('IVERMECTIN_1PCT', 'Ивермектин 1%',         'Ivermectin',           'ivermectin',
     'antiparasitic', '1% w/v', 'injectable_solution', 28, 0, true, 'draft',
     'GAFI / ВГС КЗ', 'Против эктопаразитов и нематод. Нельзя дойным коровам.'),
    ('KETOPROFEN_10PCT','Кетопрофен 10%',        'Ketoprofen',           'ketoprofen',
     'anti_inflammatory', '10% w/v', 'injectable_solution', 4, 0, true, 'draft',
     'GAFI', 'НПВС. Жаропонижающее + обезболивающее.'),
    ('ENROFLOX_10PCT',  'Энрофлоксацин 10%',    'Enrofloxacin',         'enrofloxacin',
     'antibiotic', '10% w/v', 'injectable_solution', 28, 7, true, 'draft',
     'GAFI / ВГС КЗ', 'Фторхинолон. Широкий спектр. Каренция 28 дней.'),
    ('TYLOSIN_20PCT',   'Тилозин 20%',           'Tylosin',              'tylosin',
     'antibiotic', '20% w/v', 'injectable_solution', 21, 4, true, 'draft',
     'ВГС КЗ', 'Макролид. Респираторные и ЖКТ инфекции.'),
    ('REHYDR_ORAL',     'Регидрон Вет',          'Oral rehydration salts', 'electrolytes',
     'supportive', 'powder', 'oral_powder', 0, 0, false, 'draft',
     'ВГС КЗ', 'Выпаивание при диарее телят. Каренции нет.'),
    ('VIT_AD3E_INJ',    'Витамин AD3E',          'Vitamins A,D3,E',      'vitamins_ade',
     'vitamin_mineral', 'oil solution', 'injectable_solution', 0, 0, false, 'draft',
     'ВГС КЗ', 'Поддерживающая терапия. Стельные коровы, новорождённые телята.'),
    -- Вакцины
    ('VACCINE_FMD_KZ',  'Вакцина против ящура (КЗ)', 'FMD Vaccine',     'inactivated_fmd_virus',
     'vaccine', 'suspension', 'injectable_solution', 0, 0, true, 'draft',
     'РГП НПЦ КВБЖ МСХ РК', 'Обязательная вакцинация по приказу МСХ РК. Весна + осень.'),
    ('VACCINE_BRU_KZ',  'Вакцина против бруцеллёза (КЗ)', 'Brucella Vaccine', 'live_attenuated_brucella',
     'vaccine', 'lyophilized', 'injectable_solution', 21, 21, true, 'draft',
     'РГП НПЦ КВБЖ МСХ РК', 'Живая вакцина. Каренция 21 день. Телята 4-8 мес.'),
    ('VACCINE_ANTHRAX', 'Вакцина против сибирской язвы', 'Anthrax Vaccine', 'live_attenuated_bacillus',
     'vaccine', 'suspension', 'injectable_solution', 14, 14, true, 'draft',
     'РГП НПЦ КВБЖ МСХ РК', 'Обязательная в эндемичных районах КЗ. Ежегодно.')
on conflict (code) do nothing;

-- diseases seed: 10 наиболее частых болезней КЗ (draft, Q42 — полный набор 50 вносит ветеринар)
-- Сиды содержат минимальные данные. Ветеринар заполняет symptoms, treatments через Expert Console.
insert into public.diseases
    (code, name_ru, name_en, category,
     incubation_period_days_min, incubation_period_days_max,
     is_notifiable, is_quarantine_required, quarantine_days,
     status, source_reference)
values
    ('FMD',     'Ящур',                     'Foot-and-Mouth Disease',   'infectious', 2,  14,  true,  true,  30,  'draft', 'WOAH OIE / МСХ РК'),
    ('BRUCELL', 'Бруцеллёз',               'Brucellosis',              'infectious', 14, 180, true,  true,  30,  'draft', 'МСХ РК Приказ №50'),
    ('LSD',     'Нодулярный дерматит (БОД)','Lumpy Skin Disease',       'infectious', 4,  14,  true,  true,  30,  'draft', 'WOAH OIE'),
    ('ANTHRAX', 'Сибирская язва',           'Anthrax',                  'infectious', 1,  3,   true,  true,  21,  'draft', 'МСХ РК / WOAH OIE'),
    ('BVD',     'Вирусная диарея (ВД-БС)',  'BVD-MD',                   'infectious', 2,  14,  false, false, null, 'draft', 'NADIS / ВГС КЗ'),
    ('CALF_DIARRHEA', 'Диарея телят',       'Neonatal Calf Diarrhea',   'neonatal',   1,  5,   false, false, null, 'draft', 'ВГС КЗ'),
    ('PNEUMO_CATTLE', 'Пастереллёз',        'Pasteurellosis',           'respiratory',1,  5,   false, false, null, 'draft', 'ВГС КЗ'),
    ('LEPTOSPI','Лептоспироз',              'Leptospirosis',            'infectious', 3,  20,  true,  false, null, 'draft', 'WOAH OIE'),
    ('LEUKOSIS', 'Лейкоз КРС',             'Bovine Leukemia',          'infectious', 730,1825, true,  false, null, 'draft', 'МСХ РК'),
    ('IBR',     'Инфекционный ринотрахеит', 'IBR',                      'respiratory',2,  6,   false, false, null, 'draft', 'NADIS / ВГС КЗ')
on conflict (code) do nothing;

-- vaccination_protocols seed: 5 ключевых протоколов КЗ (draft, Q44)
-- Заполняем после того как diseases и vet_products уже в БД
insert into public.vaccination_protocols
    (code, name_ru, disease_id, vet_product_id,
     dose_count, interval_between_doses_days, annual_revaccination,
     seasonal_months, is_mandatory_kz, withdrawal_period_days,
     status, source_reference)
select
    p.code, p.name_ru,
    d.id as disease_id,
    vp.id as vet_product_id,
    p.dose_count, p.interval_days, p.annual_revac,
    p.seasonal_months, p.is_mandatory, p.withdrawal,
    'draft', p.source
from (values
    ('FMD_ANNUAL_KZ',   'Вакцинация против ящура (ежегодная)',
     'FMD', 'VACCINE_FMD_KZ',     1, null, true,  '{3,4}',  true,  0, 'МСХ РК Приказ №126'),
    ('FMD_BOOSTER_KZ',  'Ревакцинация против ящура (осень)',
     'FMD', 'VACCINE_FMD_KZ',     1, null, false, '{9,10}', true,  0, 'МСХ РК Приказ №126'),
    ('BRU_CALVES_KZ',   'Вакцинация тёлок против бруцеллёза',
     'BRUCELL', 'VACCINE_BRU_KZ', 1, null, false, '{4,5}',  true,  21, 'МСХ РК Приказ №50'),
    ('ANTHRAX_ANNUAL',  'Вакцинация против сибирской язвы',
     'ANTHRAX', 'VACCINE_ANTHRAX',1, null, true,  '{4,5}',  true,  14, 'МСХ РК / эндемичные районы'),
    -- Q44: LSD использует каприпоксвирусную вакцину, не ящурную. VACCINE_FMD_KZ = placeholder.
    -- Ветеринар добавляет VACCINE_LSD_KZ через Expert Console и обновляет этот протокол.
    ('LSD_ANNUAL',      'Вакцинация против нодулярного дерматита',
     'LSD', 'VACCINE_FMD_KZ',     1, null, true,  '{3,4}',  true,  0, 'МСХ РК (с 2016)')
) as p(code, name_ru, disease_code, product_code, dose_count, interval_days,
       annual_revac, seasonal_months, is_mandatory, withdrawal, source)
join public.diseases d on d.code = p.disease_code
join public.vet_products vp on vp.code = p.product_code
on conflict (code) do nothing;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Summary:
--   Reference tables:    7 (vet_products, diseases, symptoms,
--                           disease_symptoms, treatments,
--                           vaccination_protocols, epidemic_thresholds)
--   Operational tables: 11 (vet_cases, symptom_evidence, vet_diagnoses,
--                           vet_recommendations, treatment_logs,
--                           health_restrictions, vaccination_plans,
--                           vaccination_plan_items, vaccination_records,
--                           epidemic_signals, proactive_alerts)
--   Total:              18 tables
--
--   Indexes:            59
--   RLS policies:       36
--   Triggers:           17 (11 updated_at + 6 business logic)
--   Functions:           6 business logic functions
--   Deferred FK closed:  1 (consultation_requests.vet_case_id)
--
--   Seed data:
--     epidemic_thresholds: 3 default thresholds (D91)
--     symptoms: 25 common KZ cattle symptoms (draft, Q43)
--     vet_products: 10 drugs + vaccines (draft, Q44)
--     diseases: 10 of 50 planned diseases (draft, Q42)
--     vaccination_protocols: 5 mandatory KZ protocols (draft, Q44)
--
-- Decisions implemented: D55-D63, D91-D102
-- Deferred: Q71 (medical_inventory), Q45 (photo diagnosis → Dok 5)
--
-- Cross-domain links:
--   → 001_kernel.sql: consultation_requests (FK CLOSED), farms,
--                     herd_groups, organizations, users, expert_profiles,
--                     regions, knowledge_chunks, ai_messages
--   → 002_tsp.sql: health_restrictions → batches (via RPC in Dok 3)
--   → 003_feed.sql: vet_recommendations nutrition_change (D48 boundary)
--
-- Next migration: 005_ops_edu.sql (Operations 10 + Education 8 = 18 tables)
-- ============================================================
