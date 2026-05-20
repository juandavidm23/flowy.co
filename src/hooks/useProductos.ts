import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  createVariante,
} from '../services/productos.service'
import type { NewProducto, NewVariante, Variante } from '../types/database'

export function useProductos() {
  return useQuery({ queryKey: ['productos'], queryFn: getProductos })
}

export function useProducto(id: string) {
  return useQuery({
    queryKey: ['productos', id],
    queryFn: () => getProductoById(id),
    enabled: !!id,
  })
}

export function useCreateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ producto, variantes }: { producto: NewProducto; variantes: NewVariante[] }) =>
      createProducto(producto, variantes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

export function useUpdateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewProducto> }) =>
      updateProducto(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

export function useDeleteProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProducto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

export function useCreateVariante() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variante: Omit<Variante, 'id' | 'created_at'>) => createVariante(variante),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}
