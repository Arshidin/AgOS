import { useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  const organization = ctx.userContext?.organizations?.[0] ?? null
  const farm = ctx.userContext?.farms?.[0] ?? null
  const membership = ctx.userContext?.memberships?.[0] ?? null

  return {
    session: ctx.session,
    user: ctx.user,
    userContext: ctx.userContext,
    organization,
    farm,
    membership,
    membershipStatus: membership?.status as import('@/types/membership').MembershipStatus | undefined,
    role: organization?.org_type as import('@/types/membership').UserRole | undefined,
    loading: ctx.isLoading,
    isContextLoading: ctx.isContextLoading,
    signOut: ctx.signOut,
    refreshContext: ctx.refreshContext,
  }
}
