import { useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGlossaryMap } from '@/hooks/subsidies/useGlossary';

interface Props {
  text: string;
}

export default function GlossaryTooltip({ text }: Props) {
  const glossaryMap = useGlossaryMap();

  const parts = useMemo(() => {
    if (!glossaryMap.size || !text) return [{ text, term: null }];

    const abbrs = (Array.from(glossaryMap.keys()) as string[])
      .sort((a, b) => b.length - a.length);

    const pattern = new RegExp(`(${abbrs.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

    const result: Array<{ text: string; term: ReturnType<typeof glossaryMap.get> | null }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ text: text.slice(lastIndex, match.index), term: null });
      }
      result.push({ text: match[0], term: glossaryMap.get(match[0]) ?? null });
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < text.length) {
      result.push({ text: text.slice(lastIndex), term: null });
    }

    return result;
  }, [text, glossaryMap]);

  if (!glossaryMap.size) return <>{text}</>;

  return (
    <TooltipProvider delayDuration={200}>
      {parts.map((part, i) =>
        part.term ? (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <abbr
                className="underline decoration-dotted decoration-[#E8730C]/40 cursor-help no-underline"
                title=""
              >
                {part.text}
              </abbr>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold text-sm">{part.term.full_name_ru}</p>
              {part.term.description_ru && (
                <p className="text-xs text-muted-foreground mt-1">{part.term.description_ru}</p>
              )}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </TooltipProvider>
  );
}
