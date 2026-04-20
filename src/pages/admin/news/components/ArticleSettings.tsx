import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TagsInput from './TagsInput';
import { NEWS_CATEGORIES, adminInputStyle, adminSelectContentStyle, adminSelectItemClass } from '../constants';

export interface ArticleSettingsData {
  is_published: boolean;
  published_at: string;
  author: string;
  category: string;
  tags: string[];
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
}

interface ArticleSettingsProps {
  data: ArticleSettingsData;
  onChange: (data: Partial<ArticleSettingsData>) => void;
  existingTags?: string[];
}

export default function ArticleSettings({
  data,
  onChange,
  existingTags = [],
}: ArticleSettingsProps) {
  const [seoOpen, setSeoOpen] = useState(false);

  return (
    <div className="space-y-5 p-4 rounded-lg sticky top-20 bg-secondary border border-border">
      {/* Status */}
      <div className="space-y-2">
        <Label>Статус</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              checked={!data.is_published}
              onChange={() => onChange({ is_published: false })}
              className="accent-primary"
            />
            <span className="text-sm">Черновик</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              checked={data.is_published}
              onChange={() => onChange({ is_published: true })}
              className="accent-primary"
            />
            <span className="text-sm">Опубликовать</span>
          </label>
        </div>
      </div>

      {/* Published date */}
      <div className="space-y-2">
        <Label>Дата публикации</Label>
        <Input
          type="date"
          value={data.published_at.split('T')[0]}
          onChange={(e) =>
            onChange({ published_at: new Date(e.target.value).toISOString() })
          }
          className="h-9 text-sm"
          style={adminInputStyle}
        />
      </div>

      {/* Author */}
      <div className="space-y-2">
        <Label>Автор</Label>
        <Input
          value={data.author}
          onChange={(e) => onChange({ author: e.target.value })}
          placeholder="TURAN Standard Pool"
          className="h-9 text-sm"
          style={adminInputStyle}
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Категория</Label>
        <Select
          value={data.category}
          onValueChange={(v) => onChange({ category: v })}
        >
          <SelectTrigger className="h-9 text-sm" style={adminInputStyle}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={adminSelectContentStyle}>
            {NEWS_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value} className={adminSelectItemClass}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <TagsInput
        value={data.tags}
        onChange={(tags) => onChange({ tags })}
        suggestions={existingTags}
      />

      {/* Featured */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="featured"
          checked={data.is_featured}
          onCheckedChange={(v) => onChange({ is_featured: !!v })}
        />
        <label htmlFor="featured" className="text-sm cursor-pointer">
          Избранное
        </label>
      </div>

      {/* SEO (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setSeoOpen(!seoOpen)}
          className="flex items-center gap-1 text-sm font-medium w-full text-muted-foreground"
        >
          SEO
          {seoOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {seoOpen && (
          <div className="mt-3 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Meta Title
              </Label>
              <Input
                value={data.meta_title}
                onChange={(e) => onChange({ meta_title: e.target.value })}
                className="h-8 text-sm"
                style={adminInputStyle}
                placeholder="Авто из заголовка"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">
                  Meta Description
                </Label>
                <span className="text-xs text-muted-foreground/70">
                  {data.meta_description.length}/160
                </span>
              </div>
              <Textarea
                value={data.meta_description}
                onChange={(e) =>
                  onChange({
                    meta_description: e.target.value.slice(0, 160),
                  })
                }
                rows={2}
                className="text-sm"
                style={adminInputStyle}
                placeholder="Авто из описания"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
