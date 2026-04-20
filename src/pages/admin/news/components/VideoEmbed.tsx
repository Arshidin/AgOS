import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video } from 'lucide-react';

interface VideoEmbedProps {
  value: string;
  onChange: (url: string) => void;
}

interface ParsedVideo {
  type: 'youtube' | 'instagram';
  embedUrl: string;
}

function parseVideoUrl(url: string): ParsedVideo | null {
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch)
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
    };

  const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
  if (igMatch)
    return {
      type: 'instagram',
      embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed`,
    };

  return null;
}

export { parseVideoUrl };

export default function VideoEmbed({ value, onChange }: VideoEmbedProps) {
  const parsed = useMemo(() => (value ? parseVideoUrl(value) : null), [value]);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Video className="h-4 w-4" />
        Видео
        <span className="text-xs text-muted-foreground">
          YouTube или Instagram ссылка
        </span>
      </Label>

      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://youtube.com/watch?v=... или https://instagram.com/reel/..."
        className="h-9 bg-secondary border-border"
      />

      {value && !parsed && (
        <p className="text-xs text-destructive">
          Поддерживаются только YouTube и Instagram ссылки
        </p>
      )}

      {parsed && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ aspectRatio: '16/9' }}
        >
          <iframe
            src={parsed.embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}
    </div>
  );
}
