'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { InsumoInput } from './InsumoInput'
import { Search, Filter, AlertTriangle, Palette, PackageCheck } from 'lucide-react'

interface Props {
  supplies: SupplyRow[]
}

interface SupplyRow {
  id: string
  name: string
  supply_type: string
  color: string | null
  color_label: string | null
  quantity: number
  low_stock_threshold: number
  unit: string | null
  is_active: boolean
}

const TYPES: Record<string, string> = {
  button: '🔴 Botones',
  joystick: '🕹️ Palancas',
  vinyl: '🎨 Vinilos',
  led: '💡 LEDs',
  other: '📦 Otros',
}

export function InsumosTableClient({ supplies }: Props) {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [stockMode, setStockMode] = useState<'all' | 'physical' | 'designs'>('all')
  const [onlyLowStock, setOnlyLowStock] = useState(false)

  const isDesignOnly = (item: SupplyRow) => item.supply_type === 'vinyl' && item.unit === 'diseño'

  const summary = useMemo(() => {
    return supplies.reduce(
      (acc, item) => {
        if (isDesignOnly(item)) {
          acc.designs += 1
        } else {
          acc.physical += 1
          if (item.quantity <= 0) acc.out += 1
          else if (item.quantity <= item.low_stock_threshold) acc.low += 1
        }
        return acc
      },
      { physical: 0, designs: 0, low: 0, out: 0 },
    )
  }, [supplies])

  // Filter supplies list
  const filteredSupplies = useMemo(() => {
    return supplies.filter((item) => {
      const designOnly = isDesignOnly(item)

      // 1. Search term match (name, color label or ID)
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.color_label || '').toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase())

      // 2. Type match
      const matchesType = selectedType ? item.supply_type === selectedType : true

      // 3. Operational stock mode
      const matchesStockMode =
        stockMode === 'physical' ? !designOnly : stockMode === 'designs' ? designOnly : true

      // 4. Low stock match: design-only vinyl rows are catalog references, not physical stock
      const matchesLowStock = onlyLowStock
        ? !designOnly && item.quantity <= item.low_stock_threshold
        : true

      return matchesSearch && matchesType && matchesStockMode && matchesLowStock
    })
  }, [supplies, search, selectedType, stockMode, onlyLowStock])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="insumos-summary-grid">
        <div className="insumos-summary-card">
          <span className="insumos-summary-icon"><PackageCheck size={18} /></span>
          <div>
            <strong>{summary.physical}</strong>
            <span>Insumos físicos</span>
          </div>
        </div>
        <div className="insumos-summary-card">
          <span className="insumos-summary-icon"><Palette size={18} /></span>
          <div>
            <strong>{summary.designs}</strong>
            <span>Diseños de vinilo</span>
          </div>
        </div>
        <div className="insumos-summary-card is-warning">
          <span className="insumos-summary-icon"><AlertTriangle size={18} /></span>
          <div>
            <strong>{summary.low}</strong>
            <span>Stock bajo físico</span>
          </div>
        </div>
        <div className="insumos-summary-card is-danger">
          <span className="insumos-summary-icon"><AlertTriangle size={18} /></span>
          <div>
            <strong>{summary.out}</strong>
            <span>Sin stock físico</span>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          alignItems: 'center',
          background: 'var(--color-surface)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
            <Search size={16} />
          </span>
          <input
            className="form-input"
            style={{ paddingLeft: '34px', fontSize: '0.875rem' }}
            placeholder="Buscar por nombre, color o variante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
            <Filter size={16} />
          </span>
          <select
            className="form-input form-select"
            style={{ padding: '6px 12px', fontSize: '0.875rem', width: '160px' }}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TYPES).map(([key, val]) => (
              <option key={key} value={key}>
                {val}
              </option>
            ))}
          </select>
        </div>

        <select
          className="form-input form-select"
          style={{ padding: '6px 12px', fontSize: '0.875rem', width: '190px' }}
          value={stockMode}
          onChange={(e) => setStockMode(e.target.value as 'all' | 'physical' | 'designs')}
        >
          <option value="all">Todo</option>
          <option value="physical">Solo stock físico</option>
          <option value="designs">Solo diseños de vinilo</option>
        </select>

        {/* Low Stock Checkbox */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.875rem',
            color: onlyLowStock ? 'var(--color-amber)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            userSelect: 'none',
            marginLeft: 'auto',
          }}
        >
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          <AlertTriangle size={16} style={{ display: 'inline' }} />
          <span>Solo stock físico bajo / crítico</span>
        </label>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Color / Variante</th>
              <th style={{ width: '180px', textAlign: 'center' }}>Stock</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Alerta Min</th>
              <th style={{ width: '100px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredSupplies.map((item) => (
              <tr key={item.id} className={isDesignOnly(item) ? 'insumo-row-design' : ''}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    {isDesignOnly(item) && (
                      <span className="badge badge-designed">
                        Diseño digital
                      </span>
                    )}
                    {!item.is_active && (
                      <span style={{ fontSize: '0.6875rem', padding: '1px 6px', background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.id.slice(0, 8)}...</div>
                </td>
                <td>{TYPES[item.supply_type] || item.supply_type}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {item.color && (
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: item.color,
                          border: '1px solid var(--color-border)',
                        }}
                      />
                    )}
                    <span>{item.color_label || '—'}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {isDesignOnly(item) ? (
                      <div className="insumo-design-stock">
                        <span>Diseño cargado</span>
                        <small>No descuenta stock físico</small>
                      </div>
                    ) : (
                      <InsumoInput
                        id={item.id}
                        initialQuantity={item.quantity}
                        lowStockThreshold={item.low_stock_threshold}
                        unit={item.unit || 'u'}
                      />
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  {isDesignOnly(item) ? '—' : `${item.low_stock_threshold} ${item.unit || 'u'}`}
                </td>
                <td>
                  <Link href={`/admin/insumos/${item.id}`} className="btn btn-ghost btn-sm" id={`edit-insumo-${item.id}`}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {filteredSupplies.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)' }}>
                  No se encontraron insumos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
