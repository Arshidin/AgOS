import { Outlet } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useSetTopbar } from '@/components/layout/TopbarContext'

const TABS = [
  { label: 'Членство',      path: '/admin/applications/membership' },
  { label: 'Смена уровня',  path: '/admin/applications/level' },
  { label: 'Финансирование', path: '/admin/applications/finance' },
  { label: 'Обучение',      path: '/admin/applications/education' },
]

export function ApplicationsHub() {
  useSetTopbar({
    title: 'Заявки',
    titleIcon: <FileText size={15} />,
    tabs: TABS,
  })

  return <Outlet />
}
