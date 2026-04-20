import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NewsType } from '@/types/news';
import { adminInputStyle, adminSelectContentStyle, adminSelectItemClass } from '../constants';

interface NewsFiltersProps {
  type: NewsType | null;
  onTypeChange: (t: NewsType | null) => void;
  status: 'published' | 'draft' | null;
  onStatusChange: (s: 'published' | 'draft' | null) => void;
  search: string;
  onSearchChange: (s: string) => void;
}

const TYPE_TABS: { key: NewsType | null; label: string }[] = [
  { key: null, label: 'Все' },
  { key: 'association', label: 'Ассоциация' },
  { key: 'media', label: 'СМИ' },
];

export default function NewsFilters({
  type,
  onTypeChange,
  status,
  onStatusChange,
  search,
  onSearchChange,
}: NewsFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Segmented control */}
      <div className="flex rounded-md bg-muted p-0.5 gap-0">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key ?? 'all'}
            onClick={() => onTypeChange(tab.key)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              type === tab.key ? 'bg-admin-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Поиск по заголовку..."
          className="pl-8 h-8 text-sm"
          style={adminInputStyle}
        />
      </div>

      {/* Status filter */}
      <Select
        value={status ?? 'all'}
        onValueChange={(v) =>
          onStatusChange(v === 'all' ? null : (v as 'published' | 'draft'))
        }
      >
        <SelectTrigger
          className="w-[140px] h-8 text-sm"
          style={adminInputStyle}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent style={adminSelectContentStyle}>
          <SelectItem value="all" className={adminSelectItemClass}>Все статусы</SelectItem>
          <SelectItem value="published" className={adminSelectItemClass}>Опубликовано</SelectItem>
          <SelectItem value="draft" className={adminSelectItemClass}>Черновик</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
