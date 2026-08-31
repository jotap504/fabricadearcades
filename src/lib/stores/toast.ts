'use client'

import { create } from 'zustand'
import type { Toast, ToastState } from '@/lib/types'

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  add: (toast) => {
    const id = generateId()
    const newToast: Toast = { ...toast, id, duration: toast.duration ?? 4000 }
    set((state) => ({ toasts: [...state.toasts, newToast] }))

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().remove(id)
      }, newToast.duration)
    }
  },

  remove: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))

// Convenience hook
export function useToast() {
  const add = useToastStore((s) => s.add)
  return {
    success: (title: string, message?: string) =>
      add({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      add({ type: 'error', title, message }),
    info: (title: string, message?: string) =>
      add({ type: 'info', title, message }),
    warning: (title: string, message?: string) =>
      add({ type: 'warning', title, message }),
  }
}
