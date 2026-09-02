'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { CheckCircle2, Circle } from 'lucide-react'

interface RecentSale {
  orderNumber: number
  buyerName: string
  productName: string
  thumbnailUrl: string
}

interface StepDef {
  key: string
  label: string
  target: number
  duration: number
}

const STEPS: StepDef[] = [
  { key: 'years', label: 'Años en el mercado', target: 9, duration: 1200 },
  { key: 'models', label: 'Modelos', target: 15, duration: 1200 },
  { key: 'sales', label: 'Ventas realizadas', target: 3454, duration: 2800 },
]

const RECENT_SALES: RecentSale[] = [
  {
    orderNumber: 3455,
    buyerName: 'Cristian Delfino',
    productName: 'Retrotime Mortal Kombat',
    thumbnailUrl: '/vinilos/consola%2078/mortalkombatA.jpg',
  },
  {
    orderNumber: 3456,
    buyerName: 'Agustina Etcheverria',
    productName: 'Fightstick Doble King of Fighters',
    thumbnailUrl: '/vinilos/consola%2078/kingoffighter.jpg',
  },
  {
    orderNumber: 3457,
    buyerName: 'Angel Pacino',
    productName: 'Retrotime Plus Nintendo',
    thumbnailUrl: '/vinilos/retrotime%20plus/nintendo0.jpg',
  },
  {
    orderNumber: 3458,
    buyerName: 'Marcelo Volpato',
    productName: 'Arcade Premium 32 Volver al Futuro',
    thumbnailUrl: '/vinilos/arcade%20pie/volveralfuturo.jpg',
  },
]

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)

function useCountUp(
  target: number,
  active: boolean,
  duration: number,
  onComplete?: () => void,
  easing: (t: number) => number = (t) => t
) {
  const [value, setValue] = useState(0)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!active) return
    firedRef.current = false
    let startTime: number | null = null
    let raf: number

    function tick(now: number) {
      if (startTime === null) startTime = now
      const progress = Math.min((now - startTime) / duration, 1)
      setValue(Math.round(easing(progress) * target))
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else if (!firedRef.current) {
        firedRef.current = true
        onComplete?.()
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target, duration])

  return value
}

type StepStatus = 'pending' | 'active' | 'done'

function StepRow({
  status,
  step,
  isLast,
  onComplete,
  overrideValue,
  overrideColor,
}: {
  status: StepStatus
  step: StepDef
  isLast: boolean
  onComplete: () => void
  overrideValue?: number
  overrideColor?: string
}) {
  const started = status !== 'pending'
  const done = status === 'done'
  const value = useCountUp(
    step.target,
    status === 'active',
    step.duration,
    onComplete,
    step.key === 'sales' ? easeOutQuart : undefined
  )
  const displayValue = overrideValue ?? (done ? step.target : status === 'active' ? value : 0)
  const valueColor = overrideColor ?? 'var(--color-text)'

  const nodeColor = done ? 'var(--color-green)' : started ? 'var(--color-cyan)' : 'var(--color-border)'

  return (
    <div style={{ display: 'flex' }}>
      {/* Circle + vertical connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '44px', flexShrink: 0 }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: `2px solid ${nodeColor}`,
            background: 'var(--color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'border-color 0.4s ease',
          }}
        >
          {done ? (
            <CheckCircle2 size={20} color="var(--color-green)" />
          ) : (
            <Circle size={10} color={nodeColor} fill={started ? nodeColor : 'transparent'} />
          )}
        </div>
        {!isLast && (
          <div
            style={{
              width: '2px',
              flex: 1,
              minHeight: '48px',
              background: 'var(--color-border)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: done ? '100%' : '0%',
                background: 'var(--color-green)',
                transition: 'height 0.6s ease',
              }}
            />
          </div>
        )}
      </div>

      {/* Horizontal connector + number/label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          paddingBottom: isLast ? 0 : 'var(--space-8)',
          paddingLeft: 'var(--space-2)',
          minHeight: '40px',
        }}
      >
        <div
          style={{
            height: '2px',
            width: started ? '28px' : '0px',
            background: nodeColor,
            transition: 'width 0.4s ease, background-color 0.4s ease',
            flexShrink: 0,
          }}
        />
        <div style={{ opacity: started ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '1.75rem',
              color: valueColor,
              transition: 'color 0.4s ease',
            }}
          >
            {displayValue.toLocaleString('es-AR')}
          </span>
          <span
            style={{
              marginLeft: 'var(--space-3)',
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
            }}
          >
            {step.label}
          </span>
        </div>
      </div>
    </div>
  )
}

export function SalesMilestoneStats() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.4 })

  const [phaseIndex, setPhaseIndex] = useState(0)
  const [doneFlags, setDoneFlags] = useState<boolean[]>(STEPS.map(() => false))
  const [revealedCount, setRevealedCount] = useState(0)

  function handleStepComplete(index: number) {
    setDoneFlags((flags) => {
      const next = [...flags]
      next[index] = true
      return next
    })
    if (index < STEPS.length - 1) {
      setTimeout(() => setPhaseIndex(index + 1), 650)
    } else {
      setTimeout(() => setRevealedCount(1), 650)
    }
  }

  useEffect(() => {
    if (revealedCount === 0 || revealedCount >= RECENT_SALES.length) return
    const timer = setTimeout(() => setRevealedCount((count) => count + 1), 500)
    return () => clearTimeout(timer)
  }, [revealedCount])

  return (
    <section className="section-sm" style={{ background: 'var(--color-bg-2)' }} ref={sectionRef}>
      <div className="container">
        <div className="section-header" style={{ marginBottom: 'var(--space-8)' }}>
          <h2 className="section-title" style={{ fontSize: '1.5rem' }}>
            Fábrica de Arcades en números
          </h2>
        </div>

        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          {STEPS.map((step, index) => {
            const allSalesRevealed = step.key === 'sales' && revealedCount >= RECENT_SALES.length
            return (
              <StepRow
                key={step.key}
                step={step}
                isLast={index === STEPS.length - 1}
                status={doneFlags[index] ? 'done' : inView && index === phaseIndex ? 'active' : 'pending'}
                onComplete={() => handleStepComplete(index)}
                overrideValue={allSalesRevealed ? step.target + RECENT_SALES.length : undefined}
                overrideColor={allSalesRevealed ? 'var(--color-green)' : undefined}
              />
            )
          })}

          {revealedCount > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                marginTop: 'var(--space-4)',
                paddingLeft: '44px',
              }}
            >
              {RECENT_SALES.slice(0, revealedCount).map((sale) => (
                <motion.div
                  key={sale.orderNumber}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                >
                  {/* Order number, circular, on the left so it lines up with the main stepper's circle column */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '2px solid var(--color-green)',
                      background: 'var(--color-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        color: 'var(--color-green)',
                      }}
                    >
                      {sale.orderNumber}
                    </span>
                  </div>

                  {/* Connector line pointing from the order number to the buyer */}
                  <div
                    style={{
                      height: '2px',
                      width: '20px',
                      background: 'var(--color-green)',
                      flexShrink: 0,
                    }}
                  />

                  {/* Pill: thumbnail + buyer name */}
                  <div
                    title={sale.productName}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-full)',
                      padding: '6px 16px 6px 6px',
                      boxShadow: 'var(--shadow-sm)',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: '#fff',
                      }}
                    >
                      <img
                        src={sale.thumbnailUrl}
                        alt={sale.productName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {sale.buyerName}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
