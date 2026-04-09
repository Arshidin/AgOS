# AGOS Dok 7 — Архитектура: Унификация Рационов и Консалтинга
## Версия 1.0 · Апрель 2026

> **Статус:** Утверждено · Аршидин + Architect Agent  
> **Контекст:** Решение принято в ходе сессии 08.04.2026 после анализа дублирования между `d03_feed.sql` и `d09_consulting.sql`

---

## 1. Проблема

### 1.1 Дублирование справочных данных

В системе существуют **два независимых хранилища** данных о кормах:

```
d03_feed.sql                           d09_consulting.sql
──────────────────────────────         ─────────────────────────────────────
feed_items          (справочник)       consulting_reference_data
feed_prices         (цены)               category = 'feed_prices'   ← ДУБЛЬ
nutrient_requirements (NASEM нормы)      category = 'feed_norms'    ← ДУБЛЬ
```

Admin вынужден обновлять данные в двух местах. Риск расхождения цен и норм между модулями.  
Нарушение принципа **P8 — единственный источник правды для нормативов**.

### 1.2 Различие между `nutrient_requirements` и `feed_norms`

Это **разные уровни абстракции** — не дубликаты, но связанные:

| | `nutrient_requirements` | `consulting_reference_data.feed_norms` |
|---|---|---|
| **Что хранит** | Что животному нужно (NASEM) | Что животное ест (практика) |
| **Формат** | 20+ числовых полей (me_mj, cp_g, dm_kg...) | JSONB: [{feed_code, kg_per_day}] |
| **Используется** | LP-solver как constraint | Python engine как lookup |
| **Происхождение** | Зоотехнический стандарт | Экспертная оценка или кэш NASEM |

`feed_norms` — это по сути **кэш результата NASEM-расчёта**, записанный вручную:

```
nutrient_requirements → [LP Solver] → ration items == feed_norms
   "сколько нужно"                     "сколько кормить"
```

### 1.3 Consulting не использует NASEM калькулятор

Python `feeding_model.py` читает упрощённые нормы из `consulting_reference_data`  
и умножает напрямую: `kg_per_day × price × head_count × days → COGS`.  
Точный NASEM-расчёт для консалтинговых проектов недоступен.

### 1.4 Нет пути переноса Consulting → Ферма

Консалтинговый проект содержит параметры стада и технологию — всё нужное для онбординга реальной фермы. Но данные несовместимы по формату с `rations`/`ration_versions`.

---

## 2. Архитектурное решение: три независимых слоя

### Слой 0 — Справочник (shared reference, admin-managed)

**Единственный источник правды для всей системы.**

```
d03_feed.sql
├── feed_categories              ← таксономия кормов
├── feed_items                   ← каталог кормов (18+ позиций)
├── feed_prices                  ← цены (расширить: + valid_from, valid_to, region_id)
├── nutrient_requirements        ← NASEM стандарты (потребности животных)
├── feed_consumption_norms       ← NEW: типовые нормы кормления (кг/день по категориям)
└── animal_categories            ← shared (d01_kernel)
```

**`feed_consumption_norms` (новая таблица в d03_feed):**
```sql
CREATE TABLE feed_consumption_norms (
    id          UUID PRIMARY KEY,
    farm_type   TEXT NOT NULL,               -- beef_reproducer | feedlot | sheep_goat
    animal_category_id UUID NOT NULL REFERENCES animal_categories(id),
    season      TEXT NOT NULL,               -- winter | summer | transition
    items       JSONB NOT NULL,              -- [{feed_item_id, kg_per_day}]
    valid_from  DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to    DATE,
    notes       TEXT
);
```

Заменяет `consulting_reference_data category='feed_norms'`.  
Доступна **всем модулям** — не только консалтингу.

**Что удаляется из `consulting_reference_data`:**
- `category = 'feed_prices'` → мигрирует в `d03_feed.feed_prices`
- `category = 'feed_norms'` → мигрирует в `d03_feed.feed_consumption_norms`

