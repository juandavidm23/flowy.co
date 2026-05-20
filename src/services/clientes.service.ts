import { supabase } from '../lib/supabase'
import type { Cliente } from '../types/database'

export async function getClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data ?? []
}

export async function createCliente(
  cliente: Omit<Cliente, 'id' | 'created_at'>
): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .insert(cliente)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCliente(
  id: string,
  cliente: Partial<Omit<Cliente, 'id' | 'created_at'>>
): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .update(cliente)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}

export async function getClienteCompras(
  clienteId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('ventas')
    .select('*', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)
  if (error) throw error
  return count ?? 0
}
