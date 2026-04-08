/**
 * API client for Consulting Engine (Railway).
 * Handles JWT injection and request/response types.
 */

import { supabase } from '@/lib/supabase'

const CONSULTING_ENGINE_URL = import.meta.env.VITE_CONSULTING_ENGINE_URL
  || 'http://localhost:8001'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  }
}

/** Запуск расчёта финансовой модели */
export async function calculateProject(params: {
  project_id: string
  organization_id: string
  input_params: Record<string, unknown>
}) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${CONSULTING_ENGINE_URL}/api/v1/calculate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Calculation failed')
  }
  return res.json()
}

/** Получить справочник по категории */
export async function getReferences(category: string) {
  const headers = await getAuthHeaders()
  const res = await fetch(
    `${CONSULTING_ENGINE_URL}/api/v1/references/${category}`,
    { headers },
  )
  if (!res.ok) throw new Error('Failed to fetch references')
  return res.json()
}
