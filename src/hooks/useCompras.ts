import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCompras, createCompra } from '../services/compras.service'
import type { NewCompra, NewDetalleCompra } from '../types/database'

export function useCompras() {
  return useQuery({ queryKey: ['compras'], queryFn: getCompras })
}

export function useCreateCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ compra, detalles }: { compra: NewCompra; detalles: NewDetalleCompra[] }) =>
      createCompra(compra, detalles),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compras'] })
      qc.invalidateQueries({ queryKey: ['productos'] })
      qc.invalidateQueries({ queryKey: ['stock-bajo'] })
    },
  })
}
