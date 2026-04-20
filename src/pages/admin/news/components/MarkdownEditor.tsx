import { useState, useRef, useCallback, useMemo } from 'react';
import { Bold, Italic, Heading2, Heading3, Link, Quote, List, ListOrdered, Eye, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
}

type ToolAction = {
  icon: React.ReactNode;
  title: string;
  prefix: string;
  suffix: string;
  block?: boolean;
};

const tools: ToolAction[] = [
  { icon: <Bold className="h-4 w-4" />, title: 'Bold', prefix: '**', suffix: '**' },
  { icon: <Italic className="h-4 w-4" />, title: 'Italic', prefix: '*', suffix: '*' },
  { icon: <Heading2 className="h-4 w-4" />, title: 'H2', prefix: '## ', suffix: '', block: true },
  { icon: <Heading3 className="h-4 w-4" />, title: 'H3', prefix: '### ', suffix: '', block: true },
  { icon: <Link className="h-4 w-4" />, title: 'Link', prefix: '[', suffix: '](url)' },
  { icon: <Quote className="h-4 w-4" />, title: 'Quote', prefix: '> ', suffix: '', block: true },
  { icon: <List className="h-4 w-4" />, title: 'List', prefix: '- ', suffix: '', block: true },
  { icon: <ListOrdered className="h-4 w-4" />, title: 'Ordered', prefix: '1. ', suffix: '', block: true },
];

export default function MarkdownEditor({ value, onChange, label = 'Полный текст', required }: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyTool = useCallback(
    (tool: ToolAction) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end);

      let newText: string;
      let cursorPos: number;

      if (tool.block && start === end) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        newText =
          value.slice(0, lineStart) +
          tool.prefix +
          value.slice(lineStart);
        cursorPos = start + tool.prefix.length;
      } else {
        newText =
          value.slice(0, start) +
          tool.prefix +
          (selected || 'текст') +
          tool.suffix +
          value.slice(end);
        cursorPos = start + tool.prefix.length + (selected || 'текст').length;
      }

      onChange(newText);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [value, onChange],
  );

  // Simple markdown to HTML (memoized)
  const renderedHtml = useMemo(() => {
    if (!preview) return '';
    return value
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 pl-4 italic opacity-70">$1</blockquote>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="underline text-primary">$1</a>')
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br/>');
  }, [value, preview]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>
          {label}
          {required && <span className="text-primary"> *</span>}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPreview(!preview)}
          className="h-7 text-xs gap-1 text-muted-foreground"
        >
          {preview ? <Edit2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {preview ? 'Редактор' : 'Предпросмотр'}
        </Button>
      </div>

      {!preview && (
        <div className="flex gap-0.5 p-1 rounded-t-md bg-muted border-b border-border">
          {tools.map((tool) => (
            <Button
              key={tool.title}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyTool(tool)}
              className="h-7 w-7 p-0 text-muted-foreground"
              title={tool.title}
            >
              {tool.icon}
            </Button>
          ))}
        </div>
      )}

      {preview ? (
        <div
          className="prose prose-invert max-w-none p-4 rounded-md min-h-[300px] bg-secondary border border-border"
          dangerouslySetInnerHTML={{ __html: `<p class="mb-2">${renderedHtml}</p>` }}
        />
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[300px] resize-y font-mono text-sm bg-secondary border-border rounded-t-none"
          placeholder="Напишите текст статьи в формате Markdown..."
        />
      )}
    </div>
  );
}
