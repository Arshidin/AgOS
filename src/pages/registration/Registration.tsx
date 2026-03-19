import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { phoneToFakeEmail } from '@/lib/auth-utils'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { ProgressBar } from './components/ProgressBar'
import { RoleSelect } from './steps/RoleSelect'
import { Contact } from './steps/Contact'
import { BenefitScreen } from './steps/BenefitScreen'
import { FarmerDetails } from './steps/FarmerDetails'
import { MpkDetails } from './steps/MpkDetails'
import { ServicesDetails } from './steps/ServicesDetails'
import { FeedProducerDetails } from './steps/FeedProducerDetails'
import { Agreement } from './steps/Agreement'
import { MembershipApp } from './steps/MembershipApp'
import { Success } from './steps/Success'
import { INITIAL_FORM_DATA } from './constants'
import type { RegistrationFormData, RoleType } from './constants'

const STORAGE_KEY = 'agos_reg_form'

type Step =
  | 'role_select'
  | 'contact'
  | 'benefit_1'
  | 'role_details'
  | 'benefit_2'
  | 'agreement'
  | 'membership'
  | 'success'

const STEP_ORDER: Step[] = [
  'role_select',
  'contact',
  'benefit_1',
  'role_details',
  'benefit_2',
  'agreement',
  'membership',
  'success',
]

function getProgress(step: Step): number {
  const idx = STEP_ORDER.indexOf(step)
  return Math.round(((idx + 1) / STEP_ORDER.length) * 100)
}

