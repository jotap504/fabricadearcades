'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import type { UserProfile, UserRole } from '@/lib/types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  fabricante: 'Fabricante',
  distribuidor: 'Distribuidor',
  cliente: 'Cliente',
}

interface Props {
  users: UserProfile[]
}

export function UsersClient({ users: initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const supabase = createClient()
  const toast = useToast()

  async function updateRole(userId: string, role: UserRole) {
    const { error } = await supabase.rpc('admin_update_user', {
      p_user_id: userId,
      p_role: role,
      p_distributor_approved: null,
      p_current_account_enabled: null,
    })

    if (error) {
      toast.error('Error al actualizar el rol')
      return
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role } : u))
    )
    toast.success('Rol actualizado', ROLE_LABELS[role])
  }

  async function approveDistributor(userId: string) {
    const { error } = await supabase.rpc('admin_update_user', {
      p_user_id: userId,
      p_role: 'distribuidor',
      p_distributor_approved: true,
      p_current_account_enabled: null,
    })

    if (error) {
      toast.error('Error al aprobar distribuidor')
      return
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, distributor_approved: true, role: 'distribuidor' } : u
      )
    )
    toast.success('Distribuidor aprobado', 'El usuario fue notificado')
  }

  async function toggleCurrentAccount(userId: string, enabled: boolean) {
    const { error } = await supabase.rpc('admin_update_user', {
      p_user_id: userId,
      p_role: null,
      p_distributor_approved: null,
      p_current_account_enabled: enabled,
    })

    if (error) {
      toast.error('Error al actualizar la cuenta corriente')
      return
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, current_account_enabled: enabled } : u))
    )
    toast.success(enabled ? 'Cuenta corriente habilitada' : 'Cuenta corriente deshabilitada')
  }

  const filtered = useMemo(() => {
    const byRole = filter === 'all'
      ? users
      : filter === 'pending_distributors'
        ? users.filter((u) => u.distributor_requested && !u.distributor_approved)
        : users.filter((u) => u.role === filter)
    const term = search.trim().toLocaleLowerCase('es')
    if (!term) return byRole
    return byRole.filter((user) => [user.full_name, user.phone, user.company_name, user.role]
      .filter(Boolean).join(' ').toLocaleLowerCase('es').includes(term))
  }, [users, filter, search])

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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Usuarios</h1>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          {users.length} usuarios
        </span>
      </div>

      <div className="admin-list-toolbar">
        <label className="admin-search-field">
          <span className="sr-only">Buscar usuarios</span>
          <Search size={17} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, teléfono, empresa o rol…" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda"><X size={15} /></button>}
        </label>
        <span className="admin-toolbar-count">{filtered.length} resultados</span>
      </div>

      {/* Filters */}
      <div className="category-tabs" style={{ marginBottom: 'var(--space-5)' }}>
        {[
          { value: 'all', label: 'Todos' },
          { value: 'pending_distributors', label: '⚡ Dist. pendientes' },
          { value: 'distribuidor', label: 'Distribuidores' },
          { value: 'cliente', label: 'Clientes' },
          { value: 'fabricante', label: 'Fabricantes' },
          { value: 'admin', label: 'Admins' },
        ].map((f) => (
          <button
            key={f.value}
            className={`category-tab ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
            id={`users-filter-${f.value}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Empresa</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Cuenta corriente</th>
              <th>Registrado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{u.full_name ?? '—'}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {u.phone}
                  </div>
                </td>
                <td>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
                    {u.company_name ?? '—'}
                  </span>
                </td>
                <td>
                  <select
                    className="form-input form-select"
                    style={{ padding: '4px 28px 4px 8px', fontSize: '0.8125rem', width: 'auto' }}
                    value={u.role}
                    onChange={(e) => updateRole(u.id, e.target.value as UserRole)}
                    id={`user-role-${u.id}`}
                  >
                    {Object.entries(ROLE_LABELS).map(([role, label]) => (
                      <option key={role} value={role}>{label}</option>
                    ))}
                  </select>
                </td>
                <td>
                  {u.role === 'distribuidor' || u.distributor_requested ? (
                    u.distributor_approved ? <span className="badge badge-immediate">✓ Aprobado</span> : <span className="badge badge-printed">⏳ Pendiente</span>
                  ) : <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>—</span>}
                </td>
                <td>
                  {u.role === 'distribuidor' && u.distributor_approved ? (
                    <button
                      className={`btn btn-sm ${u.current_account_enabled ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => toggleCurrentAccount(u.id, !u.current_account_enabled)}
                      id={`current-account-${u.id}`}
                    >
                      {u.current_account_enabled ? 'Habilitada' : 'Habilitar'}
                    </button>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                  )}
                </td>
                <td
                  style={{
                    color: 'var(--color-text-muted)',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {new Date(u.created_at).toLocaleDateString('es-AR')}
                </td>
                <td>
                  {u.distributor_requested && !u.distributor_approved && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => approveDistributor(u.id)}
                      id={`approve-distributor-${u.id}`}
                    >
                      ✓ Aprobar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: 'var(--space-10)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  No hay usuarios en esta categoría
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
