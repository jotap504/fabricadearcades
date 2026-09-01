'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { Bot, CheckCircle2, MessageCircle, PauseCircle, Search, Send, UserRound, X } from 'lucide-react'
import { sendChatbotConversationReply, setChatbotConversationMode } from '../actions'
import { useToast } from '@/lib/stores/toast'

type ConversationMode = 'BOT' | 'HUMAN' | 'PAUSED'
type SalesStatus = 'NEW' | 'BOT_ACTIVE' | 'WAITING_CUSTOMER' | 'HUMAN_REQUIRED' | 'HUMAN_ACTIVE' | 'PURCHASE_INTENT' | 'PURCHASE_LINK_SENT' | 'PURCHASED' | 'CLOSED' | 'POST_SALE'

type InboxConversation = {
  id: string
  phone: string
  display_name: string | null
  mode: ConversationMode
  sales_status: SalesStatus | null
  handoff_reason: string | null
  pending_count: number | null
  last_message_at: string | null
  product_interest_id: string | null
  product_interest?: { name: string; slug: string } | null
  customer?: {
    id: string
    first_name: string | null
    display_name: string | null
    email: string | null
    status: string | null
    notes: string | null
  } | null
  messages: Array<{
    id: string
    direction: 'inbound' | 'outbound'
    sender_type: 'customer' | 'bot' | 'human' | 'system'
    content: string
    created_at: string
  }>
}

const modeLabels: Record<ConversationMode, string> = {
  BOT: 'Bot activo',
  HUMAN: 'Modo humano',
  PAUSED: 'Pausado',
}

const statusLabels: Record<string, string> = {
  NEW: 'Nuevo',
  BOT_ACTIVE: 'Bot atendiendo',
  WAITING_CUSTOMER: 'Esperando cliente',
  HUMAN_REQUIRED: 'Necesita humano',
  HUMAN_ACTIVE: 'Vendedor atendiendo',
  PURCHASE_INTENT: 'Posible venta',
  PURCHASE_LINK_SENT: 'Link enviado',
  PURCHASED: 'Venta realizada',
  CLOSED: 'Cerrado',
  POST_SALE: 'Postventa',
}

