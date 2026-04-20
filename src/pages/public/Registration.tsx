// ═══════════════════════════════════════════════════════════════
// TURAN Association — Membership Application Form
// ═══════════════════════════════════════════════════════════════
// Multi-step registration with role-based branching (Farmer / MPK)
// Mobile-first, 480px centered, conversational UX
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  Check, ChevronLeft, Search, X, ArrowRight,
  BarChart3, MapPin, Award, Target, ShieldCheck, TrendingUp,
  MessageCircle, ClipboardList, Phone, Factory, Lock, Loader2,
} from 'lucide-react';
import turanIcon from '@/assets/turan-icon.svg';

// ═══════════════════════════════════════════════════════════════
// CUSTOM ICON — Cattle head, matches lucide stroke style
// ═══════════════════════════════════════════════════════════════

const CattleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    className={className}
  >
    {/* Horns */}
    <path d="M3 5c1 2 3 3.5 5 4" />
    <path d="M21 5c-1 2-3 3.5-5 4" />
    {/* Head */}
    <path d="M8 9c-1.5 1.5-2 3.5-2 5.5C6 18 8.7 20 12 20s6-2 6-5.5c0-2-0.5-4-2-5.5" />
    {/* Ears */}
    <path d="M7.5 9.5c-.8-.3-1.5-.2-2 .3" />
    <path d="M16.5 9.5c.8-.3 1.5-.2 2 .3" />
    {/* Nose ring / muzzle */}
    <path d="M10 16.5c.5.8 1.2 1 2 1s1.5-.2 2-1" />
    <circle cx="10.5" cy="15" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="13.5" cy="15" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type Role = 'farmer' | 'mpk';

type View =
  | 'role_select'
  | 'contact'
  | 'benefit_1'
  | 'step_2'
  | 'benefit_2'
  | 'step_3'
  | 'benefit_3'
  | 'agreement'
  | 'create_password'
  | 'success';

interface FormData {
  role: Role | null;
  full_name: string;
  phone: string;
  region: string;
  farm_name: string;
  bin_iin: string;
  herd_size: string;
  primary_breed: string;
  company_name: string;
  bin: string;
  company_type: string;
  monthly_volume: string;
  ready_to_sell: string;
  sell_count: string;
  target_breeds: string[];
  target_weight: string;
  procurement_frequency: string;
  consent: boolean;
  how_heard: string;
}

import type { SelectOption } from '@/lib/constants';
import {
  REGIONS, HERD_SIZES, BREEDS, COMPANY_TYPES, MONTHLY_VOLUMES,
  MPK_BREEDS_CHIPS, TARGET_WEIGHTS, PROCUREMENT_FREQ, HOW_HEARD,
  localizeOptions, localizeChips,
} from '@/lib/constants';

type Direction = 'forward' | 'backward';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'turan_registration';

const INITIAL_FORM_DATA: FormData = {
  role: null,
  full_name: '',
  phone: '',
  region: '',
  farm_name: '',
  bin_iin: '',
  herd_size: '',
  primary_breed: '',
  company_name: '',
  bin: '',
  company_type: '',
  monthly_volume: '',
  ready_to_sell: '',
  sell_count: '',
  target_breeds: [],
  target_weight: '',
  procurement_frequency: '',
  consent: false,
  how_heard: '',
};

const VIEW_PROGRESS: Record<View, number> = {
  role_select: 0,
  contact: 20,
  benefit_1: 30,
  step_2: 40,
  benefit_2: 50,
  step_3: 60,
  benefit_3: 72,
  agreement: 85,
  create_password: 95,
  success: 100,
};

const getForwardOrder = (role: Role | null): View[] => {
  if (role === 'farmer') {
    // Farmer: no step_3 / benefit_3 — go straight from benefit_2 to agreement
    return ['role_select', 'contact', 'benefit_1', 'step_2', 'benefit_2', 'agreement', 'success'];
  }
  return ['role_select', 'contact', 'benefit_1', 'step_2', 'benefit_2', 'step_3', 'benefit_3', 'agreement', 'success'];
};

