'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface CartItem {
  id: string;
  productId: string;
  title: string;
  image: string;
  quantity: number;
  medium: string | null;
  frameType: string | null;
  frameColor: string | null;
  selectedOptions?: string;
  price: number;
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addToCart: (item: Omit<CartItem, 'id'>) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({
  items: [],
  loading: false,
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeFromCart: async () => {},
  clearCart: async () => {},
  totalItems: 0,
  totalPrice: 0,
  refreshCart: async () => {},
});

const CART_STORAGE_KEY = 'gv-cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCartFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      setItems([]);
    }
  }, []);

  const saveCartToStorage = useCallback((cartItems: CartItem[]) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, []);

  const refreshCart = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const res = await fetch('/api/cart');
        if (res.ok) {
          const data = await res.json();
          setItems(data.items);
        }
      } catch (e) {
        console.error('Failed to load cart', e);
      } finally {
        setLoading(false);
      }
    } else {
      loadCartFromStorage();
    }
  }, [user, loadCartFromStorage]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (item: Omit<CartItem, 'id'>) => {
    if (user) {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        await refreshCart();
      }
    } else {
      const newItem: CartItem = { ...item, id: `temp-${Date.now()}` };
      const updated = [...items, newItem];
      setItems(updated);
      saveCartToStorage(updated);
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1) return;
    if (user) {
      await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantity }),
      });
      await refreshCart();
    } else {
      const updated = items.map(item =>
        item.id === id ? { ...item, quantity } : item
      );
      setItems(updated);
      saveCartToStorage(updated);
    }
  };

  const removeFromCart = async (id: string) => {
    if (user) {
      await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await refreshCart();
    } else {
      const updated = items.filter(item => item.id !== id);
      setItems(updated);
      saveCartToStorage(updated);
    }
  };

  const clearCart = async () => {
    if (user) {
      await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });
      await refreshCart();
    } else {
      setItems([]);
      saveCartToStorage([]);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, loading, addToCart, updateQuantity, removeFromCart, clearCart, totalItems, totalPrice, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
