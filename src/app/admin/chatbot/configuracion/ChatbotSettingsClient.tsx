'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'

type Setting = { key: string; value: unknown; label: string | null }

export function ChatbotSettingsClient({ initialSettings, databasePending = false }: { initialSettings: Setting[]; databasePending?: boolean }) {
  const supabase = createClient()
  const toast = useToast()
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const map = new Map(settings.map((setting) => [setting.key, setting]))

  function value(key: string) {
    return map.get(key)?.value
  }

  function setValue(key: string, nextValue: unknown) {
    setSettings((current) => current.map((setting) => setting.key === key ? { ...setting, value: nextValue } : setting))
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('chatbot_bot_settings').upsert(settings)
    setSaving(false)
    if (error) return toast.error('No se pudo guardar', error.message)
    toast.success('Configuración guardada')
  }

  return (
    <div>
      <div className="admin-page-heading">
        <div><h1>Configuración del chatbot</h1><p>El bot queda apagado hasta terminar pruebas reales.</p></div>
        <button className="btn btn-primary" disabled={saving || databasePending} onClick={save}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
      {databasePending && <div className="admin-card" style={{ marginBottom: 'var(--space-5)' }}><h2>Base pendiente</h2><p>Falta aplicar las tablas `chatbot_*` en Supabase. Esta pantalla queda lista para cuando la migration esté aplicada.</p></div>}
      <div className="admin-card">
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
          <input type="checkbox" checked={Boolean(value('bot_active'))} onChange={(event) => setValue('bot_active', event.target.checked)} />
          Bot activo
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
