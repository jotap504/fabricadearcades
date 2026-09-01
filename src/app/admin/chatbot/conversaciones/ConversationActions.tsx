'use client'

import { useTransition } from 'react'
import { setChatbotConversationMode } from '../actions'

export function ConversationActions({ conversationId, mode }: { conversationId: string; mode: 'BOT' | 'HUMAN' | 'PAUSED' }) {
  const [pending, startTransition] = useTransition()

  function update(nextMode: 'BOT' | 'HUMAN' | 'PAUSED') {
    startTransition(async () => {
      await setChatbotConversationMode(conversationId, nextMode)
    })
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {mode !== 'HUMAN' && <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => update('HUMAN')}>Tomar</button>}
      {mode !== 'BOT' && <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => update('BOT')}>Reanudar bot</button>}
      {mode !== 'PAUSED' && <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => update('PAUSED')}>Pausar</button>}
    </div>
  )
}
