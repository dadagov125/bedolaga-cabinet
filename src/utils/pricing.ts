/** Длина «месяца» в днях — тот же множитель, что использует бэкенд при расчёте цены за месяц. */
const DAYS_IN_MONTH = 30;

/**
 * Цена за месяц (в копейках) для периода длиной `days` дней.
 *
 * Возвращает `null`, когда месячная ставка не имеет смысла: для периода
 * в месяц и короче она либо повторяет цену периода (30 дней), либо
 * выдаёт цену периода за месячную (7 дней → цена семи дней «за месяц»).
 */
export function getMonthlyPriceKopeks(priceKopeks: number, days: number): number | null {
  if (!Number.isFinite(priceKopeks) || !Number.isFinite(days)) return null;
  if (days <= DAYS_IN_MONTH) return null;
  return Math.round((priceKopeks * DAYS_IN_MONTH) / days);
}

/**
 * Цена за месяц для любого периода, включая месячный.
 *
 * В отличие от `getMonthlyPriceKopeks`, здесь месячная ставка нужна и для
 * 30 дней — чтобы было с чем сравнивать длинные периоды.
 */
export function getMonthlyRateKopeks(priceKopeks: number, days: number): number | null {
  if (!Number.isFinite(priceKopeks) || !Number.isFinite(days) || days <= 0) return null;
  return Math.round((priceKopeks * DAYS_IN_MONTH) / days);
}

export interface PeriodPrice {
  days: number;
  price_kopeks: number;
}

export interface BestMonthlyOffer {
  /** Период, дающий самую низкую цену за месяц. */
  days: number;
  /** Та самая цена за месяц. */
  monthlyKopeks: number;
  /** Самая дорогая месячная ставка тарифа — база для «экономии». */
  baseMonthlyKopeks: number;
  /** Экономия в процентах относительно базы, 0 — если её нет. */
  savePercent: number;
}

/**
 * Лучшее предложение тарифа: «от X ₽/мес» и сколько это экономит.
 *
 * Считаем по всем периодам, а не по первому: человек видит нижнюю границу
 * цены сразу, не перебирая вкладки. База сравнения — самая дорогая месячная
 * ставка (обычно оплата помесячно), поэтому процент отвечает на вопрос
 * «сколько я сэкономлю, если возьму сразу надолго».
 */
export function getBestMonthlyOffer(periods: PeriodPrice[]): BestMonthlyOffer | null {
  const rates = periods
    .map((period) => ({
      days: period.days,
      rate: getMonthlyRateKopeks(period.price_kopeks, period.days),
    }))
    .filter((entry): entry is { days: number; rate: number } => entry.rate !== null);

  if (rates.length === 0) return null;

  const best = rates.reduce((min, entry) => (entry.rate < min.rate ? entry : min));
  const baseMonthlyKopeks = rates.reduce((max, entry) =>
    entry.rate > max.rate ? entry : max,
  ).rate;
  const savePercent =
    baseMonthlyKopeks > best.rate ? Math.round((1 - best.rate / baseMonthlyKopeks) * 100) : 0;

  return {
    days: best.days,
    monthlyKopeks: best.rate,
    baseMonthlyKopeks,
    savePercent,
  };
}
