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

/**
 * Разбор пользовательского ввода в цифры национального номера (без кода страны,
 * максимум 10). Поле показывает отформатированную строку с префиксом «+7 », а
 * состояние держит только цифры — иначе префикс на каждом нажатии заново
 * попадает в разбор и подмешивается в номер. Регрессия ловилась дважды, тесты
 * лежат рядом в phone.test.ts.
 */
export function extractPhoneDigits(input: string): string {
  // 1. Снимаем нарисованный префикс вместе с разделителями после него.
  const withoutPrefix = input.replace(/^\s*\+?\s*7[\s(-]*/, '');
  let digits = withoutPrefix.replace(/\D/g, '');
  // 2. Вставка из буфера с кодом страны: +7… или 8….
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) {
    digits = digits.slice(1);
  }
  // 3. Привычка набирать «восьмёрку» первой. Мобильные номера России всегда
  //    начинаются с девятки, так что ведущая 8 — это код выхода, а не номер.
  if (digits.length > 1 && digits[0] === '8') {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

/** 9991234567 → +7 999 123-45-67. Пустая строка на пустом вводе: иначе в поле
 *  остаётся «+7 », которое нельзя стереть. */
export function formatPhoneDigits(digits: string): string {
  if (!digits) return '';
  let out = `+7 ${digits.slice(0, 3)}`;
  if (digits.length > 3) out += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) out += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) out += `-${digits.slice(8, 10)}`;
  return out;
}