**Что остаётся в `consulting_reference_data`** (consulting-специфичное):
- `infrastructure_norms`, `equipment_norms`, `tax_rates`
- `wacc_parameters`, `subsidy_programs`, `livestock_norms`, `regional_prices`

---

### Слой 1 — NASEM Калькулятор (чистая функция, без контекста)

```
Edge Function: calculate-ration

Input:
  animal_category_id   UUID
  avg_weight_kg        number
  objective            maintenance | growth | finishing | gestation | lactation
  feed_item_ids        UUID[]      ← из feed_items (Слой 0)
  head_count           number
  quick_mode           boolean     ← true = не сохранять результат

Output:
  items[]              {feed_item_id, kg_per_day, cost_per_day}
  nutrients_met{}      {dm: bool, me: bool, cp: bool, ...}
  total_cost_per_day   number
  solver_status        feasible | infeasible
```

**Принцип:** калькулятор не знает ни о ферме, ни о консалтинговом проекте.  
Результат может быть сохранён в любом контексте.

**Статус:** Edge Function `calculate-ration` **уже реализована**.  
Изменение: убрать `farm_id` из обязательных (уже есть `quick_mode=true`).

---

### Слой 2 — Хранилище рационов (контекст-зависимое)

Сделать `ration_versions` контекст-независимым через расширение схемы:

**Изменения в `ration_versions` (d03_feed.sql):**
```sql
ALTER TABLE ration_versions
    ALTER COLUMN ration_id DROP NOT NULL,                    -- было NOT NULL
    ADD COLUMN consulting_project_id UUID                    -- NEW
        REFERENCES consulting_projects(id),
    ADD COLUMN animal_category_id UUID                       -- NEW (для consulting ctx)
        REFERENCES animal_categories(id),
    ADD CONSTRAINT ration_versions_context_check
        CHECK (ration_id IS NOT NULL OR consulting_project_id IS NOT NULL);
```

**Два контекста, один формат данных:**

```
ration_versions
├── ration_id IS NOT NULL          → контекст ФЕРМЫ
│     farm → herd_group → ration → ration_versions
│
└── consulting_project_id IS NOT NULL  → контекст КОНСАЛТИНГА
      consulting_project → ration_versions (+ animal_category_id)
```

JSONB-формат `items` и `results` — **идентичен** в обоих контекстах.  
UI-компоненты RationViewer, GroupRations переиспользуются без изменений.

---

### Слой 3 — Финансовая интеграция

Python `feeding_model.py` получает **fallback chain** для расчёта COGS:

```
Для каждой animal_category:

1. ПРИОРИТЕТ 1: consulting_project ration_versions (Слой 2)
   ↓ Если привязаны рационы → берём items[] из них
   ↓ Точный NASEM-расчёт. kg × price × head_count × days → COGS

2. ПРИОРИТЕТ 2: feed_consumption_norms (Слой 0, d03_feed)
   ↓ Если нет attached rations → используем типовые нормы
   ↓ Приближённый расчёт

3. ПРИОРИТЕТ 3: константы в коде
   ↓ Grубая оценка, только для первого черновика
```

Система **работает на любом уровне данных**. Ранние проекты → fallback.  
Детальные проекты → точные рационы.

---

## 3. Сквозной путь данных

