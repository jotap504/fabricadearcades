import { ExternalLink, Film } from 'lucide-react'

const InstagramIcon = ({ size = 20, ...props }: any) => (
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

interface InstagramReel {
  id: string
  title: string
  subtitle: string
  tag: string
  reelUrl: string
  embedUrl: string
  aspectRatio?: string
}

const REELS: InstagramReel[] = [
  {
    id: 'DbJgerMPV6g',
    title: 'Armado de una Bigbox Arcade',
    subtitle: 'Proceso de fabricación artesanal, ensamble y cableado de alta precisión en nuestro taller.',
    tag: 'Fabricación en taller',
    reelUrl: 'https://www.instagram.com/reel/DbJgerMPV6g/?igsi=MzRlODBiNWFlZA==',
    embedUrl: 'https://www.instagram.com/reel/DbJgerMPV6g/embed',
  },
  {
    id: 'DNWNn1duUIz',
    title: 'Entrega de Arcade Premium 32" Led',
    subtitle: 'Mueble completo de pie con marquesina y botones iluminados, listo para disfrutar.',
    tag: 'Entrega a cliente',
    reelUrl: 'https://www.instagram.com/reel/DNWNn1duUIz/?igsi=MzRlODBiNWFlZA==',
    embedUrl: 'https://www.instagram.com/reel/DNWNn1duUIz/embed',
  },
  {
    id: 'DPeY347gHyD',
    title: 'Arcade 32" 100% Personalizado para IndiaBar',
    subtitle: 'Diseño comercial exclusivo a medida con estética retro futurista para local gastronómico.',
    tag: 'Proyecto a medida',
    reelUrl: 'https://www.instagram.com/reel/DPeY347gHyD/?igsi=MzRlODBiNWFlZA==',
    embedUrl: 'https://www.instagram.com/reel/DPeY347gHyD/embed',
  },
]

export function InstagramReelsSection() {
  return (
    <section className="section" style={{ background: 'var(--color-bg-2)', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow accents */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '5%',
          width: '380px',
          height: '380px',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '5%',
          width: '380px',
          height: '380px',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--color-magenta) 10%, transparent) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-header" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="section-divider" />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span className="badge" style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: 'white', fontWeight: 700, padding: '4px 10px' }}>
              <InstagramIcon size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              @Fabricadearcades
            </span>
          </div>
          <h2 className="section-title">
            Nuestros Arcades en <span className="text-gradient-neon">Acción</span>
          </h2>
          <p className="section-subtitle">
            Mirá los armados en fábrica, entregas reales a clientes y proyectos personalizados en videos directos de nuestro Instagram.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--space-6)',
            alignItems: 'stretch',
          }}
        >
          {REELS.map((reel) => {
            return (
              <div
                key={reel.id}
                className="card card-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast)',
                }}
              >
                {/* Reel Video Container */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '460px',
                    background: 'var(--color-bg)',
                    borderBottom: '1px solid var(--color-border)',
                    overflow: 'hidden',
                  }}
                >
                  <iframe
                    src={`${reel.embedUrl}?utm_source=ig_embed&amp;utm_campaign=loading`}
                    title={reel.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: 'block',
                    }}
                  />
                </div>

                {/* Card Content */}
                <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--color-primary)',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      {reel.tag}
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 var(--space-2)', color: 'var(--color-text)' }}>
                      {reel.title}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      {reel.subtitle}
                    </p>
                  </div>

                  <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <a
                      href={reel.reelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.8125rem', gap: 'var(--space-2)', padding: '6px 10px' }}
                    >
                      <InstagramIcon size={15} /> Ver en Instagram <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Instagram Follow Callout */}
        <div
          style={{
            marginTop: 'var(--space-8)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <a
            href="https://instagram.com/Fabricadearcades"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{
              gap: 'var(--space-2)',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-3) var(--space-6)',
              fontWeight: 700,
            }}
          >
            <InstagramIcon size={18} />
            Seguinos en @Fabricadearcades para más videos diarios
          </a>
        </div>
      </div>
    </section>
  )
}
