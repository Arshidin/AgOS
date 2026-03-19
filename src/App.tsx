import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { RequireAuth } from '@/components/guards/RequireAuth'
import { RequireAdmin } from '@/components/guards/RequireAdmin'
import { Login } from '@/pages/auth/Login'
import { Registration } from '@/pages/registration/Registration'
import { CabinetLayout } from '@/pages/cabinet/CabinetLayout'
import { FarmProfile } from '@/pages/cabinet/FarmProfile'
import { ReportSick } from '@/pages/cabinet/vet/ReportSick'
import { VetCaseDetail } from '@/pages/cabinet/vet/VetCaseDetail'
import { CabinetDashboard } from '@/pages/cabinet/CabinetDashboard'
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { MembershipQueue } from '@/pages/admin/MembershipQueue'
import { MembershipDecision } from '@/pages/admin/MembershipDecision'
import '@/i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Registration />} />

            <Route element={<RequireAuth />}>
              <Route path="/cabinet" element={<CabinetLayout />}>
                <Route index element={<CabinetDashboard />} />
                <Route path="farm" element={<FarmProfile />} />
                <Route path="vet/new" element={<ReportSick />} />
                <Route path="vet/:caseId" element={<VetCaseDetail />} />
              </Route>
            </Route>

            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="membership" element={<MembershipQueue />} />
                <Route path="membership/:applicationId" element={<MembershipDecision />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
