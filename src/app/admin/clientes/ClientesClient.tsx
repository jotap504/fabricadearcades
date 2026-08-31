'use client'

import { useMemo, useState } from 'react'
import { ContactRound, Download, MailCheck, MessageCircle, Search, SlidersHorizontal, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import { formatPrice } from '@/lib/types'

type LifecycleStatus = 'lead' | 'customer' | 'inactive'

interface CustomerContact {
  id: string
  user_id: string | null
  email: string
  full_name: string
  phone: string | null
  company_name: string | null
  customer_type: 'cliente' | 'distribuidor'
  lifecycle_status: LifecycleStatus
  tags: string[]
  notes: string | null
  email_marketing_consent: boolean
  whatsapp_marketing_consent: boolean
  consent_source: string | null
  first_order_at: string | null
  last_order_at: string | null
  order_count: number
  total_spent: number
  created_at: string
  updated_at: string
}

const STATUS_LABELS: Record<LifecycleStatus, string> = {
  lead: 'Potencial',
  customer: 'Cliente',
  inactive: 'Inactivo',
}

export function ClientesClient({ contacts: initialContacts }: { contacts: CustomerContact[] }) {
  const supabase = createClient()
  const toast = useToast()
  const [contacts, setContacts] = useState(initialContacts)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [consent, setConsent] = useState('all')
  const [selected, setSelected] = useState<CustomerContact | null>(null)
  const [saving, setSaving] = useState(false)
  const [editStatus, setEditStatus] = useState<LifecycleStatus>('customer')
  const [editTags, setEditTags] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [emailConsent, setEmailConsent] = useState(false)
  const [whatsappConsent, setWhatsappConsent] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return contacts.filter((contact) => {
      const haystack = [contact.full_name, contact.email, contact.phone, contact.company_name, ...contact.tags]
        .filter(Boolean).join(' ').toLocaleLowerCase('es')
      const matchesSearch = !term || haystack.includes(term)
      const matchesType = type === 'all' || contact.customer_type === type
      const matchesStatus = status === 'all' || contact.lifecycle_status === status
      const matchesConsent = consent === 'all'
        || (consent === 'email' && contact.email_marketing_consent)
        || (consent === 'whatsapp' && contact.whatsapp_marketing_consent)
        || (consent === 'none' && !contact.email_marketing_consent && !contact.whatsapp_marketing_consent)
      return matchesSearch && matchesType && matchesStatus && matchesConsent
    })
  }, [contacts, search, type, status, consent])

  function openContact(contact: CustomerContact) {
    setSelected(contact)
    setEditStatus(contact.lifecycle_status)
    setEditTags(contact.tags.join(', '))
    setEditNotes(contact.notes ?? '')
    setEmailConsent(contact.email_marketing_consent)
    setWhatsappConsent(contact.whatsapp_marketing_consent)
  }

  async function saveContact() {
    if (!selected) return
    setSaving(true)
    const tags = [...new Set(editTags.split(',').map((tag) => tag.trim()).filter(Boolean))]
    const { data, error } = await supabase.rpc('admin_update_customer_contact', {
      p_contact_id: selected.id,
      p_lifecycle_status: editStatus,
      p_tags: tags,
      p_notes: editNotes,
      p_email_consent: emailConsent,
      p_whatsapp_consent: whatsappConsent,
      p_consent_source: 'admin',
    })
    setSaving(false)
    if (error) {
      toast.error('No se pudo guardar el cliente', error.message)
      return
    }
    const updated = data as CustomerContact
    setContacts((current) => current.map((contact) => contact.id === updated.id ? updated : contact))
    setSelected(null)
    toast.success('Cliente actualizado')
  }

  function exportFilteredContacts() {
    const escapeCsv = (value: unknown) => {
      const text = String(value ?? '')
      return `"${text.replaceAll('"', '""')}"`
    }
    const rows = filtered.map((contact) => [
      contact.full_name,
      contact.email,
      contact.phone,
      contact.company_name,
      contact.customer_type,
      STATUS_LABELS[contact.lifecycle_status],
      contact.email_marketing_consent ? 'si' : 'no',
      contact.whatsapp_marketing_consent ? 'si' : 'no',
      contact.tags.join(', '),
      contact.order_count,
      contact.total_spent,
      contact.last_order_at ? new Date(contact.last_order_at).toLocaleDateString('es-AR') : '',
    ])
    const csv = [
      ['Nombre', 'Email', 'Telefono', 'Empresa', 'Tipo', 'Estado', 'Acepta email', 'Acepta WhatsApp', 'Etiquetas', 'Compras', 'Total gastado', 'Ultima compra'],
      ...rows,
    ].map((row) => row.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const emailEnabled = contacts.filter((contact) => contact.email_marketing_consent).length
  const whatsappEnabled = contacts.filter((contact) => contact.whatsapp_marketing_consent).length

  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <h1>Clientes</h1>
          <p>Directorio comercial, historial y permisos de contacto</p>
        </div>
        <span className="admin-results-summary">{contacts.length} contactos</span>
      </div>

      <div className="customer-summary-grid">
        <div className="customer-summary-card"><ContactRound aria-hidden="true" /><div><strong>{contacts.length}</strong><span>Total</span></div></div>
        <div className="customer-summary-card"><MailCheck aria-hidden="true" /><div><strong>{emailEnabled}</strong><span>Aceptan email</span></div></div>
        <div className="customer-summary-card"><MessageCircle aria-hidden="true" /><div><strong>{whatsappEnabled}</strong><span>Aceptan WhatsApp</span></div></div>
      </div>

      <div className="admin-list-toolbar">
        <label className="admin-search-field">
          <span className="sr-only">Buscar clientes</span>
          <Search size={17} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, email, teléfono, empresa o etiqueta…" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda"><X size={15} /></button>}
        </label>
        <div className="admin-filter-group">
          <SlidersHorizontal size={17} aria-hidden="true" />
          <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Tipo de cliente">
            <option value="all">Todos los tipos</option><option value="cliente">Clientes finales</option><option value="distribuidor">Distribuidores</option>
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Estado comercial">
            <option value="all">Todos los estados</option><option value="lead">Potenciales</option><option value="customer">Clientes</option><option value="inactive">Inactivos</option>
          </select>
          <select value={consent} onChange={(event) => setConsent(event.target.value)} aria-label="Permiso de marketing">
            <option value="all">Cualquier permiso</option><option value="email">Acepta email</option><option value="whatsapp">Acepta WhatsApp</option><option value="none">Sin permisos</option>
          </select>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportFilteredContacts} disabled={filtered.length === 0}>
          <Download size={16} />
          Exportar CSV
        </button>
        <span className="admin-toolbar-count">{filtered.length} resultados</span>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Cliente</th><th>Tipo</th><th>Compras</th><th>Última compra</th><th>Marketing</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {filtered.map((contact) => (
              <tr key={contact.id}>
                <td><div style={{ fontWeight: 700 }}>{contact.full_name}</div><div className="table-secondary">{contact.email}</div><div className="table-secondary">{contact.phone ?? 'Sin teléfono'}{contact.company_name ? ` · ${contact.company_name}` : ''}</div></td>
                <td><span className="badge">{contact.customer_type === 'distribuidor' ? 'Distribuidor' : 'Cliente final'}</span></td>
                <td><strong>{contact.order_count}</strong><div className="table-secondary">{formatPrice(contact.total_spent)}</div></td>
                <td className="table-secondary">{contact.last_order_at ? new Date(contact.last_order_at).toLocaleDateString('es-AR') : 'Sin compras'}</td>
                <td><div className="consent-badges"><span className={contact.email_marketing_consent ? 'enabled' : ''}>Email</span><span className={contact.whatsapp_marketing_consent ? 'enabled' : ''}>WhatsApp</span></div></td>
                <td><span className={`customer-status customer-status-${contact.lifecycle_status}`}>{STATUS_LABELS[contact.lifecycle_status]}</span></td>
                <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => openContact(contact)}>Gestionar</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="admin-empty-state">No encontramos clientes con esos filtros. Probá limpiar la búsqueda o ampliar los estados.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay open" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h2 className="modal-title">{selected.full_name}</h2><div className="table-secondary">{selected.email}</div></div><button type="button" className="btn btn-ghost btn-icon" aria-label="Cerrar" onClick={() => setSelected(null)}><X size={18} /></button></div>
            <div className="modal-body customer-edit-form">
              <label className="form-group"><span className="form-label">Estado comercial</span><select className="form-input form-select" value={editStatus} onChange={(event) => setEditStatus(event.target.value as LifecycleStatus)}><option value="lead">Potencial</option><option value="customer">Cliente</option><option value="inactive">Inactivo</option></select></label>
              <label className="form-group"><span className="form-label">Etiquetas</span><input className="form-input" value={editTags} onChange={(event) => setEditTags(event.target.value)} placeholder="mayorista, buenos aires, evento" /><small>Separalas con comas.</small></label>
              <label className="form-group"><span className="form-label">Notas internas</span><textarea className="form-input" rows={4} value={editNotes} onChange={(event) => setEditNotes(event.target.value)} /></label>
              <fieldset className="customer-consent-fieldset"><legend>Permisos de marketing</legend><p>Activá estos permisos únicamente cuando el cliente haya dado su consentimiento.</p><label><input type="checkbox" checked={emailConsent} onChange={(event) => setEmailConsent(event.target.checked)} /> Acepta campañas por email</label><label><input type="checkbox" checked={whatsappConsent} onChange={(event) => setWhatsappConsent(event.target.checked)} /> Acepta campañas por WhatsApp</label></fieldset>
              <button type="button" className="btn btn-primary" onClick={saveContact} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cliente'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
