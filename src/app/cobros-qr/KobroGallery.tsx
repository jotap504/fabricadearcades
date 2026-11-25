'use client'

import { useState } from 'react'
import Image from 'next/image'

const VIEWS = [
  {
    id: 'equipo',
    label: 'Vista del equipo',
    src: '/cobros-qr/kobro-equipo.webp',
    alt: 'Equipo Kobro con gabinete gris, pantalla roja de cuatro dígitos, bornera verde y antena',
  },
  {
    id: 'antena',
    label: 'Con antena externa',
    src: '/cobros-qr/kobro-antena-externa.webp',
    alt: 'Equipo Kobro con pantalla roja y antena externa magnética con cable',
  },
] as const

/** Two-view photo gallery of the Kobro board. The photos have a white studio background, so the stage stays white in both themes. */
export function KobroGallery() {
  const [active, setActive] = useState(0)
  const view = VIEWS[active]

  return (
    <div
      className="card"
      style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '1 / 1',
          width: '100%',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: '#ffffff',
        }}
      >
        <Image
          key={view.id}
          src={view.src}
          alt={view.alt}
          fill
          sizes="(max-width: 900px) 90vw, 520px"
          quality={75}
          style={{ objectFit: 'contain' }}
        />
      </div>

      <div role="group" aria-label="Fotos del producto Kobro" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        {VIEWS.map((item, index) => {
          const selected = index === active
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(index)}
              aria-pressed={selected}
              style={{
                flex: '1 1 150px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-surface)',
                border: `2px solid ${selected ? 'var(--color-cyan)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                color: selected ? 'var(--color-text)' : 'var(--color-text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  position: 'relative',
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  background: '#ffffff',
                }}
              >
                <Image src={item.src} alt="" fill sizes="44px" quality={70} style={{ objectFit: 'contain' }} />
              </span>
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
