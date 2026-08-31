'use client'

import { useToastStore } from '@/lib/stores/toast'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={18} style={{ color: 'var(--color-green)' }} />,
  error: <AlertCircle size={18} style={{ color: 'var(--color-red)' }} />,
  info: <Info size={18} style={{ color: 'var(--color-cyan)' }} />,
  warning: <AlertTriangle size={18} style={{ color: 'var(--color-amber)' }} />,
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {ICONS[toast.type]}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--color-text)',
              }}
            >
              {toast.title}
            </div>
            {toast.message && (
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-secondary)',
                  marginTop: 2,
                }}
              >
                {toast.message}
              </div>
            )}
          </div>
          <button
            onClick={() => remove(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: 2,
              display: 'flex',
              flexShrink: 0,
            }}
            aria-label="Cerrar notificación"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
