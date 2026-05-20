import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useVentasHoy } from '../hooks/useVentas'
import { formatCOP } from '../lib/utils'
import type { StockBajo } from '../types/database'

function getRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const diffMs = new Date().getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'hace unos instantes'
  if (diffMins < 60) return `hace ${diffMins} min`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `hace ${diffHrs} h`
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(date)
}

export default function Dashboard() {
  const [userName, setUserName] = useState('Manuela')

  // Obtener datos del usuario activo para el saludo
  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const email = user.email || ''
        if (email.toLowerCase().includes('manuela')) {
          setUserName('Manuela')
        } else {
          setUserName(email.split('@')[0] || 'Admin')
        }
      }
    })
  })

  // 1. Ventas de Hoy
  const { data: ventasHoy } = useVentasHoy()

  // 2. Alertas de Stock Bajo
  const { data: stockBajo = [] } = useQuery<StockBajo[]>({
    queryKey: ['stock-bajo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vista_stock_bajo')
        .select('*')
        .order('stock_actual')
      if (error) throw error
      return (data ?? []) as StockBajo[]
    },
  })

  // 3. Totales de catálogo y unidades físicas
  const { data: catStats } = useQuery({
    queryKey: ['catalog-stats'],
    queryFn: async () => {
      const { count: modelos } = await supabase
        .from('productos')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true)

      const { count: variantes } = await supabase
        .from('variantes')
        .select('*', { count: 'exact', head: true })

      const { data: stockData } = await supabase
        .from('variantes')
        .select('stock_actual')

      const totalUds = stockData?.reduce((sum, v) => sum + (v.stock_actual || 0), 0) ?? 0

      return {
        modelos: modelos ?? 0,
        variantes: variantes ?? 0,
        totalUds
      }
    }
  })

  // 4. Ventas Recientes con imágenes y clientes
  const { data: ventasRecientes = [] } = useQuery<any[]>({
    queryKey: ['ventas-recientes-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          clientes(nombre),
          detalle_ventas(
            cantidad,
            variantes(
              foto_url,
              color,
              productos(nombre)
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(4)
      if (error) throw error
      return data ?? []
    },
  })

  const handleNewSale = () => {
    window.location.href = '/ventas'
  }

  const handleSearchFocus = () => {
    window.location.href = '/inventario'
  }

  // Formatear fecha al estilo Y2K mockup: "LUNES - 18 MAYO 2026"
  const dayName = new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(new Date()).toUpperCase()
  const dateNum = new Intl.DateTimeFormat('es-CO', { day: 'numeric' }).format(new Date())
  const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date()).toUpperCase()
  const yearNum = new Intl.DateTimeFormat('es-CO', { year: 'numeric' }).format(new Date())
  const formattedDate = `${dayName} - ${dateNum} ${monthName} ${yearNum}`

  // Clases de colores para las tarjetas inferiores
  const colorsList = ['pink', 'orange', 'yellow', 'green']

  return (
    <div>
      {/* Header superior estilo Mockup Escritorio */}
      <div className="page-header">
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>
              {formattedDate}
            </div>
            <h1 
              className="welcome-title"
              style={{ 
                marginTop: '4px',
              }}
            >
              Bienvenida, {userName}
            </h1>
          </div>

          {/* Barra de búsqueda y botón de acción */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} className="no-print">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="hide-mobile">
              <input 
                type="text" 
                placeholder="Buscar producto, cliente, factura..." 
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px', 
                  padding: '8px 16px 8px 36px', 
                  fontSize: '13px', 
                  color: '#fff', 
                  width: '280px', 
                  fontFamily: 'Space Grotesk' 
                }}
                onFocus={handleSearchFocus}
              />
              <svg 
                style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span style={{ position: 'absolute', right: 12, fontSize: '10px', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px', background: 'rgba(255,255,255,0.02)' }}>⌘K</span>
            </div>

            <button 
              onClick={handleNewSale}
              className="btn btn-primary btn-glow"
              style={{ 
                borderRadius: '20px', 
                padding: '10px 20px', 
                fontWeight: 800, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontFamily: 'Space Grotesk'
              }}
            >
              <span>+</span> Nueva venta
            </button>
          </div>
        </div>
      </div>

      <div className="page-body fade-in">

      {/* Grid de 4 Métricas principales */}
      <div className="stats-grid" style={{ marginBottom: '28px' }}>
        {/* Ventas Hoy */}
        <div className="card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="highlight-badge pink" style={{ fontSize: '9px', padding: '3px 6px' }}>+ VENTAS HOY</span>
            <div className="stat-value pink">
              {formatCOP(ventasHoy?.total ?? 0)}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span style={{ color: 'var(--green)', fontWeight: 800 }}>↑ 18%</span> vs ayer &middot; {ventasHoy?.count ?? 0} ventas
          </div>
        </div>

        {/* Stock Bajo */}
        <div className="card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="highlight-badge yellow" style={{ fontSize: '9px', padding: '3px 6px' }}>STOCK BAJO</span>
            <div className="stat-value yellow">
              {stockBajo.length}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            variantes a reponer
          </div>
        </div>

        {/* Inventario Total */}
        <div className="card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="highlight-badge pink" style={{ fontSize: '9px', padding: '3px 6px', color: '#b026ff', background: 'rgba(176,38,255,0.15)', borderColor: 'rgba(176,38,255,0.3)' }}>INVENTARIO</span>
            <div className="stat-value purple">
              {catStats?.totalUds ?? 0}<span style={{ fontSize: '16px', fontWeight: 600 }}> u.</span>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {catStats?.modelos ?? 0} modelos - {catStats?.variantes ?? 0} variantes
          </div>
        </div>

        {/* Margen */}
        <div className="card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="highlight-badge pink" style={{ fontSize: '9px', padding: '3px 6px', color: '#ffd200', background: 'rgba(255,210,0,0.15)', borderColor: 'rgba(255,210,0,0.3)' }}>MARGEN MES</span>
            <div className="stat-value gold">
              54%
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            promedio ponderado
          </div>
        </div>
      </div>

      {/* Botones de acción rápida visibles únicamente en móvil para imitar el mockup */}
      <div 
        className="hide-desktop" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '12px', 
          marginBottom: '28px' 
        }}
      >
        <button 
          onClick={handleNewSale}
          className="btn btn-primary"
          style={{ borderRadius: '20px', padding: '12px', fontWeight: 800 }}
        >
          + Nueva venta
        </button>
        <button 
          onClick={handleSearchFocus}
          className="btn btn-secondary"
          style={{ borderRadius: '20px', padding: '12px', fontWeight: 800, background: 'rgba(255,255,255,0.04)' }}
        >
          🔍 Buscar
        </button>
      </div>

      {/* Sección intermedia: Ventas Recientes */}
      <div style={{ marginBottom: '32px' }}>
        {/* Últimas Ventas */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800 }}>Últimas ventas</span>
            <span 
              onClick={() => window.location.href = '/ventas'}
              style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.5px', cursor: 'pointer', textTransform: 'uppercase' }}
            >
              Ver Todo &rarr;
            </span>
          </div>

          {ventasRecientes.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No hay ventas registradas
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {ventasRecientes.map((v, i) => {
                const firstDetail = v.detalle_ventas?.[0]
                const nombreProducto = firstDetail?.variantes?.productos?.nombre ?? 'Gafas Flowy'
                const colorProducto = firstDetail?.variantes?.color ? ` (${firstDetail.variantes.color})` : ''
                const fotoProducto = firstDetail?.variantes?.foto_url
                const sku = v.id.slice(0, 5).toUpperCase()
                const metodo = v.metodo_pago.charAt(0).toUpperCase() + v.metodo_pago.slice(1)
                const relTime = getRelativeTime(v.created_at)

                return (
                  <div key={v.id || i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {fotoProducto ? (
                      <img 
                        src={fotoProducto} 
                        alt="" 
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)' }} 
                      />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent) 0%, rgba(var(--accent-rgb),0.2) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: '14px' }}>
                        👓
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {nombreProducto}{colorProducto}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        #{sku} &middot; {metodo} &middot; {relTime}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {formatCOP(v.total)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sección inferior: Inventario Destacado */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '16px', fontWeight: 800 }}>Inventario destacado</span>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px', fontWeight: 700 }}>
              Variantes con bajo stock o ventas recientes
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/compras'}
            className="btn btn-secondary" 
            style={{ borderRadius: '12px', padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)' }}
          >
            <span>+</span> Registrar compra
          </button>
        </div>

        {stockBajo.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Todo el inventario cuenta con stock suficiente.
          </div>
        ) : (
          <div className="product-grid">
            {stockBajo.slice(0, 4).map((item, index) => {
              const activeColor = colorsList[index % colorsList.length]
              return (
                <div 
                  key={item.variante_id || index} 
                  className={`highlight-card ${activeColor}`}
                  onClick={() => window.location.href = '/inventario'}
                >
                  <div className="highlight-pattern" />
                  <div className="highlight-content">
                    <span className={`highlight-badge ${activeColor}`}>
                      STOCK BAJO
                    </span>
                    
                    {/* Contenedor central flotante para la silueta o imagen del producto */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '64px' }}>
                      {item.foto_url ? (
                        <img 
                          src={item.foto_url} 
                          alt="" 
                          style={{ maxHeight: '54px', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}
                        />
                      ) : (
                        <span style={{ fontSize: '32px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' }}>🕶️</span>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>
                        {item.producto_nombre}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px', display: 'flex', justifyContent: 'between', alignItems: 'center', width: '100%' }}>
                        <span>{item.color}</span>
                        <span style={{ fontWeight: 800, color: '#ffffff', marginLeft: 'auto', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.stock_actual} uds
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  </div>
)
}
