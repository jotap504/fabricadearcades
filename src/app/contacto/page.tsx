import { Mail, MapPin, MessageCircle, Clock } from 'lucide-react'
import { buildPageMetadata } from '@/lib/seo'
import { InstagramIcon, TikTokIcon } from '@/components/ui/SocialIcons'

export const metadata = buildPageMetadata({
  title: 'Contacto',
  description:
    'Contactá a Fábrica de Arcades: WhatsApp +54 9 11 6404-5074, info@fabricadearcades.com.ar. Showroom y fábrica en Virgilio 2379, Devoto, CABA. Lunes a viernes de 9:00 a 18:00 hs.',
  path: '/contacto',
})

export default function ContactPage() {
  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-4)', maxWidth: '800px' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
          Contacto
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.125rem' }}>
          ¿Tenés dudas o querés coordinar una visita a nuestro showroom? Estamos para ayudarte.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }}>
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
            Nuestros Medios de Contacto
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* WhatsApp */}
            <a
              href="https://wa.me/5491164045074"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(37,211,102,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366' }}>
                <MessageCircle size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>WhatsApp / Teléfono</div>
                <div style={{ color: 'var(--color-cyan)', fontSize: '0.9375rem' }}>+54 9 11 6404-5074</div>
              </div>
            </a>

            {/* Email */}
            <a
              href="mailto:info@fabricadearcades.com.ar"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-cyan)' }}>
                <Mail size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Correo Electrónico</div>
                <div style={{ color: 'var(--color-cyan)', fontSize: '0.9375rem' }}>info@fabricadearcades.com.ar</div>
              </div>
            </a>

            {/* Address */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                <MapPin size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Showroom & Fábrica</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>Virgilio 2379, Devoto, Capital Federal</div>
              </div>
            </div>

            {/* Hours */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber)' }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Horario de Atención</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>Lunes a Viernes de 9:00 a 18:00 hs</div>
              </div>
            </div>

            {/* Instagram */}
            <a
              href="https://instagram.com/Fabricadearcades"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(219,39,119,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DB2777' }}>
                <InstagramIcon size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Instagram</div>
                <div style={{ color: 'var(--color-cyan)', fontSize: '0.9375rem' }}>@Fabricadearcades</div>
              </div>
            </a>

            {/* TikTok */}
            <a
              href="https://tiktok.com/@fabricadearcades"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <TikTokIcon size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>TikTok</div>
                <div style={{ color: 'var(--color-cyan)', fontSize: '0.9375rem' }}>@fabricadearcades</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
