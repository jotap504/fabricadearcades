'use client'

import { MessageCircle } from 'lucide-react'

export function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/5491164045074"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        right: 'var(--space-6)',
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#25D366',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(37, 211, 102, 0.4)',
        zIndex: 999,
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        cursor: 'pointer',
      }}
      className="whatsapp-float"
      title="Consultar por WhatsApp"
      id="whatsapp-sticky-btn"
    >
      <MessageCircle size={28} />
    </a>
  )
}
