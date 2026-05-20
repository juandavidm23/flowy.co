import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProductos, useDeleteProducto } from '../../hooks/useProductos'
import { searchProductos } from '../../services/productos.service'
import { formatCOP } from '../../lib/utils'
import type { Producto, CartItem } from '../../types/database'

const CHIPS_SUGERIDOS = ['rosa', 'oro', 'cromo', 'aviator', 'medellín']

export default function Inventario() {
  const navigate = useNavigate()
  const { data: productos = [], isLoading } = useProductos()
  const deleteProducto = useDeleteProducto()

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Producto[]>([])
  const [selected, setSelected] = useState<Producto | null>(null)
  
  // Mapear el ID de variante activa para cada producto
  const [activeVariants, setActiveVariants] = useState<Record<string, string>>({})

  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      const res = await searchProductos(search)
      setSearchResults(res)
    }, 280)
    return () => clearTimeout(timer)
  }, [search])

  // Inicializar variantes activas si no están seteadas
  useEffect(() => {
    const defaultVariants: Record<string, string> = {}
    productos.forEach(p => {
      if (p.variantes && p.variantes.length > 0 && !activeVariants[p.id]) {
        defaultVariants[p.id] = p.variantes[0].id
      }
    })
    if (Object.keys(defaultVariants).length > 0) {
      setActiveVariants(prev => ({ ...prev, ...defaultVariants }))
    }
  }, [productos, activeVariants])

  const displayed = search.trim() ? searchResults : productos

  const handleChipClick = (chip: string) => {
    setSearch(chip)
  }

  // Lógica para agregar al carrito y vender
  const handleVender = (producto: Producto) => {
    const activeVarId = activeVariants[producto.id] || producto.variantes?.[0]?.id
    if (!activeVarId) return

    const variante = producto.variantes?.find(v => v.id === activeVarId)
    if (!variante) return

    // Estructurar el CartItem de acuerdo con el tipo estricto de types/database.ts
    const item: CartItem = {
      variante_id: variante.id,
      producto: producto,
      variante: variante,
      cantidad: 1,
      precio_unitario: producto.precio_venta,
      descuento: 0
    }

    try {
      const stored = localStorage.getItem('flowy-cart')
      let cart: CartItem[] = stored ? JSON.parse(stored) : []
      const index = cart.findIndex(c => c.variante_id === item.variante_id)

      if (index > -1) {
        cart[index].cantidad += 1
      } else {
        cart.push(item)
      }

      localStorage.setItem('flowy-cart', JSON.stringify(cart))
      // Disparar evento para actualizar Layout
      window.dispatchEvent(new Event('cart-updated'))
      
      // Redirigir a Ventas
      navigate('/ventas')
    } catch (e) {
      console.error('Error al agregar al carrito:', e)
    }
  }

  return (
    <div>
      {/* Encabezado estilo Buscador del mockup (con botón atrás) */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <button 
          onClick={() => navigate('/')} 
          className="btn btn-ghost btn-icon"
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }}
          title="Regresar al Dashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: '24px' }}>Buscador</h1>
          <p className="page-subtitle" style={{ fontSize: '11px', marginTop: '2px' }}>
            {search.trim() ? `${displayed.length} resultados - escribiendo "${search}"` : `${productos.length} productos en total`}
          </p>
        </div>
        <button className="btn btn-primary no-print" onClick={() => navigate('/compras')} style={{ borderRadius: '16px' }}>
          <span>+</span> Registrar compra
        </button>
      </div>

      <div className="page-body fade-in">
        {/* Input de Búsqueda Y2K con Barcode Scanner icon */}
        <div ref={searchRef} className="search-wrap" style={{ marginBottom: '16px', maxWidth: '100%', position: 'relative' }}>
          <svg className="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por color, modelo o estilo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ 
              paddingLeft: '40px', 
              paddingRight: '54px', 
              height: '48px', 
              borderRadius: '16px', 
              background: 'rgba(255,255,255,0.02)', 
              border: '1.5px solid var(--border)' 
            }}
          />
          {search && (
            <button 
              onClick={() => { setSearch(''); setSearchResults([]) }}
              style={{ position: 'absolute', right: '44px', top: '14px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
            >
              ✕
            </button>
          )}
          {/* Icono de Cámara / Código de barras en el extremo derecho */}
          <div style={{ position: 'absolute', right: '16px', top: '13px', color: 'var(--accent)', cursor: 'pointer', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        </div>

        {/* Chips de sugerencias horizontales */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '8px', 
            marginBottom: '20px', 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          className="no-scrollbar"
        >
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', alignSelf: 'center', marginRight: '4px', letterSpacing: '0.5px' }}>
            Sugerencias
          </span>
          {CHIPS_SUGERIDOS.map(chip => {
            const isActive = search.toLowerCase() === chip.toLowerCase()
            return (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                style={{
                  background: isActive ? 'var(--accent)' : 'rgba(255, 255, 255, 0.03)',
                  color: isActive ? '#000' : 'var(--text-muted)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '6px 14px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap'
                }}
              >
                {chip}
              </button>
            )
          })}
        </div>

        {isLoading ? (
          <div className="product-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="skeleton" style={{ aspectRatio: '1.4', width: '100%' }} />
                <div style={{ padding: '16px' }}>
                  <div className="skeleton" style={{ height: '14px', width: '60%', marginBottom: '8px' }} />
                  <div className="skeleton" style={{ height: '11px', width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="empty" style={{ padding: '40px 20px' }}>
            <div className="empty-ico">🕶️</div>
            <div className="empty-txt" style={{ marginTop: '12px' }}>Sin resultados para "{search}"</div>
            <div className="empty-sub">Intenta con otra palabra o registra una nueva gafa</div>
          </div>
        ) : (
          /* Listado de resultados adaptado al estilo mockup */
          <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {displayed.map(p => {
              const currentVarId = activeVariants[p.id] || p.variantes?.[0]?.id
              const activeVar = p.variantes?.find(v => v.id === currentVarId)
              const varColorName = activeVar?.color ?? ''
              const varFotoUrl = activeVar?.foto_url || p.foto_url

              return (
                <div 
                  key={p.id} 
                  className="product-card" 
                  style={{ 
                    display: 'flex', 
                    padding: '14px', 
                    gap: '14px', 
                    borderRadius: '18px', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    alignItems: 'center'
                  }}
                  onClick={(e) => {
                    // Evitar abrir modal si se hace clic en botones o círculos
                    const target = e.target as HTMLElement
                    if (!target.closest('.no-modal-action')) {
                      setSelected(p)
                    }
                  }}
                >
                  {/* Thumbnail redondo con imagen */}
                  <div style={{ flexShrink: 0 }}>
                    {varFotoUrl ? (
                      <img 
                        src={varFotoUrl} 
                        alt="" 
                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }} 
                      />
                    ) : (
                      <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--accent) 0%, rgba(var(--accent-rgb),0.2) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        🕶️
                      </div>
                    )}
                  </div>

                  {/* Detalles del producto */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '14px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.nombre}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', marginLeft: '6px' }}>
                        {formatCOP(p.precio_venta)}
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {p.marca} &middot; {p.estilo}
                    </div>

                    {/* Selector de Círculos de Color (Swatches) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }} className="no-modal-action">
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {(p.variantes ?? []).map(v => {
                          const isActive = v.id === currentVarId
                          // Generamos un color simulado o usamos negro/gris/rosa para el circulito
                          let colorBg = 'rgba(255,255,255,0.2)'
                          const normalized = v.color.toLowerCase()
                          if (normalized.includes('rosa')) colorBg = '#ff007f'
                          else if (normalized.includes('lila') || normalized.includes('morado')) colorBg = '#b026ff'
                          else if (normalized.includes('verde') || normalized.includes('lima')) colorBg = '#39ff14'
                          else if (normalized.includes('azul')) colorBg = '#00a3ff'
                          else if (normalized.includes('oro') || normalized.includes('dorado')) colorBg = '#ffd200'
                          else if (normalized.includes('cromo') || normalized.includes('plata')) colorBg = '#e2e8f0'
                          else if (normalized.includes('negro')) colorBg = '#000000'
                          else if (normalized.includes('blanco')) colorBg = '#ffffff'

                          return (
                            <button
                              key={v.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveVariants(prev => ({ ...prev, [p.id]: v.id }))
                              }}
                              style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                background: colorBg,
                                border: isActive ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                padding: 0,
                                outline: isActive ? '1px solid #fff' : 'none',
                                transform: isActive ? 'scale(1.1)' : 'scale(1)'
                              }}
                              title={v.color}
                            />
                          )
                        })}
                      </div>

                      {/* Nombre del color activo */}
                      <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {varColorName}
                      </span>
                    </div>
                  </div>

                  {/* Botón de Vender rápido en el extremo derecho */}
                  <div className="no-modal-action" style={{ flexShrink: 0 }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleVender(p)
                      }}
                      className="btn btn-primary"
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '11px', 
                        fontWeight: 900, 
                        borderRadius: '12px',
                        background: 'var(--accent)',
                        color: '#000',
                        textTransform: 'uppercase',
                        border: 'none',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Vender
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>



      {selected && (
        <ProductoDetail
          producto={selected}
          onClose={() => setSelected(null)}
          onDelete={async () => {
            await deleteProducto.mutateAsync(selected.id)
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}

function ProductoDetail({
  producto,
  onClose,
  onDelete,
}: {
  producto: Producto
  onClose: () => void
  onDelete: () => void
}) {
  const totalStock = (producto.variantes ?? []).reduce((s, v) => s + v.stock_actual, 0)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">{producto.nombre}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24 }}>
          <div>
            {producto.foto_url ? (
              <img src={producto.foto_url} alt="" style={{ width: '100%', borderRadius: 10, aspectRatio: '1', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-3)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/>
                  <path d="M3 12h1M20 12h1M11 12h2"/>
                </svg>
              </div>
            )}
          </div>
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{producto.nombre}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{producto.marca} · {producto.estilo}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Precio costo</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--purple)' }}>{formatCOP(producto.precio_costo)}</div>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Precio venta</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--pink)' }}>{formatCOP(producto.precio_venta)}</div>
              </div>
            </div>
            <div className="section-title" style={{ marginBottom: 10 }}>Variantes · {totalStock} en stock total</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(producto.variantes ?? []).map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {v.foto_url ? (
                    <img src={v.foto_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, background: 'var(--bg-3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/>
                        <path d="M10 12h4M4 12h0.5M19.5 12h0.5"/>
                      </svg>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{v.color}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>mín. {v.stock_minimo} uds</div>
                  </div>
                  <span className={`badge ${v.stock_actual <= v.stock_minimo ? (v.stock_actual === 0 ? 'badge-red' : 'badge-yellow') : 'badge-green'}`}>
                    {v.stock_actual} uds
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('¿Archivar este producto?')) onDelete() }}>
            Archivar
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
