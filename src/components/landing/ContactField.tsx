import { useTranslation } from 'react-i18next';
import { extractPhoneDigits, formatPhoneDigits } from '../../utils/phone';

/**
 * Ввод контакта одним из трёх способов: телефон, почта, Telegram.
 *
 * Вкладки, а не автоопределение по строке: раньше тип угадывался по первому
 * символу, и человек не понимал, что от него хотят — подсказка была одна на все
 * случаи. Плюс угадывание ломало ввод номера (см. ниже про цифры).
 *
 * Значения трёх вкладок независимы: переключение не стирает уже введённое.
 */
export { extractPhoneDigits, formatPhoneDigits };

export type ContactType = 'phone' | 'email' | 'telegram';

export interface ContactValues {
  phone: string; // только цифры национального номера, максимум 10
  email: string;
  telegram: string;
}

export const EMPTY_CONTACTS: ContactValues = { phone: '', email: '', telegram: '' };

/** Значение, которое уходит на сервер для выбранной вкладки. */
export function contactPayload(type: ContactType, values: ContactValues): string {
  if (type === 'phone') return values.phone ? `+7${values.phone}` : '';
  if (type === 'telegram') {
    const trimmed = values.telegram.trim();
    return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  }
  return values.email.trim();
}

export function isContactValid(type: ContactType, values: ContactValues): boolean {
  if (type === 'phone') return values.phone.length === 10 && values.phone.startsWith('9');
  if (type === 'telegram') return values.telegram.replace(/^@/, '').length >= 3;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim());
}

interface Props {
  id: string;
  label: string;
  type: ContactType;
  onTypeChange: (type: ContactType) => void;
  values: ContactValues;
  onChange: (values: ContactValues) => void;
  hint?: string;
}

export default function ContactField({
  id,
  label,
  type,
  onTypeChange,
  values,
  onChange,
  hint,
}: Props) {
  const { t } = useTranslation();

  const tabs: { key: ContactType; label: string }[] = [
    { key: 'phone', label: t('landing.contactTabs.phone', 'Телефон') },
    { key: 'email', label: t('landing.contactTabs.email', 'Email') },
    { key: 'telegram', label: t('landing.contactTabs.telegram', 'Telegram') },
  ];

  const inputClass =
    'w-full rounded-xl border border-dark-700/50 bg-dark-800/50 px-4 py-3 text-sm text-dark-50 placeholder-dark-500 outline-none transition-colors focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25';

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-dark-200">
        {label}
      </label>

      <div className="mb-2 flex rounded-xl bg-dark-800/60 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTypeChange(tab.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              type === tab.key
                ? 'bg-accent-500 text-on-accent'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {type === 'phone' && (
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={formatPhoneDigits(values.phone)}
          onChange={(e) => onChange({ ...values, phone: extractPhoneDigits(e.target.value) })}
          placeholder={t('landing.contactPlaceholders.phone', '+7 ___ ___-__-__')}
          className={inputClass}
        />
      )}

      {type === 'email' && (
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => onChange({ ...values, email: e.target.value })}
          placeholder={t('landing.contactPlaceholders.email', 'email@example.com')}
          className={inputClass}
        />
      )}

      {type === 'telegram' && (
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={values.telegram}
          onChange={(e) => onChange({ ...values, telegram: e.target.value })}
          placeholder={t('landing.contactPlaceholders.telegram', '@username')}
          className={inputClass}
        />
      )}

      <p className="mt-1.5 text-xs text-dark-500">
        {hint ?? t(`landing.contactHints.${type}`, '')}
      </p>
    </div>
  );
}
