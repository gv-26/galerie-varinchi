'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface WishlistItem {
  id: string;
  productId: string;
  title: string;
  image: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  loading: boolean;
  addToWishlist: (productId: string, title: string, image: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  totalItems: number;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType>({
  items: [],
  loading: false,
  addToWishlist: async () => {},
  removeFromWishlist: async () => {},
  isWishlisted: () => false,
  totalItems: 0,
  refreshWishlist: async () => {},
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/wishlist');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch (e) {
      console.error('Failed to load wishlist', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const addToWishlist = async (productId: string, title: string, image: string) => {
    if (!user) return;
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (res.ok) {
      setItems(prev => [...prev, { id: `temp-${Date.now()}`, productId, title, image }]);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;
    const res = await fetch('/api/wishlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (res.ok) {
      setItems(prev => prev.filter(item => item.productId !== productId));
    }
  };

  const isWishlisted = (productId: string) => {
    return items.some(item => item.productId === productId);
  };

  return (
    <WishlistContext.Provider value={{ items, loading, addToWishlist, removeFromWishlist, isWishlisted, totalItems: items.length, refreshWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
