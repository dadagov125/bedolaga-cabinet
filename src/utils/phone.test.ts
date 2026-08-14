import { describe, expect, it } from 'vitest';
import { extractPhoneDigits, formatPhoneDigits } from './phone';
import { contactPayload, isContactValid } from '../components/landing/ContactField';

/**
 * Регрессия, пойманная дважды на проде: префикс «+7» нарисован прямо в значении
 * поля, и его семёрка при каждом нажатии снова попадала в разбор. Пользователь
 * жал 9 — получал «+7 799», потом «+7 7799» и так далее, а стереть цифры по
 * одной было нельзя.
 *
 * Поэтому здесь проверяется не форматирование само по себе, а цикл
 * «значение поля → цифры → новое значение поля», то есть ровно то, что
 * происходит при каждом нажатии клавиши.
 */
function type(current: string, key: string): string {
  return formatPhoneDigits(extractPhoneDigits(current + key));
}

function backspace(current: string): string {
  return formatPhoneDigits(extractPhoneDigits(current.slice(0, -1)));
}

describe('ввод номера телефона', () => {
  it('набор цифр подряд не подмешивает семёрку из префикса', () => {
    let value = '';
    for (const digit of '9991234567') {
      value = type(value, digit);
    }
    expect(value).toBe('+7 999 123-45-67');
  });

  it('первые нажатия дают именно то, что нажали', () => {
    const first = type('', '9');
    expect(first).toBe('+7 9');
    const second = type(first, '9');
    expect(second).toBe('+7 99');
    const third = type(second, '9');
    expect(third).toBe('+7 999');
  });

  it('backspace стирает по одной цифре, а не превращает их в семёрки', () => {
    let value = formatPhoneDigits('9991234567');
    value = backspace(value);
    expect(value).toBe('+7 999 123-45-6');
    value = backspace(value);
    expect(value).toBe('+7 999 123-45');
    // Разделители удаляются вместе с цифрой, а не залипают.
    value = backspace(value);
    expect(value).toBe('+7 999 123-4');
  });

  it('стирание до конца очищает поле, а не оставляет префикс', () => {
    let value = formatPhoneDigits('999');
    for (let i = 0; i < 20; i += 1) {
      value = backspace(value);
    }
    expect(value).toBe('');
  });

  it('вставка из буфера подрезает код страны в любом написании', () => {
    for (const pasted of ['+79991234567', '89991234567', '9991234567', '+7 (999) 123-45-67']) {
      expect(extractPhoneDigits(pasted)).toBe('9991234567');
    }
  });

  it('лишние цифры сверх десяти отбрасываются', () => {
    expect(extractPhoneDigits('99912345678888')).toBe('9991234567');
  });

  it('на сервер уходит E.164', () => {
    const values = { phone: '9991234567', email: '', telegram: '' };
    expect(contactPayload('phone', values)).toBe('+79991234567');
    expect(isContactValid('phone', values)).toBe(true);
    expect(isContactValid('phone', { ...values, phone: '999123' })).toBe(false);
  });
});
