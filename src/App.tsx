import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { RequireAuth } from '@/components/guards/RequireAuth'

import { RequireAdmin } from '@/components/guards/RequireAdmin'
import { RequireExpert } from '@/components/guards/RequireExpert'
import { PublicLanding } from '@/components/guards/PublicLanding'
import { Login } from '@/pages/auth/Login'
import { Registration } from '@/pages/registration/Registration'
import { AppShell } from '@/components/layout/AppShell'
import { FarmProfile } from '@/pages/cabinet/FarmProfile'
import { ReportSick } from '@/pages/cabinet/vet/ReportSick'
import { VetCaseList } from '@/pages/cabinet/vet/VetCaseList'
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
import { MarketDashboard } from '@/pages/cabinet/market/MarketDashboard'
import { CreateBatch } from '@/pages/cabinet/market/CreateBatch'
import { BatchDetail } from '@/pages/cabinet/market/BatchDetail'
import { PriceInfo } from '@/pages/cabinet/market/PriceInfo'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { MembershipQueue } from '@/pages/admin/MembershipQueue'
import { MembershipDecision } from '@/pages/admin/MembershipDecision'
import { VetCaseQueue } from '@/pages/admin/expert/VetCaseQueue'
import { CaseConsultation } from '@/pages/admin/expert/CaseConsultation'
import { VaccinationPlans } from '@/pages/admin/expert/VaccinationPlans'
import { RecordVaccination } from '@/pages/admin/expert/RecordVaccination'
import { EpidemicSignals } from '@/pages/admin/expert/EpidemicSignals'
import { ExpertKpi } from '@/pages/admin/expert/ExpertKpi'
import { KnowledgeBase } from '@/pages/admin/knowledge/KnowledgeBase'
import { Restrictions } from '@/pages/admin/restrictions/Restrictions'
import { AuditLog } from '@/pages/admin/audit/AuditLog'
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
                <Route path="vet" element={<VetCaseList />} />
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
                <Route path="market" element={<MarketDashboard />} />
                <Route path="market/new" element={<CreateBatch />} />
                <Route path="market/batch/:batchId" element={<BatchDetail />} />
                <Route path="market/prices" element={<PriceInfo />} />
              </Route>
            </Route>

            {/* Expert routes: fn_is_expert() OR fn_is_admin() */}
            <Route element={<RequireExpert />}>
              <Route path="/admin" element={<AppShell />}>
                <Route index element={<AdminDashboard />} />
                <Route path="expert/queue" element={<VetCaseQueue />} />
                <Route path="expert/case/:caseId" element={<CaseConsultation />} />
                <Route path="expert/vaccination" element={<VaccinationPlans />} />
                <Route path="expert/vaccination/:planId/record" element={<RecordVaccination />} />
                <Route path="expert/epidemic" element={<EpidemicSignals />} />
                <Route path="expert/kpi" element={<ExpertKpi />} />
              </Route>
            </Route>

            {/* Admin-only routes: fn_is_admin() only */}
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AppShell />}>
                <Route path="membership" element={<MembershipQueue />} />
                <Route path="membership/:applicationId" element={<MembershipDecision />} />
                <Route path="knowledge" element={<KnowledgeBase />} />
                <Route path="restrictions" element={<Restrictions />} />
                <Route path="audit" element={<AuditLog />} />
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
