'use client'

import { useState, useTransition } from 'react'
import { dismissUnansweredQuestion, learnUnansweredQuestion } from '../actions'

export function UnansweredActions({ questionId, question }: { questionId: string; question: string }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(question.slice(0, 90))
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('preguntas frecuentes')
  const [pending, startTransition] = useTransition()

  function learn() {
    startTransition(async () => {
      await learnUnansweredQuestion(questionId, title, content, category)
      setOpen(false)
    })
  }

  function dismiss() {
    startTransition(async () => {
      await dismissUnansweredQuestion(questionId)
    })
  }

  if (!open) {
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => setOpen(true)}>Aprender</button>
        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={dismiss}>Descartar</button>
      </div>
    )
  }

  return (
    <div className="admin-card" style={{ marginTop: 12 }}>
      <div className="form-group"><label className="form-label">Categoría</label><input className="form-input" value={category} onChange={(event) => setCategory(event.target.value)} /></div>
      <div className="form-group"><label className="form-label">Título</label><input className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
      <div className="form-group"><label className="form-label">Respuesta aprobada</label><textarea className="form-input" rows={4} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Escribí exactamente lo que el bot podrá usar como conocimiento autorizado." /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" disabled={pending || !content.trim()} onClick={learn}>Guardar como conocimiento</button>
        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setOpen(false)}>Cancelar</button>
      </div>
      <p className="table-secondary" style={{ marginTop: 8 }}>Queda creado pausado hasta generar embedding y revisarlo.</p>
    </div>
  )
}
