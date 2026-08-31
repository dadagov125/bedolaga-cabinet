import { describe, expect, it } from 'vitest';
import { getBestMonthlyOffer, getMonthlyPriceKopeks } from './pricing';

describe('getMonthlyPriceKopeks', () => {
  it('hides the monthly rate for periods of a month or shorter', () => {
    expect(getMonthlyPriceKopeks(4830, 7)).toBeNull();
    expect(getMonthlyPriceKopeks(9900, 14)).toBeNull();
    expect(getMonthlyPriceKopeks(16030, 30)).toBeNull();
  });

  it('divides by whole months for multiples of 30 days', () => {
    expect(getMonthlyPriceKopeks(30000, 90)).toBe(10000);
    expect(getMonthlyPriceKopeks(60000, 180)).toBe(10000);
  });

  it('prorates periods that are not whole months', () => {
    expect(getMonthlyPriceKopeks(15000, 45)).toBe(10000);
    expect(getMonthlyPriceKopeks(100000, 365)).toBe(8219);
  });

  it('returns null for non-finite input', () => {
    expect(getMonthlyPriceKopeks(Number.NaN, 90)).toBeNull();
    expect(getMonthlyPriceKopeks(30000, Number.NaN)).toBeNull();
    expect(getMonthlyPriceKopeks(30000, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('getBestMonthlyOffer', () => {
  const startTariff = [
    { days: 30, price_kopeks: 18900 },
    { days: 90, price_kopeks: 47900 },
    { days: 180, price_kopeks: 84900 },
    { days: 360, price_kopeks: 135900 },
  ];

  it('finds the cheapest month and the saving against monthly billing', () => {
    expect(getBestMonthlyOffer(startTariff)).toEqual({
      days: 360,
      monthlyKopeks: 11325,
      baseMonthlyKopeks: 18900,
      savePercent: 40,
    });
  });

  it('reports no saving when every period costs the same per month', () => {
    const offer = getBestMonthlyOffer([
      { days: 30, price_kopeks: 10000 },
      { days: 90, price_kopeks: 30000 },
    ]);
    expect(offer?.savePercent).toBe(0);
    expect(offer?.monthlyKopeks).toBe(10000);
  });

  it('returns null without usable periods', () => {
    expect(getBestMonthlyOffer([])).toBeNull();
    expect(getBestMonthlyOffer([{ days: 0, price_kopeks: 10000 }])).toBeNull();
  });
});
