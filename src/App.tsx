import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { RequireAuth } from '@/components/guards/RequireAuth'
import { RequireAdmin } from '@/components/guards/RequireAdmin'
import { PublicLanding } from '@/components/guards/PublicLanding'
import { Login } from '@/pages/auth/Login'
import { Registration } from '@/pages/registration/Registration'
import { AppShell } from '@/components/layout/AppShell'
import { FarmProfile } from '@/pages/cabinet/FarmProfile'
import { ReportSick } from '@/pages/cabinet/vet/ReportSick'
import { VetCaseDetail } from '@/pages/cabinet/vet/VetCaseDetail'
import { CabinetDashboard } from '@/pages/cabinet/CabinetDashboard'
import { HerdOverview } from '@/pages/cabinet/herd/HerdOverview'
import { HerdGroupForm } from '@/pages/cabinet/herd/HerdGroupForm'
import { FeedInventory } from '@/pages/cabinet/feed/FeedInventory'
import { FeedItemForm } from '@/pages/cabinet/feed/FeedItemForm'
import { RationViewer } from '@/pages/cabinet/ration/RationViewer'
import { FeedBudget } from '@/pages/cabinet/ration/FeedBudget'
import { ProductionPlan } from '@/pages/cabinet/plan/ProductionPlan'
import { TaskList } from '@/pages/cabinet/plan/TaskList'
import { Timeline } from '@/pages/cabinet/plan/Timeline'
import { CascadePreview } from '@/pages/cabinet/plan/CascadePreview'
import { KpiDashboard } from '@/pages/cabinet/plan/KpiDashboard'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { MembershipQueue } from '@/pages/admin/MembershipQueue'
import { MembershipDecision } from '@/pages/admin/MembershipDecision'
import NotFound from '@/pages/public/NotFound'
import '@/i18n'

const MembershipPolicy = lazy(() => import('@/pages/public/MembershipPolicy'))

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
            <Route path="/" element={<PublicLanding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Registration />} />
            <Route path="/membership-policy" element={<Suspense fallback={null}><MembershipPolicy /></Suspense>} />

            <Route element={<RequireAuth />}>
              <Route path="/cabinet" element={<AppShell />}>
                <Route index element={<CabinetDashboard />} />
                <Route path="farm" element={<FarmProfile />} />
                <Route path="vet/new" element={<ReportSick />} />
                <Route path="vet/:caseId" element={<VetCaseDetail />} />
                <Route path="herd" element={<HerdOverview />} />
                <Route path="herd/add" element={<HerdGroupForm />} />
                <Route path="herd/:groupId" element={<HerdGroupForm />} />
                <Route path="feed" element={<FeedInventory />} />
                <Route path="feed/add" element={<FeedItemForm />} />
                <Route path="feed/:inventoryId" element={<FeedItemForm />} />
                <Route path="ration" element={<RationViewer />} />
                <Route path="ration/budget" element={<FeedBudget />} />
                <Route path="plan" element={<ProductionPlan />} />
                <Route path="plan/tasks" element={<TaskList />} />
                <Route path="plan/timeline" element={<Timeline />} />
                <Route path="plan/cascade/:phaseId" element={<CascadePreview />} />
                <Route path="plan/kpi" element={<KpiDashboard />} />
              </Route>
            </Route>

            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AppShell />}>
                <Route index element={<AdminDashboard />} />
                <Route path="membership" element={<MembershipQueue />} />
                <Route path="membership/:applicationId" element={<MembershipDecision />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
