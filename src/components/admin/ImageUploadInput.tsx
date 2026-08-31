'use client'

import { useState } from 'react'

interface Props {
  defaultValue?: string | null
}

/**
 * Resizes and compresses image on client side before passing to state
 */
function compressImage(file: File, maxWidth: number = 1000, maxHeight: number = 1000, quality: number = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(event.target?.result as string)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/webp', quality)
        resolve(compressedBase64)
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

export function ImageUploadInput({ defaultValue }: Props) {
  const [imageUrl, setImageUrl] = useState(defaultValue || '')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null)
    const file = e.target.files?.[0]
    if (!file) return

    // 5MB Limit check
    const MAX_SIZE_MB = 5
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`⚠️ El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)}MB. El tamaño máximo permitido es de ${MAX_SIZE_MB}MB.`)
      e.target.value = ''
      return
    }

    try {
      setProcessing(true)
      const compressed = await compressImage(file, 1000, 1000, 0.85)
      setImageUrl(compressed)
    } catch (err) {
      setErrorMessage('Error al procesar la imagen. Intentá con otro formato (JPG, PNG o WEBP).')
    } finally {
      setProcessing(false)
      e.target.value = ''
    }
  }

  return (
    <div className="form-group">
      <label className="form-label">Imagen / Foto del Insumo</label>
      <input type="hidden" name="image_url" value={imageUrl} />

      {errorMessage && (
        <div
          style={{
            padding: 'var(--space-3)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
            fontSize: '0.8125rem',
            marginBottom: 'var(--space-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setErrorMessage(null)}
            style={{ color: 'var(--color-danger)', padding: '2px 6px' }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {imageUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
            <img
              src={imageUrl}
              alt="Preview"
              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-cyan)' }}>✓ Imagen cargada</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                Optimizada para la tienda
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{ color: 'var(--color-danger)' }}
              onClick={() => {
                setImageUrl('')
                setErrorMessage(null)
              }}
            >
              Quitar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <label
              className="btn btn-secondary btn-sm"
              style={{ cursor: processing ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {processing ? '⏳ Procesando imagen...' : '📁 Adjuntar Imagen desde tu PC'}
              <input
                type="file"
                accept="image/*"
                disabled={processing}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              PNG, JPG, WEBP (hasta 5MB)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
