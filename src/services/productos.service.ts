import { supabase } from '../lib/supabase'
import type { Producto, NewProducto, NewVariante, Variante } from '../types/database'

export async function getProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*, variantes(*), proveedores(nombre)')
    .eq('activo', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getProductoById(id: string): Promise<Producto | null> {
  const { data, error } = await supabase
    .from('productos')
    .select('*, variantes(*), proveedores(nombre)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function searchProductos(query: string): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*, variantes(*)')
    .eq('activo', true)
    .or(`nombre.ilike.%${query}%,marca.ilike.%${query}%`)
    .limit(10)
  if (error) throw error
  return data ?? []
}

export async function createProducto(
  producto: NewProducto,
  variantes: NewVariante[]
): Promise<Producto> {
  const { data: prod, error } = await supabase
    .from('productos')
    .insert(producto)
    .select()
    .single()
  if (error) throw error

  let createdVariantes: any[] = []
  if (variantes.length > 0) {
    const { data: vars, error: vErr } = await supabase
      .from('variantes')
      .insert(variantes.map(v => ({ ...v, producto_id: prod.id })))
      .select()
    if (vErr) throw vErr
    createdVariantes = vars ?? []
  }

  return {
    ...prod,
    variantes: createdVariantes
  }
}

export async function updateProducto(
  id: string,
  data: Partial<NewProducto>
): Promise<Producto> {
  const { data: prod, error } = await supabase
    .from('productos')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return prod
}

export async function deleteProducto(id: string): Promise<void> {
  const { error } = await supabase
    .from('productos')
    .update({ activo: false })
    .eq('id', id)
  if (error) throw error
}

export async function uploadFoto(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage
    .from('fotos-productos')
    .upload(path, file, { upsert: false })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage
    .from('fotos-productos')
    .getPublicUrl(data.path)
  return publicUrl
}

export async function createVariante(
  variante: Omit<Variante, 'id' | 'created_at'>
): Promise<Variante> {
  const { data, error } = await supabase
    .from('variantes')
    .insert(variante)
    .select()
    .single()
  if (error) throw error
  return data
}