function formatDate(value: string | null) {
  if (!value) return 'Sin mensajes'
  return new Date(value).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function getDisplayName(conversation: InboxConversation) {
  return conversation.customer?.first_name
    ?? conversation.customer?.display_name
    ?? conversation.display_name
    ?? conversation.phone
}

function getLastMessage(conversation: InboxConversation) {
  return conversation.messages[conversation.messages.length - 1]?.content ?? 'Sin mensajes todavía'
}

export function ConversationInbox({ conversations }: { conversations: InboxConversation[] }) {
  const toast = useToast()
  const [selectedId, setSelectedId] = useState(conversations.find((conversation) => conversation.messages.length > 0)?.id ?? '')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'bot' | 'human'>('all')
  const [reply, setReply] = useState('')
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return conversations.filter((conversation) => {
      if (conversation.messages.length === 0) return false
      if (filter === 'pending' && !conversation.pending_count) return false
      if (filter === 'bot' && conversation.mode !== 'BOT') return false
      if (filter === 'human' && conversation.mode !== 'HUMAN') return false
      if (!term) return true
      const haystack = [
        conversation.phone,
        conversation.display_name,
        conversation.customer?.first_name,
        conversation.customer?.display_name,
        conversation.customer?.email,
        conversation.product_interest?.name,
        getLastMessage(conversation),
      ].filter(Boolean).join(' ').toLocaleLowerCase('es')
      return haystack.includes(term)
    })
  }, [conversations, filter, search])

  const selected = filtered.find((conversation) => conversation.id === selectedId) ?? filtered[0] ?? null

  function updateMode(mode: ConversationMode) {
    if (!selected) return
    startTransition(async () => {
      try {
        await setChatbotConversationMode(selected.id, mode)
        toast.success(mode === 'BOT' ? 'Bot reanudado' : mode === 'HUMAN' ? 'Conversación tomada' : 'Conversación pausada')
      } catch (error) {
        toast.error('No se pudo cambiar el estado', error instanceof Error ? error.message : 'Intentá nuevamente.')
      }
    })
  }

  function sendReply(returnToBot: boolean) {
    if (!selected) return
    const text = reply.trim()
    startTransition(async () => {
      try {
        await sendChatbotConversationReply(selected.id, text, returnToBot)
        setReply('')
        toast.success(returnToBot ? 'Respuesta enviada y bot reanudado' : 'Respuesta enviada')
      } catch (error) {
        toast.error('No se pudo enviar', error instanceof Error ? error.message : 'Intentá nuevamente.')
      }
    })
  }

  return (
    <div className="chat-inbox">
      <aside className="chat-inbox-sidebar" aria-label="Conversaciones">
        <label className="admin-search-field chat-inbox-search">
          <span className="sr-only">Buscar conversación</span>
          <Search size={17} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, teléfono o producto…" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda"><X size={15} /></button>}
        </label>

        <div className="chat-filter-tabs" aria-label="Filtros de conversaciones">
          {[
            ['all', 'Todos'],
            ['pending', 'Pendientes'],
            ['bot', 'Bot'],
            ['human', 'Humano'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? 'active' : ''}
              onClick={() => setFilter(value as typeof filter)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="chat-conversation-list">
          {filtered.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              className={`chat-conversation-item ${selected?.id === conversation.id ? 'active' : ''}`}
              onClick={() => setSelectedId(conversation.id)}
            >
              <span className={`chat-status-dot chat-status-${conversation.mode.toLowerCase()}`} aria-hidden="true" />
              <span className="chat-conversation-copy">
                <strong>{getDisplayName(conversation)}</strong>
                <small>{conversation.product_interest?.name ?? conversation.phone}</small>
                <em>{getLastMessage(conversation)}</em>
              </span>
              <span className="chat-conversation-meta">
                <small>{formatDate(conversation.last_message_at)}</small>
                {!!conversation.pending_count && <b>{conversation.pending_count}</b>}
              </span>
            </button>
          ))}
          {filtered.length === 0 && <p className="admin-empty-state">No encontramos conversaciones con esa búsqueda.</p>}
        </div>
      </aside>

      <section className="chat-thread-panel">
        {selected ? (
          <>
            <header className="chat-thread-header">
              <div>
                <h2>{getDisplayName(selected)}</h2>
                <p>{selected.phone} · {statusLabels[selected.sales_status ?? selected.mode] ?? selected.sales_status ?? selected.mode}</p>
              </div>
              <div className="chat-thread-actions">
                <span className={`badge chat-mode-${selected.mode.toLowerCase()}`}>{modeLabels[selected.mode]}</span>
                {selected.mode !== 'HUMAN' && <button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={() => updateMode('HUMAN')}><UserRound size={16} /> Tomar</button>}
                {selected.mode !== 'BOT' && <button className="btn btn-primary btn-sm" type="button" disabled={pending} onClick={() => updateMode('BOT')}><Bot size={16} /> Reanudar bot</button>}
                {selected.mode !== 'PAUSED' && <button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={() => updateMode('PAUSED')}><PauseCircle size={16} /> Pausar</button>}
              </div>
            </header>

            <div className="chat-thread-layout">
              <div className="chat-messages">
                {selected.messages.map((message) => (
                  <div key={message.id} className={`chat-bubble-row ${message.direction === 'outbound' ? 'outbound' : 'inbound'}`}>
                    <div className={`chat-bubble chat-bubble-${message.sender_type}`}>
                      <span>{message.sender_type === 'bot' ? 'Bot' : message.sender_type === 'human' ? 'Vendedor' : 'Cliente'}</span>
                      <p>{message.content}</p>
                      <small>{formatDate(message.created_at)}</small>
                    </div>
                  </div>
                ))}
                {selected.messages.length === 0 && <p className="admin-empty-state">Todavía no hay mensajes en esta conversación.</p>}
              </div>

              <aside className="chat-customer-card">
                <h3>Ficha del cliente</h3>
                <dl>
                  <div><dt>Nombre</dt><dd>{selected.customer?.display_name ?? selected.display_name ?? 'Sin nombre confirmado'}</dd></div>
                  <div><dt>Teléfono</dt><dd>{selected.phone}</dd></div>
                  <div><dt>Email</dt><dd>{selected.customer?.email ?? 'Sin email'}</dd></div>
                  <div><dt>Producto</dt><dd>{selected.product_interest ? <Link href={`/productos/${selected.product_interest.slug}`} target="_blank">{selected.product_interest.name}</Link> : 'Sin producto detectado'}</dd></div>
                  <div><dt>Notas</dt><dd>{selected.customer?.notes ?? 'Sin notas internas'}</dd></div>
                </dl>
              </aside>
            </div>

            <footer className="chat-reply-box">
              <label>
                <span className="sr-only">Responder por WhatsApp</span>
                <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Escribí una respuesta corta, como si estuvieras en WhatsApp…" rows={3} />
              </label>
              <div>
                <button className="btn btn-ghost btn-sm" type="button" disabled={pending || !reply.trim()} onClick={() => sendReply(false)}><Send size={16} /> Enviar y tomar</button>
                <button className="btn btn-primary btn-sm" type="button" disabled={pending || !reply.trim()} onClick={() => sendReply(true)}><CheckCircle2 size={16} /> Responder y devolver al bot</button>
              </div>
            </footer>
          </>
        ) : (
          <div className="chat-empty-panel">
            <MessageCircle size={34} />
            <h2>Todavía no hay conversaciones</h2>
            <p>Cuando escriban por WhatsApp, van a aparecer acá.</p>
          </div>
        )}
      </section>
    </div>
  )
}
