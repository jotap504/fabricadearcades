import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { isMercadoLibreConfigured } from '@/lib/mercadolibre/config'
import { disconnectMercadoLibreAccount } from './actions'

interface PageProps {
  searchParams: Promise<{ connected?: string; error?: string }>
}

interface SyncLogRow {
  id: string
  event_type: string
  status: 'ok' | 'error'
  message: string | null
  created_at: string
}

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: 'Faltan configurar las credenciales de MercadoLibre (MELI_CLIENT_ID/SECRET/REDIRECT_URI).',
  state_mismatch: 'La conexión expiró o no pudo validarse. Probá de nuevo.',
  account_conflict: 'Esa cuenta de MercadoLibre es distinta a la que ya está conectada. Desconectá la actual primero.',
  connect_failed: 'No se pudo completar la conexión con MercadoLibre.',
}

export default async function MercadoLibrePage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)
  if (!user) redirect('/login')
  if (profile?.role !== 'admin') redirect('/')

  const { data: account } = await supabase
    .from('mercadolibre_accounts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: logs } = await supabase
    .from('mercadolibre_sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  const configured = isMercadoLibreConfigured()
  const isConnected = account?.status === 'connected'
  const errorMessage = params.error
    ? ERROR_MESSAGES[params.error] || `No se pudo conectar (${params.error}).`
    : null

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>MercadoLibre</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Conexión de la cuenta vendedora (Fase 1 — sin publicaciones ni ventas todavía)</p>
      </div>

      {params.connected && (
        <div className="card card-body" style={{ marginBottom: 'var(--space-5)', borderColor: 'var(--color-green)' }}>
          Cuenta de MercadoLibre conectada correctamente.
        </div>
      )}

      {errorMessage && (
        <div className="card card-body" style={{ marginBottom: 'var(--space-5)', borderColor: 'var(--color-red)' }}>
          {errorMessage}
        </div>
      )}

      {!configured && (
        <div className="card card-body" style={{ marginBottom: 'var(--space-5)' }}>
          Configurá <code>MELI_CLIENT_ID</code>, <code>MELI_CLIENT_SECRET</code> y <code>MELI_REDIRECT_URI</code> en las variables de entorno antes de conectar una cuenta.
        </div>
      )}

      <div className="card card-body" style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Estado de conexión
        </h3>

        {isConnected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div><strong>{account.nickname}</strong> ({account.site_id})</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Conectada desde: {account.connected_at ? new Date(account.connected_at).toLocaleString('es-AR') : '—'}
            </div>
            <form action={disconnectMercadoLibreAccount.bind(null, account.id)}>
              <button type="submit" className="btn btn-outline" style={{ borderColor: 'var(--color-red)', color: 'var(--color-red)' }}>
                Desconectar
              </button>
            </form>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>No hay ninguna cuenta de MercadoLibre conectada.</p>
            {configured && (
              <Link href="/api/mercadolibre/oauth/authorize" className="btn btn-primary" id="mercadolibre-connect-btn">
                Conectar cuenta MercadoLibre
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Últimos eventos
        </h3>
        {logs && logs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {(logs as SyncLogRow[]).map((log) => (
              <div key={log.id} style={{ fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                <span>
                  <strong style={{ color: log.status === 'error' ? 'var(--color-red)' : 'var(--color-green)' }}>{log.event_type}</strong>
                  {log.message ? ` — ${log.message}` : ''}
                </span>
                <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  {new Date(log.created_at).toLocaleString('es-AR')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)' }}>Todavía no hay eventos registrados.</p>
        )}
      </div>
    </div>
  )
}
