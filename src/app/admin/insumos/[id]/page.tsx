import { createClient, getAuthUser } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { ImageUploadInput } from '@/components/admin/ImageUploadInput'
import { ColorSelector } from '@/components/admin/ColorSelector'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditInsumoPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, profile } = await getAuthUser(supabase)

  if (!user || profile?.role !== 'admin') {
    redirect('/')
  }

  const { data: supply } = await supabase
    .from('supply_inventory')
    .select('*')
    .eq('id', id)
    .single()

  if (!supply) {
    notFound()
  }

  const { data: familiesConfig } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('key', 'supply_families')
    .maybeSingle()

  let families: any[] = []
  if (familiesConfig?.value) {
    try {
      families = typeof familiesConfig.value === 'string' ? JSON.parse(familiesConfig.value) : familiesConfig.value
    } catch {}
  }

  const currentFamily = families.find((f: any) => (f.supply_ids || []).includes(id))

  async function updateInsumoAction(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const supply_type = formData.get('supply_type') as string
    const color = formData.get('color') as string
    const colorLabel = formData.get('color_label') as string
    const imageUrl = formData.get('image_url') as string
    const familyId = formData.get('family_id') as string
    const quantity = parseInt(formData.get('quantity') as string) || 0
    const lowStockThreshold = parseInt(formData.get('low_stock_threshold') as string) || 5
    const isActiveVal = formData.get('is_active') as string
    const isActive = isActiveVal === 'true' || isActiveVal === 'on'

    const supabase = await createClient()
    const { error } = await supabase
      .from('supply_inventory')
      .update({
        name,
        supply_type: supply_type,
        color: color || null,
        color_label: colorLabel || null,
        image_url: imageUrl || null,
        quantity,
        low_stock_threshold: lowStockThreshold,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating supply:', error)
    }

    // Update family membership in pricing_config
    const { data: fConfig } = await supabase.from('pricing_config').select('*').eq('key', 'supply_families').single()
    if (fConfig?.value) {
      try {
        const list = typeof fConfig.value === 'string' ? JSON.parse(fConfig.value) : fConfig.value
        const updated = list.map((f: any) => {
          let ids = (f.supply_ids || []).filter((sId: string) => sId !== id)
          if (f.id === familyId) {
            ids.push(id)
          }
          return { ...f, supply_ids: Array.from(new Set(ids)) }
        })
        await supabase.from('pricing_config').update({ value: updated }).eq('key', 'supply_families')
      } catch (err) {
        console.error('Error updating family membership:', err)
      }
    }

    revalidatePath('/admin/insumos')
    revalidatePath(`/admin/insumos/${id}`)
    redirect('/admin/insumos')
  }

  async function deleteInsumoAction() {
    'use server'
    const supabase = await createClient()
    const { error } = await supabase
      .from('supply_inventory')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deleting supply:', error)
    }

    revalidatePath('/admin/insumos')
    redirect('/admin/insumos')
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 'var(--space-16)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <Link href="/admin/insumos" className="btn btn-ghost btn-icon btn-sm">
          <ArrowLeft size={18} />
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Editar Insumo</h1>
      </div>

      <div className="card card-body">
        <form action={updateInsumoAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="insumo-name">Nombre *</label>
            <input
              id="insumo-name"
              name="name"
              className="form-input"
              defaultValue={supply.name}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="insumo-type">Tipo *</label>
            <select
              id="insumo-type"
              name="supply_type"
              className="form-input form-select"
              defaultValue={supply.supply_type}
              required
            >
              <option value="button">🔴 Botones</option>
              <option value="joystick">🕹️ Palancas</option>
              <option value="vinyl">🎨 Vinilos</option>
              <option value="led">💡 LEDs</option>
              <option value="other">📦 Otros</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="insumo-family">Familia de Insumo</label>
            <select
              id="insumo-family"
              name="family_id"
              className="form-input form-select"
              defaultValue={currentFamily?.id || ''}
            >
              <option value="">-- Sin Familia / Ninguna --</option>
              {families.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <ImageUploadInput defaultValue={supply.image_url} />

          <ColorSelector defaultColor={supply.color} defaultLabel={supply.color_label} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="insumo-qty">Cantidad en Stock *</label>
              <input
                id="insumo-qty"
                name="quantity"
                type="number"
                className="form-input"
                defaultValue={supply.quantity}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="insumo-threshold">Umbral de alerta stock bajo *</label>
              <input
                id="insumo-threshold"
                name="low_stock_threshold"
                type="number"
                className="form-input"
                defaultValue={supply.low_stock_threshold}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="insumo-active">Estado</label>
            <select
              id="insumo-active"
              name="is_active"
              className="form-input form-select"
              defaultValue={supply.is_active ? 'true' : 'false'}
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo (deshabilitado)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', justifyContent: 'space-between' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
              <Save size={16} /> Guardar cambios
            </button>
          </div>
        </form>

        <form action={deleteInsumoAction} style={{ marginTop: 'var(--space-4)' }}>
          <button type="submit" className="btn btn-outline" style={{ width: '100%', borderColor: 'var(--color-red)', color: 'var(--color-red)', justifyContent: 'center', gap: 8 }}>
            <Trash size={16} /> Desactivar Insumo
          </button>
        </form>
      </div>
    </div>
  )
}
