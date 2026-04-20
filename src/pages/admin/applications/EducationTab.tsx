import { GraduationCap } from 'lucide-react'

export function EducationTab() {
  return (
    <div className="page flex flex-col items-center justify-center py-20 text-center">
      <GraduationCap className="h-12 w-12 text-[var(--fg3)] mb-4" strokeWidth={1.5} />
      <p className="text-sm font-medium text-[var(--fg2)]">Заявки на обучение</p>
      <p className="text-xs text-[var(--fg3)] mt-1">Раздел в разработке</p>
    </div>
  )
}
