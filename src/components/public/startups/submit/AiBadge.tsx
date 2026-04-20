import { Sparkles } from 'lucide-react';

export default function AiBadge() {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ml-1.5"
      style={{ background: 'rgba(130,100,180,0.08)', color: '#6B4E9B' }}
      title="AI-generated"
    >
      <Sparkles size={10} />
      AI
    </span>
  );
}
