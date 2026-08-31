'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/lib/stores/toast'
import { useRouter } from 'next/navigation'
import { Building2, User, Phone, Mail } from 'lucide-react'

export default function DistributorRegistrationPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const toast = useToast()
  const router = useRouter()

  const [form, setForm] = useState({
    full_name: '',
    company_name: '',
    phone: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (user) {
      const { error } = await supabase.rpc('request_distributor_account', {
        p_full_name: form.full_name,
        p_company_name: form.company_name,
        p_phone: form.phone,
      })

      if (error) {
        toast.error('Error al enviar la solicitud')
        setLoading(false)
        return
      }
    } else {
      // Register new user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            company_name: form.company_name,
            phone: form.phone,
            distributor_requested: true,
          }
        }
      })

      if (authError || !authData.user) {
        toast.error('Error al registrar usuario', authError?.message)
        setLoading(false)
        return
      }

    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-5)',
          padding: 'var(--space-8)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '4rem' }}>🎉</div>
        <h1 style={{ fontSize: '1.5rem' }}>¡Solicitud enviada!</h1>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: 480 }}>
          Revisaremos tu solicitud y te notificaremos por email cuando tu cuenta de
          distribuidor esté activa (generalmente dentro de 24 horas hábiles).
        </p>
        <a href="/" className="btn btn-primary" id="distributor-success-home-btn">
          Volver al inicio
        </a>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
        background:
          'radial-gradient(ellipse at 70% 30%, rgba(255,0,229,0.06) 0%, transparent 60%), var(--color-bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
          <span className="badge badge-distributor" style={{ marginBottom: 'var(--space-4)', display: 'inline-flex' }}>
            💼 Para revendedores
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
            Cuenta de distribuidor
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Accedé a precios mayoristas sin cargo adicional. Completá el formulario
            y nuestro equipo validará tu solicitud.
          </p>
        </div>

        <div
          className="glass"
          style={{
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            boxShadow: 'var(--shadow-glow-magenta), var(--shadow-lg)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="dist-name">
                Nombre completo *
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="dist-name"
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Juan Pérez"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dist-company">
                Empresa / Negocio *
              </label>
              <div style={{ position: 'relative' }}>
                <Building2
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="dist-company"
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  value={form.company_name}
                  onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                  placeholder="Mi Tienda de Juegos S.A."
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dist-phone">
                Teléfono de contacto *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="dist-phone"
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+54 11 0000-0000"
                  type="tel"
                  required
                />
              </div>
            </div>

            {!user && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="dist-email">
                    Email *
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
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      id="dist-email"
                      className="form-input"
                      style={{ paddingLeft: 40 }}
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="contacto@mitienda.com"
                      type="email"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="dist-password">
                    Contraseña *
                  </label>
                  <input
                    id="dist-password"
                    className="form-input"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    type="password"
                    required
                  />
                </div>
              </>
            )}

            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--color-magenta-dim)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255,0,229,0.2)',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              ✅ Acceso a precios mayoristas sin margen adicional<br />
              ✅ Compras en cantidad con precios preferenciales<br />
              ✅ Soporte comercial dedicado<br />
              ✅ Aprobación en 24 horas hábiles
            </div>

            <button
              type="submit"
              className="btn btn-secondary btn-lg"
              disabled={loading}
              style={{ justifyContent: 'center' }}
              id="distributor-submit-btn"
            >
              {loading ? 'Enviando...' : 'Solicitar cuenta de distribuidor'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