const getBackMap = (role: Role | null): Partial<Record<View, View>> => {
  if (role === 'farmer') {
    return { contact: 'role_select', step_2: 'contact', agreement: 'step_2' };
  }
  return { contact: 'role_select', step_2: 'contact', step_3: 'step_2', agreement: 'step_3' };
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const formatPhone = (digits: string): string => {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length <= 8) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`;
};

const formatPhoneFull = (digits: string): string => {
  if (!digits) return '';
  return `+7 ${formatPhone(digits)}`;
};

const formatBin = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 12);
};

const vibrate = () => {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(50); } catch (_) { /* noop */ }
  }
};

// ═══════════════════════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════════════════════

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="fixed top-0 left-0 right-0 z-50 h-[3px]" style={{ background: 'rgba(43,24,10,0.06)' }}>
    <div
      className="h-full rounded-r-sm"
      style={{
        width: `${progress}%`,
        background: '#C4883A',
        borderRadius: '2px',
        transition: 'width 400ms ease',
      }}
    />
  </div>
);

// ═══════════════════════════════════════════════════════════════
// FLOATING INPUT
// ═══════════════════════════════════════════════════════════════

interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  error?: string;
  helper?: string;
  type?: 'text' | 'tel' | 'password';
  inputMode?: 'text' | 'numeric' | 'tel';
  autoComplete?: string;
  maxLength?: number;
  formatter?: (val: string) => string;
  optional?: boolean;
  optionalLabel?: string;
  valid?: boolean;
  autoAdvanceAt?: number; // blur input when value reaches this length
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  label, value, onChange, onBlur, error, helper, type = 'text',
  inputMode = 'text', autoComplete, maxLength, formatter, optional, optionalLabel = '',
  valid, autoAdvanceAt,
}) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFloating = focused || !!value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const val = formatter ? formatter(raw) : raw;
    onChange(val);
    if (autoAdvanceAt && val.length >= autoAdvanceAt) {
      setTimeout(() => inputRef.current?.blur(), 80);
    }
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'relative w-full h-14 rounded-xl border bg-white transition-all duration-200',
          error
            ? 'border-[#E53935]'
            : focused
              ? 'border-[#C4883A]'
              : 'border-[rgba(43,24,10,0.1)]',
        )}
      >
        <input
          ref={inputRef}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          className={cn(
            'w-full h-full bg-transparent rounded-xl px-4 text-base outline-none transition-all duration-200',
            isFloating ? 'pt-5 pb-2' : 'py-4',
          )}
          style={{ fontSize: '16px' }}
          placeholder=""
        />
        <label
          className={cn(
            'absolute left-4 pointer-events-none transition-all duration-200',
            isFloating
              ? 'top-2 text-xs'
              : 'top-1/2 -translate-y-1/2 text-base',
            error
              ? 'text-[#E53935]'
              : focused
                ? 'text-[#C4883A]'
                : 'text-muted-foreground/70',
          )}
        >
          {label}{optional ? ` (${optionalLabel})` : ''}
        </label>
        {valid && !error && value && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Check size={18} className="text-[#4CAF50]" />
          </div>
        )}
      </div>
      {error && <p className="text-[#E53935] text-xs mt-1.5 ml-1">{error}</p>}
      {helper && !error && <p className="text-[rgba(43,24,10,0.35)] text-xs mt-1.5 ml-1">{helper}</p>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PHONE INPUT
// ═══════════════════════════════════════════════════════════════

interface PhoneInputProps {
  value: string; // raw digits (up to 10)
  onChange: (digits: string) => void;
  onBlur?: () => void;
  error?: string;
  valid?: boolean;
  label?: string;
  helper?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, onBlur, error, valid, label, helper }) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFloating = focused || !!value;
  const display = formatPhone(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const digits = raw.slice(0, 10);
    onChange(digits);
    // Auto-advance: blur when 10 digits filled
    if (digits.length === 10) {
      setTimeout(() => inputRef.current?.blur(), 80);
    }
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'relative flex w-full h-14 rounded-xl border bg-white transition-all duration-200',
          error
            ? 'border-[#E53935]'
            : focused
              ? 'border-[#C4883A]'
              : 'border-[rgba(43,24,10,0.1)]',
        )}
      >
        <span
          className="pl-4 text-base font-medium select-none shrink-0 text-foreground flex items-center"
          style={{ paddingTop: isFloating ? 8 : 0, transition: 'padding-top 0.2s' }}
        >
          +7
        </span>
        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          value={display}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          className="flex-1 h-full bg-transparent outline-none text-base text-foreground pl-2 pr-4"
          style={{ fontSize: '16px', paddingTop: isFloating ? 8 : 0, transition: 'padding-top 0.2s' }}
          placeholder=""
        />
        <label
          className={cn(
            'absolute pointer-events-none transition-all duration-200',
            isFloating
              ? 'left-4 top-2 text-xs'
              : 'left-[3.5rem] top-1/2 -translate-y-1/2 text-base',
            error
              ? 'text-[#E53935]'
              : focused
                ? 'text-[#C4883A]'
                : 'text-muted-foreground/70',
          )}
        >
          {label}
        </label>
        {valid && !error && value.length === 10 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Check size={18} className="text-[#4CAF50]" />
          </div>
        )}
      </div>
      {error && <p className="text-[#E53935] text-xs mt-1.5 ml-1">{error}</p>}
      {!error && helper && <p className="text-muted-foreground/60 text-xs mt-1.5 ml-1">{helper}</p>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  options: SelectOption[];
  onSelect: (value: string) => void;
  title?: string;
  searchable?: boolean;
  selected?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen, onClose, options, onSelect, title, searchable, selected,
  searchPlaceholder, noResultsText,
}) => {
  const [search, setSearch] = useState('');
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = searchable
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[1000] bg-black/30 reg-backdrop-enter"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[1001] bg-white rounded-t-2xl reg-sheet-enter"
        style={{ maxHeight: '70vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(43,24,10,0.15)' }} />
        </div>

        {/* Title */}
        {title && (
          <div className="px-5 pb-2 pt-1 text-sm font-medium text-muted-foreground">
            {title}
          </div>
        )}

        {/* Search */}
        {searchable && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(43,24,10,0.3)]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-[rgba(43,24,10,0.08)] bg-[rgba(43,24,10,0.02)] text-sm outline-none focus:border-[#C4883A]"
                style={{ fontSize: '16px' }}
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X size={14} className="text-[rgba(43,24,10,0.3)]" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Options */}
        <div className="overflow-y-auto px-2 pb-8" style={{ maxHeight: searchable ? '48vh' : '56vh' }}>
          {filtered.map(option => (
            <button
              key={option.value}
              onClick={() => { onSelect(option.value); onClose(); }}
              className={cn(
                'w-full px-4 py-3.5 text-left text-base rounded-xl transition-colors flex items-center justify-between',
                selected === option.value
                  ? 'bg-[rgba(196,136,58,0.06)]'
                  : 'hover:bg-[rgba(43,24,10,0.03)]',
              )}
              style={{ minHeight: '48px' }}
            >
              <span>{option.label}</span>
              {selected === option.value && <Check size={18} className="text-[#C4883A] shrink-0" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-6 text-sm text-muted-foreground/60">{noResultsText}</p>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
};

// ═══════════════════════════════════════════════════════════════
// SELECT FIELD
// ═══════════════════════════════════════════════════════════════

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  error?: string;
  searchable?: boolean;
  optional?: boolean;
  optionalLabel?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label, value, options, onSelect, error, searchable, optional, optionalLabel = '',
  searchPlaceholder, noResultsText,
}) => {
  const [open, setOpen] = useState(false);
  const displayLabel = options.find(o => o.value === value)?.label;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'w-full h-14 rounded-xl border bg-white text-left transition-all duration-200 relative',
            error ? 'border-[#E53935]' : 'border-[rgba(43,24,10,0.1)]',
          )}
        >
          {displayLabel ? (
            <>
              <span
                className="absolute left-4 top-2 text-xs text-muted-foreground/70"
              >
                {label}{optional ? ` (${optionalLabel})` : ''}
              </span>
              <span className="block px-4 pt-5 pb-2 text-base text-foreground">
                {displayLabel}
              </span>
            </>
          ) : (
            <span className="block px-4 py-4 text-base text-muted-foreground/70">
              {label}{optional ? ` (${optionalLabel})` : ''}
            </span>
          )}
          <svg
            className="absolute right-4 top-1/2 -translate-y-1/2"
            width="16" height="16" viewBox="0 0 16 16" fill="none"
          >
            <path d="M4 6L8 10L12 6" stroke="rgba(43,24,10,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {error && <p className="text-[#E53935] text-xs mt-1.5 ml-1">{error}</p>}
      </div>
      <BottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        options={options}
        onSelect={onSelect}
        title={label}
        searchable={searchable}
        selected={value}
        searchPlaceholder={searchPlaceholder}
        noResultsText={noResultsText}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// CHIP SELECT (multi-select)
// ═══════════════════════════════════════════════════════════════

interface ChipSelectProps {
  label: string;
  options: SelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  optional?: boolean;
  optionalLabel?: string;
}

const ChipSelect: React.FC<ChipSelectProps> = ({ label, options, selected, onChange, optional, optionalLabel = '' }) => {
  const toggle = (val: string) => {
    onChange(
      selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val],
    );
  };

  return (
    <div>
      <p className="text-sm mb-3 text-muted-foreground">
        {label}{optional ? ` (${optionalLabel})` : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                'px-4 py-2 rounded-full text-sm border transition-all duration-200',
                isSelected
                  ? 'bg-[rgba(196,136,58,0.1)] border-[#C4883A] text-[#2B180A]'
                  : 'bg-[rgba(43,24,10,0.04)] border-[rgba(43,24,10,0.08)] text-[#2B180A]',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP HEADER
// ═══════════════════════════════════════════════════════════════

const StepHeader: React.FC<{ title: string; subtitle: string; eyebrow?: string }> = ({
  title, subtitle, eyebrow,
}) => (
  <div className="mb-8">
    {eyebrow && (
      <p
        className="text-xs font-medium uppercase mb-2 text-muted-foreground/70"
        style={{ letterSpacing: '0.06em' }}
      >
        {eyebrow}
      </p>
    )}
    <h2
      className="font-serif text-[28px] font-semibold leading-tight text-foreground"
    >
      {title}
    </h2>
    <p className="text-[15px] mt-2 text-muted-foreground">
      {subtitle}
    </p>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// BENEFIT INTERLUDE
// ═══════════════════════════════════════════════════════════════

interface BenefitData {
  icon: React.ReactNode;
  headline: string;
  body: string;
}

const getBenefitData = (step: 1 | 2 | 3, role: Role, region: string, t: (key: string, opts?: any) => string): BenefitData => {
  const regionName = region || t('registration.benefits.defaultRegion');
  const icons = {
    farmer1: <BarChart3 />, mpk1: <MapPin />,
    farmer2: <Award />, mpk2: <Target />,
    farmer3: <ShieldCheck />, mpk3: <TrendingUp />,
  };
  const key = `${role}${step}` as keyof typeof icons;
  return {
    icon: icons[key],
    headline: t(`registration.benefits.${key}headline`, { region: regionName }),
    body: t(`registration.benefits.${key}body`),
  };
};

const BenefitInterlude: React.FC<{ data: BenefitData; onContinue: () => void; nextLabel: string }> = ({ data, onContinue, nextLabel }) => (
  <div className="flex flex-col items-center text-center py-8">
    <div className="icon-box--lg icon-box mb-6 reg-benefit-enter">
      {data.icon}
    </div>
    <h3
      className="font-serif text-[22px] font-semibold mb-4 text-foreground reg-benefit-enter"
      style={{ animationDelay: '100ms' }}
    >
      {data.headline}
    </h3>
    <p
      className="text-[15px] leading-relaxed max-w-[360px] mb-10 text-muted-foreground reg-benefit-enter"
      style={{ animationDelay: '200ms' }}
    >
      {data.body}
    </p>
    <button
      onClick={onContinue}
      className="reg-btn-primary w-full flex items-center justify-center gap-2 reg-benefit-enter"
      style={{ animationDelay: '300ms' }}
    >
      {nextLabel}
      <ArrowRight size={18} />
    </button>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// CONFETTI PARTICLES (delicate)
// ═══════════════════════════════════════════════════════════════

const Confetti: React.FC = () => {
  const particles = [
    { left: '12%', delay: '0s', color: '#C4883A', size: 8 },
    { left: '28%', delay: '0.3s', color: '#E8C87A', size: 6 },
    { left: '42%', delay: '0.1s', color: '#D4A44C', size: 10 },
    { left: '58%', delay: '0.4s', color: '#C4883A', size: 7 },
    { left: '72%', delay: '0.15s', color: '#8B6914', size: 9 },
    { left: '85%', delay: '0.25s', color: '#E8C87A', size: 6 },
    { left: '50%', delay: '0.2s', color: '#C4883A', size: 8 },
  ];

  return (
    <div className="absolute inset-x-0 top-0 h-40 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full reg-confetti-particle"
          style={{
            left: p.left,
            top: '-12px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP 0: ROLE SELECT
// ═══════════════════════════════════════════════════════════════

const StepRoleSelect: React.FC<{
  onSelect: (role: Role) => void;
}> = ({ onSelect }) => {
  const [hovered, setHovered] = useState<Role | null>(null);
  const { t } = useTranslation();

  const cards: { id: Role; icon: React.ReactNode; title: string; description: string }[] = [
    { id: 'farmer', icon: <CattleIcon />, title: t('registration.roleSelect.farmer'), description: t('registration.roleSelect.farmerDesc') },
    { id: 'mpk', icon: <Factory />, title: t('registration.roleSelect.mpk'), description: t('registration.roleSelect.mpkDesc') },
  ];

  const navigate = useNavigate();

  return (
    <div>
      <StepHeader
        eyebrow={t('registration.roleSelect.eyebrow')}
        title={t('registration.roleSelect.title')}
        subtitle={t('registration.roleSelect.subtitle')}
      />
      <div className="flex flex-col gap-3 mt-8">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => onSelect(card.id)}
            onMouseEnter={() => setHovered(card.id)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              'w-full flex items-center gap-4 p-5 rounded-2xl border text-left transition-all duration-200',
              hovered === card.id
                ? 'border-[#C4883A] bg-[rgba(196,136,58,0.03)]'
                : 'border-[rgba(43,24,10,0.08)] bg-white',
            )}
          >
            <div className="icon-box">
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-semibold text-foreground">{card.title}</p>
              <p className="text-sm mt-0.5 text-muted-foreground">{card.description}</p>
            </div>
            <ArrowRight size={18} className="text-[rgba(43,24,10,0.2)] shrink-0" />
          </button>
        ))}
      </div>
      <p className="text-center text-[13px] mt-6 text-muted-foreground/60">
        {t('registration.roleSelect.notSure')}{' '}
        <a
          href="https://wa.me/77001234567"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground/70 transition-colors"
        >
          {t('registration.roleSelect.writeUs')}
        </a>
        {' '}{t('registration.roleSelect.helpDecide')}
      </p>
      <p className="text-center text-sm text-muted-foreground mt-8">
        {t('registration.roleSelect.hasAccount')}{' '}
        <button
          onClick={() => navigate('/login')}
          className="text-primary font-medium hover:underline"
        >
          {t('registration.roleSelect.login')}
        </button>
      </p>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-4 mx-auto"
      >
        <ChevronLeft size={16} />
        {t('registration.roleSelect.toHome')}
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP 1: CONTACT INFO
// ═══════════════════════════════════════════════════════════════

const StepContact: React.FC<{
  data: FormData;
  errors: Record<string, string>;
  onChange: (field: keyof FormData, val: any) => void;
  onValidateField: (field: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}> = ({ data, errors, onChange, onValidateField, onSubmit, onBack }) => {
  const { t } = useTranslation();
  return (
    <div>
      <StepHeader title={t('registration.contact.title')} subtitle={t('registration.contact.subtitle')} />
      <div className="flex flex-col gap-5">
        <FloatingInput
          label={t('registration.contact.name')}
          value={data.full_name}
          onChange={v => onChange('full_name', v)}
          onBlur={() => onValidateField('full_name')}
          error={errors.full_name}
          autoComplete="name"
          valid={!errors.full_name && data.full_name.length >= 2}
        />
        <PhoneInput
          value={data.phone}
          onChange={v => onChange('phone', v)}
          onBlur={() => onValidateField('phone')}
          error={errors.phone}
          valid={!errors.phone && data.phone.length === 10}
          label={t('registration.phoneLabel')}
          helper={t('registration.phoneHelper')}
        />
        <SelectField
          label={t('registration.contact.region')}
          value={data.region}
          options={localizeOptions(t, REGIONS, 'regions')}
          onSelect={v => { onChange('region', v); }}
          error={errors.region}
          searchable
          searchPlaceholder={t('registration.search')}
          noResultsText={t('registration.noResults')}
        />
      </div>
      <div className="mt-8">
        <button onClick={onSubmit} className="reg-btn-primary w-full">{t('registration.continue')}</button>
        <button onClick={onBack} className="reg-btn-secondary w-full mt-3">{t('registration.back')}</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP 2 (FARMER): FARM INFO
// ═══════════════════════════════════════════════════════════════

const StepFarmInfo: React.FC<{
  data: FormData;
  errors: Record<string, string>;
  onChange: (field: keyof FormData, val: any) => void;
  onValidateField: (field: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}> = ({ data, errors, onChange, onValidateField, onSubmit, onBack }) => {
  const { t } = useTranslation();
  const opt = t('registration.optional');
  return (
    <div>
      <StepHeader title={t('registration.farmInfo.title')} subtitle={t('registration.farmInfo.subtitle')} />
      <div className="flex flex-col gap-5">
        <FloatingInput
          label={t('registration.farmInfo.farmName')}
          value={data.farm_name}
          onChange={v => onChange('farm_name', v)}
          onBlur={() => onValidateField('farm_name')}
          error={errors.farm_name}
          autoComplete="organization"
          valid={!errors.farm_name && data.farm_name.length >= 2}
        />
        <FloatingInput
          label={t('registration.farmInfo.binIin')}
          value={data.bin_iin}
          onChange={v => onChange('bin_iin', formatBin(v))}
          onBlur={() => onValidateField('bin_iin')}
          error={errors.bin_iin}
          inputMode="numeric"
          maxLength={12}
          helper={t('registration.farmInfo.binHelper')}
          valid={!errors.bin_iin && data.bin_iin.length === 12}
          autoAdvanceAt={12}
        />
        <SelectField
          label={t('registration.farmInfo.herdSize')}
          value={data.herd_size}
          options={localizeOptions(t, HERD_SIZES, 'herdSizes')}
          onSelect={v => onChange('herd_size', v)}
          error={errors.herd_size}
        />
        <SelectField
          label={t('registration.farmInfo.primaryBreed')}
          value={data.primary_breed}
          options={localizeOptions(t, BREEDS, 'breeds')}
          onSelect={v => onChange('primary_breed', v)}
          optional
          optionalLabel={opt}
        />
      </div>
      <div className="mt-8">
        <button onClick={onSubmit} className="reg-btn-primary w-full">{t('registration.continue')}</button>
        <button onClick={onBack} className="reg-btn-secondary w-full mt-3">{t('registration.back')}</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP 2 (MPK): COMPANY INFO
// ═══════════════════════════════════════════════════════════════

const StepCompanyInfo: React.FC<{
  data: FormData;
  errors: Record<string, string>;
  onChange: (field: keyof FormData, val: any) => void;
  onValidateField: (field: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}> = ({ data, errors, onChange, onValidateField, onSubmit, onBack }) => {
  const { t } = useTranslation();
  return (
    <div>
      <StepHeader title={t('registration.companyInfo.title')} subtitle={t('registration.companyInfo.subtitle')} />
      <div className="flex flex-col gap-5">
        <FloatingInput
          label={t('registration.companyInfo.companyName')}
          value={data.company_name}
          onChange={v => onChange('company_name', v)}
          onBlur={() => onValidateField('company_name')}
          error={errors.company_name}
          valid={!errors.company_name && data.company_name.length >= 2}
        />
        <FloatingInput
          label={t('registration.companyInfo.bin')}
          value={data.bin}
          onChange={v => onChange('bin', formatBin(v))}
          onBlur={() => onValidateField('bin')}
          error={errors.bin}
          inputMode="numeric"
          maxLength={12}
          valid={!errors.bin && data.bin.length === 12}
          autoAdvanceAt={12}
        />
        <SelectField
          label={t('registration.companyInfo.companyType')}
          value={data.company_type}
          options={localizeOptions(t, COMPANY_TYPES, 'companyTypes')}
          onSelect={v => onChange('company_type', v)}
          error={errors.company_type}
        />
        <SelectField
          label={t('registration.companyInfo.monthlyVolume')}
          value={data.monthly_volume}
          options={localizeOptions(t, MONTHLY_VOLUMES, 'monthlyVolumes')}
          onSelect={v => onChange('monthly_volume', v)}
          error={errors.monthly_volume}
        />
      </div>
      <div className="mt-8">
        <button onClick={onSubmit} className="reg-btn-primary w-full">{t('registration.continue')}</button>
        <button onClick={onBack} className="reg-btn-secondary w-full mt-3">{t('registration.back')}</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP 3 (MPK): PROCUREMENT NEEDS
// ═══════════════════════════════════════════════════════════════

const StepMpkNeeds: React.FC<{
  data: FormData;
  errors: Record<string, string>;
  onChange: (field: keyof FormData, val: any) => void;
  onSubmit: () => void;
  onBack: () => void;
}> = ({ data, errors, onChange, onSubmit, onBack }) => {
  const { t } = useTranslation();
  const opt = t('registration.optional');
  return (
    <div>
      <StepHeader title={t('registration.mpkNeeds.title')} subtitle={t('registration.mpkNeeds.subtitle')} />
      <div className="flex flex-col gap-5">
        <ChipSelect
          label={t('registration.mpkNeeds.breedsLabel')}
          options={localizeChips(t, MPK_BREEDS_CHIPS, 'breeds')}
          selected={data.target_breeds}
          onChange={v => onChange('target_breeds', v)}
          optional
          optionalLabel={opt}
        />
        <SelectField
          label={t('registration.mpkNeeds.targetWeight')}
          value={data.target_weight}
          options={localizeOptions(t, TARGET_WEIGHTS, 'targetWeights')}
          onSelect={v => onChange('target_weight', v)}
          optional
          optionalLabel={opt}
        />
        <SelectField
          label={t('registration.mpkNeeds.procurementFreq')}
          value={data.procurement_frequency}
          options={localizeOptions(t, PROCUREMENT_FREQ, 'procurementFreq')}
          onSelect={v => onChange('procurement_frequency', v)}
          error={errors.procurement_frequency}
        />
      </div>
      <div className="mt-8">
        <button onClick={onSubmit} className="reg-btn-primary w-full">{t('registration.almostDone')}</button>
        <button onClick={onBack} className="reg-btn-secondary w-full mt-3">{t('registration.back')}</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP 4: AGREEMENT
// ═══════════════════════════════════════════════════════════════

const StepAgreement: React.FC<{
  data: FormData;
  errors: Record<string, string>;
  onChange: (field: keyof FormData, val: any) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}> = ({ data, errors, onChange, onSubmit, onBack, isSubmitting }) => {
  const { t } = useTranslation();
  const items = t('registration.agreement.items', { returnObjects: true }) as string[];

  return (
    <div>
      <StepHeader title={t('registration.agreement.title')} subtitle={t('registration.agreement.subtitle')} />

      {/* Agreement summary */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(43,24,10,0.02)' }}>
        <div className="flex flex-col gap-3.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="icon-box--sm icon-box mt-0.5">
                <Check />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Consent checkbox with link */}
      <label className="flex items-start gap-3 cursor-pointer mb-5">
        <div className="relative shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={data.consent}
            onChange={e => onChange('consent', e.target.checked)}
            className="sr-only"
          />
          <div
            className={cn(
              'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200',
              data.consent
                ? 'bg-[#2B180A] border-[#2B180A]'
                : errors.consent
                  ? 'border-[#E53935] bg-white'
                  : 'border-[rgba(43,24,10,0.2)] bg-white',
            )}
          >
            {data.consent && <Check size={14} className="text-white" strokeWidth={3} />}
          </div>
        </div>
        <span className="text-sm leading-relaxed text-muted-foreground">
          {t('registration.agreement.consentText')}{' '}
          <a
            href="/membership-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: '#C4883A' }}
            onClick={e => { e.stopPropagation(); }}
          >
            {t('registration.agreement.policyLink')}
          </a>
        </span>
      </label>
      {errors.consent && <p className="text-[#E53935] text-xs mt-1 ml-9 -mt-3 mb-4">{errors.consent}</p>}

      {/* How heard */}
      <SelectField
        label={t('registration.agreement.howHeard')}
        value={data.how_heard}
        options={localizeOptions(t, HOW_HEARD, 'howHeard')}
        onSelect={v => onChange('how_heard', v)}
      />

      <div className="mt-8">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className={cn('reg-btn-primary w-full', isSubmitting && 'opacity-60 cursor-not-allowed')}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('registration.agreement.submitting')}
            </span>
          ) : t('registration.agreement.submitBtn')}
        </button>
        <button onClick={onBack} disabled={isSubmitting} className="reg-btn-secondary w-full mt-3">{t('registration.back')}</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP: CREATE PASSWORD
// ═══════════════════════════════════════════════════════════════

/** Convert phone digits to a synthetic email for Supabase Auth */
function phoneToAuthEmail(digits: string): string {
  return `7${digits.replace(/\D/g, '').slice(0, 10)}@phone.turan.kz`;
}

const StepCreatePassword: React.FC<{
  phone: string;
  fullName: string;
  formData: FormData;
  onDone: () => void;
}> = ({ phone, fullName, formData, onDone }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const digits = phone.replace(/\D/g, '').slice(0, 10);
  const displayPhone = `+7 ${formatPhone(digits)}`;

  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      setError(t('registration.validation.enterPassword'));
      return;
    }
    setLoading(true);
    try {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: phoneToAuthEmail(digits),
        password,
        options: { data: { full_name: fullName, phone: `+7${digits}` } },
      });
      if (signUpErr) throw signUpErr;

      // Now user is authenticated — call register_member RPC
      const orgName = formData.role === 'farmer' ? formData.farm_name : formData.company_name;
      const bin = formData.role === 'farmer' ? formData.bin_iin : formData.bin;
      const { error: rpcError } = await (supabase.rpc as any)('register_member', {
        p_org_type: formData.role!,
        p_name: orgName || formData.full_name,
        p_bin: bin || null,
        p_region: formData.region || 'astana',
        p_contact_name: formData.full_name,
        p_contact_phone: `+7${digits}`,
      });
      if (rpcError) console.warn('register_member RPC error:', rpcError.message);

      // Fire-and-forget: create lead in Bitrix24 CRM
      supabase.functions.invoke('create-bitrix-lead', {
        body: {
          full_name: formData.full_name,
          phone: `+7${digits}`,
          email: null,
          role: formData.role,
          region: formData.region || null,
          bin_iin: bin || null,
          company_name: orgName || null,
        },
      }).catch((e) => console.warn('Bitrix24 lead error (non-blocking):', e));

      await supabase.auth.signOut();
      onDone();
    } catch (err: any) {
      console.error('Create password error:', err);
      setError(err?.message || t('registration.submitError'));
      setLoading(false);
    }
  };

  return (
    <div className="text-center space-y-6 pt-4">
      <div className="icon-box mx-auto"><Lock /></div>
      <div>
        <h2 className="font-serif text-[22px] font-semibold text-foreground">
          {t('registration.createPassword.title')}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-[340px] mx-auto">
          {t('registration.createPassword.subtitle')}
        </p>
      </div>

      {/* Phone (read-only) */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-left"
        style={{ background: 'rgba(43,24,10,0.03)' }}>
        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground">{displayPhone}</span>
      </div>

      <div className="flex flex-col gap-4 text-left">
        <FloatingInput
          label={t('registration.createPassword.passwordLabel')}
          value={password}
          onChange={(v) => { setPassword(v); setError(''); }}
          onBlur={() => {
            if (password && password.length < 6) {
              setError(t('registration.validation.enterPassword'));
            }
          }}
          error={error}
          type="password"
          autoComplete="new-password"
          valid={!error && password.length >= 6}
          helper={t('registration.createPassword.passwordHelper')}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className={cn('reg-btn-primary w-full', loading && 'opacity-60 cursor-not-allowed')}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('registration.createPassword.saving')}
          </span>
        ) : t('registration.createPassword.saveBtn')}
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP: SUCCESS
// ═══════════════════════════════════════════════════════════════

const StepSuccess: React.FC<{ role: Role; phone: string; companyName: string }> = ({ role, phone, companyName }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const formattedPhone = formatPhoneFull(phone);

  const waMessage = encodeURIComponent(
    t('registration.success.waMessage', { company: companyName }),
  );
  const waLink = `https://wa.me/77753387130?text=${waMessage}`;

  return (
    <div className="text-center relative">
      <Confetti />

      {/* Logo watermark instead of checkmark */}
      <div className="pt-4 flex justify-center">
        <img
          src={turanIcon}
          alt="Turan"
          className="w-16 h-16"
          style={{ opacity: 0.2 }}
        />
      </div>

      <h2
        className="font-serif text-[26px] font-semibold mt-6 text-foreground"
      >
        {t('registration.success.title')}
      </h2>

      <p className="text-[15px] max-w-[360px] mx-auto mt-3 leading-relaxed text-muted-foreground">
        {role === 'farmer'
          ? <>{t('registration.success.farmerMsg')} <span className="font-semibold text-foreground">{formattedPhone}</span>.</>
          : <>{t('registration.success.mpkMsg')} <span className="font-semibold text-foreground">{formattedPhone}</span>.</>}
      </p>

      {/* Next steps */}
      <div className="flex flex-col gap-3 mt-10">
        {/* WhatsApp — clickable */}
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200 hover:shadow-sm reg-benefit-enter"
          style={{ background: 'rgba(43,24,10,0.02)', animationDelay: '150ms' }}
        >
          <div className="icon-box mt-0.5"><MessageCircle /></div>
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-foreground font-medium">{t('registration.success.writeWhatsApp')}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{t('registration.success.openChat')}</p>
          </div>
          <ArrowRight size={16} className="text-muted-foreground/40 shrink-0 mt-1" />
        </a>

        {/* Info step */}
        <div
          className="flex items-start gap-3 p-4 rounded-xl text-left reg-benefit-enter"
          style={{ background: 'rgba(43,24,10,0.02)', animationDelay: '300ms' }}
        >
          <div className="icon-box mt-0.5">
            {role === 'farmer' ? <ClipboardList /> : <BarChart3 />}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {role === 'farmer'
              ? t('registration.success.farmerNext')
              : t('registration.success.mpkNext')}
          </p>
        </div>
      </div>

      <button
        onClick={() => navigate('/login')}
        className="w-full h-[52px] rounded-xl text-base font-medium mt-10 transition-all duration-200"
        style={{
          background: '#E8730C',
          color: '#fff',
        }}
      >
        {t('registration.success.goToLogin')}
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN REGISTRATION COMPONENT
// ═══════════════════════════════════════════════════════════════

const Registration: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [currentView, setCurrentView] = useState<View>('role_select');
  const [direction, setDirection] = useState<Direction>('forward');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Autosave: load on mount ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData && parsed.currentView) {
          setFormData(parsed.formData);
          // Don't restore benefit views or success — start at the nearest step
          const view = parsed.currentView as View;
          if (view === 'success') {
            // If they completed, start fresh
            return;
          }
          const order = getForwardOrder(parsed.formData.role);
          const backMap = getBackMap(parsed.formData.role);
          const nonBenefitView = view.startsWith('benefit_') ? backMap[order[order.indexOf(view) + 1] as View] || 'role_select' : view;
          setCurrentView(nonBenefitView as View);
          setTimeout(() => toast(t('registration.progressSaved'), { duration: 3000 }), 500);
        }
      }
    } catch { /* noop */ }
  }, []);

  // ── Autosave: save on change ──
  useEffect(() => {
    if (currentView === 'success') {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, currentView }));
    } catch { /* noop */ }
  }, [formData, currentView]);

  // ── Scroll to top on view change ──
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  // ── Field change handler ──
  const updateField = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // ── Field validation ──
  const validateField = useCallback((field: string) => {
    const val = (formData as any)[field];
    let error = '';

    switch (field) {
      case 'full_name':
        if (!val || val.trim().length < 2) error = t('registration.validation.enterName');
        break;
      case 'phone':
        if (!val || val.length < 10) error = t('registration.validation.enterPhone');
        break;
      case 'region':
        if (!val) error = t('registration.validation.selectRegion');
        break;
      case 'farm_name':
      case 'company_name':
        if (!val || val.trim().length < 2) error = t('registration.validation.fillField');
        break;
      case 'bin_iin':
      case 'bin':
        if (!val || val.length !== 12) error = t('registration.validation.enter12digits');
        break;
      case 'herd_size':
      case 'company_type':
      case 'monthly_volume':
      case 'procurement_frequency':
        if (!val) error = t('registration.validation.selectOption');
        break;
      case 'consent':
        if (!val) error = t('registration.validation.acceptTerms');
        break;
    }

    if (error) {
      vibrate();
      setErrors(prev => ({ ...prev, [field]: error }));
    }
    return !error;
  }, [formData, t]);

  // ── Step validation ──
  const validateStep = useCallback((view: View): boolean => {
    let fields: string[] = [];

    switch (view) {
      case 'contact':
        fields = ['full_name', 'phone', 'region'];
        break;
      case 'step_2':
        fields = formData.role === 'farmer'
          ? ['farm_name', 'bin_iin', 'herd_size']
          : ['company_name', 'bin', 'company_type', 'monthly_volume'];
        break;
      case 'step_3':
        fields = ['procurement_frequency'];
        break;
      case 'agreement':
        fields = ['consent'];
        break;
      default:
        return true;
    }

    let allValid = true;
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      const val = (formData as any)[field];
      let error = '';

      switch (field) {
        case 'full_name':
          if (!val || val.trim().length < 2) error = t('registration.validation.enterName');
          break;
        case 'phone':
          if (!val || val.length < 10) error = t('registration.validation.enterPhone');
          break;
        case 'region':
          if (!val) error = t('registration.validation.selectRegion');
          break;
        case 'farm_name':
        case 'company_name':
          if (!val || val.trim().length < 2) error = t('registration.validation.fillField');
          break;
        case 'bin_iin':
        case 'bin':
          if (!val || val.length !== 12) error = t('registration.validation.enter12digits');
          break;
        case 'herd_size':
        case 'company_type':
        case 'monthly_volume':
        case 'procurement_frequency':
          if (!val) error = t('registration.validation.selectOption');
          break;
        case 'consent':
          if (!val) error = t('registration.validation.acceptTerms');
          break;
      }

      if (error) {
        newErrors[field] = error;
        allValid = false;
      }
    });

    if (!allValid) {
      vibrate();
      setErrors(prev => ({ ...prev, ...newErrors }));
    }

    return allValid;
  }, [formData, t]);

  // ── Navigation ──
  const goForward = useCallback((nextView: View) => {
    setDirection('forward');
    setAnimKey(k => k + 1);
    setCurrentView(nextView);
  }, []);

  const goBack = useCallback(() => {
    const prev = getBackMap(formData.role)[currentView];
    if (prev) {
      setDirection('backward');
      setAnimKey(k => k + 1);
      setCurrentView(prev);
      setErrors({});
    }
  }, [currentView, formData.role]);

  const getNextView = useCallback((): View => {
    const order = getForwardOrder(formData.role);
    const idx = order.indexOf(currentView);
    if (idx < order.length - 1) return order[idx + 1]!;
    return currentView;
  }, [currentView, formData.role]);

  // ── Step submit handlers ──
  const handleRoleSelect = useCallback((role: Role) => {
    updateField('role', role);
    goForward('contact');
  }, [updateField, goForward]);

  const handleStepSubmit = useCallback(() => {
    if (!validateStep(currentView)) return;
    goForward(getNextView());
  }, [validateStep, currentView, goForward, getNextView]);

  const handleBenefitContinue = useCallback(() => {
    goForward(getNextView());
  }, [goForward, getNextView]);

  const handleFinalSubmit = useCallback(async () => {
    if (!validateStep('agreement')) return;
    setIsSubmitting(true);
    try {
      // Insert into registration_applications
      const { error: insertError } = await supabase.from('registration_applications').insert({
        role: formData.role!,
        full_name: formData.full_name,
        phone: formData.phone,
        region: formData.region || null,
        farm_name: formData.farm_name || null,
        bin_iin: formData.bin_iin || null,
        herd_size: formData.herd_size || null,
        primary_breed: formData.primary_breed || null,
        company_name: formData.company_name || null,
        bin: formData.bin || null,
        company_type: formData.company_type || null,
        monthly_volume: formData.monthly_volume || null,
        ready_to_sell: formData.ready_to_sell || null,
        sell_count: formData.sell_count || null,
        target_breeds: formData.target_breeds.length > 0 ? formData.target_breeds : null,
        target_weight: formData.target_weight || null,
        procurement_frequency: formData.procurement_frequency || null,
        how_heard: formData.how_heard || null,
      });
      if (insertError) throw insertError;

      // register_member RPC is called in StepCreatePassword after signUp

      setIsSubmitting(false);
      localStorage.removeItem(STORAGE_KEY);
      goForward('create_password');
    } catch (err: any) {
      console.error('Registration error:', err);
      setIsSubmitting(false);
      toast.error(err?.message || t('registration.submitError'));
    }
  }, [validateStep, goForward, formData]);

  // ── Benefit step number from view ──
  const getBenefitStep = (view: View): 1 | 2 | 3 => {
    if (view === 'benefit_1') return 1;
    if (view === 'benefit_2') return 2;
    return 3;
  };

  // ── Render current view ──
  const renderView = () => {
    switch (currentView) {
      case 'role_select':
        return <StepRoleSelect onSelect={handleRoleSelect} />;

      case 'contact':
        return (
          <StepContact
            data={formData}
            errors={errors}
            onChange={updateField}
            onValidateField={validateField}
            onSubmit={handleStepSubmit}
            onBack={goBack}
          />
        );

      case 'benefit_1':
      case 'benefit_2':
      case 'benefit_3':
        return (
          <BenefitInterlude
            data={getBenefitData(getBenefitStep(currentView), formData.role!, formData.region, t)}
            onContinue={handleBenefitContinue}
            nextLabel={t('registration.next')}
          />
        );

      case 'step_2':
        return formData.role === 'farmer' ? (
          <StepFarmInfo
            data={formData}
            errors={errors}
            onChange={updateField}
            onValidateField={validateField}
            onSubmit={handleStepSubmit}
            onBack={goBack}
          />
        ) : (
          <StepCompanyInfo
            data={formData}
            errors={errors}
            onChange={updateField}
            onValidateField={validateField}
            onSubmit={handleStepSubmit}
            onBack={goBack}
          />
        );

      case 'step_3':
        return (
          <StepMpkNeeds
            data={formData}
            errors={errors}
            onChange={updateField}
            onSubmit={handleStepSubmit}
            onBack={goBack}
          />
        );

      case 'agreement':
        return (
          <StepAgreement
            data={formData}
            errors={errors}
            onChange={updateField}
            onSubmit={handleFinalSubmit}
            onBack={goBack}
            isSubmitting={isSubmitting}
          />
        );

      case 'create_password':
        return (
          <StepCreatePassword
            phone={formData.phone}
            fullName={formData.full_name}
            formData={formData}
            onDone={() => goForward('success')}
          />
        );

      case 'success':
        return (
          <StepSuccess
            role={formData.role!}
            phone={formData.phone}
            companyName={formData.role === 'farmer' ? formData.farm_name : formData.company_name}
          />
        );

      default:
        return null;
    }
  };

  const progress = VIEW_PROGRESS[currentView];

  return (
    <div
      className="min-h-screen relative"
      style={{ background: '#FAF8F5' }}
      ref={containerRef}
    >
      {/* Progress bar — hidden on role_select and success */}
      {currentView !== 'role_select' && currentView !== 'success' && (
        <ProgressBar progress={progress} />
      )}

      {/* Form container */}
      <div className="mx-auto" style={{ maxWidth: '480px', padding: '24px 20px' }}>
        {/* Spacer for fixed progress bar */}
        {currentView !== 'role_select' && currentView !== 'success' && <div className="h-2" />}

        {/* Animated view container */}
        <div
          key={animKey}
          className={cn(
            direction === 'forward' ? 'reg-slide-forward' : 'reg-slide-backward',
          )}
        >
          {renderView()}
        </div>
      </div>
    </div>
  );
};

export default Registration;
