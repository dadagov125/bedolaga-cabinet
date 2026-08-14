import { useTranslation } from 'react-i18next';

/**
 * Ввод контакта одним из трёх способов: телефон, почта, Telegram.
 *
 * Вкладки, а не автоопределение по строке: раньше тип угадывался по первому
 * символу, и человек не понимал, что от него хотят — подсказка была одна на все
 * случаи. Плюс угадывание ломало ввод номера (см. ниже про цифры).
 *
 * Значения трёх вкладок независимы: переключение не стирает уже введённое.
 */
export type ContactType = 'phone' | 'email' | 'telegram';

export interface ContactValues {
  phone: string; // только цифры национального номера, максимум 10
  email: string;
  telegram: string;
}

export const EMPTY_CONTACTS: ContactValues = { phone: '', email: '', telegram: '' };

/**
 * Цифры национального номера из произвольного ввода.
 *
 * Ключевая деталь: состояние хранит ТОЛЬКО цифры, а на экран отдаётся
 * отформатированная строка. Прошлая версия форматировала «строку в строку», и
 * семёрка из префикса «+7» при каждом вводе снова попадала в разбор — цифры
 * затирались, а стереть их по одной было нельзя. Здесь префикс отбрасывается
 * до разбора, поэтому и ввод, и удаление ведут себя предсказуемо.
 */
export function extractPhoneDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  // Номер, вставленный из буфера, обычно идёт с кодом страны.
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

/** 9991234567 → +7 999 123-45-67 */
export function formatPhoneDigits(digits: string): string {
  if (!digits) return '';
  let out = `+7 ${digits.slice(0, 3)}`;
  if (digits.length > 3) out += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) out += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) out += `-${digits.slice(8, 10)}`;
  return out;
}

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
