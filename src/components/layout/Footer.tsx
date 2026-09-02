import Link from 'next/link'
import { Gamepad2, Mail, Phone, MapPin } from 'lucide-react'

const InstagramIcon = ({ size = 24, ...props }: any) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
)

const TikTokIcon = ({ size = 24, ...props }: any) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
  </svg>
)

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <Link href="/" style={{ display: 'inline-block', marginBottom: 'var(--space-4)' }}>
              <img src="/logo.png" alt="Fábrica de Arcades" className="logo-dark" style={{ height: 48, width: 'auto' }} />
              <img src="/logo-light.png" alt="Fábrica de Arcades" className="logo-light" style={{ height: 48, width: 'auto' }} />
            </Link>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 320 }}>
              Fabricamos consolas arcade personalizadas en Argentina. Calidad premium,
              stock siempre disponible y envío a todo el país.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <a
                href="https://instagram.com/Fabricadearcades"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-icon"
                aria-label="Instagram"
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: 'auto', padding: '6px 12px', fontSize: '0.8125rem' }}
              >
                <InstagramIcon size={16} />
                <span>@Fabricadearcades</span>
              </a>
              <a
                href="https://tiktok.com/@fabricadearcades"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-icon"
                aria-label="TikTok"
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: 'auto', padding: '6px 12px', fontSize: '0.8125rem' }}
              >
                <TikTokIcon size={14} />
                <span>TikTok</span>
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="footer-heading">Productos</h3>
            <Link href="/productos?categoria=arcades" className="footer-link">
              Arcades verticales
            </Link>
            <Link href="/productos?categoria=arcades" className="footer-link">
              Bartops
            </Link>
            <Link href="/productos?categoria=pedestales" className="footer-link">
              Pedestales
            </Link>
            <Link href="/productos?categoria=bundles" className="footer-link">
              Combos
            </Link>
            <Link href="/productos?categoria=accesorios" className="footer-link">
              Accesorios
            </Link>
          </div>

          {/* Info */}
          <div>
            <h3 className="footer-heading">Información</h3>
            <Link href="/nosotros" className="footer-link">
              Sobre nosotros
            </Link>
            <Link href="/como-comprar" className="footer-link">
              Cómo comprar
            </Link>
            <Link href="/envios" className="footer-link">
              Envíos y entregas
            </Link>
            <Link href="/garantia" className="footer-link">
              Garantía
            </Link>
            <Link href="/distribuidores" className="footer-link">
              Distribuidores
            </Link>
          </div>

          {/* Contact */}
          <div>
            <h3 className="footer-heading">Contacto</h3>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            >
              <a
                href="mailto:info@fabricadearcades.com.ar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                }}
              >
                <Mail size={16} style={{ color: 'var(--color-cyan)', flexShrink: 0 }} />
                info@fabricadearcades.com.ar
              </a>
              <a
                href="https://wa.me/5491164045074"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                }}
              >
                <Phone size={16} style={{ color: 'var(--color-cyan)', flexShrink: 0 }} />
                11-6404-5074 (WhatsApp)
              </a>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-2)',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <MapPin
                  size={16}
                  style={{
                    color: 'var(--color-cyan)',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                Virgilio 2379, Devoto, CABA
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {currentYear} Fábrica de Arcades. Todos los derechos reservados.</span>
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <Link href="/privacidad" className="footer-link" style={{ padding: 0 }}>
              Privacidad
            </Link>
            <Link href="/terminos" className="footer-link" style={{ padding: 0 }}>
              Términos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