```
┌─────────────────────────────────────────────────────────────────────┐
│  СЛОЙ 0: Справочник (d03_feed.sql)                                  │
│  feed_items · feed_prices · nutrient_requirements                   │
│  feed_consumption_norms · animal_categories                         │
└──────────────────────┬──────────────────────┬───────────────────────┘
                       │                      │
          ┌────────────▼───────────┐          │ (потребности животных)
          │  СЛОЙ 1: Калькулятор  │◄─────────┘
          │  Edge Function NASEM  │
          │  (stateless, shared)  │
          └────────────┬──────────┘
                       │ items[] + nutrients + cost
          ┌────────────▼──────────────────────────────┐
          │  СЛОЙ 2: ration_versions (единая таблица) │
          │  ration_id=X (farm ctx) OR                │
          │  consulting_project_id=Y (consulting ctx) │
          └─────────┬────────────────────┬────────────┘
                    │                    │
     ┌──────────────▼──┐       ┌─────────▼──────────────┐
     │  ФЕРМА          │       │  КОНСАЛТИНГ            │
     │  GroupRations   │       │  feeding_model.py      │
     │  FeedBudget     │       │  → cogs[120 мес]       │
     │  Summary        │       │  → P&L / Cash Flow     │
     └─────────────────┘       └────────────────────────┘
```

---

## 4. Сценарий переноса: Consulting → Ферма

Когда консалтинговый проект «активируется» как реальная ферма:

```
Consulting Project                  →  Farm Account

WizardParams.initial_cows           →  HerdGroup (Маточные, N голов)
WizardParams.reproducer_capacity    →  HerdGroup (Репродуктор, N голов)
WizardParams.project_start_date     →  FeedingPlan.start_date

ration_versions                     →  ration_versions
  (consulting_project_id = X)            (ration_id = Y, consulting_project_id = NULL)
  Рацион не копируется — меняется только FK

tech_card.phases[]                  →  ProductionPlan + phases
```

**Новый RPC (Фаза 4):** `rpc_activate_consulting_project(p_project_id, p_organization_id)`  
Создаёт Farm + HerdGroups + Rations из данных проекта. Атомарная транзакция.

---

## 5. План реализации по фазам

### Фаза 1 — Устранение дублирования (DB Agent)
**Приоритет: Высокий · Срок: 1 день**

- [ ] Расширить `feed_prices`: + `valid_from DATE`, `valid_to DATE`, `region_id UUID` (nullable)
- [ ] Создать `feed_consumption_norms` в d03_feed.sql
- [ ] Мигрировать данные из `consulting_reference_data` (feed_prices, feed_norms) в d03_feed
- [ ] Удалить категории `feed_prices`, `feed_norms` из `consulting_reference_data` (после миграции)
- [ ] Python engine: обновить `feeding_model.py` читать из `d03_feed` вместо `consulting_reference_data`
- [ ] Dok 1 update: добавить `feed_consumption_norms` в ERD и Ownership Matrix

### Фаза 2 — Контекст-независимый калькулятор (DB Agent)
**Приоритет: Высокий · Срок: 0.5 дня**

- [ ] `ration_versions.ration_id` → NULLABLE
- [ ] `ration_versions` + `consulting_project_id UUID` (nullable FK)
- [ ] `ration_versions` + `animal_category_id UUID` (nullable FK, для consulting ctx)
- [ ] CHECK constraint: `(ration_id IS NOT NULL OR consulting_project_id IS NOT NULL)`
- [ ] RLS: consulting context rations видны org members + admins
- [ ] Edge Function `calculate-ration`: убрать `farm_id` из обязательных параметров
- [ ] Dok 3 update: добавить новые RPC для ration в consulting context

### Фаза 3 — Таб «Рационы» в Consulting (UI Agent + Backend Agent)
**Приоритет: Средний · Срок: 3 дня**

- [ ] Новый таб `RationTab` в `/admin/consulting/:projectId/ration`
- [ ] Маршрут в App.tsx + топбар в ProjectPage.tsx
- [ ] Per-category NASEM калькулятор: выбор кормов → расчёт → сохранение
- [ ] Отображение attached ration versions per animal_category
- [ ] Показ расчётного COGS от рациона (сравнение с current consulting results)
- [ ] Python engine: реализовать fallback chain (ration_versions → feed_consumption_norms → defaults)
- [ ] Dok 6: screen contract A-RationTab

### Фаза 4 — Перенос проекта на ферму (DB Agent + UI Agent)
**Приоритет: Низкий · Срок: 2 дня · Зависит от: RPC-24 (rpc_get_current_ration)**

