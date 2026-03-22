import { useState } from 'react'
import { FloatingInput } from '../components/FloatingInput'
import { BottomSheet } from '../components/BottomSheet'
import { ChipSelect } from '../components/ChipSelect'
import { FEED_TYPES, PRODUCTION_VOLUMES, REGIONS } from '../constants'
import type { RegistrationFormData } from '../constants'

interface FeedProducerDetailsProps {
  formData: RegistrationFormData
  onChange: (updates: Partial<RegistrationFormData>) => void
  onNext: () => void
}

export function FeedProducerDetails({ formData, onChange, onNext }: FeedProducerDetailsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [volumeSheetOpen, setVolumeSheetOpen] = useState(false)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.company_name.trim() || formData.company_name.trim().length < 2) {
      errs.company_name = 'Введите название компании'
    }
    if (!formData.bin || formData.bin.length !== 12) {
      errs.bin = 'БИН должен содержать 12 цифр'
    }
    if (formData.feed_types.length === 0) {
      errs.feed_types = 'Выберите хотя бы один вид кормов'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (validate()) onNext()
  }

  const selectedVolume = PRODUCTION_VOLUMES.find((v) => v.value === formData.production_volume)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-turan-fg font-serif">
          О вашем производстве
        </h2>
      </div>

      <div className="space-y-4">
        <FloatingInput
          label="Название компании"
          value={formData.company_name}
          onChange={(v) => {
            onChange({ company_name: v })
            if (errors.company_name) setErrors((e) => ({ ...e, company_name: '' }))
          }}
          error={errors.company_name}
        />

        <FloatingInput
          label="БИН"
          value={formData.bin}
          onChange={(v) => {
            const digits = v.replace(/\D/g, '').slice(0, 12)
            onChange({ bin: digits })
            if (errors.bin) setErrors((e) => ({ ...e, bin: '' }))
          }}
          error={errors.bin}
          maxLength={12}
          autoAdvanceAt={12}
        />

        <ChipSelect
          label="Виды кормов *"
          options={FEED_TYPES}
          value={formData.feed_types}
          onChange={(v) => {
            onChange({ feed_types: v })
            if (errors.feed_types) setErrors((e) => ({ ...e, feed_types: '' }))
          }}
          error={errors.feed_types}
        />

        <button
          type="button"
          onClick={() => setVolumeSheetOpen(true)}
          className="w-full h-14 px-4 bg-turan-bg-c border border-turan-bd rounded-xl text-left flex items-center justify-between hover:border-turan-bd-h transition-colors"
        >
          <span className={selectedVolume ? 'text-turan-fg' : 'text-turan-fg3'}>
            {selectedVolume?.label || 'Объём производства (необязательно)'}
          </span>
          <svg className="h-4 w-4 text-turan-fg3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <ChipSelect
          label="Регионы доставки (необязательно)"
          options={REGIONS.map((r) => ({ value: r.id, label: r.name }))}
          value={formData.delivery_regions}
          onChange={(v) => onChange({ delivery_regions: v })}
        />
      </div>

      <button onClick={handleSubmit} className="reg-btn-primary w-full">
        Далее
      </button>

      <BottomSheet
        open={volumeSheetOpen}
        onClose={() => setVolumeSheetOpen(false)}
        title="Объём производства"
        options={PRODUCTION_VOLUMES}
        value={formData.production_volume}
        onChange={(v) => onChange({ production_volume: v })}
      />
    </div>
  )
}
