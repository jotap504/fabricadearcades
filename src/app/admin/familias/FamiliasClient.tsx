'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import { Trash, Edit2, Boxes, Search, X } from 'lucide-react'

interface Family {
  id: string
  name: string
  supply_ids?: string[]
}

interface Supply {
  id: string
  name: string
  quantity: number
}

interface Props {
  initialFamilies: Family[]
  supplies: Supply[]
}

export function FamiliasClient({ initialFamilies, supplies }: Props) {
  const supabase = createClient()
  const toast = useToast()

  const [families, setFamilies] = useState<Family[]>(() => {
    if (initialFamilies && initialFamilies.length > 0) return initialFamilies
    return [
      { id: 'fam-vinyl-78', name: 'Vinilos Consola 78cm' },
      { id: 'fam-vinyl-32', name: 'Vinilos Arcade 32"' },
      { id: 'fam-joy-sanwa', name: 'Palanca Sanwa' },
      { id: 'fam-joy-americana', name: 'Palanca Americana' },
      { id: 'fam-joy-led', name: 'Palanca LED' },
      { id: 'fam-btn-30', name: 'Botones 30mm' },
      { id: 'fam-btn-24', name: 'Botones 24mm' },
      { id: 'fam-btn-led-30', name: 'Botones LED 30mm' },
    ]
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const filteredFamilies = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    if (!term) return families
    return families.filter((family) => {
      const supplyIds = family.supply_ids ?? []
      const supplyNames = supplies.filter((supply) => supplyIds.includes(supply.id)).map((supply) => supply.name)
      return [family.name, ...supplyNames].join(' ').toLocaleLowerCase('es').includes(term)
    })
  }, [families, supplies, search])

  async function saveFamiliesToDB(updatedFamilies: Family[]) {
    setSaving(true)

    // Fetch existing pricing_config to merge and preserve supply_ids
    const { data: existingConfig } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('key', 'supply_families')
      .maybeSingle()

    let existingList: Family[] = []
    if (existingConfig?.value) {
      try {
        const parsed = typeof existingConfig.value === 'string' ? JSON.parse(existingConfig.value) : existingConfig.value
        existingList = Array.isArray(parsed) ? parsed as Family[] : []
      } catch {
        existingList = []
      }
    }

    const merged = updatedFamilies.map((f) => {
      const existing = existingList.find((e) => e.id === f.id)
      return {
        ...f,
        supply_ids: f.supply_ids || existing?.supply_ids || [],
      }
    })

    const { error } = await supabase
      .from('pricing_config')
      .upsert({
        key: 'supply_families',
        value: merged,
        label: 'Familias de Insumos',
        updated_at: new Date().toISOString(),
      })

    setSaving(false)
    if (error) {
      toast.error('Error al guardar familias', error.message)
    } else {
      toast.success('Familias actualizadas')
    }
  }

  function handleCreateOrUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    let updated: Family[]
    if (editingId) {
      updated = families.map((f) =>
        f.id === editingId ? { ...f, name: name.trim() } : f
      )
      toast.success('Familia actualizada', name)
    } else {
      const newFam: Family = {
        id: `fam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
      }
      updated = [...families, newFam]
      toast.success('Familia creada', name)
    }

    setFamilies(updated)
    saveFamiliesToDB(updated)
    setEditingId(null)
    setName('')
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta familia de insumos?')) return
    const updated = families.filter((f) => f.id !== id)
    setFamilies(updated)
    saveFamiliesToDB(updated)
  }

  function handleStartEdit(fam: Family) {
    setEditingId(fam.id)
    setName(fam.name)
  }

  return (
    <div style={{ maxWidth: 650 }}>
      {/* Create / Edit Form */}
      <div className="card card-body" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Boxes size={18} className="text-cyan" />
          {editingId ? 'Editar Nombre de Familia' : 'Nueva Familia de Insumos'}
        </h3>

        <form onSubmit={handleCreateOrUpdate} style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            required
            placeholder="ej: Palanca Sanwa, Botones 30mm, Vinilos Consola 78cm..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {editingId && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditingId(null)
                setName('')
              }}
            >
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {editingId ? 'Guardar' : '+ Agregar'}
          </button>
        </form>
      </div>

      {/* Simple Families Table */}
      <div className="card card-body">
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-4)' }}>
          Listado de Familias ({families.length})
        </h3>

        <div className="admin-list-toolbar">
          <label className="admin-search-field">
            <span className="sr-only">Buscar familias</span>
            <Search size={17} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar familia o insumo vinculado…" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda"><X size={15} /></button>}
          </label>
          <span className="admin-toolbar-count">{filteredFamilies.length} resultados</span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre de la Familia</th>
                <th>Insumos Vinculados</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredFamilies.map((fam) => {
                const familySupplyIds = fam.supply_ids || []
                const matchedSupplies = supplies.filter((s) => familySupplyIds.includes(s.id))
                return (
                  <tr key={fam.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{fam.name}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem' }}>
                        {matchedSupplies.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {matchedSupplies.map((s) => (
                              <span
                                key={s.id}
                                style={{
                                  padding: '2px 6px',
                                  background: 'var(--color-surface-2)',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.75rem',
                                  border: '1px solid var(--color-border)',
                                }}
                              >
                                {s.name} ({s.quantity} un)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                            0 insumos (editá o creá insumos para asignarlos a esta familia)
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleStartEdit(fam)}
                          title="Editar nombre"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => handleDelete(fam.id)}
                          title="Eliminar"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredFamilies.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
                    No encontramos familias con esa búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
