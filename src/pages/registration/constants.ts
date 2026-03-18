export const REGIONS = [
  { id: 'almaty_city', name: 'Алматы' },
  { id: 'astana_city', name: 'Астана' },
  { id: 'shymkent_city', name: 'Шымкент' },
  { id: 'akmola', name: 'Акмолинская область' },
  { id: 'aktobe', name: 'Актюбинская область' },
  { id: 'almaty_obl', name: 'Алматинская область' },
  { id: 'atyrau', name: 'Атырауская область' },
  { id: 'east_kaz', name: 'Восточно-Казахстанская область' },
  { id: 'zhambyl', name: 'Жамбылская область' },
  { id: 'west_kaz', name: 'Западно-Казахстанская область' },
  { id: 'karagandy', name: 'Карагандинская область' },
  { id: 'kostanay', name: 'Костанайская область' },
  { id: 'kyzylorda', name: 'Кызылординская область' },
  { id: 'mangystau', name: 'Мангистауская область' },
  { id: 'pavlodar', name: 'Павлодарская область' },
  { id: 'north_kaz', name: 'Северо-Казахстанская область' },
  { id: 'turkestan', name: 'Туркестанская область' },
  { id: 'ulytau', name: 'Улытауская область' },
  { id: 'abai', name: 'Область Абай' },
  { id: 'zhetysu', name: 'Область Жетісу' },
]

export const BREEDS = [
  { id: 'kazakh_whiteheaded', name: 'Казахская белоголовая' },
  { id: 'angus', name: 'Ангус' },
  { id: 'hereford', name: 'Герефорд' },
  { id: 'simmental', name: 'Симментальская' },
  { id: 'auliekol', name: 'Аулиекольская' },
  { id: 'kalmyk', name: 'Калмыцкая' },
  { id: 'mixed', name: 'Смешанная' },
]

export const HERD_SIZES = [
  { value: 'under_50', label: 'до 50' },
  { value: '51_100', label: '51-100' },
  { value: '100_300', label: '100-300' },
  { value: '300_500', label: '300-500' },
  { value: '500_1000', label: '500-1000' },
  { value: 'over_1000', label: '1000+' },
]

export const LEGAL_FORMS = [
  { value: 'kh', label: 'КХ' },
  { value: 'ip', label: 'ИП' },
  { value: 'too', label: 'ТОО' },
  { value: 'individual', label: 'Физлицо' },
]

export const COMPANY_TYPES = [
  { value: 'feedlot', label: 'Откормочная площадка' },
  { value: 'meatpacking', label: 'Мясокомбинат' },
  { value: 'feedlot_processing', label: 'Откорм+переработка' },
  { value: 'trader', label: 'Трейдер' },
]

export const MONTHLY_VOLUMES = [
  { value: 'under_100', label: 'до 100 голов' },
  { value: '100_500', label: '100-500' },
  { value: '500_1000', label: '500-1000' },
  { value: 'over_1000', label: '1000+' },
]

export const TARGET_WEIGHTS = [
  { value: '350_400', label: '350-400 кг' },
  { value: '400_450', label: '400-450 кг' },
  { value: '450_500', label: '450-500 кг' },
  { value: 'over_500', label: '500+ кг' },
  { value: 'various', label: 'Разный' },
]

export const PROCUREMENT_FREQUENCIES = [
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'biweekly', label: 'Раз в 2 недели' },
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'seasonal', label: 'Сезонно' },
]

export const SERVICE_TYPES = [
  { value: 'veterinary', label: 'Ветеринария' },
  { value: 'zootechnics', label: 'Зоотехния' },
  { value: 'logistics', label: 'Логистика' },
  { value: 'insurance', label: 'Страхование' },
  { value: 'legal', label: 'Юридические услуги' },
  { value: 'certification', label: 'Сертификация' },
  { value: 'other', label: 'Другое' },
]

export const FEED_TYPES = [
  { value: 'hay', label: 'Сено' },
  { value: 'haylage', label: 'Сенаж' },
  { value: 'silage', label: 'Силос' },
  { value: 'compound_feed', label: 'Комбикорм' },
  { value: 'grain', label: 'Зерновые' },
  { value: 'oilcake', label: 'Жмых/шрот' },
  { value: 'minerals', label: 'Минеральные добавки' },
  { value: 'other', label: 'Другое' },
]

export const PRODUCTION_VOLUMES = [
  { value: 'small', label: 'Малый (до 100 т/мес)' },
  { value: 'medium', label: 'Средний (100-500)' },
  { value: 'large', label: 'Крупный (500-1000)' },
  { value: 'industrial', label: 'Промышленный (1000+)' },
]

export const READY_TO_SELL = [
  { value: 'now', label: 'Готов сейчас' },
  { value: '1_3_months', label: '1-3 мес' },
  { value: '3_6_months', label: '3-6 мес' },
  { value: 'exploring', label: 'Пока изучаю' },
]

export const HOW_HEARD = [
  { value: 'recommendation', label: 'Рекомендация' },
  { value: 'messenger', label: 'WhatsApp/Telegram' },
  { value: 'social', label: 'Соцсети' },
  { value: 'event', label: 'Мероприятие' },
  { value: 'feed_supplier', label: 'Поставщик кормов' },
  { value: 'other', label: 'Другое' },
]

export type RoleType = 'farmer' | 'mpk' | 'services' | 'feed_producer'

export interface RegistrationFormData {
  role: RoleType | null
  full_name: string
  phone: string
  region_id: string
  // Auth
  otp_sent: boolean
  otp_verified: boolean
  password: string
  // Farmer
  farm_name: string
  bin_iin: string
  legal_form: string
  herd_size: string
  primary_breed: string
  ready_to_sell: string
  // MPK
  company_name: string
  bin: string
  company_type: string
  monthly_volume: string
  target_breeds: string[]
  target_weight: string
  procurement_frequency: string
  // Services
  service_types: string[]
  service_regions: string[]
  // Feed producer
  feed_types: string[]
  production_volume: string
  delivery_regions: string[]
  // Agreement
  consent_terms: boolean
  consent_data: boolean
  how_heard: string
  // Membership
  membership_notes: string
}

export const INITIAL_FORM_DATA: RegistrationFormData = {
  role: null,
  full_name: '',
  phone: '',
  region_id: '',
  otp_sent: false,
  otp_verified: false,
  password: '',
  farm_name: '',
  bin_iin: '',
  legal_form: '',
  herd_size: '',
  primary_breed: '',
  ready_to_sell: '',
  company_name: '',
  bin: '',
  company_type: '',
  monthly_volume: '',
  target_breeds: [],
  target_weight: '',
  procurement_frequency: '',
  service_types: [],
  service_regions: [],
  feed_types: [],
  production_volume: '',
  delivery_regions: [],
  consent_terms: false,
  consent_data: false,
  how_heard: '',
  membership_notes: '',
}