- [ ] `rpc_activate_consulting_project` — атомарный перенос в farm account
- [ ] UI: кнопка «Активировать как ферму» в ProjectPage
- [ ] Dok 1: новый FSM state `activated` для ConsultingProject
- [ ] Dok 3: RPC-C09 `rpc_activate_consulting_project`

---

## 6. Затронутые файлы

| Файл | Изменение | Фаза |
|------|-----------|------|
| `d03_feed.sql` | + `feed_consumption_norms` table; расширить `feed_prices` | 1 |
| `d09_consulting.sql` | Удалить `feed_prices`/`feed_norms` из category CHECK | 1 |
| `feeding_model.py` (Railway) | Читать из `d03_feed` вместо `consulting_reference_data` | 1 |
| `d03_feed.sql` | `ration_versions`: nullable FK + consulting_project_id | 2 |
| `calculate-ration` (Edge Fn) | Убрать `farm_id` из required | 2 |
| `src/pages/admin/consulting/ProjectPage.tsx` | + таб Рационы | 3 |
| `src/pages/admin/consulting/tabs/RationTab.tsx` | Новый компонент | 3 |
| `src/App.tsx` | + маршрут `/ration` | 3 |
| `Docs/AGOS-Dok1-v1_8.md` | + `feed_consumption_norms` в ERD; FSM update | 1, 4 |
| `Docs/AGOS-Dok3-RPC-Catalog-v1_4.md` | + RPC-C09; обновить RPC-22 | 2, 4 |

---

## 7. Ключевые решения (Architecture Decision Records)

### ADR-FEED-01: Унификация источника данных о кормах
**Решение:** Все данные о кормах (каталог, цены, нормы) живут в `d03_feed.sql`.  
`consulting_reference_data` не хранит данные, которые есть в `d03_feed`.  
**Обоснование:** P8 — единственный источник правды. Admin обновляет в одном месте.  
**Последствие:** Python engine требует обновления при переключении источника.

### ADR-FEED-02: `ration_versions` как контекст-независимое хранилище
**Решение:** `ration_versions.ration_id` nullable; добавить `consulting_project_id`.  
CHECK constraint гарантирует наличие хотя бы одного контекста.  
**Обоснование:** Единый формат данных = переиспользование UI + путь к переносу проекта.  
**Последствие:** Аддитивное изменение схемы (D87 — additive only). Существующие данные не затронуты.

### ADR-FEED-03: Fallback chain в feeding_model.py
**Решение:** Приоритет: attached ration_versions → feed_consumption_norms → defaults.  
**Обоснование:** Система работает на любом уровне данных. Детальность опциональна.  
**Последствие:** Первые черновые проекты не требуют рациона — работают на нормативах.

### ADR-FEED-04: `feed_norms` — это кэш NASEM, а не самостоятельная сущность
**Решение:** `feed_consumption_norms` в d03_feed — это стартовые нормы для быстрого расчёта.  
В Фазе 3 они вытесняются реальными `ration_versions`, привязанными к проекту.  
**Обоснование:** Точность нарастает по мере ввода данных. Не блокирует ранний расчёт.

---

## 8. Принципы, которые соблюдает это решение

| Принцип | Соблюдение |
|---------|------------|
| **P8 — Standards as Data** | Все нормы в d03_feed, admin-managed, не в коде |
| **D42 — Quick Mode** | `ration_versions.ration_id` nullable (quick без фермы) |
| **D51 — Append-only** | `ration_versions` не меняются, только добавляются |
| **D87 — Compute outside DB** | NASEM в Edge Function, финансы в Python FastAPI |
| **P7 — Additive** | JSONB в items/results — расширяемый формат |
| **ADR-CONSULT-1** | Python engine остаётся на Railway, только источники данных меняются |

---

*Документ создан: 08.04.2026*  
*Следующий шаг: Фаза 1 — DB Agent*
