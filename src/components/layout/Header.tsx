'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingCart,
  Menu,
  X,
  Bell,
  User,
  LogOut,
  Settings,
  Package,
  Gamepad2,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCartStore } from '@/lib/stores/cart'
import { clsx } from 'clsx'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const NAV_LINKS = [
  { href: '/productos', label: 'Catálogo' },
  { href: '/productos?categoria=arcades', label: 'Arcades' },
  { href: '/productos?categoria=accesorios', label: 'Accesorios' },
  { href: '/contacto', label: 'Contacto' },
]

export function Header() {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()
  const openCart = useCartStore((s) => s.openCart)
  const persistedItemCount = useCartStore((s) => s.itemCount())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // The cart is persisted client-side (localStorage), so the server always
  // renders 0. Hold at 0 until after mount so the first client render still
  // matches the server, instead of causing a hydration mismatch.
  const itemCount = mounted ? persistedItemCount : 0

  const isAdmin = profile?.role === 'admin'
  const isFabricante = profile?.role === 'fabricante'

  return (
    <>
      <header className="header">
        <div className="header-inner">
          {/* Logo */}
          <Link href="/" className="header-logo" style={{ padding: 0, background: 'none', border: 'none' }}>
            <img src="/logo.png" alt="Fábrica de Arcades" className="logo-dark" style={{ height: 40, width: 'auto' }} />
            <img src="/logo-light.png" alt="Fábrica de Arcades" className="logo-light" style={{ height: 40, width: 'auto' }} />
          </Link>

          {/* Desktop Nav */}
          <nav className="header-nav">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx('header-nav-link', {
                  active: pathname === link.href || pathname.startsWith(link.href.split('?')[0] + '/'),
                })}
              >
                {link.label}
              </Link>
            ))}
            {(isAdmin || isFabricante) && (
              <Link
                href={isAdmin ? '/admin' : '/fabricante'}
                className={clsx('header-nav-link', {
                  active: pathname.startsWith('/admin') || pathname.startsWith('/fabricante'),
                })}
                style={{ color: 'var(--color-cyan)' }}
              >
                Panel
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="header-actions">
            <ThemeToggle />

            {/* Cart */}
            <button
              className="header-cart-btn"
              onClick={openCart}
              aria-label={`Carrito (${itemCount} items)`}
              id="header-cart-btn"
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="cart-badge">{itemCount > 9 ? '9+' : itemCount}</span>
              )}
            </button>

            {/* User menu */}
            {user ? (
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  id="user-menu-btn"
                  style={{ gap: '6px' }}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <User size={18} />
                  )}
                  <span className="hide-mobile">
                    {profile?.full_name?.split(' ')[0] || 'Mi cuenta'}
                  </span>
                  <ChevronDown size={14} />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 150,
                      }}
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div
                      className="glass"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: 220,
                        borderRadius: 'var(--radius-lg)',
                        zIndex: 160,
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-lg)',
                      }}
                    >
                      <div
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--color-border)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'var(--color-text)',
                          }}
                        >
                          {profile?.full_name || user.email?.split('@')[0]}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {user.email}
                        </div>
                      </div>
                      <div style={{ padding: '8px 0' }}>
                        <Link
                          href="/mi-cuenta"
                          className="admin-nav-link"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User size={16} /> Mi cuenta
                        </Link>
                        <Link
                          href="/mi-cuenta"
                          className="admin-nav-link"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Package size={16} /> Mis pedidos
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className="admin-nav-link"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Settings size={16} /> Panel admin
                          </Link>
                        )}
                        <button
                          className="admin-nav-link"
                          onClick={() => {
                            setUserMenuOpen(false)
                            signOut()
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-red)',
                          }}
                        >
                          <LogOut size={16} /> Cerrar sesión
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary btn-sm" id="header-login-btn">
                Ingresar
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menú"
              id="mobile-menu-btn"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div
        className={clsx('drawer-overlay', { open: mobileOpen })}
        onClick={() => setMobileOpen(false)}
      />
      <div className={clsx('drawer', { open: mobileOpen })}>
        <div>
          <Link href="/" className="header-logo" onClick={() => setMobileOpen(false)} style={{ padding: 0, background: 'none', border: 'none', marginBottom: 'var(--space-6)' }}>
            <img src="/logo.png" alt="Fábrica de Arcades" className="logo-dark" style={{ height: 40, width: 'auto' }} />
            <img src="/logo-light.png" alt="Fábrica de Arcades" className="logo-light" style={{ height: 40, width: 'auto' }} />
          </Link>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx('admin-nav-link', {
                  active: pathname === link.href,
                })}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {(isAdmin || isFabricante) && (
              <Link
                href={isAdmin ? '/admin' : '/fabricante'}
                className="admin-nav-link"
                onClick={() => setMobileOpen(false)}
                style={{ color: 'var(--color-cyan)' }}
              >
                Panel de control
              </Link>
            )}
          </nav>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'var(--space-5)',
          }}
        >
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ padding: '0 20px var(--space-2)' }}>
                <ThemeToggle />
              </div>
              <div
                style={{
                  padding: '12px 20px',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {profile?.full_name || user.email}
              </div>
              <button
                onClick={() => {
                  setMobileOpen(false)
                  signOut()
                }}
                className="btn btn-ghost btn-sm"
                style={{ margin: '0 20px', justifyContent: 'flex-start', gap: 'var(--space-2)' }}
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                padding: '0 20px',
              }}
            >
              <Link
                href="/login"
                className="btn btn-primary"
                onClick={() => setMobileOpen(false)}
                id="mobile-login-btn"
              >
                Ingresar
              </Link>
              <Link
                href="/registro"
                className="btn btn-ghost"
                onClick={() => setMobileOpen(false)}
              >
                Registrarme
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
