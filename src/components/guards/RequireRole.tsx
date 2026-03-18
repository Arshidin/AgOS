import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/membership';
import { Loader2 } from 'lucide-react';

interface Props {
  role: UserRole;
}

export function RequireRole({ role: requiredRole }: Props) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== requiredRole) {
    return <Navigate to="/cabinet" replace />;
  }

  return <Outlet />;
}
