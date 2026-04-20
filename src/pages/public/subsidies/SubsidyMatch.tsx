import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSubsidyPrograms } from '@/hooks/subsidies/useSubsidyPrograms';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import type { SubsidyMatchInputs, SubsidyRate } from '@/types/subsidy';
import { matchSubsidies } from '@/lib/subsidies/engine';
import { formatKzt } from '@/lib/subsidies/calculator';
import { ArrowRight, ArrowLeft, Check, Sparkles, ChevronRight } from 'lucide-react';

const EMPTY: SubsidyMatchInputs = {
  recipient_type: null,
  okved: null,
  has_livestock_breeding: false,
  has_crop: false,
  has_dairy: false,
  has_meat: false,
  has_wool_honey: false,
  needs_investment: false,
  needs_irrigation: false,
  livestock_type: null,
  livestock_origin: null,
  herd_size: 0,
  land_area: 0,
  irrigated_area: 0,
  irrigation_equipment: null,
  irrigation_cost_per_ha: null,
  is_cooperative: false,
};

const RECIPIENTS = ['shtp', 'cooperative', 'individual', 'processor'] as const;
const ACTIVITIES = ['livestock', 'crop', 'dairy', 'meat', 'wool_honey', 'investment', 'irrigation'] as const;
const LIVESTOCK_TYPES = ['cattle', 'sheep', 'poultry', 'pig', 'horse', 'camel'] as const;
const ORIGINS = ['domestic', 'cis', 'eu'] as const;

const TOTAL_STEPS = 4;

