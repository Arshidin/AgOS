import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  STARTUP_CATEGORIES,
  STARTUP_STAGES,
  REGIONS,
  localizeOptions,
} from '@/lib/constants';
import type { SubmitStartupFormData } from '@/types/startup';
import AiBadge from './AiBadge';
import TeamMemberFields from './TeamMemberFields';
import UseOfFundsFields from './UseOfFundsFields';

interface Props {
  data: SubmitStartupFormData;
  aiFields: Set<string>;
  errors: Record<string, string>;
  onChange: (field: string, value: any) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-serif font-semibold text-[16px] mt-2" style={{ color: '#2B180A' }}>
      {children}
    </h3>
  );
}

function FieldLabel({ children, fieldKey, aiFields }: { children: React.ReactNode; fieldKey: string; aiFields: Set<string> }) {
  return (
    <label className="flex items-center text-[13px] font-medium mb-1.5" style={{ color: '#2B180A' }}>
      {children}
      {aiFields.has(fieldKey) && <AiBadge />}
    </label>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-[12px] mt-1 font-medium" style={{ color: '#993333' }}>{error}</p>;
}

const inputStyle = { background: 'rgba(43,24,10,0.04)' };

export default function StepReviewForm({ data, aiFields, errors, onChange }: Props) {
  const { t } = useTranslation();

  const categories = localizeOptions(t, STARTUP_CATEGORIES, 'startupCategories');
  const stages = localizeOptions(t, STARTUP_STAGES, 'startupStages');
  const regions = localizeOptions(t, REGIONS, 'regions');

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif font-semibold text-[20px] md:text-[24px]" style={{ color: '#2B180A' }}>
          {t('startups.submit.step3Title')}
        </h2>
        <p className="text-[13px] mt-1" style={{ color: 'rgba(43,24,10,0.5)' }}>
          {t('startups.submit.step3Subtitle')}
        </p>
      </div>

      {/* ─── Basic ─── */}
      <SectionTitle>{t('startups.submit.sectionBasic')}</SectionTitle>

      <div>
        <FieldLabel fieldKey="title" aiFields={aiFields}>{t('startups.submit.projectName')}</FieldLabel>
        <Input
          value={data.title}
          onChange={(e) => onChange('title', e.target.value)}
          className="h-11 rounded-xl border-none"
          style={inputStyle}
        />
        <FieldError error={errors.title} />
      </div>

      <div>
        <FieldLabel fieldKey="tagline" aiFields={aiFields}>{t('startups.submit.tagline')}</FieldLabel>
        <Input
          value={data.tagline}
          onChange={(e) => onChange('tagline', e.target.value)}
          placeholder={t('startups.submit.taglinePlaceholder')}
          className="h-11 rounded-xl border-none"
          style={inputStyle}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel fieldKey="category" aiFields={aiFields}>{t('startups.submit.category')}</FieldLabel>
          <Select
            value={data.category || '_none'}
            onValueChange={(v) => onChange('category', v === '_none' ? '' : v)}
          >
            <SelectTrigger className="h-11 rounded-xl border-none" style={inputStyle}>
              <SelectValue placeholder={t('startups.submit.selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">{t('startups.submit.selectCategory')}</SelectItem>
              {categories.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError error={errors.category} />
        </div>

        <div>
          <FieldLabel fieldKey="stage" aiFields={aiFields}>{t('startups.submit.stage')}</FieldLabel>
          <Select
            value={data.stage || '_none'}
            onValueChange={(v) => onChange('stage', v === '_none' ? '' : v)}
          >
            <SelectTrigger className="h-11 rounded-xl border-none" style={inputStyle}>
              <SelectValue placeholder={t('startups.submit.selectStage')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">{t('startups.submit.selectStage')}</SelectItem>
              {stages.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError error={errors.stage} />
        </div>
      </div>

      {/* ─── Description ─── */}
      <div style={{ borderTop: '1px solid rgba(43,24,10,0.06)' }} />
      <SectionTitle>{t('startups.submit.sectionDescription')}</SectionTitle>

      <div>
        <FieldLabel fieldKey="description_problem" aiFields={aiFields}>{t('startups.detail.problem')}</FieldLabel>
        <Textarea
          value={data.description_problem}
          onChange={(e) => onChange('description_problem', e.target.value)}
          rows={3}
          className="rounded-xl border-none resize-none text-[14px]"
          style={inputStyle}
        />
      </div>

      <div>
        <FieldLabel fieldKey="description_solution" aiFields={aiFields}>{t('startups.detail.solution')}</FieldLabel>
        <Textarea
          value={data.description_solution}
          onChange={(e) => onChange('description_solution', e.target.value)}
          rows={3}
          className="rounded-xl border-none resize-none text-[14px]"
          style={inputStyle}
        />
      </div>

      <div>
        <FieldLabel fieldKey="target_market" aiFields={aiFields}>{t('startups.detail.targetMarket')}</FieldLabel>
        <Textarea
          value={data.target_market}
          onChange={(e) => onChange('target_market', e.target.value)}
          rows={2}
          className="rounded-xl border-none resize-none text-[14px]"
          style={inputStyle}
        />
      </div>

      <div>
        <FieldLabel fieldKey="business_model" aiFields={aiFields}>{t('startups.detail.businessModel')}</FieldLabel>
        <Textarea
          value={data.business_model}
          onChange={(e) => onChange('business_model', e.target.value)}
          rows={2}
          className="rounded-xl border-none resize-none text-[14px]"
          style={inputStyle}
        />
      </div>

      {/* ─── Investment ─── */}
      <div style={{ borderTop: '1px solid rgba(43,24,10,0.06)' }} />
      <SectionTitle>{t('startups.detail.investment')}</SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel fieldKey="funding_ask" aiFields={aiFields}>{t('startups.detail.fundingAsk')} (₸)</FieldLabel>
          <Input
            type="number"
            value={data.funding_ask}
            onChange={(e) => onChange('funding_ask', e.target.value)}
            placeholder="0"
            className="h-11 rounded-xl border-none"
            style={inputStyle}
          />
        </div>

        <div>
          <FieldLabel fieldKey="funding_instrument" aiFields={aiFields}>{t('startups.detail.instrument')}</FieldLabel>
          <Input
            value={data.funding_instrument}
            onChange={(e) => onChange('funding_instrument', e.target.value)}
            placeholder="Equity, SAFE, Convertible Note..."
            className="h-11 rounded-xl border-none"
            style={inputStyle}
          />
        </div>
      </div>

      <UseOfFundsFields
        items={data.use_of_funds}
        onChange={(items) => onChange('use_of_funds', items)}
        aiFilledCount={aiFields.has('use_of_funds') ? data.use_of_funds.length : 0}
      />

      {/* ─── Team ─── */}
      <div style={{ borderTop: '1px solid rgba(43,24,10,0.06)' }} />
      <SectionTitle>{t('startups.detail.team')}</SectionTitle>

      <TeamMemberFields
        members={data.team_members}
        onChange={(members) => onChange('team_members', members)}
        aiFilledCount={aiFields.has('team_members') ? data.team_members.length : 0}
      />

      {/* ─── Additional ─── */}
      <div style={{ borderTop: '1px solid rgba(43,24,10,0.06)' }} />
      <SectionTitle>{t('startups.submit.sectionAdditional')}</SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <FieldLabel fieldKey="year_founded" aiFields={aiFields}>{t('startups.submit.yearFounded')}</FieldLabel>
          <Input
            type="number"
            value={data.year_founded}
            onChange={(e) => onChange('year_founded', e.target.value)}
            placeholder="2024"
            className="h-11 rounded-xl border-none"
            style={inputStyle}
          />
        </div>

        <div>
          <FieldLabel fieldKey="team_size" aiFields={aiFields}>{t('startups.submit.teamSizeLabel')}</FieldLabel>
          <Input
            type="number"
            value={data.team_size}
            onChange={(e) => onChange('team_size', e.target.value)}
            placeholder="0"
            className="h-11 rounded-xl border-none"
            style={inputStyle}
          />
        </div>

        <div>
          <FieldLabel fieldKey="location_region" aiFields={aiFields}>{t('startups.submit.region')}</FieldLabel>
          <Select
            value={data.location_region || '_none'}
            onValueChange={(v) => onChange('location_region', v === '_none' ? '' : v)}
          >
            <SelectTrigger className="h-11 rounded-xl border-none" style={inputStyle}>
              <SelectValue placeholder={t('startups.filters.allRegions')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">—</SelectItem>
              {regions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
