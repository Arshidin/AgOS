import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { RequireAuth } from '@/components/guards/RequireAuth'

import { RequireExpert } from '@/components/guards/RequireExpert'
import { PublicLanding } from '@/components/guards/PublicLanding'
import { Login } from '@/pages/auth/Login'
import { Registration } from '@/pages/registration/Registration'
import { AppLayout } from '@/components/layout/AppLayout'
import { FarmProfile } from '@/pages/cabinet/FarmProfile'
import { ReportSick } from '@/pages/cabinet/vet/ReportSick'
import { VetCaseList } from '@/pages/cabinet/vet/VetCaseList'
import { VetCaseDetail } from '@/pages/cabinet/vet/VetCaseDetail'
import { CabinetDashboard } from '@/pages/cabinet/CabinetDashboard'
import { HerdOverview } from '@/pages/cabinet/herd/HerdOverview'
import { HerdGroupForm } from '@/pages/cabinet/herd/HerdGroupForm'
import { FeedInventory } from '@/pages/cabinet/feed/FeedInventory'
import { FeedItemForm } from '@/pages/cabinet/feed/FeedItemForm'
import { RationPage } from '@/pages/cabinet/ration/RationPage'
import { Calculator as RationCalculator } from '@/pages/cabinet/ration/tabs/Calculator'
import { GroupRations } from '@/pages/cabinet/ration/tabs/GroupRations'
import { Summary as RationSummary } from '@/pages/cabinet/ration/tabs/Summary'
import { Budget as RationBudget } from '@/pages/cabinet/ration/tabs/Budget'
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
import { PoolQueue } from '@/pages/admin/pools/PoolQueue'
import { PoolDetail } from '@/pages/admin/pools/PoolDetail'
import { PriceGridManagement } from '@/pages/admin/pricing/PriceGridManagement'
import { UserManagement } from '@/pages/admin/users/UserManagement'
import { RoleAssignment } from '@/pages/admin/roles/RoleAssignment'
import { OrgManagement } from '@/pages/admin/orgs/OrgManagement'
import { RegionDirectory } from '@/pages/admin/regions/RegionDirectory'
import { SystemSettings } from '@/pages/admin/settings/SystemSettings'
import { FeedReferenceAdmin, CatalogTab as FeedCatalogTab, PricesTab as FeedPricesTab, NormsTab as FeedNormsTab } from '@/pages/admin/feeds/FeedReferenceAdmin'
import { CapexReferenceAdmin, CapexMaterialsTab, CapexNormsTab, CapexSurchargesTab } from '@/pages/admin/capex/CapexReferenceAdmin'
import { ConsultingDashboard } from '@/pages/admin/consulting/ConsultingDashboard'
import { ProjectPage } from '@/pages/admin/consulting/ProjectPage'
import { ProjectWizard } from '@/pages/admin/consulting/ProjectWizard'
import { SummaryTab } from '@/pages/admin/consulting/tabs/SummaryTab'
import { HerdTab } from '@/pages/admin/consulting/tabs/HerdTab'
import { PnlTab } from '@/pages/admin/consulting/tabs/PnlTab'
import { CashFlowTab } from '@/pages/admin/consulting/tabs/CashFlowTab'
import { CapexTab } from '@/pages/admin/consulting/tabs/CapexTab'
import { TechCardTab } from '@/pages/admin/consulting/tabs/TechCardTab'
import { RationTab } from '@/pages/admin/consulting/tabs/RationTab'
import { StaffTab } from '@/pages/admin/consulting/tabs/StaffTab'
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
              <Route element={<AppLayout />}>
                <Route path="/cabinet">
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
                  <Route path="ration" element={<RationPage />}>
                    <Route path="calculator" element={<RationCalculator />} />
                    <Route path="groups" element={<GroupRations />} />
                    <Route path="summary" element={<RationSummary />} />
                    <Route path="budget" element={<RationBudget />} />
                  </Route>
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

                {/* All admin/expert routes: fn_is_expert() OR fn_is_admin() */}
                <Route element={<RequireExpert />}>
                  <Route path="/admin">
                    <Route index element={<AdminDashboard />} />
                    <Route path="expert/queue" element={<VetCaseQueue />} />
                    <Route path="expert/case/:caseId" element={<CaseConsultation />} />
                    <Route path="expert/vaccination" element={<VaccinationPlans />} />
                    <Route path="expert/vaccination/:planId/record" element={<RecordVaccination />} />
                    <Route path="expert/epidemic" element={<EpidemicSignals />} />
                    <Route path="expert/kpi" element={<ExpertKpi />} />
                    <Route path="membership" element={<MembershipQueue />} />
                    <Route path="membership/:applicationId" element={<MembershipDecision />} />
                    <Route path="knowledge" element={<KnowledgeBase />} />
                    <Route path="restrictions" element={<Restrictions />} />
                    <Route path="audit" element={<AuditLog />} />
                    <Route path="pools" element={<PoolQueue />} />
                    <Route path="pools/:poolId" element={<PoolDetail />} />
                    <Route path="pricing" element={<PriceGridManagement />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="roles" element={<RoleAssignment />} />
                    <Route path="orgs" element={<OrgManagement />} />
                    <Route path="regions" element={<RegionDirectory />} />
                    <Route path="settings" element={<SystemSettings />} />
                    <Route path="feeds" element={<FeedReferenceAdmin />}>
                      <Route path="catalog" element={<FeedCatalogTab />} />
                      <Route path="prices" element={<FeedPricesTab />} />
                      <Route path="norms" element={<FeedNormsTab />} />
                    </Route>
                    {/* ADR-CAPEX-01 Phase 4: admin CAPEX reference (materials / norms / surcharges) */}
                    <Route path="capex" element={<CapexReferenceAdmin />}>
                      <Route path="materials" element={<CapexMaterialsTab />} />
                      <Route path="norms" element={<CapexNormsTab />} />
                      <Route path="surcharges" element={<CapexSurchargesTab />} />
                    </Route>
                    <Route path="consulting" element={<ConsultingDashboard />} />
                    <Route path="consulting/:projectId" element={<ProjectPage />}>
                      <Route path="edit" element={<ProjectWizard />} />
                      <Route path="summary" element={<SummaryTab />} />
                      <Route path="techcard" element={<TechCardTab />} />
                      <Route path="herd" element={<HerdTab />} />
                      <Route path="pnl" element={<PnlTab />} />
                      <Route path="cashflow" element={<CashFlowTab />} />
                      <Route path="capex" element={<CapexTab />} />
                      <Route path="staff" element={<StaffTab />} />
                      <Route path="ration" element={<RationTab />} />
                    </Route>
                  </Route>
                </Route>
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
