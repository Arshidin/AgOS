import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ArticleForm, { type ArticleFormData } from './components/ArticleForm';
import ArticleSettings, { type ArticleSettingsData } from './components/ArticleSettings';
import { useCreateNewsArticle } from '@/hooks/useCreateNewsArticle';
import { parseVideoUrl } from './components/VideoEmbed';
import { toast } from 'sonner';

export default function CreateArticlePage() {
  const navigate = useNavigate();
  const createMutation = useCreateNewsArticle();

  const [formData, setFormData] = useState<ArticleFormData>({
    title: '',
    slug: '',
    summary: '',
    content: '',
    cover_image_url: null,
    video_url: '',
  });

  const [settings, setSettings] = useState<ArticleSettingsData>({
    is_published: false,
    published_at: new Date().toISOString(),
    author: 'TURAN Standard Pool',
    category: 'general',
    tags: [],
    is_featured: false,
    meta_title: '',
    meta_description: '',
  });

  const updateForm = useCallback(
    (partial: Partial<ArticleFormData>) =>
      setFormData((prev) => ({ ...prev, ...partial })),
    [],
  );

  const updateSettings = useCallback(
    (partial: Partial<ArticleSettingsData>) =>
      setSettings((prev) => ({ ...prev, ...partial })),
    [],
  );

  const handleSave = async (publish: boolean) => {
    if (!formData.title.trim()) {
      toast.error('Заполните заголовок');
      return;
    }
    if (!formData.slug.trim()) {
      toast.error('Заполните URL (slug)');
      return;
    }
    if (!formData.summary.trim()) {
      toast.error('Заполните краткое описание');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Заполните текст статьи');
      return;
    }

    const video = formData.video_url ? parseVideoUrl(formData.video_url) : null;

    try {
      await createMutation.mutateAsync({
        type: 'association',
        title: formData.title,
        slug: formData.slug,
        summary: formData.summary,
        content: formData.content,
        cover_image_url: formData.cover_image_url,
        video_url: formData.video_url || null,
        video_type: video?.type ?? null,
        author: settings.author || null,
        category: settings.category,
        tags: settings.tags,
        is_published: publish || settings.is_published,
        is_featured: settings.is_featured,
        published_at: settings.published_at,
        meta_title: settings.meta_title || null,
        meta_description: settings.meta_description || null,
      });
      toast.success('Статья сохранена');
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
            Новая статья ассоциации
          </h1>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column (~60%) */}
          <div className="lg:col-span-3">
            <ArticleForm data={formData} onChange={updateForm} />
          </div>

          {/* Right column (~40%) */}
          <div className="lg:col-span-2">
            <ArticleSettings
              data={settings}
              onChange={updateSettings}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 py-4 mt-6 flex gap-2 justify-end bg-background border-t border-border">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={createMutation.isPending}
            className="bg-secondary border-border text-muted-foreground hover:bg-secondary/80"
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
  );
}
