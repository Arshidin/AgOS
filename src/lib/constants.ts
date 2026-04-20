export interface SelectOption {
  value: string;
  label: string;
}

export const REGIONS: SelectOption[] = [
  { value: 'akmola', label: 'Акмолинская область' },
  { value: 'aktobe', label: 'Актюбинская область' },
  { value: 'almaty_obl', label: 'Алматинская область' },
  { value: 'almaty_city', label: 'г. Алматы' },
  { value: 'astana', label: 'г. Астана' },
  { value: 'atyrau', label: 'Атырауская область' },
  { value: 'east_kz', label: 'Восточно-Казахстанская область' },
  { value: 'zhambyl', label: 'Жамбылская область' },
  { value: 'west_kz', label: 'Западно-Казахстанская область' },
  { value: 'karaganda', label: 'Карагандинская область' },
  { value: 'kostanay', label: 'Костанайская область' },
  { value: 'kyzylorda', label: 'Кызылординская область' },
  { value: 'mangystau', label: 'Мангистауская область' },
  { value: 'pavlodar', label: 'Павлодарская область' },
  { value: 'north_kz', label: 'Северо-Казахстанская область' },
  { value: 'shymkent', label: 'г. Шымкент' },
  { value: 'turkestan', label: 'Туркестанская область' },
  { value: 'ulytau', label: 'Улытауская область' },
  { value: 'zhetysu', label: 'Жетісу область' },
  { value: 'abai', label: 'Абай область' },
];

export const HERD_SIZES: SelectOption[] = [
  { value: 'small', label: 'до 50 голов' },
  { value: 'medium', label: '51–100 голов' },
  { value: 'large', label: '100–300 голов' },
  { value: 'xlarge', label: '300–500 голов' },
  { value: 'xxlarge', label: '500–1 000 голов' },
  { value: 'xxxlarge', label: 'более 1 000 голов' },
];

export const BREEDS: SelectOption[] = [
  { value: 'Казахская белоголовая', label: 'Казахская белоголовая' },
  { value: 'Ангус', label: 'Ангус' },
  { value: 'Герефорд', label: 'Герефорд' },
  { value: 'Симментальская', label: 'Симментальская' },
  { value: 'Аулиекольская', label: 'Аулиекольская' },
  { value: 'Калмыцкая', label: 'Калмыцкая' },
  { value: 'Смешанная / другая', label: 'Смешанная / другая' },
];

export const COMPANY_TYPES: SelectOption[] = [
  { value: 'feedlot', label: 'Откормочная площадка' },
  { value: 'processor', label: 'Мясокомбинат' },
  { value: 'both', label: 'Откорм + переработка' },
  { value: 'trader', label: 'Трейдер' },
];

export const MONTHLY_VOLUMES: SelectOption[] = [
  { value: 'small', label: 'до 100 голов' },
  { value: 'medium', label: '100–500 голов' },
  { value: 'large', label: '500–1 000 голов' },
  { value: 'xlarge', label: 'более 1 000 голов' },
];

export const MPK_BREEDS_CHIPS = [
  'Казахская белоголовая',
  'Ангус',
  'Герефорд',
  'Симментальская',
  'Любые мясные',
];

export const TARGET_WEIGHTS: SelectOption[] = [
  { value: '350–400 кг', label: '350–400 кг' },
  { value: '400–450 кг', label: '400–450 кг' },
  { value: '450–500 кг', label: '450–500 кг' },
  { value: '500+ кг', label: '500+ кг' },
  { value: 'Разный', label: 'Разный' },
];

export const PROCUREMENT_FREQ: SelectOption[] = [
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'biweekly', label: 'Раз в 2 недели' },
  { value: 'monthly', label: 'Раз в месяц' },
  { value: 'seasonal', label: 'Сезонно' },
];

export const READY_TO_SELL: SelectOption[] = [
  { value: 'now', label: 'Готов к продаже' },
  { value: '1_3_months', label: '1–3 мес.' },
  { value: '3_6_months', label: '3–6 мес.' },
  { value: 'exploring', label: 'Изучает систему' },
];

export const HOW_HEARD: SelectOption[] = [
  { value: 'recommendation', label: 'Рекомендация знакомого' },
  { value: 'whatsapp', label: 'WhatsApp / Telegram' },
  { value: 'social', label: 'Социальные сети' },
  { value: 'event', label: 'Мероприятие / форум' },
  { value: 'supplier', label: 'Поставщик кормов' },
  { value: 'other', label: 'Другое' },
];

// Утилита для маппинга value → label
export function getLabel(options: SelectOption[], value: string | null | undefined): string {
  if (!value) return '—';
  return options.find(o => o.value === value)?.label ?? value;
}

// Утилита для локализации опций через i18next t()
export function localizeOptions(t: (key: string) => string, options: SelectOption[], category: string): SelectOption[] {
  return options.map(o => ({ ...o, label: t(`constants.${category}.${o.value}`) }));
}

export function localizeChips(t: (key: string) => string, chips: string[], category: string): SelectOption[] {
  return chips.map(c => ({ value: c, label: t(`constants.${category}.${c}`) }));
}

export function getLocalizedLabel(t: (key: string, options?: Record<string, unknown>) => string, category: string, value: string | null | undefined): string {
  if (!value) return '—';
  return t(`constants.${category}.${value}`, { defaultValue: value });
}

// ─── Startup constants ───────────────────────────────────────

export const STARTUP_CATEGORIES: SelectOption[] = [
  { value: 'agritech', label: 'AgriTech' },
  { value: 'livestock', label: 'Livestock Production' },
  { value: 'feed_nutrition', label: 'Feed & Nutrition' },
  { value: 'genetics', label: 'Genetics & Breeding' },
  { value: 'cold_chain', label: 'Cold Chain & Logistics' },
  { value: 'processing', label: 'Processing & Manufacturing' },
  { value: 'digital_platform', label: 'Digital Platform' },
  { value: 'sustainability', label: 'Sustainability & Climate' },
];

export const STARTUP_STAGES: SelectOption[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'pre_seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'growth', label: 'Growth' },
];

export const FUNDING_STATUSES: SelectOption[] = [
  { value: 'open', label: 'Open' },
  { value: 'closing_soon', label: 'Closing Soon' },
  { value: 'closed', label: 'Closed' },
];

export const STARTUP_SORT_OPTIONS: SelectOption[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'funding_ask_desc', label: 'Funding: High to Low' },
  { value: 'funding_ask_asc', label: 'Funding: Low to High' },
];
