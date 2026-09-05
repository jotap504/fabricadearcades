'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useToast } from '@/lib/stores/toast'
import { Check, Loader2 } from 'lucide-react'

interface Props {
  id: string
  initialBasePrice: number
  initialMarkupPct: number
}

export function ProductPriceMarkupInputs({ id, initialBasePrice, initialMarkupPct }: Props) {
  const supabase = createClient()
  const toast = useToast()

  const [basePrice, setBasePrice] = useState<number | string>(initialBasePrice)
  const [markupPct, setMarkupPct] = useState<number | string>(initialMarkupPct)
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    setBasePrice(initialBasePrice)
    setMarkupPct(initialMarkupPct)
  }, [initialBasePrice, initialMarkupPct])

  const numBase = typeof basePrice === 'number' ? basePrice : parseFloat(basePrice) || 0
  const numMarkup = typeof markupPct === 'number' ? markupPct : parseFloat(markupPct) || 0
  const calculatedFinalPrice = Math.round(numBase * (1 + numMarkup / 100))

  const saveChanges = async (nextBasePrice?: number, nextMarkupPct?: number) => {
    const finalBase = nextBasePrice !== undefined ? nextBasePrice : numBase
    const finalMarkup = nextMarkupPct !== undefined ? nextMarkupPct : numMarkup

    if (finalBase === initialBasePrice && finalMarkup === initialMarkupPct) {
      return
    }

    setIsSaving(true)
    setSavedSuccess(false)

    const { error } = await supabase
      .from('products')
      .update({
        base_price: finalBase,
        retail_markup_pct: finalMarkup,
      })
      .eq('id', id)

    setIsSaving(false)

    if (error) {
      toast.error('Error al actualizar precio', error.message)
    } else {
      setSavedSuccess(true)
      toast.success('Precio y margen actualizados')
      setTimeout(() => setSavedSuccess(false), 2000)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Base Price input */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 8,
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              fontWeight: 600,
              pointerEvents: 'none',
            }}
          >
            $
          </span>
          <input
            type="number"
            min="0"
            step="100"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            onBlur={() => saveChanges(parseFloat(String(basePrice)) || 0, undefined)}
            onKeyDown={handleKeyDown}
            title="Precio base (costo)"
            aria-label="Precio base"
            style={{
              width: '100px',
              padding: '5px 6px 5px 18px',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--color-text)',
              background: 'var(--color-surface-2)',
              border: isSaving
                ? '1px solid var(--color-cyan)'
                : savedSuccess
                ? '1px solid var(--color-green)'
                : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'right',
              transition: 'border 0.2s ease, box-shadow 0.2s ease',
            }}
            id={`product-base-price-${id}`}
          />
        </div>

        {/* Markup input */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <input
            type="number"
            min="0"
            max="500"
            step="1"
            value={markupPct}
            onChange={(e) => setMarkupPct(e.target.value)}
            onBlur={() => saveChanges(undefined, parseFloat(String(markupPct)) || 0)}
            onKeyDown={handleKeyDown}
            title="Margen minorista (%)"
            aria-label="Margen minorista"
            style={{
              width: '60px',
              padding: '5px 16px 5px 6px',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--color-cyan)',
              background: 'var(--color-surface-2)',
              border: isSaving
                ? '1px solid var(--color-cyan)'
                : savedSuccess
                ? '1px solid var(--color-green)'
                : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'right',
              transition: 'border 0.2s ease, box-shadow 0.2s ease',
            }}
            id={`product-markup-${id}`}
          />
          <span
            style={{
              position: 'absolute',
              right: 6,
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              fontWeight: 700,
              pointerEvents: 'none',
            }}
          >
            %
          </span>
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 16 }}>
          {isSaving && <Loader2 size={15} className="animate-spin" style={{ color: 'var(--color-cyan)' }} />}
          {savedSuccess && <Check size={15} style={{ color: 'var(--color-green)' }} />}
        </div>
      </div>

      {/* Calculated public price preview */}
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>P. Venta:</span>
        <strong style={{ color: 'var(--color-text)' }}>
          {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(calculatedFinalPrice)}
        </strong>
      </div>
    </div>
  )
}
