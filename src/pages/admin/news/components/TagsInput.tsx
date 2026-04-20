import { useState, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  label?: string;
}

export default function TagsInput({
  value,
  onChange,
  suggestions = [],
  label = 'Теги',
}: TagsInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim().toLowerCase();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      setInput('');
      setShowSuggestions(false);
    },
    [value, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => onChange(value.filter((t) => t !== tag)),
    [value, onChange],
  );

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      <div
        className="flex flex-wrap gap-1.5 p-2 rounded-md min-h-[36px] bg-secondary border border-border"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-primary/10 text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="hover:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (input.trim()) addTag(input);
            }
            if (e.key === 'Backspace' && !input && value.length > 0) {
              removeTag(value[value.length - 1]!);
            }
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={value.length === 0 ? 'Введите тег + Enter' : ''}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm"
        />
      </div>

      {showSuggestions && input && filtered.length > 0 && (
        <div className="rounded-md p-1 max-h-[120px] overflow-y-auto bg-muted border border-border">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => addTag(s)}
              className="w-full text-left px-2 py-1 text-sm rounded transition-colors hover:bg-foreground/5"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
