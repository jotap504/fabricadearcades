'use client'

import { useState } from 'react'
import { Plus, Check, RefreshCw, X, PackagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import { useRouter } from 'next/navigation'

interface ProductOption {
  id: string
  name: string
  slug: string
  product_type: string
  base_price: number
  images?: string[] | null
}

interface SupplyOption {
  id: string
  name: string
  supply_type: string
  quantity: number
  color_label?: string | null
  image_url?: string | null
}

interface Props {
  products: ProductOption[]
  supplies: SupplyOption[]
}

export function QuickStockModal({ products, supplies }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'product' | 'supply'>('product')
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '')
  const [selectedSupplyId, setSelectedSupplyId] = useState(supplies[0]?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const supabase = createClient()
  const toast = useToast()
  const router = useRouter()

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.product_type.toLowerCase().includes(search.toLowerCase())
  )

  const filteredSupplies = supplies.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.color_label && s.color_label.toLowerCase().includes(search.toLowerCase())) ||
    s.supply_type.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault()
    if (quantity <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }
    setLoading(true)

    try {
      if (activeTab === 'product') {
        const prod = products.find((p) => p.id === selectedProductId)
        if (!prod) throw new Error('Producto no encontrado')

        // Fetch or create immediate stock row
        const { data: existing, error: fetchErr } = await supabase
          .from('stock_items')
          .select('id, quantity')
          .eq('product_id', selectedProductId)
          .eq('stock_type', 'immediate')
          .maybeSingle()

        if (fetchErr) throw fetchErr

        if (existing) {
          const { error: updErr } = await supabase
            .from('stock_items')
            .update({
              quantity: existing.quantity + quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
          if (updErr) throw updErr
        } else {
          const { error: insErr } = await supabase
            .from('stock_items')
            .insert({
              product_id: selectedProductId,
              stock_type: 'immediate',
              quantity: quantity,
            })
          if (insErr) throw insErr
        }

        toast.success(`+${quantity} unidades agregadas a ${prod.name}`)
      } else {
        const sup = supplies.find((s) => s.id === selectedSupplyId)
        if (!sup) throw new Error('Insumo no encontrado')

        const { error: updErr } = await supabase
          .from('supply_inventory')
          .update({
            quantity: sup.quantity + quantity,
          })
          .eq('id', selectedSupplyId)

        if (updErr) throw updErr
        toast.success(`+${quantity} unidades sumadas a ${sup.name}`)
      }

      setIsOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error('Error al agregar stock', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => setIsOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <PackagePlus size={16} />
        + Carga Rápida de Stock
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 580,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-4) var(--space-5)',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PackagePlus size={20} className="text-cyan" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                  Carga Rápida de Stock Inmediato
                </h2>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab selector: Producto / Accesorio vs Insumo */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab('product')
                  setSearch('')
                }}
                style={{
                  flex: 1,
                  padding: 'var(--space-3)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  borderBottom: activeTab === 'product' ? '2px solid var(--color-cyan)' : '2px solid transparent',
                  background: activeTab === 'product' ? 'var(--color-cyan-dim)' : 'transparent',
                  color: activeTab === 'product' ? 'var(--color-cyan)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                🎮 Productos & Accesorios ({products.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('supply')
                  setSearch('')
                }}
                style={{
                  flex: 1,
                  padding: 'var(--space-3)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  borderBottom: activeTab === 'supply' ? '2px solid var(--color-cyan)' : '2px solid transparent',
                  background: activeTab === 'supply' ? 'var(--color-cyan-dim)' : 'transparent',
                  color: activeTab === 'supply' ? 'var(--color-cyan)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                📦 Insumos & Repuestos ({supplies.length})
              </button>
            </div>

            <form onSubmit={handleAddStock} style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">
                  Filtrar / Buscar {activeTab === 'product' ? 'producto' : 'insumo'}
                </label>
                <input
                  type="search"
                  className="form-input"
                  placeholder="Escribí para buscar…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {activeTab === 'product' ? (
                <div className="form-group">
                  <label className="form-label">Seleccionar Producto *</label>
                  <select
                    className="form-input form-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                    size={6}
                    style={{ height: 'auto', maxHeight: 180 }}
                  >
                    {filteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.product_type === 'accessory' ? 'Accesorio' : p.product_type}) — ${p.base_price?.toLocaleString('es-AR')}
                      </option>
                    ))}
                    {filteredProducts.length === 0 && (
                      <option disabled>No se encontraron productos</option>
                    )}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Seleccionar Insumo *</label>
                  <select
                    className="form-input form-select"
                    value={selectedSupplyId}
                    onChange={(e) => setSelectedSupplyId(e.target.value)}
                    required
                    size={6}
                    style={{ height: 'auto', maxHeight: 180 }}
                  >
                    {filteredSupplies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.color_label ? `(${s.color_label})` : ''} — Stock actual: {s.quantity}
                      </option>
                    ))}
                    {filteredSupplies.length === 0 && (
                      <option disabled>No se encontraron insumos</option>
                    )}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Cantidad a sumar *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
                  {[1, 5, 10, 20].map((quickVal) => (
                    <button
                      key={quickVal}
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1, padding: '8px 0', border: '1px solid var(--color-border)' }}
                      onClick={() => setQuantity(quickVal)}
                    >
                      +{quickVal}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : `Sumar +${quantity} al Stock`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
