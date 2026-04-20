import { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import FileDropzone from './FileDropzone';

/** Format raw digits into +7 (7XX) XXX-XX-XX mask */
function formatPhone(raw: string): string {
  // strip everything except digits
  let digits = raw.replace(/\D/g, '');

  // normalise leading: always start with 7
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7') && digits.length > 0) digits = '7' + digits;

  // cap at 11 digits (country code + 10 digits)
  digits = digits.slice(0, 11);

  let result = '';
  if (digits.length >= 1) result += '+' + digits[0];           // +7
  if (digits.length >= 2) result += ' (' + digits[1];          // +7 (7
  if (digits.length >= 4) result += digits.slice(2, 4);        // +7 (7XX
  if (digits.length >= 5) result += ') ' + digits.slice(4, 7); // +7 (7XX) XXX
  else if (digits.length > 4) result += ') ' + digits.slice(4);
  else if (digits.length >= 2 && digits.length < 4) result += digits.slice(2);
  if (digits.length >= 8) result += '-' + digits.slice(7, 9);  // -XX
  if (digits.length >= 10) result += '-' + digits.slice(9, 11);// -XX

  return result;
}

interface Props {
  data: {
    title: string;
    website_url: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
  };
  file: File | null;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onFileChange: (file: File | null) => void;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  const { t } = useTranslation();
  return (
    <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#2B180A' }}>
      {children}
      {!required && (
        <span className="ml-1 font-normal" style={{ color: 'rgba(43,24,10,0.35)' }}>
          ({t('registration.optional')})
        </span>
      )}
    </label>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-[12px] mt-1 font-medium" style={{ color: '#993333' }}>{error}</p>;
}

export default function StepBasicInfo({ data, file, errors, onChange, onFileChange }: Props) {
  const { t } = useTranslation();
  const phoneRef = useRef<HTMLInputElement>(null);

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const raw = input.value;

      // detect backspace at a formatting char → remove the digit before it
      const formatted = formatPhone(raw);
      onChange('contact_phone', formatted);

      // restore cursor position after React re-render
      requestAnimationFrame(() => {
        if (!phoneRef.current) return;
        // place cursor at the end of meaningful content
        const len = formatted.length;
        phoneRef.current.setSelectionRange(len, len);
      });
    },
    [data.contact_phone, onChange],
  );

  const handlePhoneFocus = useCallback(() => {
    // pre-fill prefix so the user sees the mask right away
    if (!data.contact_phone) {
      onChange('contact_phone', '+7 (');
      requestAnimationFrame(() => {
        if (phoneRef.current) {
          const len = '+7 ('.length;
          phoneRef.current.setSelectionRange(len, len);
        }
      });
    }
  }, [data.contact_phone, onChange]);

  const handlePhoneBlur = useCallback(() => {
    // clear if user leaves only the prefix
    if (data.contact_phone.replace(/\D/g, '').length <= 1) {
      onChange('contact_phone', '');
    }
  }, [data.contact_phone, onChange]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif font-semibold text-[20px] md:text-[24px]" style={{ color: '#2B180A' }}>
          {t('startups.submit.step1Title')}
        </h2>
        <p className="text-[13px] mt-1" style={{ color: 'rgba(43,24,10,0.5)' }}>
          {t('startups.submit.step1Subtitle')}
        </p>
      </div>

      {/* Project name */}
      <div>
        <FieldLabel required>{t('startups.submit.projectName')}</FieldLabel>
        <Input
          value={data.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder={t('startups.submit.projectNamePlaceholder')}
          className="h-11 rounded-xl border-none"
          style={{ background: 'rgba(43,24,10,0.04)' }}
        />
        <FieldError error={errors.title} />
      </div>

      {/* Website */}
      <div>
        <FieldLabel>{t('startups.submit.website')}</FieldLabel>
        <Input
          value={data.website_url}
          onChange={(e) => onChange('website_url', e.target.value)}
          placeholder="https://"
          className="h-11 rounded-xl border-none"
          style={{ background: 'rgba(43,24,10,0.04)' }}
        />
        <FieldError error={errors.website_url} />
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(43,24,10,0.06)' }} />

      {/* Contact name */}
      <div>
        <FieldLabel required>{t('startups.submit.contactName')}</FieldLabel>
        <Input
          value={data.contact_name}
          onChange={(e) => onChange('contact_name', e.target.value)}
          placeholder={t('startups.submit.contactNamePlaceholder')}
          className="h-11 rounded-xl border-none"
          style={{ background: 'rgba(43,24,10,0.04)' }}
        />
        <FieldError error={errors.contact_name} />
      </div>

      {/* Contact email */}
      <div>
        <FieldLabel required>Email</FieldLabel>
        <Input
          type="email"
          value={data.contact_email}
          onChange={(e) => onChange('contact_email', e.target.value)}
          placeholder="name@company.com"
          className="h-11 rounded-xl border-none"
          style={{ background: 'rgba(43,24,10,0.04)' }}
        />
        <FieldError error={errors.contact_email} />
      </div>

      {/* Contact phone */}
      <div>
        <FieldLabel>{t('startups.submit.contactPhone')}</FieldLabel>
        <Input
          ref={phoneRef}
          type="tel"
          value={data.contact_phone}
          onChange={handlePhoneChange}
          onFocus={handlePhoneFocus}
          onBlur={handlePhoneBlur}
          placeholder="+7 (7XX) XXX-XX-XX"
          className="h-11 rounded-xl border-none"
          style={{ background: 'rgba(43,24,10,0.04)' }}
        />
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(43,24,10,0.06)' }} />

      {/* Pitch deck upload */}
      <div>
        <FieldLabel required>{t('startups.submit.pitchDeck')}</FieldLabel>
        <FileDropzone file={file} onFileChange={onFileChange} error={errors.file} />
      </div>
    </div>
  );
}
