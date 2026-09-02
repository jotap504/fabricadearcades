'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export interface ImageAccordionItem {
  id: string
  title: string
  imageUrl: string
  href?: string
}

interface AccordionSlideProps {
  item: ImageAccordionItem
  isActive: boolean
  onActivate: () => void
}

function AccordionSlide({ item, isActive, onActivate }: AccordionSlideProps) {
  const content = (
    <div
      onMouseEnter={onActivate}
      onClick={onActivate}
      style={{
        position: 'relative',
        height: 'clamp(190px, 58vw, 450px)',
        width: isActive ? 'clamp(140px, 46vw, 400px)' : 'clamp(26px, 8vw, 60px)',
        maxWidth: isActive ? 'clamp(140px, 46vw, 400px)' : 'clamp(26px, 8vw, 60px)',
        flexShrink: 0,
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'width var(--transition-slow), max-width var(--transition-slow)',
        border: '1px solid var(--color-border)',
      }}
    >
      <img
        src={item.imageUrl}
        alt={item.title}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isActive
            ? 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.25) 100%)'
            : 'rgba(0,0,0,0.45)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          color: '#fff',
          fontWeight: 700,
          fontSize: 'clamp(0.8125rem, 2.4vw, 1.0625rem)',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-display)',
          transition: 'opacity var(--transition-base)',
          ...(isActive
            ? { bottom: 'var(--space-4)', left: '50%', transform: 'translateX(-50%) rotate(0deg)' }
            : { bottom: 'clamp(56px, 16vw, 96px)', left: '50%', transform: 'translateX(-50%) rotate(90deg)' }),
        }}
      >
        {item.title}
      </span>
    </div>
  )

  return item.href ? (
    <Link href={item.href} aria-label={item.title} style={{ display: 'contents' }}>
      {content}
    </Link>
  ) : (
    content
  )
}

interface ImageAccordionHeroProps {
  tagline?: string
  title: React.ReactNode
  description: string
  ctaText: string
  ctaHref?: string
  items: ImageAccordionItem[]
  className?: string
}

export function ImageAccordionHero({
  tagline,
  title,
  description,
  ctaText,
  ctaHref = '/productos',
  items,
  className,
}: ImageAccordionHeroProps) {
  const [activeIndex, setActiveIndex] = useState(items.length - 1)

  return (
    <section
      className={className}
      style={{
        background: 'var(--color-bg)',
        padding: 'clamp(28px, 6vw, 56px) var(--space-4) var(--space-16)',
      }}
    >
      <div
        className="container hero-accordion-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-10)',
        }}
      >
        {/* Text content */}
        <div style={{ flex: '0 1 360px', maxWidth: '360px' }}>
          {tagline && (
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-cyan)',
                marginBottom: 'var(--space-3)',
              }}
            >
              {tagline}
            </div>
          )}
          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              marginBottom: 'var(--space-4)',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.125rem)',
              color: 'var(--color-text-secondary, var(--color-text-muted))',
              lineHeight: 1.6,
              marginBottom: 'var(--space-6)',
            }}
          >
            {description}
          </p>
          <Link href={ctaHref} className="btn btn-primary btn-lg" id="hero-cta-button">
            {ctaText}
          </Link>
        </div>

        {/* Image accordion */}
        <div
          className="hero-accordion-images"
          style={{
            flex: '1 1 660px',
            width: '100%',
            display: 'flex',
            gap: 'clamp(5px, 2vw, 12px)',
            overflowX: 'auto',
            padding: 'var(--space-1) 0',
          }}
        >
          {items.map((item, index) => (
            <AccordionSlide
              key={item.id}
              item={item}
              isActive={index === activeIndex}
              onActivate={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
