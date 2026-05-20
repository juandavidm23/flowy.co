import { supabase } from '../lib/supabase'
import type { Venta, NewVenta, NewDetalleVenta } from '../types/database'

const VENTA_SELECT = `
  *,
  clientes(nombre, telefono),
  detalle_ventas(
    *,
    variantes(color, foto_url, productos(nombre, marca, foto_url))
  )
`

export async function getVentas(): Promise<Venta[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select(VENTA_SELECT)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function getVentaById(id: string): Promise<Venta | null> {
  const { data, error } = await supabase
    .from('ventas')
    .select(VENTA_SELECT)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getVentasHoy(): Promise<{ total: number; count: number }> {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('ventas')
    .select('total')
    .gte('created_at', hoy.toISOString())
  if (error) throw error
  const ventas = data ?? []
  return {
    total: ventas.reduce((s, v) => s + (v.total ?? 0), 0),
    count: ventas.length,
  }
}

export async function createVenta(
  venta: NewVenta,
  detalles: NewDetalleVenta[]
): Promise<Venta> {
  const { data: v, error } = await supabase
    .from('ventas')
    .insert(venta)
    .select()
    .single()
  if (error) throw error

  if (detalles.length > 0) {
    const { error: dErr } = await supabase
      .from('detalle_ventas')
      .insert(detalles.map(d => ({ ...d, venta_id: v.id })))
    if (dErr) throw dErr
  }

  return v
}
