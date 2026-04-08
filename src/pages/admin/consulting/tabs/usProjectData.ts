/**
 * Shared hook to load project + latest version data.
 * Used by all result tab pages.
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export function useProjectData() {
  const { projectId } = useParams()
  const { organization } = useAuth()
  const [project, setProject] = useState<any>(null)
  const [version, setVersion] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const orgId = organization?.id

  useEffect(() => {
    if (!orgId || !projectId) return
    const load = async () => {
      setLoading(true)
      const { data: proj } = await supabase.rpc('rpc_get_consulting_project', {
        p_organization_id: orgId,
        p_project_id: projectId,
      })
      setProject(proj)

      if (proj?.versions?.length > 0) {
        const { data: ver } = await supabase.rpc('rpc_get_consulting_version', {
          p_organization_id: orgId,
          p_version_id: proj.versions[0].id,
        })
        setVersion(ver)
      }
      setLoading(false)
    }
    load()
  }, [orgId, projectId])

  return { project, version, results: version?.results || {}, loading }
}

export function fmt(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: decimals }).format(n)
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return `${(n * 100).toFixed(1)}%`
}
