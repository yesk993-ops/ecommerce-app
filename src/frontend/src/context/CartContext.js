import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cart } from '../api/client';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await cart.get();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = useCallback(async (product) => {
    await cart.addItem(product);
    await fetchCart();
  }, [fetchCart]);

  const updateQuantity = useCallback(async (itemId, quantity) => {
    await cart.updateItem(itemId, { quantity });
    await fetchCart();
  }, [fetchCart]);

  const removeItem = useCallback(async (itemId) => {
    await cart.removeItem(itemId);
    await fetchCart();
  }, [fetchCart]);

  const clearCart = useCallback(async () => {
    await cart.clear();
    await fetchCart();
  }, [fetchCart]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, total, loading, itemCount, fetchCart, addItem, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
