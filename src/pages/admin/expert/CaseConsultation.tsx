/**
 * M02 — Консультация (Case Detail for Expert)
 * Dok 6 Slice 6a: /admin/expert/case/:caseId
 * RPCs: rpc_get_vet_case_detail, rpc_add_vet_diagnosis (RPC-26),
 *       rpc_add_vet_recommendation (RPC-27), rpc_close_vet_case (RPC-28)
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useRpc, useRpcMutation } from '@/hooks/useRpc'

export function CaseConsultation() {
  const navigate = useNavigate()
  const { caseId } = useParams()
  const { organization, userContext } = useAuth()
  const [showDiagForm, setShowDiagForm] = useState(false)
  const [diagText, setDiagText] = useState('')
  const [diagConfidence, setDiagConfidence] = useState('70')

  const { data: caseDetail, isLoading, refetch } = useRpc<any>('rpc_get_vet_case_detail', {
    p_organization_id: organization?.id, p_vet_case_id: caseId,
  }, { enabled: !!organization?.id && !!caseId })

  const diagMutation = useRpcMutation('rpc_add_vet_diagnosis', {
    successMessage: 'Диагноз добавлен', invalidateKeys: [['rpc_get_vet_case_detail']],
    onSuccess: () => { setShowDiagForm(false); setDiagText(''); refetch() },
  })

  const closeMutation = useRpcMutation('rpc_close_vet_case', {
    successMessage: 'Кейс закрыт', invalidateKeys: [['rpc_get_vet_case_detail']],
    onSuccess: () => navigate('/admin/expert/queue'),
  })

  if (isLoading) return <div className="p-6"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-64 w-full" /></div>
  if (!caseDetail) return <div className="p-6 text-muted-foreground">Кейс не найден</div>

  const c = caseDetail

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/expert/queue')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-semibold">Кейс</h1>
        <Badge variant={c.status === 'resolved' ? 'outline' : 'default'}>{c.status}</Badge>
        {c.severity && <Badge className="text-xs">{c.severity}</Badge>}
      </div>

      {/* Symptoms */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Симптомы</CardTitle></CardHeader>
        <CardContent>
          <p>{c.symptoms_text || 'Не указаны'}</p>
          {c.affected_head_count && <p className="text-sm text-muted-foreground mt-2">{c.affected_head_count} голов</p>}
        </CardContent>
      </Card>

      {/* Diagnoses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Диагнозы</CardTitle>
          {c.status !== 'resolved' && <Button size="sm" variant="outline" onClick={() => setShowDiagForm(!showDiagForm)}>+ Диагноз</Button>}
        </CardHeader>
        <CardContent>
          {c.diagnoses?.length > 0 ? c.diagnoses.map((d: any, i: number) => (
            <div key={i} className="border-b py-2 last:border-0">
              <div className="font-medium">{d.diagnosis_text || d.disease_name || 'Диагноз'}</div>
              <div className="text-sm text-muted-foreground">Уверенность: {d.confidence_pct}%{d.is_final ? ' · Финальный' : ''}</div>
            </div>
          )) : <p className="text-muted-foreground text-sm">Диагноз не выставлен</p>}

          {showDiagForm && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <div><Label>Текст диагноза</Label><Input value={diagText} onChange={e => setDiagText(e.target.value)} placeholder="Предварительный диагноз..." /></div>
              <div><Label>Уверенность (%)</Label><Input type="number" min={0} max={100} value={diagConfidence} onChange={e => setDiagConfidence(e.target.value)} /></div>
              <Button size="sm" onClick={() => diagMutation.mutate({
                p_organization_id: organization!.id, p_vet_case_id: caseId,
                p_diagnosis_text: diagText, p_confidence_pct: parseInt(diagConfidence),
                p_source: 'expert_manual', p_is_final: false, p_diagnosed_by: userContext!.user_id,
              } as any)} disabled={!diagText}>Сохранить диагноз</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Рекомендации</CardTitle></CardHeader>
        <CardContent>
          {c.recommendations?.length > 0 ? c.recommendations.map((r: any, i: number) => (
            <div key={i} className="border-b py-2 last:border-0">
              <div className="font-medium">{r.recommendation_type}: {r.dosage_note || 'см. инструкцию'}</div>
              {r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}
            </div>
          )) : <p className="text-muted-foreground text-sm">Нет рекомендаций</p>}
        </CardContent>
      </Card>

      {/* Close case */}
      {c.status !== 'resolved' && (
        <Card>
          <CardContent className="p-4 flex gap-3">
            <Button onClick={() => closeMutation.mutate({
              p_organization_id: organization!.id, p_vet_case_id: caseId,
              p_outcome: 'recovered', p_actor_id: userContext!.user_id,
            } as any)} className="flex-1">Закрыть: Выздоровление</Button>
            <Button variant="destructive" onClick={() => closeMutation.mutate({
              p_organization_id: organization!.id, p_vet_case_id: caseId,
              p_outcome: 'died', p_actor_id: userContext!.user_id,
            } as any)}>Гибель</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
