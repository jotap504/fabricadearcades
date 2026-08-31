'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail } from 'lucide-react'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    // For QA Testing: Try password login first.
    let authError = null
    if (password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      authError = error
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}` },
      })
      authError = error
      if (!error) setSent(true)
    }
    
    setLoading(false)
    if (authError) {
      setError(authError.message)
    } else if (password) {
      window.location.assign(redirect)
      router.refresh()
    }
  }

  async function handleGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}` },
    })
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        background:
          'radial-gradient(ellipse at 30% 40%, rgba(0,245,255,0.06) 0%, transparent 60%), var(--color-bg)',
      }}
    >
      <div
        className="glass"
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          boxShadow: 'var(--shadow-glow-cyan), var(--shadow-lg)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ margin: '0 auto var(--space-4)' }}>
            <img src="/logo.png" alt="Fábrica de Arcades" style={{ height: 80, width: 'auto' }} />
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
            Ingresá a tu cuenta
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>📧</div>
            <h2 style={{ marginBottom: 'var(--space-3)', fontSize: '1.125rem' }}>
              ¡Revisá tu email!
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
              Te enviamos un link mágico a <strong>{email}</strong>.
            </p>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSent(false)}
              style={{ marginTop: 'var(--space-6)' }}
            >
              Usar otro email
            </button>
          </div>
        ) : (
          <>
            <button
              className="btn btn-ghost"
              onClick={handleGoogle}
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginBottom: 'var(--space-4)' }}
            >
              Continuar con Google
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: 'var(--space-6) 0',
                color: 'var(--color-text-muted)',
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              <span style={{ padding: '0 var(--space-4)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                o con tu email
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label className="form-label" htmlFor="login-email">Email</label>
                <div className="input-with-icon">
                  <Mail size={18} className="icon" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    className="form-input"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="login-password">Contraseña (Sólo QA)</label>
                <div className="input-with-icon">
                  <input
                    id="login-password"
                    type="password"
                    className="form-input"
                    placeholder="Dejar vacío para Link Mágico"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    background: 'rgba(255, 60, 60, 0.1)',
                    border: '1px solid rgba(255, 60, 60, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    color: '#ff6b6b',
                    fontSize: '0.875rem',
                  }}
                >
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading || !email}>
                {loading ? 'Procesando...' : (password ? 'Ingresar con Password' : 'Recibir link por email')}
              </button>
            </form>
            <div style={{ marginTop: 'var(--space-6)', textAlign: 'center', fontSize: '0.875rem' }}>
              <p style={{ color: 'var(--color-text-muted)' }}>
                ¿No tenés cuenta?{' '}
                <Link href="/registrarse" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                  Registrate gratis
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: 'var(--space-12) 0', textAlign: 'center' }}>Cargando...</div>}>
      <LoginForm />
    </Suspense>
  )
}
