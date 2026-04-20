import { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const translitMap: Record<string, string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo',
  'ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m',
  'н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u',
  'ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch',
  'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
  'ә':'a','ғ':'g','қ':'q','ң':'n','ө':'o','ұ':'u','ү':'u','і':'i','һ':'h',
};

function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((c) => translitMap[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

interface SlugInputProps {
  title: string;
  value: string;
  onChange: (slug: string) => void;
}

export default function SlugInput({ title, value, onChange }: SlugInputProps) {
  const [manual, setManual] = useState(false);

  // Auto-generate slug from title when not manually edited
  useEffect(() => {
    if (!manual && title) {
      onChange(transliterate(title));
    }
  }, [title, manual, onChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setManual(true);
      const clean = e.target.value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 80);
      onChange(clean);
    },
    [onChange],
  );

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">URL</Label>
      <div className="flex items-center gap-0">
        <span className="text-xs px-2 py-1.5 rounded-l-md whitespace-nowrap bg-muted border border-border border-r-0 text-muted-foreground">
          turanstandard.kz/news/
        </span>
        <Input
          value={value}
          onChange={handleChange}
          className="h-8 text-xs rounded-l-none bg-secondary border-border"
          placeholder="auto-generated-slug"
        />
      </div>
    </div>
  );
}

export { transliterate };
