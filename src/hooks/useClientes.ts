import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
} from '../services/clientes.service'
import type { Cliente } from '../types/database'

export function useClientes() {
  return useQuery({ queryKey: ['clientes'], queryFn: getClientes })
}

export function useCreateCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Cliente, 'id' | 'created_at'>) => createCliente(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}

export function useUpdateCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Cliente, 'id' | 'created_at'>> }) =>
      updateCliente(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}

export function useDeleteCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCliente(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}
