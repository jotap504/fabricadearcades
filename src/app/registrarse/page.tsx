'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/stores/toast'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      toast.error('Error al registrarse', error.message)
      setLoading(false)
      return
    }

    toast.success('Cuenta creada', 'Ya podés iniciar sesión')
    router.push('/login')
  }

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
            Creá tu cuenta
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Únete a la comunidad de Fábrica de Arcades
          </p>
        </div>

        <div className="card card-body glass" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-2)' }}
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>

          <div
            style={{
              marginTop: 'var(--space-6)',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" style={{ color: 'var(--color-cyan)', fontWeight: 600 }}>
              Iniciá sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
