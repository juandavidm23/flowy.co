import { supabase } from '../lib/supabase'
import type { Proveedor } from '../types/database'

export async function getProveedores(): Promise<Proveedor[]> {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data ?? []
}

export async function createProveedor(
  proveedor: Omit<Proveedor, 'id' | 'created_at'>
): Promise<Proveedor> {
  const { data, error } = await supabase
    .from('proveedores')
    .insert(proveedor)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProveedor(
  id: string,
  proveedor: Partial<Omit<Proveedor, 'id' | 'created_at'>>
): Promise<Proveedor> {
  const { data, error } = await supabase
    .from('proveedores')
    .update(proveedor)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProveedor(id: string): Promise<void> {
  const { error } = await supabase.from('proveedores').delete().eq('id', id)
  if (error) throw error
}
