'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import { regenerateKnowledgeEmbedding } from '../actions'

type KnowledgeItem = {
  id: string
  category: string
  title: string
  content: string
  active: boolean
  priority: number
  updated_at: string
}

export function ChatbotKnowledgeClient({ initialItems, databasePending = false }: { initialItems: KnowledgeItem[]; databasePending?: boolean }) {
  const supabase = createClient()
  const toast = useToast()
  const [items, setItems] = useState(initialItems)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<KnowledgeItem | null>(null)
  const [draft, setDraft] = useState({ category: 'general', title: '', content: '', priority: 0, active: true })
  const [saving, setSaving] = useState(false)
  const [generatingEmbeddingId, setGeneratingEmbeddingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    if (!term) return items
    return items.filter((item) => [item.category, item.title, item.content].join(' ').toLocaleLowerCase('es').includes(term))
  }, [items, search])

  function startNew() {
    setEditing(null)
    setDraft({ category: 'general', title: '', content: '', priority: 0, active: true })
  }

  function startEdit(item: KnowledgeItem) {
    setEditing(item)
    setDraft({ category: item.category, title: item.title, content: item.content, priority: item.priority, active: item.active })
  }

  async function saveItem() {
    if (!draft.title.trim() || !draft.content.trim()) {
      toast.error('Falta información', 'Completá título y contenido.')
      return
    }
    setSaving(true)
    const payload = {
      category: draft.category.trim() || 'general',
      title: draft.title.trim(),
      content: draft.content.trim(),
      priority: Number(draft.priority) || 0,
      active: draft.active,
      embedding: null,
    }
    const query = editing
      ? supabase.from('chatbot_knowledge_items').update(payload).eq('id', editing.id).select('id,category,title,content,active,priority,updated_at').single()
      : supabase.from('chatbot_knowledge_items').insert(payload).select('id,category,title,content,active,priority,updated_at').single()
    const { data, error } = await query
    setSaving(false)
    if (error) {
      toast.error('No se pudo guardar', error.message)
      return
    }
    setItems((current) => editing ? current.map((item) => item.id === editing.id ? data : item) : [data, ...current])
    startNew()
    toast.success('Conocimiento guardado', 'Recordá regenerar embeddings antes de activar respuestas reales.')
  }

  async function toggleActive(item: KnowledgeItem) {
    const { data, error } = await supabase
      .from('chatbot_knowledge_items')
      .update({ active: !item.active })
      .eq('id', item.id)
      .select('id,category,title,content,active,priority,updated_at')
      .single()
    if (error) return toast.error('No se pudo actualizar', error.message)
    setItems((current) => current.map((row) => row.id === item.id ? data : row))
  }

  async function regenerateEmbedding(item: KnowledgeItem) {
    if (generatingEmbeddingId) return
    setGeneratingEmbeddingId(item.id)
    try {
      const result = await regenerateKnowledgeEmbedding(item.id)
      if (!result.ok) {
        toast.warning('Embedding no configurado', result.message)
        return
      }
      setItems((current) => current.map((row) => row.id === item.id ? result.item : row))
      toast.success('Embedding generado', 'El bot ya puede encontrar este conocimiento en la búsqueda.')
    } catch (error) {
      toast.error('No se pudo generar embedding', error instanceof Error ? error.message : 'Revisá la configuración del servidor.')
    } finally {
      setGeneratingEmbeddingId(null)
    }
  }

  return (
    <div>
      <div className="admin-page-heading">
        <div><h1>Conocimiento del bot</h1><p>Solo lo cargado acá puede usar el bot para responder.</p></div>
        <button className="btn btn-primary" type="button" onClick={startNew} disabled={databasePending}>Nuevo conocimiento</button>
      </div>

      {databasePending && <div className="admin-card" style={{ marginBottom: 'var(--space-5)' }}><h2>Base pendiente</h2><p>Falta aplicar las tablas `chatbot_*` en Supabase. Después de eso vas a poder cargar conocimiento y generar embeddings.</p></div>}

      <div className="admin-list-toolbar">
        <label className="admin-search-field">
          <Search size={17} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar conocimiento…" />
          {search && <button type="button" onClick={() => setSearch('')}><X size={15} /></button>}
        </label>
        <span className="admin-toolbar-count">{filtered.length} resultados</span>
      </div>

      <div className="admin-grid">
        <div className="admin-card">
          <h2>{editing ? 'Editar' : 'Nuevo'}</h2>
          <div className="form-group"><label className="form-label">Categoría</label><input className="form-input" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></div>
          <div className="form-group"><label className="form-label">Título</label><input className="form-input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></div>
          <div className="form-group"><label className="form-label">Contenido autorizado</label><textarea className="form-input" rows={7} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></div>
          <div className="form-group"><label className="form-label">Prioridad</label><input className="form-input" type="number" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })} /></div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Activo</label>
          <button className="btn btn-primary" type="button" disabled={saving || databasePending} onClick={saveItem}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>

        <div className="admin-card">
          <h2>Listado</h2>
          {(filtered ?? []).map((item) => (
            <div key={item.id} style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-border)' }}>
              <strong>{item.title}</strong>
              <div className="table-secondary">{item.category} · prioridad {item.priority} · {item.active ? 'Activo' : 'Pausado'}</div>
              <p style={{ color: 'var(--color-text-muted)' }}>{item.content.slice(0, 180)}{item.content.length > 180 ? '…' : ''}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>Editar</button><button className="btn btn-ghost btn-sm" onClick={() => toggleActive(item)}>{item.active ? 'Pausar' : 'Activar'}</button><button className="btn btn-ghost btn-sm" disabled={generatingEmbeddingId !== null} onClick={() => regenerateEmbedding(item)}>{generatingEmbeddingId === item.id ? 'Generando…' : 'Generar embedding'}</button></div>
            </div>
          ))}
          {filtered.length === 0 && <p className="admin-empty-state">No hay conocimiento cargado.</p>}
        </div>
      </div>
    </div>
  )
}
