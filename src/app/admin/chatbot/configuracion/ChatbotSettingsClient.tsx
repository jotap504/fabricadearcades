'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'

type Setting = { key: string; value: unknown; label: string | null }
type HandoffRouteItem = {
  id: string
  route_key: string
  label: string
  responsible_phone: string
  keywords: string[]
  priority: number
  active: boolean
}

export function ChatbotSettingsClient({
  initialSettings,
  initialRoutes = [],
  databasePending = false,
}: {
  initialSettings: Setting[]
  initialRoutes?: HandoffRouteItem[]
  databasePending?: boolean
}) {
  const supabase = createClient()
  const toast = useToast()
  const [settings, setSettings] = useState(initialSettings)
  const [routes, setRoutes] = useState<HandoffRouteItem[]>(initialRoutes)
  const [saving, setSaving] = useState(false)
  const map = new Map(settings.map((setting) => [setting.key, setting]))

  function value(key: string) {
    return map.get(key)?.value
  }

  function setValue(key: string, nextValue: unknown) {
    setSettings((current) => current.map((setting) => (setting.key === key ? { ...setting, value: nextValue } : setting)))
  }

  function updateRoute(routeKey: string, field: keyof HandoffRouteItem, nextValue: any) {
    setRoutes((current) =>
      current.map((r) => (r.route_key === routeKey ? { ...r, [field]: nextValue } : r))
    )
  }

  async function save() {
    setSaving(true)
    const [settingsRes, routesRes] = await Promise.all([
      supabase.from('chatbot_bot_settings').upsert(settings),
      routes.length > 0 ? supabase.from('chatbot_handoff_routes').upsert(routes) : Promise.resolve({ error: null }),
    ])
    setSaving(false)
    if (settingsRes.error) return toast.error('No se pudo guardar la configuración', settingsRes.error.message)
    if (routesRes.error) return toast.error('No se pudieron guardar las rutas', routesRes.error.message)
    toast.success('Configuración y rutas guardadas correctamente')
  }

  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <h1>Configuración del chatbot</h1>
          <p>Ajustes de modelo, umbrales y teléfonos responsables para derivación y respuesta por WhatsApp.</p>
        </div>
        <button className="btn btn-primary" disabled={saving || databasePending} onClick={save}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {databasePending && (
        <div className="admin-card" style={{ marginBottom: 'var(--space-5)' }}>
          <h2>Base pendiente</h2>
          <p>Falta aplicar las tablas `chatbot_*` en Supabase. Esta pantalla queda lista para cuando la migration esté aplicada.</p>
        </div>
      )}

      {/* RUTAS DE DERIVACIÓN HUMANA */}
      <div className="admin-card" style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-2)' }}>📱 Teléfonos Responsables de Derivación (Handoff)</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-4)' }}>
          Cuando el bot no sabe una respuesta o el cliente pide hablar con una persona, se reenvía el mensaje al número asignado. El responsable puede <strong>responder directamente desde su WhatsApp</strong> y el bot reenviará la respuesta al cliente.
        </p>

        {routes.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No hay rutas registradas.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {routes.map((route) => (
              <div
                key={route.route_key}
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ minWidth: 200, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      id={`route-active-${route.route_key}`}
                      checked={route.active}
                      onChange={(e) => updateRoute(route.route_key, 'active', e.target.checked)}
                    />
                    <label htmlFor={`route-active-${route.route_key}`} style={{ fontWeight: 700, cursor: 'pointer' }}>
                      {route.label}
                    </label>
                  </div>
                  <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>
                    Clave: <code>{route.route_key}</code> · Prioridad: {route.priority}
                  </small>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Teléfono:</label>
                  <input
                    className="form-input"
                    style={{ width: 170, fontSize: '0.875rem', padding: '6px 10px' }}
                    value={route.responsible_phone}
                    onChange={(e) => updateRoute(route.route_key, 'responsible_phone', e.target.value)}
                    placeholder="54911xxxxxxxx"
                  />
                  <span
                    className={`badge ${route.active ? 'badge-success' : ''}`}
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    {route.active ? 'Activa' : 'Pausada'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-card">
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, fontWeight: 700 }}>
          <input type="checkbox" checked={Boolean(value('bot_active'))} onChange={(event) => setValue('bot_active', event.target.checked)} />
          Bot activo (responde automáticamente a clientes)
        </label>
        {['company_name', 'assistant_name', 'welcome_message', 'handoff_message', 'llm_model', 'llm_fallback_model'].map((key) => (
          <div className="form-group" key={key}>
            <label className="form-label">{map.get(key)?.label ?? key}</label>
            <input className="form-input" value={String(value(key) ?? '')} onChange={(event) => setValue(key, event.target.value)} />
          </div>
        ))}
        {['confidence_threshold', 'rag_threshold', 'top_k', 'temperature', 'debounce_ms'].map((key) => (
          <div className="form-group" key={key}>
            <label className="form-label">{map.get(key)?.label ?? key}</label>
            <input className="form-input" type="number" step="0.01" value={Number(value(key) ?? 0)} onChange={(event) => setValue(key, Number(event.target.value))} />
          </div>
        ))}
      </div>
    </div>
  )
}
