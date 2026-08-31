'use client'

import { useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, SlidersHorizontal, X, Gamepad2, Zap, LayoutGrid, Wrench } from 'lucide-react'
import { ProductCard } from '@/components/products/ProductCard'
import type { Product, Category } from '@/lib/types'

interface ProductsClientProps {
  products: Product[]
  categories: Category[]
  activeCategory: string
  searchQuery: string
}

const getCategoryIcon = (slug: string) => {
  switch (slug) {
    case 'arcades':
      return <Gamepad2 size={16} />
    case 'accesorios':
      return <Wrench size={16} />
    default:
      return <Gamepad2 size={16} />
  }
}

export function ProductsClient({
  products,
  categories,
  activeCategory,
  searchQuery,
}: ProductsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState(searchQuery)

  function applyFilter(cat: string, q?: string) {
    const params = new URLSearchParams()
    if (cat && cat !== 'todos') params.set('categoria', cat)
    if (q) params.set('buscar', q)
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    applyFilter(activeCategory, search)
  }

  const allTab = { id: 'todos', name: 'Todos', slug: 'todos', icon: <LayoutGrid size={16} /> }
  const expressTab = { id: 'express', name: 'Entrega Express', slug: 'express', icon: <Zap size={16} /> }
  const tabs = [allTab, expressTab, ...categories]

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'var(--space-16)' }}>
      {/* Page header */}
      <div
        style={{
          background: 'var(--color-bg-2)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--space-8) 0 var(--space-6)',
        }}
      >
        <div className="container">
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
              fontWeight: 800,
              marginBottom: 'var(--space-2)',
            }}
          >
            <span className="text-gradient-cyan">Catálogo</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
            {products.length} producto{products.length !== 1 ? 's' : ''} disponibles
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-3)', maxWidth: 480 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar arcades, accesorios..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.75rem' }}
                id="products-search-input"
              />
            </div>
            {search && (
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => {
                  setSearch('')
                  applyFilter(activeCategory, '')
                }}
                aria-label="Limpiar búsqueda"
              >
                <X size={18} />
              </button>
            )}
            <button type="submit" className="btn btn-primary" id="products-search-btn">
              Buscar
            </button>
          </form>
        </div>
      </div>

      <div className="container" style={{ marginTop: 'var(--space-6)' }}>
        {/* Category tabs */}
        <div className="category-tabs" style={{ marginBottom: 'var(--space-8)' }}>
          {tabs.map((tab: any) => (
            <button
              key={tab.slug}
              className={`category-tab ${activeCategory === tab.slug ? 'active' : ''}`}
              onClick={() => applyFilter(tab.slug, search)}
              id={`category-tab-${tab.slug}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              {tab.slug === 'todos' || tab.slug === 'express' ? tab.icon : getCategoryIcon(tab.slug)}
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Products grid */}
        {products.length > 0 ? (
          <div className="product-grid">
            {products.map((product: Product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-16) 0',
              color: 'var(--color-text-muted)',
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🔍</div>
            <h3 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
              No encontramos productos
            </h3>
            <p style={{ fontSize: '0.9375rem' }}>
              Probá con otra búsqueda o categoría
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
