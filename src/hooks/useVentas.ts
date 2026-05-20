import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getVentas,
  getVentaById,
  getVentasHoy,
  createVenta,
} from '../services/ventas.service'
import type { NewVenta, NewDetalleVenta } from '../types/database'

export function useVentas() {
  return useQuery({ queryKey: ['ventas'], queryFn: getVentas })
}

export function useVenta(id: string) {
  return useQuery({
    queryKey: ['ventas', id],
    queryFn: () => getVentaById(id),
    enabled: !!id,
  })
}

export function useVentasHoy() {
  return useQuery({ queryKey: ['ventas-hoy'], queryFn: getVentasHoy })
}

export function useCreateVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ venta, detalles }: { venta: NewVenta; detalles: NewDetalleVenta[] }) =>
      createVenta(venta, detalles),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas'] })
      qc.invalidateQueries({ queryKey: ['ventas-hoy'] })
      qc.invalidateQueries({ queryKey: ['productos'] })
      qc.invalidateQueries({ queryKey: ['stock-bajo'] })
    },
  })
}
