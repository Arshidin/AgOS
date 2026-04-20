import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ImageUpload from './ImageUpload';
import VideoEmbed from './VideoEmbed';
import MarkdownEditor from './MarkdownEditor';
import SlugInput from './SlugInput';

export interface ArticleFormData {
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image_url: string | null;
  video_url: string;
}

interface ArticleFormProps {
  data: ArticleFormData;
  onChange: (data: Partial<ArticleFormData>) => void;
}

export default function ArticleForm({ data, onChange }: ArticleFormProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label>
          Заголовок <span className="text-primary">*</span>
        </Label>
        <Input
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Введите заголовок статьи"
          className="h-11 text-lg font-semibold bg-secondary border-border"
        />
      </div>

      {/* Slug */}
      <SlugInput
        title={data.title}
        value={data.slug}
        onChange={(slug) => onChange({ slug })}
      />

      {/* Cover Image */}
      <div className="space-y-2">
        <Label>Обложка</Label>
        <ImageUpload
          value={data.cover_image_url}
          onChange={(url) => onChange({ cover_image_url: url })}
        />
      </div>

      {/* Video */}
      <VideoEmbed
        value={data.video_url}
        onChange={(video_url) => onChange({ video_url })}
      />

      {/* Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            Краткое описание <span className="text-primary">*</span>
          </Label>
          <span
            className={`text-xs ${
              data.summary.length > 280 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {data.summary.length}/280
          </span>
        </div>
        <Textarea
          value={data.summary}
          onChange={(e) => onChange({ summary: e.target.value.slice(0, 280) })}
          rows={3}
          placeholder="Краткое описание для карточки в ленте"
          className="bg-secondary border-border"
        />
      </div>

      {/* Content (Markdown) */}
      <MarkdownEditor
        value={data.content}
        onChange={(content) => onChange({ content })}
        required
      />
    </div>
  );
}