function useAllRates() {
  return useQuery({
    queryKey: ['all-subsidy-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subsidy_rates' as any)
        .select('*')
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as unknown as SubsidyRate[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/* ─── Option card used in Steps 1 & 2 ─── */
function OptionCard({
  selected,
  onClick,
  title,
  subtitle,
  multi = false,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  multi?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full text-left px-3 py-2.5 sm:px-5 sm:py-4 rounded-[11px] sm:rounded-[13px] border transition-all duration-200 ${
        selected
          ? 'border-[#3f2407] bg-[#3f2407]/[0.04] shadow-[0_0_0_1px_#3f2407]'
          : 'border-[#2b180914] bg-white/60 hover:border-[#2b180930] hover:bg-white/80'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="block font-medium text-[13.5px] sm:text-base text-foreground leading-snug">{title}</span>
          {subtitle && (
            <span className="block text-[12px] sm:text-[13px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</span>
          )}
        </div>
        {/* Checkbox / Radio indicator */}
        <div
          className={`shrink-0 flex items-center justify-center rounded-full transition-all duration-200 ${
            multi ? 'w-5 h-5 rounded-md' : 'w-5 h-5'
          } ${
            selected
              ? 'bg-[#3f2407] text-white'
              : 'border-2 border-[#2b180920] bg-transparent'
          }`}
        >
          {selected && <Check className="w-3 h-3" strokeWidth={3} />}
        </div>
      </div>
    </button>
  );
}

/* ─── Chip selector for livestock types / origins ─── */
function ChipSelect({
  options,
  selected,
  onSelect,
  getLabel,
}: {
  options: readonly string[];
  selected: string | null;
  onSelect: (v: string) => void;
  getLabel: (v: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onSelect(o)}
          className={`px-3.5 py-2 rounded-full text-[13px] sm:text-sm font-medium transition-all duration-200 ${
            selected === o
              ? 'bg-[#3f2407] text-white shadow-sm'
              : 'bg-[#f1e7dc] text-[#2b1809] hover:bg-[#e8ddd0]'
          }`}
        >
          {getLabel(o)}
        </button>
      ))}
    </div>
  );
}

export default function SubsidyMatch() {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [inputs, setInputs] = useState<SubsidyMatchInputs>(EMPTY);
  const { data: programs = [] } = useSubsidyPrograms();
  const { data: rates = [] } = useAllRates();

  const matches = useMemo(() => matchSubsidies(programs, rates, inputs), [programs, rates, inputs]);
  const totalAmount = useMemo(() => matches.reduce((s, m) => s + m.total_amount_kzt, 0), [matches]);

  const set = <K extends keyof SubsidyMatchInputs>(k: K, v: SubsidyMatchInputs[K]) => {
    setInputs((prev) => ({ ...prev, [k]: v }));
  };

  const toggleActivity = (key: (typeof ACTIVITIES)[number]) => {
    const fieldMap: Record<string, keyof SubsidyMatchInputs> = {
      livestock: 'has_livestock_breeding',
      crop: 'has_crop',
      dairy: 'has_dairy',
      meat: 'has_meat',
      wool_honey: 'has_wool_honey',
      investment: 'needs_investment',
      irrigation: 'needs_irrigation',
    };
    const field = fieldMap[key]!;
    setInputs((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const activities = ACTIVITIES.filter((a) => {
    const map: Record<string, keyof SubsidyMatchInputs> = {
      livestock: 'has_livestock_breeding', crop: 'has_crop', dairy: 'has_dairy',
      meat: 'has_meat', wool_honey: 'has_wool_honey', investment: 'needs_investment', irrigation: 'needs_irrigation',
    };
    return inputs[map[a]!];
  });

  const showLivestockDetails = inputs.has_livestock_breeding || inputs.has_dairy || inputs.has_meat;
  const showCropDetails = inputs.has_crop;
  const showIrrigationDetails = inputs.needs_irrigation;

  const canProceed = () => {
    if (step === 1) return !!inputs.recipient_type;
    if (step === 2) return activities.length > 0;
    return true;
  };

  /* ─── Step header with counter ─── */
  const StepHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('subsidies.match.stepOf', { current: step, total: TOTAL_STEPS })}
        </span>
      </div>
      <h2 className="font-serif text-[20px] sm:text-[26px] font-bold text-foreground leading-tight tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[13px] sm:text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );

  return (
    <div className="noise-overlay min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{t('subsidies.match.title')}</title>
      </Helmet>
      

      <main className="flex-1 pt-4 sm:pt-10 md:pt-14 pb-20 sm:pb-28 px-4 sm:px-6">
        <div className="max-w-[600px] mx-auto">

          {/* ─── Step 1: Recipient type ─── */}
          {step === 1 && (
            <div>
              <StepHeader
                title={t('subsidies.match.step1')}
                subtitle={t('subsidies.match.recipientType')}
              />
              <div className="space-y-2 sm:space-y-3">
                {RECIPIENTS.map((r) => (
                  <OptionCard
                    key={r}
                    selected={inputs.recipient_type === r}
                    onClick={() => set('recipient_type', r)}
                    title={t(`subsidies.match.recipient.${r}`)}
                    subtitle={t(`subsidies.match.recipientDesc.${r}`, { defaultValue: '' })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 2: Activities (multi-select) ─── */}
          {step === 2 && (
            <div>
              <StepHeader
                title={t('subsidies.match.step2')}
                subtitle={t('subsidies.match.activities')}
              />
              <div className="space-y-2 sm:space-y-3">
                {ACTIVITIES.map((a) => {
                  const map: Record<string, keyof SubsidyMatchInputs> = {
                    livestock: 'has_livestock_breeding', crop: 'has_crop', dairy: 'has_dairy',
                    meat: 'has_meat', wool_honey: 'has_wool_honey', investment: 'needs_investment', irrigation: 'needs_irrigation',
                  };
                  const active = !!inputs[map[a]!];
                  return (
                    <OptionCard
                      key={a}
                      selected={active}
                      onClick={() => toggleActivity(a)}
                      title={t(`subsidies.match.activity.${a}`)}
                      subtitle={t(`subsidies.match.activityDesc.${a}`, { defaultValue: '' })}
                      multi
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Step 3: Details ─── */}
          {step === 3 && (
            <div>
              <StepHeader
                title={t('subsidies.match.step3', { defaultValue: 'Детали' })}
                subtitle={t('subsidies.match.step3Desc', { defaultValue: 'Уточните параметры для расчёта' })}
              />

              <div className="space-y-4">
                {showLivestockDetails && (
                  <div className="rounded-2xl border border-[#2b180910] bg-white/70 p-4 sm:p-5 space-y-5">
                    <h3 className="font-serif text-lg font-bold text-foreground">
                      {t('subsidies.match.activity.livestock')}
                    </h3>

                    <div className="space-y-2">
                      <Label className="text-[13px] font-medium text-muted-foreground">
                        {t('subsidies.match.livestockType')}
                      </Label>
                      <ChipSelect
                        options={LIVESTOCK_TYPES}
                        selected={inputs.livestock_type}
                        onSelect={(v) => set('livestock_type', v)}
                        getLabel={(v) => t(`subsidies.match.livestockTypes.${v}`)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[13px] font-medium text-muted-foreground">
                        {t('subsidies.match.origin')}
                      </Label>
                      <ChipSelect
                        options={ORIGINS}
                        selected={inputs.livestock_origin}
                        onSelect={(v) => set('livestock_origin', v)}
                        getLabel={(v) => t(`subsidies.match.originTypes.${v}`)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[13px] font-medium text-muted-foreground">
                        {t('subsidies.match.herdSize')}
                      </Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={inputs.herd_size || ''}
                        placeholder="0"
                        onChange={(e) => set('herd_size', Math.max(0, Number(e.target.value) || 0))}
                        className="h-11 text-base rounded-[13px] border-[#2b180914]"
                      />
                    </div>
                  </div>
                )}

                {showCropDetails && (
                  <div className="rounded-2xl border border-[#2b180910] bg-white/70 p-4 sm:p-5 space-y-4">
                    <h3 className="font-serif text-lg font-bold text-foreground">
                      {t('subsidies.match.activity.crop')}
                    </h3>
                    <div className="space-y-2">
                      <Label className="text-[13px] font-medium text-muted-foreground">
                        {t('subsidies.match.landArea')}
                      </Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={inputs.land_area || ''}
                        placeholder="0"
                        onChange={(e) => set('land_area', Math.max(0, Number(e.target.value) || 0))}
                        className="h-11 text-base rounded-[13px] border-[#2b180914]"
                      />
                    </div>
                  </div>
                )}

                {showIrrigationDetails && (
                  <div className="rounded-2xl border border-[#2b180910] bg-white/70 p-6 sm:p-8 space-y-5">
                    <h3 className="font-serif text-lg font-semibold text-[#2B180A]">{t('subsidies.match.activity.irrigation')}</h3>
                    <div className="space-y-2">
                      <Label className="text-sm">{t('subsidies.match.irrigationEquipment')}</Label>
                      <div className="flex flex-wrap gap-2">
                        {(['sprinkler_circular', 'sprinkler_drum', 'drip', 'infrastructure'] as const).map((eq) => (
                          <button
                            key={eq}
                            onClick={() => set('irrigation_equipment', inputs.irrigation_equipment === eq ? null : eq)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                              inputs.irrigation_equipment === eq
                                ? 'bg-[#E8730C] text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {t(`subsidies.match.irrigationTypes.${eq}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">{t('subsidies.match.irrigatedArea')}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={inputs.irrigated_area}
                        onChange={(e) => set('irrigated_area', Math.max(0, Number(e.target.value) || 0))}
                        className="h-11 text-base rounded-[13px] border-[#2b180914]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">{t('subsidies.match.irrigationCost')}</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder={t('subsidies.match.irrigationCostPlaceholder')}
                        value={inputs.irrigation_cost_per_ha ?? ''}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          set('irrigation_cost_per_ha', v > 0 ? v : null);
                        }}
                        className="h-11 text-base rounded-[13px] border-[#2b180914]"
                      />
                    </div>
                  </div>
                )}

                {!showLivestockDetails && !showCropDetails && !showIrrigationDetails && (
                  <div className="rounded-2xl border border-[#2b180910] bg-white/70 p-6 sm:p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t('subsidies.match.noDetailsNeeded')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Step 4: Results ─── */}
          {step === 4 && (
            <div>
              <StepHeader
                title={t('subsidies.match.step4', { defaultValue: 'Результаты' })}
              />

              <div className="space-y-3 sm:space-y-4">
                {/* Total hero card */}
                {matches.length > 0 && totalAmount > 0 && (
                  <div className="rounded-2xl p-5 sm:p-6 bg-[#3f2407] text-white relative overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-[0.06]"
                      style={{
                        backgroundImage: 'radial-gradient(circle at 70% 20%, white 0%, transparent 60%)',
                      }}
                    />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 opacity-70" />
                        <span className="text-xs sm:text-sm opacity-70 uppercase tracking-wider font-medium">
                          {t('subsidies.match.totalEstimate')}
                        </span>
                      </div>
                      <div className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                        {formatKzt(totalAmount)}
                      </div>
                      <p className="text-xs sm:text-sm opacity-60 mt-2">
                        {t('subsidies.match.matched', { count: matches.length })}
                      </p>
                    </div>
                  </div>
                )}

                {matches.length === 0 ? (
                  <div className="rounded-2xl border border-[#2b180910] bg-white/70 p-8 sm:p-10 text-center">
                    <p className="text-muted-foreground">{t('subsidies.match.empty')}</p>
                  </div>
                ) : (
                  matches.map((m) => (
                    <div
                      key={m.subsidy.id}
                      className="rounded-2xl border border-[#2b180910] bg-white/70 p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <Badge
                            variant="secondary"
                            className="mb-1.5 text-[11px] bg-[#f1e7dc] text-[#786758] border-0"
                          >
                            {t(`subsidies.categories.${m.subsidy.category}`)}
                          </Badge>
                          <h3 className="font-serif text-base sm:text-lg font-bold text-foreground leading-snug">
                            {m.subsidy.name_ru}
                          </h3>
                          {m.subsidy.npa_reference && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{m.subsidy.npa_reference}</p>
                          )}
                        </div>
                        {m.total_amount_kzt > 0 && (
                          <div className="text-right shrink-0">
                            <div className="font-serif text-lg sm:text-xl font-bold text-[#3f2407]">
                              {formatKzt(m.total_amount_kzt)}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              возмещение
                            </div>
                          </div>
                        )}
                      </div>

                      {m.matched_rates.length > 0 && (
                        <ul className="space-y-1 mt-3 border-t border-[#2b180908] pt-3">
                          {m.matched_rates.slice(0, 4).map((r) => (
                            <li key={r.rate_id} className="flex justify-between text-[13px] sm:text-sm gap-2">
                              <span className="text-muted-foreground truncate">
                                {t('subsidies.match.amountForQty', { qty: r.qty, name: r.rate_name })}
                              </span>
                              <span className="font-medium text-foreground shrink-0">
                                {formatKzt(r.amount_kzt)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <Link
                        to={`/subsidies/${m.subsidy.id}`}
                        className="inline-flex items-center gap-1 text-[13px] sm:text-sm font-medium text-[#3f2407] hover:text-[#E07A34] transition-colors mt-3"
                      >
                        {t('subsidies.match.viewDetails')}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ─── Sticky bottom navigation bar ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          backgroundColor: 'rgba(253, 246, 238, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(43,24,10,0.06)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.05)',
        }}
      >
        <div className="max-w-[600px] mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (step === 1) {
                setInputs(EMPTY);
                return;
              }
              setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4);
            }}
            disabled={step === 1 && inputs.recipient_type === null}
            className="gap-1.5 shrink-0 rounded-[13px] h-10 px-3 sm:px-4 text-[13px] sm:text-sm border-[#2b180914] hover:brightness-[0.92]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {step === 1 ? t('subsidies.match.startOver') : t('subsidies.match.back')}
            </span>
          </Button>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 flex-1 justify-center">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-500 ease-out"
                style={{
                  width: i + 1 === step ? 18 : 6,
                  height: 6,
                  backgroundColor: i < step ? '#3f2407' : 'rgba(43,24,10,0.12)',
                }}
              />
            ))}
          </div>

          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
              disabled={!canProceed()}
              className="gap-1.5 shrink-0 rounded-[13px] h-10 px-4 sm:px-5 text-[13px] sm:text-sm bg-[#3f2407] hover:brightness-[0.92] text-white"
            >
              <span>
                {step === 3 ? t('subsidies.match.calculate') : t('subsidies.match.next')}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              onClick={() => { setStep(1); setInputs(EMPTY); }}
              variant="outline"
              size="sm"
              className="shrink-0 rounded-[13px] h-10 px-4 text-[13px] sm:text-sm border-[#2b180914]"
            >
              {t('subsidies.match.startOver')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
