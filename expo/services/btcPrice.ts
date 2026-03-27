import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

let cachedPrice = 100000;
let lastFetch = 0;
const CACHE_DURATION = 60000;

export const fetchBtcPrice = async (): Promise<number> => {
  const now = Date.now();
  if (now - lastFetch < CACHE_DURATION && cachedPrice > 0) {
    return cachedPrice;
  }

  const apis = [
    {
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur',
      parse: (data: any) => data.bitcoin.eur,
    },
    {
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
      parse: (data: any) => parseFloat(data.data.rates.EUR),
    },
  ];

  for (const api of apis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(api.url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const eurRate = api.parse(data);
      
      if (eurRate && eurRate > 0) {
        cachedPrice = eurRate;
        lastFetch = now;
        return eurRate;
      }
    } catch {
      // Silently continue to next API
    }
  }

  return cachedPrice;
};

export const useBtcPrice = () => {
  const [btcPrice, setBtcPrice] = useState<number>(cachedPrice);

  useEffect(() => {
    const updatePrice = async () => {
      const price = await fetchBtcPrice();
      setBtcPrice(price);
    };

    updatePrice();
    const interval = setInterval(updatePrice, CACHE_DURATION);
    return () => clearInterval(interval);
  }, []);

  return btcPrice;
};

export const btconToEuro = (btcon: number, btcPrice: number = cachedPrice): string => {
  const btc = btcon / 100000000;
  const euro = btc * btcPrice;
  return euro.toFixed(2);
};

export const formatBtconWithEuro = (btcon: number, btcPrice: number = cachedPrice): string => {
  return `${Math.floor(btcon)} Btcon (≈ ${btconToEuro(btcon, btcPrice)} €)`;
};
