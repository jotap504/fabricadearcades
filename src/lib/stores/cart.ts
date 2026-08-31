'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartState, CartItem } from '@/lib/types'

// Simple UUID v4 without external dep
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const newItem: CartItem = { ...item, id: generateId() }
        set((state) => ({ items: [...state.items, newItem], isOpen: true }))
      },

      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          get().removeItem(id)
          return
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }))
      },

      clearCart: () => set({ items: [], isOpen: false }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      total: () => {
        const { items } = get()
        return items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
      },

      itemCount: () => {
        const { items } = get()
        return items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'arcade-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
)
