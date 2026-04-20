import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import UrlParserInput from './components/UrlParserInput';
import ImageUpload from './components/ImageUpload';
import TagsInput from './components/TagsInput';
import { useCreateNewsArticle } from '@/hooks/useCreateNewsArticle';
import { transliterate } from './components/SlugInput';
import type { ParsedArticle } from '@/hooks/useParseArticleUrl';
import { toast } from 'sonner';
import { NEWS_CATEGORIES, adminInputStyle, adminSelectContentStyle, adminSelectItemClass } from './constants';

interface FormState {
  title: string;
  summary: string;
  cover_image_url: string | null;
  source_name: string;
  source_url: string;
  published_at: string;
  category: string;
  tags: string[];
  is_published: boolean;
  is_featured: boolean;
}

export default function CreateMediaPage() {
  const navigate = useNavigate();
  const createMutation = useCreateNewsArticle();

  const [parsed, setParsed] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: '',
    summary: '',
    cover_image_url: null,
    source_name: '',
    source_url: '',
    published_at: new Date().toISOString().split('T')[0] ?? '',
    category: 'general',
    tags: [],
    is_published: false,
    is_featured: false,
  });

  const update = useCallback(
    (partial: Partial<FormState>) => setForm((prev) => ({ ...prev, ...partial })),
    [],
  );

  const handleParsed = useCallback((data: ParsedArticle) => {
    setParsed(true);
    setForm((prev) => ({
      ...prev,
      title: data.title ?? '',
      summary: data.summary ?? '',
      cover_image_url: data.cover_image_url,
      source_name: data.source_name ?? '',
      source_url: data.url,
      published_at: data.published_date
        ? (data.published_date.split('T')[0] ?? prev.published_at)
        : prev.published_at,
    }));
  }, []);

  const handleError = useCallback(() => {
    setParsed(true); // Show form for manual entry
  }, []);

  const handleSave = async (publish: boolean) => {
    if (!form.title.trim()) {
      toast.error('Заполните заголовок');
      return;
    }
    if (!form.summary.trim()) {
      toast.error('Заполните описание');
      return;
    }
    if (!form.source_name.trim()) {
      toast.error('Укажите издание');
      return;
    }

    try {
      await createMutation.mutateAsync({
        type: 'media',
        title: form.title,
        slug: transliterate(form.title),
        summary: form.summary,
        cover_image_url: form.cover_image_url,
        source_name: form.source_name,
        source_url: form.source_url,
        category: form.category,
        tags: form.tags,
        is_published: publish || form.is_published,
        is_featured: form.is_featured,
        published_at: new Date(form.published_at).toISOString(),
      });
      toast.success('Публикация сохранена');
      navigate('/admin/news');
    } catch {
      toast.error('Ошибка при сохранении');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
        {/* Back + Title */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/news')}
            className="p-1 text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">
            Добавить СМИ-публикацию
          </h1>
        </div>

        {/* Content - single column, centered */}
        <div className="max-w-[640px] mx-auto space-y-6">
          {/* Step A: URL Parser */}
          <UrlParserInput onParsed={handleParsed} onError={handleError} />

          {/* Step C: Preview & Edit Form */}
          {parsed && (
            <div className="p-5 rounded-lg space-y-5 bg-secondary border border-border">
              {/* Cover Image */}
              <ImageUpload
                value={form.cover_image_url}
                onChange={(url) => update({ cover_image_url: url })}
              />

              {/* Title */}
              <div className="space-y-2">
                <Label>
                  Заголовок <span className="text-primary">*</span>
                </Label>
                <Input
                  value={form.title}
                  onChange={(e) => update({ title: e.target.value })}
                  className="h-10"
                  style={adminInputStyle}
                />
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>
                    Описание <span className="text-primary">*</span>
                  </Label>
                  <span
                    className={`text-xs ${form.summary.length > 280 ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {form.summary.length}/280
                  </span>
                </div>
                <Textarea
                  value={form.summary}
                  onChange={(e) =>
                    update({ summary: e.target.value.slice(0, 280) })
                  }
                  rows={3}
                  style={adminInputStyle}
                />
              </div>

              {/* Source Name */}
              <div className="space-y-2">
                <Label>
                  Издание <span className="text-primary">*</span>
                </Label>
                <Input
                  value={form.source_name}
                  onChange={(e) => update({ source_name: e.target.value })}
                  className="h-9"
                  style={adminInputStyle}
                />
              </div>

              {/* Source URL (readonly) */}
              <div className="space-y-2">
                <Label>URL оригинала</Label>
                <Input
                  value={form.source_url}
                  readOnly
                  className="h-9 text-sm text-muted-foreground"
                  style={adminInputStyle}
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>
                  Дата <span className="text-primary">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.published_at}
                  onChange={(e) => update({ published_at: e.target.value })}
                  className="h-9"
                  style={adminInputStyle}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>
                  Категория <span className="text-primary">*</span>
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => update({ category: v })}
                >
                  <SelectTrigger className="h-9" style={adminInputStyle}>
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
                value={form.tags}
                onChange={(tags) => update({ tags })}
              />

              {/* Footer */}
              <div className="pt-4 space-y-3 border-t border-border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="publish-now"
                      checked={form.is_published}
                      onCheckedChange={(v) => update({ is_published: !!v })}
                    />
                    <label htmlFor="publish-now" className="text-sm cursor-pointer">
                      Опубликовать сразу
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="featured"
                      checked={form.is_featured}
                      onCheckedChange={(v) => update({ is_featured: !!v })}
                    />
                    <label htmlFor="featured" className="text-sm cursor-pointer">
                      Избранное
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleSave(false)}
                    disabled={createMutation.isPending}
                    className="bg-muted border-border text-muted-foreground hover:bg-muted/80"
                  >
                    Сохранить черновик
                  </Button>
                  <Button
                    onClick={() => handleSave(true)}
                    disabled={createMutation.isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {createMutation.isPending ? 'Сохранение...' : 'Опубликовать'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
