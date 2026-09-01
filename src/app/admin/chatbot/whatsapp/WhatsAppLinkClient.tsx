'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, CircleDashed, RefreshCw, ShieldCheck, Smartphone, WifiOff } from 'lucide-react'
import type { ChatbotSetupStatus } from '@/lib/chatbot/status'

const EMPTY_STATUS: ChatbotSetupStatus = {
  databaseReady: false,
  workerReachable: false,
  evolutionReachable: false,
  whatsappConnected: false,
  qrCode: null,
  message: 'Consultando estado…',
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`badge ${ok ? 'badge-success' : ''}`}>{ok ? '✓' : '•'} {label}</span>
}

export function WhatsAppLinkClient() {
  const [status, setStatus] = useState<ChatbotSetupStatus>(EMPTY_STATUS)
  const [loading, setLoading] = useState(true)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState('')

  async function refreshStatus() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/chatbot/whatsapp/status', { cache: 'no-store' })
      const data = await response.json()
      setStatus(data)
    } catch {
      setStatus({ ...EMPTY_STATUS, message: 'No se pudo consultar el estado.' })
    } finally {
      setLoading(false)
    }
  }

  async function requestQr() {
    setQrLoading(true)
    setQrError('')
    try {
      const response = await fetch('/api/admin/chatbot/whatsapp/qr', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? 'No se pudo generar QR')
      setStatus((current) => ({ ...current, qrCode: data.qrCode ?? null }))
      if (!data.qrCode) setQrError('Evolution respondió, pero no devolvió una imagen QR reconocible.')
    } catch (error) {
      setQrError(error instanceof Error ? error.message : 'No se pudo generar QR')
    } finally {
      setQrLoading(false)
    }
  }

  useEffect(() => {
    refreshStatus()
    const id = window.setInterval(refreshStatus, 10000)
    return () => window.clearInterval(id)
  }, [])

  const canAskQr = status.evolutionReachable

  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <h1>Vincular WhatsApp</h1>
          <p>Conectá una línea de prueba escaneando el QR desde WhatsApp.</p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={refreshStatus} disabled={loading}>
          <RefreshCw size={16} />
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      <div className="chatbot-status-strip">
        <StatusPill ok={status.evolutionReachable} label="Evolution API" />
        <StatusPill ok={status.workerReachable} label="Worker" />
        <StatusPill ok={status.databaseReady} label="Base chatbot" />
        <StatusPill ok={status.whatsappConnected} label="WhatsApp" />
      </div>

      <div className="chatbot-link-grid">
        <section className="admin-card chatbot-qr-card">
          <div className="chatbot-card-title">
            <Smartphone aria-hidden="true" />
            <div>
              <h2>QR de vinculación</h2>
              <p>{status.message}</p>
            </div>
          </div>

          <div className="chatbot-qr-box">
            {status.whatsappConnected ? (
              <div className="chatbot-empty-qr success"><CheckCircle2 size={42} /><strong>WhatsApp conectado</strong><span>La línea ya está vinculada.</span></div>
            ) : status.qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={status.qrCode.startsWith('data:') ? status.qrCode : `data:image/png;base64,${status.qrCode}`} alt="QR para vincular WhatsApp" />
            ) : (
              <div className="chatbot-empty-qr">
                {canAskQr ? <CircleDashed size={42} /> : <WifiOff size={42} />}
                <strong>{canAskQr ? 'QR pendiente' : 'Evolution no accesible'}</strong>
                <span>{canAskQr ? 'Pedí un QR cuando quieras vincular la línea.' : 'Primero debe responder Evolution API.'}</span>
              </div>
            )}
          </div>

          {qrError && <p className="form-error">{qrError}</p>}
          <button className="btn btn-primary" type="button" onClick={requestQr} disabled={!canAskQr || qrLoading || status.whatsappConnected}>
            {qrLoading ? 'Generando QR…' : 'Generar / renovar QR'}
          </button>
        </section>

        <section className="admin-card">
          <div className="chatbot-card-title">
            <ShieldCheck aria-hidden="true" />
            <div>
              <h2>Cómo vincular sin riesgo</h2>
              <p>Usar primero una línea de prueba. Nada de número definitivo todavía.</p>
            </div>
          </div>
          <ol className="chatbot-steps">
            <li><strong>Generar QR</strong><span>El QR sale desde Evolution API, no desde el navegador.</span></li>
            <li><strong>Abrir WhatsApp</strong><span>En el celular: Dispositivos vinculados → Vincular dispositivo.</span></li>
            <li><strong>Escanear</strong><span>Escaneá el QR y esperá que el estado cambie a conectado.</span></li>
            <li><strong>Probar</strong><span>Mandar mensajes de prueba antes de activar el bot.</span></li>
          </ol>
        </section>
      </div>

      <section className="admin-card" style={{ marginTop: 'var(--space-5)' }}>
        <h2>Estado de seguridad</h2>
        <div className="chatbot-checklist">
          <label><input type="checkbox" checked={status.evolutionReachable} readOnly /> Evolution responde en el VPS</label>
          <label><input type="checkbox" checked={status.workerReachable} readOnly /> Worker accesible</label>
          <label><input type="checkbox" checked={status.databaseReady} readOnly /> Tablas chatbot aplicadas en Supabase</label>
          <label><input type="checkbox" checked={status.whatsappConnected} readOnly /> Línea de WhatsApp vinculada</label>
        </div>
      </section>
    </div>
  )
}
