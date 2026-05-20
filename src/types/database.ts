export type Estilo = 'cat-eye' | 'aviador' | 'redonda' | 'rectangular' | 'otro'
export type MetodoPago = 'efectivo' | 'nequi' | 'transferencia'

export interface Proveedor {
  id: string
  nombre: string
  ciudad: string
  contacto: string
  notas: string | null
  created_at: string
}

export interface Producto {
  id: string
  proveedor_id: string | null
  nombre: string
  marca: string
  estilo: Estilo
  precio_costo: number
  precio_venta: number
  foto_url: string | null
  activo: boolean
  created_at: string
  variantes?: Variante[]
  proveedores?: { nombre: string } | null
}

export interface Variante {
  id: string
  producto_id: string
  color: string
  foto_url: string | null
  stock_actual: number
  stock_minimo: number
  created_at: string
}

export interface Cliente {
  id: string
  nombre: string
  telefono: string | null
  notas: string | null
  created_at: string
}

export interface Venta {
  id: string
  cliente_id: string | null
  metodo_pago: MetodoPago
  total: number
  notas: string | null
  created_at: string
  clientes?: { nombre: string; telefono: string | null } | null
  detalle_ventas?: DetalleVenta[]
}

export interface DetalleVenta {
  id: string
  venta_id: string
  variante_id: string
  cantidad: number
  precio_unitario: number
  descuento: number
  variantes?: {
    color: string
    foto_url: string | null
    productos: { nombre: string; marca: string; foto_url: string | null } | null
  } | null
}

export interface Compra {
  id: string
  proveedor_id: string | null
  total: number
  notas: string | null
  created_at: string
  proveedores?: { nombre: string } | null
  detalle_compras?: DetalleCompra[]
}

export interface DetalleCompra {
  id: string
  compra_id: string
  variante_id: string
  cantidad: number
  precio_unitario: number
  variantes?: {
    color: string
    productos: { nombre: string; marca: string } | null
  } | null
}

export interface StockBajo {
  variante_id: string
  producto_id: string
  producto_nombre: string
  marca: string
  color: string
  stock_actual: number
  stock_minimo: number
  foto_url: string | null
}

export interface CartItem {
  variante_id: string
  producto: Producto
  variante: Variante
  cantidad: number
  precio_unitario: number
  descuento: number
}

export interface NewProducto {
  proveedor_id: string | null
  nombre: string
  marca: string
  estilo: Estilo
  precio_costo: number
  precio_venta: number
  foto_url: string | null
  activo: boolean
}

export interface NewVariante {
  color: string
  foto_url: string | null
  stock_actual: number
  stock_minimo: number
}

export interface NewVenta {
  cliente_id: string | null
  metodo_pago: MetodoPago
  total: number
  notas: string | null
}

export interface NewDetalleVenta {
  variante_id: string
  cantidad: number
  precio_unitario: number
  descuento: number
}

export interface NewCompra {
  proveedor_id: string | null
  total: number
  notas: string | null
  created_at?: string
}

export interface NewDetalleCompra {
  variante_id: string
  cantidad: number
  precio_unitario: number
}
