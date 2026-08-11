/**
 * Показ номера человеку: +79991234567 → +7 999 123-45-67.
 *
 * Номер приходит с бэкенда в E.164 и в таком виде нечитаем — его либо диктуют
 * вслух, либо набирают руками. Формат, отличный от российского, возвращаем как
 * есть: подгонять чужую нумерацию под нашу маску хуже, чем не трогать.
 */
export function formatPhoneNumber(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || digits[0] !== '7') return value;
  return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
}
