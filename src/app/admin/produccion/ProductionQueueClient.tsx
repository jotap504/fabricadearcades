'use client'

import { useState } from 'react'
import { useToast } from '@/lib/stores/toast'
import { PRODUCTION_STATUS_CONFIG, type ProductionQueueItem, type ProductionStatus } from '@/lib/types'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, ListFilter, RefreshCw, Search, X } from 'lucide-react'
import { assignProductionItem, updateProductionStatus } from './actions'

const COLUMNS: { status: ProductionStatus; color: string }[] = [
  { status: 'pending', color: 'var(--color-amber)' },
  { status: 'in_progress', color: 'var(--color-purple)' },
  { status: 'finished', color: 'var(--color-green)' },
  { status: 'dispatched', color: 'var(--color-cyan)' },
]

type StatusFilter = 'all' | ProductionStatus
type TaskKindFilter = 'all' | 'print' | 'custom_design' | 'assembly'
type QueueItem = Omit<ProductionQueueItem, 'order'> & {
  order?: {
    order_number: string
    customer_name: string
    customer_email: string
    customer_phone: string | null
  } | null
}

interface Props {
  queue: QueueItem[]
  fabricantes: { id: string; full_name: string | null }[]
  isAdmin: boolean
}

export function ProductionQueueClient({ queue, fabricantes, isAdmin }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [items, setItems] = useState(queue)
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [taskKindFilter, setTaskKindFilter] = useState<TaskKindFilter>('all')
  const [search, setSearch] = useState('')

  async function updateStatus(itemId: string, newStatus: ProductionStatus) {
    const now = new Date().toISOString()
    const updates: Partial<ProductionQueueItem> = { status: newStatus, updated_at: now }
    if (newStatus === 'in_progress') updates.started_at = now
    if (newStatus === 'finished') updates.finished_at = now
    if (newStatus === 'dispatched') updates.dispatched_at = now

    try {
      await updateProductionStatus(itemId, newStatus)
    } catch {
      toast.error('Error al actualizar el estado')
      return
    }

    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    )

    toast.success('Estado actualizado', PRODUCTION_STATUS_CONFIG[newStatus].label)
    setSelectedItem(null)
  }

  async function assignFabricante(itemId: string, fabricanteId: string) {
    try {
      await assignProductionItem(itemId, fabricanteId || null)
    } catch {
      toast.error('Error al asignar fabricante')
      return
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, assigned_to: fabricanteId } : item
      )
    )
    toast.success('Fabricante asignado')
  }

  async function refresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1000)
  }

  const byStatus = (status: ProductionStatus) =>
    items.filter((item) => item.status === status)

  const getTaskKind = (item: QueueItem): TaskKindFilter => {
    const summary = (item.customization_summary || '').toLocaleLowerCase('es')
    if (summary.includes('diseño/impresión personalizada')) return 'custom_design'
    if (summary.includes('impresión de vinilo')) return 'print'
    return 'assembly'
  }

  const getTaskKindInfo = (item: QueueItem) => {
    const kind = getTaskKind(item)
    if (kind === 'custom_design') {
      return {
        label: 'Diseño + impresión',
        className: 'badge-designed',
        helper: 'Coordinar imagen con cliente y mandar a imprimir.',
      }
    }
    if (kind === 'print') {
      return {
        label: 'Impresión vinilo',
        className: 'badge-printed',
        helper: 'Enviar archivo/diseño a impresión antes del armado.',
      }
    }
    return {
      label: 'Armado',
      className: 'badge-immediate',
      helper: 'Preparar gabinete, controles y configuración final.',
    }
  }

  const matchesSearch = (item: QueueItem) => {
    const term = search.trim().toLocaleLowerCase('es')
    if (!term) return true
    const fabricante = fabricantes.find((candidate) => candidate.id === item.assigned_to)
    return [item.product_name, item.order?.order_number, item.order?.customer_name, item.customization_summary, fabricante?.full_name]
      .filter(Boolean).join(' ').toLocaleLowerCase('es').includes(term)
  }

  const visibleByStatus = (status: ProductionStatus) =>
    byStatus(status)
      .filter((item) => taskKindFilter === 'all' || getTaskKind(item) === taskKindFilter)
      .filter(matchesSearch)

  const visibleColumns = statusFilter === 'all'
    ? COLUMNS
    : COLUMNS.filter(({ status }) => status === statusFilter)
  const visiblePool = statusFilter === 'all' ? items : byStatus(statusFilter)
  const visibleItemsCount = visiblePool
    .filter((item) => taskKindFilter === 'all' || getTaskKind(item) === taskKindFilter)
    .filter(matchesSearch).length
  const taskKindCounts = {
    all: items.length,
    print: items.filter((item) => getTaskKind(item) === 'print').length,
    custom_design: items.filter((item) => getTaskKind(item) === 'custom_design').length,
    assembly: items.filter((item) => getTaskKind(item) === 'assembly').length,
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
            Cola de Producción
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
            {items.filter((i) => i.status !== 'dispatched').length} items activos
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={refresh}
          disabled={refreshing}
          id="production-refresh-btn"
        >
          <RefreshCw size={16} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>

      <div className="admin-list-toolbar">
        <label className="admin-search-field">
          <span className="sr-only">Buscar trabajos de producción</span>
          <Search size={17} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por producto, pedido, cliente o fabricante…" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda"><X size={15} /></button>}
        </label>
        <span className="admin-toolbar-count">{visibleItemsCount} resultados</span>
      </div>

      <section className="production-filters" aria-labelledby="production-filters-title">
        <div className="production-filters-heading">
          <ListFilter size={18} aria-hidden="true" />
          <div>
            <h2 id="production-filters-title">Filtrar por estado</h2>
            <p>Mostrando {visibleItemsCount} de {items.length} trabajos</p>
          </div>
        </div>
        <div className="production-filter-options" role="group" aria-label="Estado de producción">
          <button
            type="button"
            className={clsx('production-filter-button', { active: statusFilter === 'all' })}
            aria-pressed={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          >
            Todos
            <span>{items.length}</span>
          </button>
          {COLUMNS.map(({ status }) => {
            const config = PRODUCTION_STATUS_CONFIG[status]
            return (
              <button
                type="button"
                key={status}
                className={clsx('production-filter-button', { active: statusFilter === status })}
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              >
                {config.label}
                <span>{byStatus(status).length}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="production-filters" aria-labelledby="production-kind-filters-title">
        <div className="production-filters-heading">
          <ClipboardCheck size={18} aria-hidden="true" />
          <div>
            <h2 id="production-kind-filters-title">Filtrar por tipo de tarea</h2>
            <p>Separá impresión, diseño personalizado y armado</p>
          </div>
        </div>
        <div className="production-filter-options" role="group" aria-label="Tipo de tarea">
          {[
            { id: 'all' as TaskKindFilter, label: 'Todas' },
            { id: 'print' as TaskKindFilter, label: 'Impresión vinilo' },
            { id: 'custom_design' as TaskKindFilter, label: 'Diseño personalizado' },
            { id: 'assembly' as TaskKindFilter, label: 'Armado' },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              className={clsx('production-filter-button', { active: taskKindFilter === option.id })}
              aria-pressed={taskKindFilter === option.id}
              onClick={() => setTaskKindFilter(option.id)}
            >
              {option.label}
              <span>{taskKindCounts[option.id]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Kanban board */}
      <div className={clsx('production-kanban', { 'production-kanban-filtered': statusFilter !== 'all' })}>
        {visibleColumns.map(({ status, color }) => {
          const columnItems = visibleByStatus(status)
          const config = PRODUCTION_STATUS_CONFIG[status]

          return (
            <div key={status} className="kanban-column">
              <div className="kanban-column-header">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    color,
                  }}
                >
                  <span>{config.icon}</span>
                  <span className="kanban-column-title">{config.label}</span>
                </div>
                <span className="kanban-count">{columnItems.length}</span>
              </div>
              <div className="kanban-items">
                {columnItems.map((item) => {
                  const fabricante = fabricantes.find((f) => f.id === item.assigned_to)
                  const taskKind = getTaskKindInfo(item)
                  return (
                    <div
                      key={item.id}
                      className="kanban-item"
                      onClick={() => setSelectedItem(item)}
                      id={`production-item-${item.id}`}
                    >
                      <div className="kanban-item-badges">
                        <span className={`badge ${taskKind.className}`}>{taskKind.label}</span>
                      </div>
                      <div className="kanban-item-title">{item.product_name}</div>
                      <div className="kanban-item-order">
                        {item.order?.order_number ?? 'Sin orden'}
                      </div>
                      {item.customization_summary && (
                        <div className="kanban-item-meta">
                          {item.customization_summary}
                        </div>
                      )}
                      {fabricante && (
                        <div
                          className="kanban-item-meta"
                          style={{ color: 'var(--color-cyan)', marginTop: 4 }}
                        >
                          👤 {fabricante.full_name}
                        </div>
                      )}
                    </div>
                  )
                })}
                {columnItems.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 'var(--space-6)',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.875rem',
                    }}
                  >
                    Sin items
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Item detail modal */}
      {selectedItem && (
        <div className="modal-overlay open" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedItem.product_name}</h3>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSelectedItem(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                  fontSize: '0.9375rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                    Pedido
                  </span>
                  <div style={{ fontFamily: 'var(--font-display)', color: 'var(--color-cyan)' }}>
                    {selectedItem.order?.order_number}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                    Cliente
                  </span>
                  <div>{selectedItem.order?.customer_name}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {selectedItem.order?.customer_phone}
                  </div>
                </div>
                {selectedItem.customization_summary && (
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                      Personalización
                    </span>
                    <div>{selectedItem.customization_summary}</div>
                  </div>
                )}
                {(() => {
                  const taskKind = getTaskKindInfo(selectedItem)
                  const checklist =
                    getTaskKind(selectedItem) === 'custom_design'
                      ? ['Contactar al cliente por imagen/referencia', 'Validar medidas del vinilo', 'Enviar archivo a impresión', 'Marcar como en producción al recibir confirmación']
                      : getTaskKind(selectedItem) === 'print'
                        ? ['Identificar diseño elegido', 'Enviar archivo a imprenta', 'Confirmar plazo de entrega del vinilo', 'Avisar a armado cuando llegue']
                        : ['Revisar insumos reservados', 'Armar gabinete y controles', 'Configurar sistema', 'Control final y embalaje']
                  return (
                    <div className="production-task-panel">
                      <span className={`badge ${taskKind.className}`}>{taskKind.label}</span>
                      <p>{taskKind.helper}</p>
                      <ul>
                        {checklist.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )
                })()}

                {/* Assign fabricante */}
                {isAdmin && (
                  <div className="form-group">
                    <label className="form-label">Asignar a fabricante</label>
                    <select
                      className="form-input form-select"
                      value={selectedItem.assigned_to ?? ''}
                      onChange={(e) => assignFabricante(selectedItem.id, e.target.value)}
                    >
                      <option value="">Sin asignar</option>
                      {fabricantes.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status actions */}
                <div>
                  <span
                    style={{
                      display: 'block',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.8125rem',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    Cambiar estado
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {(
                      ['pending', 'in_progress', 'finished', 'dispatched'] as ProductionStatus[]
                    ).map((s) => {
                      const conf = PRODUCTION_STATUS_CONFIG[s]
                      const isCurrentStatus = selectedItem.status === s
                      return (
                        <button
                          key={s}
                          className={clsx('btn btn-sm', {
                            'btn-primary': isCurrentStatus,
                            'btn-ghost': !isCurrentStatus,
                          })}
                          onClick={() => updateStatus(selectedItem.id, s)}
                          disabled={isCurrentStatus}
                          id={`production-status-${s}`}
                        >
                          {conf.icon} {conf.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
