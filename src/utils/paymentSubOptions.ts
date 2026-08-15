/**
 * Порядок под-способов оплаты внутри платёжного метода (например, «Карта» и
 * «СБП» у ЮKassa).
 *
 * СБП идёт первым и выбирается по умолчанию — но только если он вообще
 * доступен: список приходит с сервера и зависит от того, что включено у
 * магазина. Если СБП выключен, порядок остаётся тем, что прислал сервер.
 *
 * Почему СБП вперёд: оплата подтверждается в банковском приложении, без
 * ввода номера карты и кода из СМС. Для человека это два касания вместо
 * заполнения формы, а для нас — заметно ниже комиссия.
 */
export interface SubOptionLike {
  id: string;
}

const PREFERRED_FIRST = 'sbp';

export function orderSubOptions<T extends SubOptionLike>(options: T[]): T[] {
  return [...options].sort(
    (a, b) => Number(b.id === PREFERRED_FIRST) - Number(a.id === PREFERRED_FIRST),
  );
}

/** Под-способ, выбранный по умолчанию: СБП, если он есть, иначе первый доступный. */
export function defaultSubOptionId<T extends SubOptionLike>(
  options: T[] | null | undefined,
): string | null {
  if (!options || options.length === 0) return null;
  return orderSubOptions(options)[0].id;
}
