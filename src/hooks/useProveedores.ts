import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
} from '../services/proveedores.service'
import type { Proveedor } from '../types/database'

export function useProveedores() {
  return useQuery({ queryKey: ['proveedores'], queryFn: getProveedores })
}

export function useCreateProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Proveedor, 'id' | 'created_at'>) => createProveedor(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores'] }),
  })
}

export function useUpdateProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Proveedor, 'id' | 'created_at'>> }) =>
      updateProveedor(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores'] }),
  })
}

export function useDeleteProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProveedor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores'] }),
  })
}
