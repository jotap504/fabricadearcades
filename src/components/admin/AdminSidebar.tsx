'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wrench,
  ShoppingBag,
  Users,
  Layers,
  Settings,
  Gamepad2,
  BoxIcon,
  Boxes,
  ContactRound,
} from 'lucide-react'
import { clsx } from 'clsx'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

type NavItem = {
  href: string
  icon: React.ReactNode
  label: string
  exact?: boolean
}

const NAV_ITEMS: { section: string; items: NavItem[] }[] = [
  {
    section: 'General',
    items: [
      { href: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', exact: true },
    ],
  },
  {
    section: 'Tienda',
    items: [
      { href: '/admin/productos', icon: <Gamepad2 size={18} />, label: 'Productos' },
      { href: '/admin/stock', icon: <BoxIcon size={18} />, label: 'Stock' },
      { href: '/admin/familias', icon: <Boxes size={18} />, label: 'Familias de Insumos' },
      { href: '/admin/insumos', icon: <Layers size={18} />, label: 'Insumos' },
    ],
  },
  {
    section: 'Operaciones',
    items: [
      { href: '/admin/pedidos', icon: <ShoppingBag size={18} />, label: 'Pedidos' },
      { href: '/admin/produccion', icon: <Wrench size={18} />, label: 'Producción' },
    ],
  },
  {
    section: 'Administración',
    items: [
      { href: '/admin/clientes', icon: <ContactRound size={18} />, label: 'Clientes' },
      { href: '/admin/usuarios', icon: <Users size={18} />, label: 'Usuarios' },
      { href: '/admin/configuracion', icon: <Settings size={18} />, label: 'Configuración' },
    ],
  },
]

export function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <aside className="admin-sidebar">
      <div
        style={{
          padding: '0 var(--space-5) var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <Image src="/logo.png" alt="Fábrica de Arcades" width={120} height={32} style={{ height: 32, width: 'auto' }} />
          <ThemeToggle />
        </div>
      </div>

      {NAV_ITEMS.map(({ section, items }) => (
        <div key={section}>
          <div className="admin-sidebar-section">{section}</div>
          {items.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx('admin-nav-link', { active: isActive })}
                id={`admin-nav-${item.href.split('/').pop()}`}
                onClick={onClose}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>
      ))}

      <div style={{ marginTop: 'auto', padding: 'var(--space-5)' }}>
        <Link
          href="/"
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          ← Ver la tienda
        </Link>
      </div>
    </aside>
  )
}
