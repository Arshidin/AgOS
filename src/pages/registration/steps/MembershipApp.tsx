import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface MembershipAppProps {
  orgId: string
  onComplete: () => void
  onSkip: () => void
}

export function MembershipApp({ orgId, onComplete, onSkip }: MembershipAppProps) {
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase.rpc('rpc_submit_membership_application', {
        p_organization_id: orgId,
        p_membership_type: 'associate',
        p_notes: notes || null,
      })
      if (error) {
        if (error.message?.includes('PENDING_EXISTS')) {
          toast.info('Заявка уже подана')
        } else {
          toast.error(error.message || 'Ошибка подачи заявки')
          return
        }
      } else {
        toast.success('Заявка на членство подана')
      }
      onComplete()
    } catch (err) {
      toast.error('Ошибка подачи заявки')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-turan-fg font-serif">
          Членство в ТУРАН
        </h2>
        <p className="text-sm text-turan-fg2">
          Подайте заявку на вступление в ассоциацию
        </p>
      </div>

      <div className="p-4 bg-turan-bg-c rounded-xl border border-turan-bd space-y-3">
        <p className="text-sm text-turan-fg/80 leading-relaxed">
          Членство в ассоциации ТУРАН открывает доступ к координации рынка,
          экспертным консультациям и общей аналитике отрасли. Вступление добровольное.
        </p>
        <div className="text-xs text-turan-fg2 space-y-1">
          <p>- Доступ к пулам и координации продаж</p>
          <p>- Консультации зоотехников и ветеринаров</p>
          <p>- Аналитика и рыночные данные</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-turan-fg2 font-medium">
          Комментарий к заявке (необязательно)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Расскажите о себе или задайте вопрос..."
          className="reg-input w-full h-24 px-4 py-3 bg-turan-bg-c border border-turan-bd rounded-xl text-turan-fg outline-none focus:border-turan-fg resize-none"
        />
      </div>

      <div className="space-y-3">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="reg-btn-primary w-full flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Отправка...' : 'Подать заявку'}
        </button>

        <button
          onClick={onSkip}
          disabled={isSubmitting}
          className="reg-btn-secondary w-full"
        >
          Пропустить
        </button>
      </div>
    </div>
  )
}
