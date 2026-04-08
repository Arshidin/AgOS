/**
 * ProjectWizard — 5-step parameter input for investment project
 * Route: /admin/consulting/new or /admin/consulting/:projectId (edit mode)
 * Calls: consulting engine POST /api/v1/calculate
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calculator, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { calculateProject } from '@/lib/consulting-api'
import { toast } from 'sonner'

interface WizardParams {
  // Step 1: Farm type
  initial_cows: number
  reproducer_capacity: number
  purchase_price_cow: number
  purchase_price_bull: number
  // Step 2: Land & infrastructure
  pasture_norm_ha: number
  calving_scenario: string
  // Step 3: Financing
  equity_share: number
  capex_loan_term_years: number
  capex_grace_period_years: number
  livestock_loan_rate: number
  wc_loan_rate: number
  // Step 4: Toggles
  subsidy_switch: number
  wc_loan_switch: number
  bioasset_revaluation_switch: number
  // Step 5: confirm
  project_start_date: string
}

const STEPS = [
  { title: 'Тип фермы', desc: 'Поголовье и мощность' },
  { title: 'Инфраструктура', desc: 'Земля и сценарий отёла' },
  { title: 'Финансирование', desc: 'Условия кредитования' },
  { title: 'Переключатели', desc: 'Субсидии и оборотка' },
  { title: 'Подтверждение', desc: 'Проверка и запуск' },
]

const DEFAULT_PARAMS: WizardParams = {
  initial_cows: 200,
  reproducer_capacity: 300,
  purchase_price_cow: 550_000,
  purchase_price_bull: 650_000,
  pasture_norm_ha: 10,
  calving_scenario: 'Зимний',
  equity_share: 0.15,
  capex_loan_term_years: 10,
  capex_grace_period_years: 2,
  livestock_loan_rate: 0.05,
  wc_loan_rate: 0.06,
  subsidy_switch: 1,
  wc_loan_switch: 1,
  bioasset_revaluation_switch: 1,
  project_start_date: '2026-08-31',
}

export function ProjectWizard() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const { organization } = useAuth()
  const [step, setStep] = useState(0)
  const [params, setParams] = useState<WizardParams>(DEFAULT_PARAMS)
  const [calculating, setCalculating] = useState(false)

  const orgId = organization?.id

  const update = (key: keyof WizardParams, value: string | number) => {
    setParams(p => ({ ...p, [key]: value }))
  }

  const handleCalculate = async () => {
    if (!orgId || !projectId) return
    setCalculating(true)
    try {
      const result = await calculateProject({
        project_id: projectId,
        organization_id: orgId,
        input_params: {
          ...params,
          farm_type: 'beef_reproducer',
          bull_ratio: 1 / 15,
        },
      })
      toast.success(`Расчёт завершён. Версия ${result.version_number}`)
      navigate(`/admin/consulting/${projectId}`)
    } catch (err: any) {
      toast.error(err.message || 'Ошибка расчёта')
    } finally {
      setCalculating(false)
    }
  }

  const Field = ({ label, field, type = 'number', suffix }: { label: string; field: keyof WizardParams; type?: string; suffix?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type={type}
          value={params[field]}
          onChange={e => update(field, type === 'number' ? Number(e.target.value) : e.target.value)}
          className="font-mono"
        />
        {suffix && <span className="text-sm text-[var(--color-text-muted)] whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/consulting')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Параметры проекта
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Шаг {step + 1} из {STEPS.length}: {STEPS[step].title}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-[var(--color-cta)]' : 'bg-[var(--color-border)]'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step].title}</CardTitle>
          <p className="text-sm text-[var(--color-text-secondary)]">{STEPS[step].desc}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <Field label="Закуп маточного поголовья" field="initial_cows" suffix="голов" />
              <Field label="Мощность репродуктора" field="reproducer_capacity" suffix="голов" />
              <Field label="Цена 1 маточной головы" field="purchase_price_cow" suffix="тг" />
              <Field label="Цена 1 быка-производителя" field="purchase_price_bull" suffix="тг" />
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Норма пастбищ на 1 голову" field="pasture_norm_ha" suffix="га" />
              <div className="space-y-1.5">
                <Label className="text-sm">Сценарий отёла</Label>
                <div className="flex gap-3">
                  {['Летний', 'Зимний'].map(s => (
                    <Button
                      key={s}
                      variant={params.calving_scenario === s ? 'default' : 'outline'}
                      onClick={() => update('calving_scenario', s)}
                      className="flex-1"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              <Field label="Дата старта проекта" field="project_start_date" type="date" />
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Доля собственного участия" field="equity_share" suffix="%" />
              <Field label="Срок инвест. кредита" field="capex_loan_term_years" suffix="лет" />
              <Field label="Льготный период" field="capex_grace_period_years" suffix="лет" />
              <Field label="Ставка по закупу скота" field="livestock_loan_rate" suffix="%" />
              <Field label="Ставка по оборотному" field="wc_loan_rate" suffix="%" />
            </>
          )}

          {step === 3 && (
            <>
              {[
                { label: 'С субсидиями', field: 'subsidy_switch' as const, desc: 'Субсидии МСХ РК при закупе и содержании' },
                { label: 'С займами на ПОС', field: 'wc_loan_switch' as const, desc: 'Привлечение оборотного капитала' },
                { label: 'Без переоценки биоактивов', field: 'bioasset_revaluation_switch' as const, desc: 'Переоценка стоимости КРС на балансе' },
              ].map(({ label, field, desc }) => (
                <div key={field} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-4">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">{label}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{desc}</p>
                  </div>
                  <div className="flex gap-2">
                    {[{ v: 1, l: 'Да' }, { v: 2, l: 'Нет' }].map(({ v, l }) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={params[field] === v ? 'default' : 'outline'}
                        onClick={() => update(field, v)}
                      >
                        {l}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h3 className="font-medium text-[var(--color-text-primary)]">Сводка параметров</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-[var(--color-surface-base)] p-3">
                  <p className="text-[var(--color-text-muted)]">Поголовье</p>
                  <p className="font-mono font-medium">{params.initial_cows} голов</p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-base)] p-3">
                  <p className="text-[var(--color-text-muted)]">Мощность</p>
                  <p className="font-mono font-medium">{params.reproducer_capacity} голов</p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-base)] p-3">
                  <p className="text-[var(--color-text-muted)]">Отёл</p>
                  <p className="font-mono font-medium">{params.calving_scenario}</p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-base)] p-3">
                  <p className="text-[var(--color-text-muted)]">Собств. участие</p>
                  <p className="font-mono font-medium">{(params.equity_share * 100).toFixed(0)}%</p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-base)] p-3">
                  <p className="text-[var(--color-text-muted)]">Субсидии</p>
                  <p className="font-mono font-medium">{params.subsidy_switch === 1 ? 'Да' : 'Нет'}</p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-base)] p-3">
                  <p className="text-[var(--color-text-muted)]">Дата старта</p>
                  <p className="font-mono font-medium">{params.project_start_date}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Назад
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} className="gap-2">
            Далее <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleCalculate} disabled={calculating} className="gap-2">
            {calculating ? (
              <>Расчёт...</>
            ) : (
              <><Calculator className="h-4 w-4" /> Рассчитать</>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
