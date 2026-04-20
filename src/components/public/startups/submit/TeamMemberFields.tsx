import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { SubmitTeamMember } from '@/types/startup';
import AiBadge from './AiBadge';

interface Props {
  members: SubmitTeamMember[];
  onChange: (members: SubmitTeamMember[]) => void;
  aiFilledCount: number;
}

export default function TeamMemberFields({ members, onChange, aiFilledCount }: Props) {
  const { t } = useTranslation();

  const addMember = () => {
    onChange([...members, { name: '', role: '' }]);
  };

  const removeMember = (idx: number) => {
    onChange(members.filter((_, i) => i !== idx));
  };

  const updateMember = (idx: number, field: keyof SubmitTeamMember, value: string) => {
    const updated = [...members];
    updated[idx] = { ...updated[idx]!, [field]: value } as SubmitTeamMember;
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium" style={{ color: '#2B180A' }}>
          {t('startups.submit.teamMembers')}
        </label>
        <button
          type="button"
          onClick={addMember}
          className="flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded-lg hover:bg-black/5 transition-colors"
          style={{ color: '#E8730C' }}
        >
          <Plus size={14} />
          {t('startups.submit.addMember')}
        </button>
      </div>

      {members.map((member, idx) => (
        <div
          key={idx}
          className="flex items-start gap-2 rounded-xl p-3"
          style={{ background: 'rgba(43,24,10,0.02)', border: '1px solid rgba(43,24,10,0.06)' }}
        >
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <Input
                value={member.name}
                onChange={(e) => updateMember(idx, 'name', e.target.value)}
                placeholder={t('startups.submit.memberName')}
                className="h-9 rounded-lg border-none text-[13px]"
                style={{ background: 'rgba(43,24,10,0.04)' }}
              />
              {idx < aiFilledCount && <AiBadge />}
            </div>
            <Input
              value={member.role}
              onChange={(e) => updateMember(idx, 'role', e.target.value)}
              placeholder={t('startups.submit.memberRole')}
              className="h-9 rounded-lg border-none text-[13px]"
              style={{ background: 'rgba(43,24,10,0.04)' }}
            />
          </div>
          <button
            type="button"
            onClick={() => removeMember(idx)}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors mt-1"
          >
            <Trash2 size={14} style={{ color: 'rgba(43,24,10,0.3)' }} />
          </button>
        </div>
      ))}

      {members.length === 0 && (
        <p className="text-[12px] py-3 text-center" style={{ color: 'rgba(43,24,10,0.3)' }}>
          {t('startups.submit.noMembers')}
        </p>
      )}
    </div>
  );
}
