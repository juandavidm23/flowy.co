import { supabase } from '../lib/supabase'
import type { Compra, NewCompra, NewDetalleCompra } from '../types/database'

const COMPRA_SELECT = `
  *,
  proveedores(nombre),
  detalle_compras(
    *,
    variantes(color, productos(nombre, marca))
  )
`

export async function getCompras(): Promise<Compra[]> {
  const { data, error } = await supabase
    .from('compras')
    .select(COMPRA_SELECT)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function createCompra(
  compra: NewCompra,
  detalles: NewDetalleCompra[]
): Promise<Compra> {
  const { data: c, error } = await supabase
    .from('compras')
    .insert(compra)
    .select()
    .single()
  if (error) throw error

  if (detalles.length > 0) {
    const { error: dErr } = await supabase
      .from('detalle_compras')
      .insert(detalles.map(d => ({ ...d, compra_id: c.id })))
    if (dErr) throw dErr
  }

  return c
}
