'use client';

import { useState, useEffect } from 'react';
import { getErgPrice, formatUsdAmount } from '@/lib/ergo/price';

let sharedPrice: number | null = null;
let lastFetch = 0;
const CACHE_MS = 5 * 60 * 1000; // 5 min

export function useErgPrice() {
  const [price, setPrice] = useState<number | null>(sharedPrice);

  useEffect(() => {
    if (sharedPrice && Date.now() - lastFetch < CACHE_MS) {
      setPrice(sharedPrice);
      return;
    }
    getErgPrice()
      .then(p => {
        sharedPrice = p.usd;
        lastFetch = Date.now();
        setPrice(p.usd);
      })
      .catch(() => {});
  }, []);

  const ergToUsdStr = (erg: number): string | null => {
    if (!price) return null;
    return formatUsdAmount(erg * price);
  };

  return { price, ergToUsdStr };
}
