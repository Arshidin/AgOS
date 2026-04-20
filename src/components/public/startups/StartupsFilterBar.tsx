import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  STARTUP_SORT_OPTIONS,
  REGIONS,
  localizeOptions,
} from '@/lib/constants';
import type { StartupsFilters } from '@/types/startup';

interface Props {
  filters: StartupsFilters;
  onChange: (patch: Partial<StartupsFilters>) => void;
  compact?: boolean;
}

export default function StartupsFilterBar({ filters, onChange }: Props) {
  const { t } = useTranslation();

  const categories = localizeOptions(t, STARTUP_CATEGORIES, 'startupCategories');
  const stages = localizeOptions(t, STARTUP_STAGES, 'startupStages');
  const regions = localizeOptions(t, REGIONS, 'regions');
  const sortOptions = localizeOptions(t, STARTUP_SORT_OPTIONS, 'startupSort');

  const hasFilters =
    filters.search || filters.category || filters.stage || filters.region;

  const selectTriggerClass =
    'shrink-0 w-auto h-8 rounded-full text-[12px] sm:text-xs border border-[#2b180914] bg-white/70 hover:bg-white px-3 gap-1';

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'rgba(43,24,10,0.3)' }}
        />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value, page: 1 })}
          placeholder={t('startups.filters.searchPlaceholder')}
          className="pl-9 h-9 sm:h-10 rounded-[11px] sm:rounded-xl border-[#2b180914] bg-white/60 text-[13px] sm:text-sm"
        />
      </div>

      {/* Filters — horizontal scroll on mobile */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
        <Select
          value={filters.category ?? '_all'}
          onValueChange={(v) => onChange({ category: v === '_all' ? null : v as any, page: 1 })}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder={t('startups.filters.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">{t('startups.filters.allCategories')}</SelectItem>
            {categories.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={filters.stage ?? '_all'}
          onValueChange={(v) => onChange({ stage: v === '_all' ? null : v as any, page: 1 })}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder={t('startups.filters.allStages')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">{t('startups.filters.allStages')}</SelectItem>
            {stages.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={filters.region ?? '_all'}
          onValueChange={(v) => onChange({ region: v === '_all' ? null : v, page: 1 })}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder={t('startups.filters.allRegions')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">{t('startups.filters.allRegions')}</SelectItem>
            {regions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={filters.sort}
          onValueChange={(v) => onChange({ sort: v, page: 1 })}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={() => onChange({ search: '', category: null, stage: null, region: null, page: 1 })}
            className="shrink-0 flex items-center gap-1 px-2.5 h-8 rounded-full text-[12px] font-medium border border-[#2b180914] bg-white/70 hover:bg-white transition-colors"
            style={{ color: 'rgba(43,24,10,0.5)' }}
          >
            <X size={12} />
            {t('startups.filters.reset')}
          </button>
        )}
      </div>
    </div>
  );
}
