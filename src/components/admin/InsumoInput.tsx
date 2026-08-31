'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useToast } from '@/lib/stores/toast'

interface Props {
  id: string
  initialQuantity: number
  lowStockThreshold: number
  unit: string
}

export function InsumoInput({ id, initialQuantity, lowStockThreshold, unit }: Props) {
  const supabase = createClient()
  const toast = useToast()
  const [quantity, setQuantity] = useState(initialQuantity)
  const [isSaving, setIsSaving] = useState(false)

  const handleBlur = async () => {
    setIsSaving(true)
    const { error } = await supabase
      .from('supply_inventory')
      .update({ quantity })
      .eq('id', id)

    setIsSaving(false)
    if (error) {
      toast.error('Error al guardar stock')
    } else {
      toast.success('Stock actualizado')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        required
        min="-999"
        style={{
          width: '70px',
          background: 'var(--color-surface-2)',
          border: isSaving ? '1px solid var(--color-cyan)' : '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          color: quantity <= 0 ? 'var(--color-red)' : quantity < lowStockThreshold ? 'var(--color-amber)' : 'var(--color-green)',
          padding: '4px 8px',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          textAlign: 'center',
          transition: 'border var(--transition-fast)',
        }}
        id={`insumo-input-${id}`}
      />
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{unit || 'u'}</span>
    </div>
  )
}