export function Registration() {
  const { session } = useAuth()
  // useNavigate available for future redirect logic
  useNavigate()
  const [step, setStep] = useState<Step>('role_select')
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [formData, setFormData] = useState<RegistrationFormData>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with defaults to handle new fields added after save
        return { ...INITIAL_FORM_DATA, ...parsed, otp_sent: false, otp_verified: false, password: '' }
      }
    } catch { /* ignore */ }
    return INITIAL_FORM_DATA
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const stepRef = useRef<HTMLDivElement>(null)

  // If already authenticated with context, redirect to cabinet
  useEffect(() => {
    if (session && step === 'role_select') {
      // User already logged in — they may be coming back.
      // Don't redirect automatically — they might want to re-register.
    }
  }, [session, step])

  // Persist form to sessionStorage
  useEffect(() => {
    try {
      // Never persist password to storage (security)
      const { password: _, ...safeData } = formData
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeData))
    } catch { /* ignore */ }
  }, [formData])

  // Warn on leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (step !== 'role_select' && step !== 'success') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [step])

  const updateForm = useCallback((updates: Partial<RegistrationFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }, [])

  const goTo = useCallback((nextStep: Step) => {
    const curIdx = STEP_ORDER.indexOf(step)
    const nextIdx = STEP_ORDER.indexOf(nextStep)
    setDirection(nextIdx > curIdx ? 'forward' : 'backward')
    setStep(nextStep)
    // Scroll to top on step change
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const goBack = useCallback(() => {
    const curIdx = STEP_ORDER.indexOf(step)
    if (curIdx > 0) {
      const prev = STEP_ORDER[curIdx - 1]
      if (prev) goTo(prev)
    }
  }, [step, goTo])

  const handleRegister = async () => {
    setIsSubmitting(true)
    try {
      const role = formData.role!
      let name = ''
      let bin = ''
      let roleData: Record<string, unknown> = {}

      if (role === 'farmer') {
        name = formData.farm_name
        bin = formData.bin_iin
        roleData = {
          farm_name: formData.farm_name,
          herd_size: formData.herd_size,
          primary_breed: formData.primary_breed || null,
          ready_to_sell: formData.ready_to_sell || null,
          legal_form: formData.legal_form || null,
        }
      } else if (role === 'mpk') {
        name = formData.company_name
        bin = formData.bin
        roleData = {
          company_type: formData.company_type,
          monthly_volume: formData.monthly_volume,
          target_breeds: formData.target_breeds.length > 0 ? formData.target_breeds : null,
          target_weight: formData.target_weight || null,
          procurement_frequency: formData.procurement_frequency || null,
        }
      } else if (role === 'services') {
        name = formData.company_name
        bin = formData.bin
        roleData = {
          service_types: formData.service_types,
          service_regions: formData.service_regions.length > 0 ? formData.service_regions : null,
        }
      } else if (role === 'feed_producer') {
        name = formData.company_name
        bin = formData.bin
        roleData = {
          feed_types: formData.feed_types,
          production_volume: formData.production_volume || null,
          delivery_regions: formData.delivery_regions.length > 0 ? formData.delivery_regions : null,
        }
      }

      // 1. Create auth account (phone+password → fake email pattern)
      const fakeEmail = phoneToFakeEmail(formData.phone)

      const { error: authError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: formData.password,
      })

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          toast.error('Этот номер уже зарегистрирован. Войдите в кабинет.')
        } else {
          toast.error('Ошибка создания аккаунта')
          console.error('Auth error:', authError)
        }
        return
      }

      // Small delay for auth trigger to create public.users record
      await new Promise((r) => setTimeout(r, 500))

      // 2. Create organization via RPC
      const enrichedRoleData = {
        ...roleData,
        full_name: formData.full_name,
        how_heard: formData.how_heard || null,
      }

      const { data, error } = await supabase.rpc('rpc_register_organization', {
        p_organization_id: '00000000-0000-0000-0000-000000000000', // ignored, P-AI-2 signature consistency
        p_org_type: role,
        p_name: name,
        p_bin: bin || null,
        p_region_id: formData.region_id || null,
        p_phone: `+7${formData.phone}`,
        p_role_data: enrichedRoleData,
      })

      if (error) {
        if (error.message?.includes('BIN_DUPLICATE')) {
          toast.error('Организация с таким БИН уже зарегистрирована')
        } else {
          toast.error(error.message || 'Ошибка регистрации')
        }
        return
      }

      const result = data as { org_id: string; farm_id?: string } | null
      if (result?.org_id) {
        setOrgId(result.org_id)
      }

      // Clear saved form data
      sessionStorage.removeItem(STORAGE_KEY)

      goTo('membership')
    } catch (err) {
      toast.error('Ошибка регистрации')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 'role_select':
        return (
          <RoleSelect
            onSelect={(role: RoleType) => {
              updateForm({ role })
              goTo('contact')
            }}
          />
        )
      case 'contact':
        return (
          <Contact
            formData={formData}
            onChange={updateForm}
            onNext={() => goTo('benefit_1')}
          />
        )
      case 'benefit_1':
        return (
          <BenefitScreen
            role={formData.role!}
            step={1}
            onNext={() => goTo('role_details')}
          />
        )
      case 'role_details':
        switch (formData.role) {
          case 'farmer':
            return (
              <FarmerDetails
                formData={formData}
                onChange={updateForm}
                onNext={() => goTo('benefit_2')}
              />
            )
          case 'mpk':
            return (
              <MpkDetails
                formData={formData}
                onChange={updateForm}
                onNext={() => goTo('benefit_2')}
              />
            )
          case 'services':
            return (
              <ServicesDetails
                formData={formData}
                onChange={updateForm}
                onNext={() => goTo('benefit_2')}
              />
            )
          case 'feed_producer':
            return (
              <FeedProducerDetails
                formData={formData}
                onChange={updateForm}
                onNext={() => goTo('benefit_2')}
              />
            )
          default:
            return null
        }
      case 'benefit_2':
        return (
          <BenefitScreen
            role={formData.role!}
            step={2}
            onNext={() => goTo('agreement')}
          />
        )
      case 'agreement':
        return (
          <Agreement
            formData={formData}
            onChange={updateForm}
            onSubmit={handleRegister}
            isSubmitting={isSubmitting}
          />
        )
      case 'membership':
        return (
          <MembershipApp
            orgId={orgId || ''}
            onComplete={() => goTo('success')}
            onSkip={() => goTo('success')}
          />
        )
      case 'success':
        return (
          <Success
            role={formData.role!}
            phone={formData.phone}
            companyName={formData.role === 'farmer' ? formData.farm_name : formData.company_name}
          />
        )
      default:
        return null
    }
  }

  const showBackButton = step !== 'role_select' && step !== 'success' && step !== 'membership'

  return (
    <div className="min-h-screen bg-[#fdf6ee] flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2 max-w-[480px] mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          {showBackButton && (
            <button
              onClick={goBack}
              className="p-1.5 -ml-1.5 text-[#6b5744] hover:text-[#2B180A] transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1">
            <ProgressBar progress={getProgress(step)} />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 pb-8 max-w-[480px] mx-auto w-full">
        <div
          ref={stepRef}
          key={step}
          className={direction === 'forward' ? 'reg-slide-forward' : 'reg-slide-backward'}
        >
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
