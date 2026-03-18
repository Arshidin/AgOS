import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

/**
 * Generic hook for read-only Supabase RPC calls via TanStack Query.
 * ALL data fetching MUST use supabase.rpc() — NEVER .from('table').select().
 */
export function useRpc<T = unknown>(
  fnName: string,
  params?: Record<string, unknown>,
  options?: {
    enabled?: boolean
    staleTime?: number
    refetchOnWindowFocus?: boolean
  }
) {
  return useQuery<T>({
    queryKey: [fnName, params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(fnName, params ?? {})
      if (error) {
        throw error
      }
      return data as T
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 30_000,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
  })
}

/**
 * Generic hook for mutating Supabase RPC calls.
 * Shows error toasts automatically.
 */
export function useRpcMutation<TInput = Record<string, unknown>, TOutput = unknown>(
  fnName: string,
  options?: {
    onSuccess?: (data: TOutput) => void
    onError?: (error: Error) => void
    invalidateKeys?: string[][]
    successMessage?: string
  }
) {
  const queryClient = useQueryClient()

  return useMutation<TOutput, Error, TInput>({
    mutationFn: async (params: TInput) => {
      const { data, error } = await supabase.rpc(
        fnName,
        params as Record<string, unknown>
      )
      if (error) {
        throw error
      }
      return data as TOutput
    },
    onSuccess: (data) => {
      if (options?.successMessage) {
        toast.success(options.successMessage)
      }
      if (options?.invalidateKeys) {
        for (const key of options.invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key })
        }
      }
      options?.onSuccess?.(data)
    },
    onError: (error) => {
      const msg = error.message || 'Произошла ошибка'
      toast.error(msg)
      options?.onError?.(error)
    },
  })
}
