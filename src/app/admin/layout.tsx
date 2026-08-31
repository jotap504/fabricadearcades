'use client'

import { useState } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <header
        style={{
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-bg-2)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
        className="admin-mobile-header"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="btn btn-ghost"
            style={{ padding: 8, display: 'flex', alignItems: 'center' }}
            id="admin-menu-toggle"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Admin Panel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ThemeToggle />
          <img src="/logo.png" alt="Logo" style={{ height: 24 }} />
        </div>
      </header>

      {/* Sidebar Wrapper */}
      <div className={`admin-sidebar-wrapper ${isSidebarOpen ? 'open' : ''}`}>
        <AdminSidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 98,
          }}
          className="admin-sidebar-overlay"
        />
      )}

      <main className="admin-main">{children}</main>
    </div>
  )
}
