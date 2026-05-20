import { useState, useRef, useEffect } from 'react'
import { searchProductos } from '../../services/productos.service'
import { useCreateVenta, useVentas } from '../../hooks/useVentas'
import { useClientes, useCreateCliente } from '../../hooks/useClientes'
import { formatCOP, formatDate } from '../../lib/utils'
import Factura from './Factura'
import type { Producto, Variante, CartItem, MetodoPago, Cliente, Venta } from '../../types/database'

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'transferencia', label: 'Transferencia' },
]

export default function Ventas() {
  // Queries & Mutations
  const createVenta = useCreateVenta()
  const { data: clientes = [] } = useClientes()
  const createCliente = useCreateCliente()
  const { data: ventas = [], isLoading: isLoadingVentas } = useVentas()

  // Navigation
  const [activeTab, setActiveTab] = useState<'nueva' | 'historial'>('nueva')
  const [success, setSuccess] = useState('')

  // History Details
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)

  // POS State
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Producto[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [selectedVariante, setSelectedVariante] = useState<Variante | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [descuento, setDescuento] = useState(0)

  const [cart, setCart] = useState<CartItem[]>([])
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [clienteId, setClienteId] = useState('')
  const [notas, setNotas] = useState('')
  const [ventaId, setVentaId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [nuevoCliente, setNuevoCliente] = useState(false)
  const [ncNombre, setNcNombre] = useState('')
  const [ncTelefono, setNcTelefono] = useState('')

  const searchRef = useRef<HTMLDivElement>(null)

  // Search Debounce
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); setShowDropdown(false); return }
    const t = setTimeout(async () => {
      const res = await searchProductos(search)
      setSearchResults(res)
      setShowDropdown(true)
    }, 280)
    return () => clearTimeout(t)
  }, [search])

  // Click Outside to close search dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cart Math
  const subtotal = cart.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const totalDescuentos = cart.reduce((s, i) => s + i.descuento, 0)
  const total = subtotal - totalDescuentos

  const selectProducto = (p: Producto) => {
    setSelectedProducto(p)
    if (p.variantes && p.variantes.length === 1) {
      setSelectedVariante(p.variantes[0])
    } else {
      setSelectedVariante(null)
    }
    setCantidad(1)
    setDescuento(0)
    setSearch('')
    setShowDropdown(false)
  }

  const addToCart = () => {
    if (!selectedProducto || !selectedVariante) return
    const existing = cart.find(i => i.variante_id === selectedVariante.id)
    if (existing) {
      setCart(prev => prev.map(i =>
        i.variante_id === selectedVariante.id
          ? { ...i, cantidad: i.cantidad + cantidad, descuento: i.descuento + descuento }
          : i
      ))
    } else {
      setCart(prev => [...prev, {
        variante_id: selectedVariante.id,
        producto: selectedProducto,
        variante: selectedVariante,
        cantidad,
        precio_unitario: selectedProducto.precio_venta,
        descuento,
      }])
    }
    setSelectedProducto(null)
    setSelectedVariante(null)
    setCantidad(1)
    setDescuento(0)
  }

  const removeFromCart = (varianteId: string) =>
    setCart(prev => prev.filter(i => i.variante_id !== varianteId))

  const handleRegistrar = async () => {
    if (cart.length === 0) return setError('El carrito está vacío')
    setError('')
    try {
      let cId = clienteId || null
      if (nuevoCliente && ncNombre.trim()) {
        const nc = await createCliente.mutateAsync({ nombre: ncNombre.trim(), telefono: ncTelefono.trim() || null, notas: null })
        cId = nc.id
      }

      const v = await createVenta.mutateAsync({
        venta: { cliente_id: cId, metodo_pago: metodo, total, notas: notas || null },
        detalles: cart.map(i => ({
          variante_id: i.variante_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          descuento: i.descuento,
        })),
      })
      
      // Abre la factura
      setVentaId(v.id)
      
      // Resetea el form
      setCart([])
      setMetodo('efectivo')
      setClienteId('')
      setNotas('')
      setNuevoCliente(false)
      setNcNombre('')
      setNcTelefono('')

      // Redirige al historial con mensaje
      setActiveTab('historial')
      setSuccess('Venta registrada con éxito.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar venta')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ventas</h1>
        <p className="page-subtitle">Punto de venta e historial de transacciones</p>
      </div>

      <div className="chips" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`chip ${activeTab === 'nueva' ? 'active' : ''}`}
          onClick={() => setActiveTab('nueva')}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          Nueva venta (POS)
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'historial' ? 'active' : ''}`}
          onClick={() => setActiveTab('historial')}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          Historial de ventas
        </button>
      </div>

      <div className="page-body fade-in">
        {success && (
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.3)', color: 'var(--green)', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>{success}</span>
          </div>
        )}

        {activeTab === 'nueva' ? (
          <div className="sale-layout">
            {/* LEFT — product search + selector */}
            <div>
              <div className="section-title">Buscar producto</div>

              <div ref={searchRef} className="search-wrap" style={{ marginBottom: selectedProducto ? 16 : 24 }}>
                <svg className="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="search"
                  placeholder="Nombre o marca de la gafa…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 38 }}
                />
                {showDropdown && searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(p => (
                      <div key={p.id} className="search-result-item" onClick={() => selectProducto(p)}>
                        {p.foto_url ? (
                          <img src={p.foto_url} className="search-thumb" alt="" />
                        ) : (
                          <div className="search-thumb-placeholder">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/>
                              <path d="M10 12h4M4 12h0.5M19.5 12h0.5"/>
                            </svg>
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{p.nombre}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.marca}</div>
                        </div>
                        <div style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--accent)', fontSize: 13 }}>
                          {formatCOP(p.precio_venta)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedProducto && (
                <div className="card fade-in" style={{ padding: 18, marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                    {selectedProducto.foto_url ? (
                      <img src={selectedProducto.foto_url} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 70, height: 70, borderRadius: 8, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/>
                          <path d="M10 12h4M4 12h0.5M19.5 12h0.5"/>
                        </svg>
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{selectedProducto.nombre}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{selectedProducto.marca} · {selectedProducto.estilo}</div>
                      <div style={{ color: 'var(--accent)', fontWeight: 800, marginTop: 4 }}>{formatCOP(selectedProducto.precio_venta)}</div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto', alignSelf: 'flex-start' }} onClick={() => setSelectedProducto(null)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Selecciona color</div>
                    <div className="chips">
                      {(selectedProducto.variantes ?? []).map(v => (
                        <button
                          key={v.id}
                          type="button"
                          className={`chip ${selectedVariante?.id === v.id ? 'active' : ''}`}
                          onClick={() => setSelectedVariante(v)}
                          style={{ cursor: 'pointer' }}
                        >
                          {v.color}
                          <span style={{ marginLeft: 4, opacity: 0.6 }}>({v.stock_actual})</span>
                        </button>
                      ))}
                    </div>
                    {selectedVariante && selectedVariante.stock_actual === 0 && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <span>Sin stock disponible</span>
                      </div>
                    )}
                  </div>

                  {selectedVariante && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Cantidad</label>
                        <input type="number" min="1" max={selectedVariante.stock_actual} value={cantidad} onChange={e => setCantidad(Math.max(1, Number(e.target.value)))} />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Descuento (COP)</label>
                        <input type="number" min="0" value={descuento} onChange={e => setDescuento(Math.max(0, Number(e.target.value)))} placeholder="0" />
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={addToCart}
                        disabled={selectedVariante.stock_actual === 0}
                      >
                        Agregar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Client section */}
              <div className="section-title" style={{ marginTop: 8 }}>Cliente (opcional)</div>
              <div className="card" style={{ padding: 16, marginBottom: 4 }}>
                {!nuevoCliente ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label>Buscar cliente</label>
                      <select value={clienteId} onChange={e => setClienteId(e.target.value)}>
                        <option value="">General (Sin registrar)</option>
                        {clientes.map((c: Cliente) => <option key={c.id} value={c.id}>{c.nombre}{c.telefono ? ` · ${c.telefono}` : ''}</option>)}
                      </select>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setNuevoCliente(true)}>
                      + Nuevo
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Nuevo cliente</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => setNuevoCliente(false)}>Cancelar</button>
                    </div>
                    <div className="input-row">
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Nombre</label>
                        <input value={ncNombre} onChange={e => setNcNombre(e.target.value)} placeholder="Nombre completo" />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Teléfono</label>
                        <input value={ncTelefono} onChange={e => setNcTelefono(e.target.value)} placeholder="3001234567" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="input-group" style={{ marginTop: 12 }}>
                <label>Notas de la venta</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones…" style={{ minHeight: 60 }} />
              </div>
            </div>

            {/* RIGHT — cart */}
            <div>
              <div className="cart-panel">
                <div className="cart-header">
                  Resumen · {cart.length} item{cart.length !== 1 ? 's' : ''}
                </div>
                <div className="cart-items">
                  {cart.length === 0 ? (
                    <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      Agrega productos para comenzar
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.variante_id} className="cart-item">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="cart-item-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.producto.nombre}
                          </div>
                          <div className="cart-item-sub">
                            {item.variante.color} · x{item.cantidad}
                            {item.descuento > 0 && ` · desc. ${formatCOP(item.descuento)}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span className="cart-item-price">
                            {formatCOP(item.precio_unitario * item.cantidad - item.descuento)}
                          </span>
                          <button
                            className="btn btn-ghost btn-icon"
                            style={{ padding: 2 }}
                            onClick={() => removeFromCart(item.variante_id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="cart-total">
                  {totalDescuentos > 0 && (
                    <>
                      <div className="total-row">
                        <span>Subtotal</span><span>{formatCOP(subtotal)}</span>
                      </div>
                      <div className="total-row" style={{ color: 'var(--red)' }}>
                        <span>Descuentos</span><span>- {formatCOP(totalDescuentos)}</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Total a Cobrar</span>
                    <span className="total-final">{formatCOP(total)}</span>
                  </div>
                </div>

                <div className="cart-actions">
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Método de pago
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {METODOS.map(m => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMetodo(m.value)}
                          style={{
                            flex: 1,
                            padding: '8px 4px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            border: metodo === m.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                            background: metodo === m.value ? 'var(--accent-dim)' : 'var(--card)',
                            color: metodo === m.value ? 'var(--accent)' : 'var(--text-muted)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>
                      {error}
                    </div>
                  )}

                  <button
                    className="btn btn-primary w-full"
                    style={{ justifyContent: 'center' }}
                    onClick={handleRegistrar}
                    disabled={cart.length === 0 || createVenta.isPending}
                  >
                    {createVenta.isPending ? 'Registrando…' : `Cobrar ${formatCOP(total)}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* History Tab */}
            {isLoadingVentas ? (
              <div className="card" style={{ padding: 20, color: 'var(--text-muted)', fontSize: 14 }}>Cargando ventas...</div>
            ) : ventas.length === 0 ? (
              <div className="empty">
                <div className="empty-ico">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                </div>
                <div className="empty-txt">Sin ventas registradas</div>
              </div>
            ) : (
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha de Venta</th>
                        <th>Cliente</th>
                        <th style={{ textAlign: 'center' }}>Artículos</th>
                        <th style={{ textAlign: 'center' }}>Método de Pago</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventas.map(v => {
                        const totalRefs = (v.detalle_ventas ?? []).reduce((sum, d) => sum + d.cantidad, 0)
                        return (
                          <tr
                            key={v.id}
                            className="clickable-row"
                            onClick={() => setSelectedVenta(v)}
                            style={{ cursor: 'pointer' }}
                            title="Haz clic para ver el detalle de la venta"
                          >
                            <td style={{ fontWeight: 700 }}>{formatDate(v.created_at)}</td>
                            <td>{v.clientes?.nombre ?? 'General (Sin registrar)'}</td>
                            <td style={{ textAlign: 'center' }}>{totalRefs} ud{totalRefs !== 1 ? 's' : ''}</td>
                            <td style={{ textAlign: 'center', textTransform: 'capitalize' }}>
                              <span className="badge">{v.metodo_pago}</span>
                            </td>
                            <td style={{ color: 'var(--accent)', fontWeight: 800, textAlign: 'right' }}>
                              {formatCOP(v.total)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Detalle de Venta */}
      {selectedVenta && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">Detalle de Venta</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedVenta(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cliente</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedVenta.clientes?.nombre ?? 'General'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedVenta.clientes?.telefono ?? '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fecha y Hora</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{formatDate(selectedVenta.created_at)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>Pago: {selectedVenta.metodo_pago}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Notas de la venta</div>
                  <div style={{ fontSize: 13, lineHeight: '1.4' }}>{selectedVenta.notas || '—'}</div>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Gafa</th>
                      <th>Color</th>
                      <th style={{ textAlign: 'center' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>Unitario</th>
                      <th style={{ textAlign: 'right' }}>Desc.</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedVenta.detalle_ventas ?? []).map(d => {
                      const variantInfo = d.variantes as any
                      const productInfo = variantInfo?.productos
                      const totalFila = (d.cantidad * d.precio_unitario) - d.descuento
                      return (
                        <tr key={d.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {productInfo?.foto_url || variantInfo?.foto_url ? (
                                <img src={variantInfo?.foto_url || productInfo?.foto_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                              ) : (
                                <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>👓</div>
                              )}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{productInfo?.nombre ?? 'Gafa Eliminada'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{productInfo?.marca ?? ''}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>{variantInfo?.color ?? '—'}</td>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{d.cantidad}</td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>{formatCOP(d.precio_unitario)}</td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', color: d.descuento > 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                            {d.descuento > 0 ? `-${formatCOP(d.descuento)}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', fontWeight: 800, color: 'var(--accent)' }}>
                            {formatCOP(totalFila)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, fontSize: 16, fontWeight: 900 }}>
                <span style={{ marginRight: 12, color: 'var(--text-muted)' }}>Cobro Total:</span>
                <span style={{ color: 'var(--accent)', fontSize: 18 }}>{formatCOP(selectedVenta.total)}</span>
              </div>
            </div>
            <div className="modal-footer">
              {/* Botón para re-imprimir factura opcional si lo quisiéramos luego */}
              <button type="button" className="btn btn-secondary" onClick={() => {
                setVentaId(selectedVenta.id)
              }}>
                Ver Recibo (Factura)
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setSelectedVenta(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {ventaId && (
        <Factura ventaId={ventaId} onClose={() => setVentaId(null)} />
      )}
    </div>
  )
}
