'use client';

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'ktawn_recently_viewed';
const MAX_ITEMS = 8;

export interface RecentProduct {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  price: string;
  categoryName: string;
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  const addProduct = useCallback((product: RecentProduct) => {
    setItems(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      const next = [product, ...filtered].slice(0, MAX_ITEMS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { items, addProduct };
}
