import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'

const IcoGrid = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)

const IcoGlasses = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="7" cy="14" r="4"/><circle cx="17" cy="14" r="4"/>
    <path d="M3 14V10l3-6M21 14V10l-3-6M11 14h2"/>
  </svg>
)

const IcoCash = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M12 12v3M10 14h4"/>
  </svg>
)

const IcoBox = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)

const IcoUsers = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)

const IcoTruck = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <path d="M16 8h4l3 3v5h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
)

export default function Layout() {
  const [activeTheme, setActiveTheme] = useState(() => {
    return localStorage.getItem('glasse-theme') || 'pink'
  })
  const [userEmail, setUserEmail] = useState('')
  const [cartSize, setCartSize] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Obtener conteos de alertas dinámicas para el menú de navegación
  const { data: stockBajoCount = 0 } = useQuery({
    queryKey: ['stock-bajo-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('vista_stock_bajo')
        .select('*', { count: 'exact', head: true })
      return count ?? 0
    },
    refetchInterval: 30_000,
  })

  const { data: ventasHoyCount = 0 } = useQuery({
    queryKey: ['ventas-hoy-count'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('ventas')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)
      return count ?? 0
    },
    refetchInterval: 30_000,
  })

  useEffect(() => {
    // Obtener email del usuario activo
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || 'Admin')
      }
    })

    // Escuchar el tamaño del carrito
    const updateCartSize = () => {
      try {
        const stored = localStorage.getItem('glasse-cart')
        if (stored) {
          const parsed = JSON.parse(stored)
          const total = parsed.reduce((sum: number, item: any) => sum + item.cantidad, 0)
          setCartSize(total)
        } else {
          setCartSize(0)
        }
      } catch {
        setCartSize(0)
      }
    }
    updateCartSize()

    window.addEventListener('storage', updateCartSize)
    window.addEventListener('cart-updated', updateCartSize)
    const interval = setInterval(updateCartSize, 1000)

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'glasse-theme' && e.newValue) {
        setActiveTheme(e.newValue)
        document.body.className = `theme-${e.newValue}`
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', updateCartSize)
      window.removeEventListener('cart-updated', updateCartSize)
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  const changeTheme = (theme: string) => {
    setActiveTheme(theme)
    localStorage.setItem('glasse-theme', theme)
    document.body.className = `theme-${theme}`
  }

  const handleLogout = () => {
    if (confirm('¿Cerrar sesión en GLASSE.co?')) {
      supabase.auth.signOut()
    }
  }

  // Nombre de perfil dinámico según el mockup
  const displayName = userEmail.toLowerCase().includes('manuela') ? 'Manuela Quiroz' : (userEmail.split('@')[0] || 'Administrador')
  const initialLetter = displayName.charAt(0).toUpperCase()

  return (
    <div className="app-shell">
      {/* Capa de fondo para cerrar el menú lateral en móvil */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay open" 
          onClick={() => setIsSidebarOpen(false)} 
          style={{ display: 'block' }} 
        />
      )}

      {/* Sidebar para Escritorio y Móvil (Deslizable) */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="logo-main">GLASSE.co</div>
            <div className="logo-sub" style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '9px', opacity: 0.6 }}>Sistema - v0.3</div>
          </div>
          {/* Botón para cerrar sidebar visible únicamente en móvil */}
          <button 
            className="hide-desktop" 
            onClick={() => setIsSidebarOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <IcoGrid />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/inventario" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <IcoGlasses />
            <span style={{ flex: 1 }}>Inventario</span>
            {stockBajoCount > 0 && (
              <span className="badge badge-yellow" style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 800 }}>
                {stockBajoCount}
              </span>
            )}
          </NavLink>
          
          <NavLink to="/ventas" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <IcoCash />
            <span style={{ flex: 1 }}>Ventas</span>
            <span className="badge badge-green" style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 800, padding: '3px 6px' }}>
              {ventasHoyCount} HOY
            </span>
          </NavLink>
          
          <NavLink to="/compras" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <IcoBox />
            <span>Compras</span>
          </NavLink>
          
          <NavLink to="/clientes" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <IcoUsers />
            <span>Clientes</span>
          </NavLink>

          <NavLink to="/proveedores" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <IcoTruck />
            <span>Proveedores</span>
          </NavLink>
        </nav>

        {/* Tarjeta de Perfil Administrador en Pie de Sidebar */}
        <div 
          onClick={handleLogout}
          style={{ 
            marginTop: 'auto', 
            padding: '12px', 
            background: 'rgba(255, 255, 255, 0.03)', 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            borderRadius: '12px',
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '16px'
          }}
          className="profile-card-hover"
        >
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            background: 'var(--accent)', 
            color: '#000', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '15px',
            boxShadow: '0 0 10px var(--accent-glow)'
          }}>
            {initialLetter}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '1px' }}>
              {displayName === 'Manuela Quiroz' ? 'fundadora - ADMIN' : 'ADMIN'}
            </div>
          </div>
        </div>
      </aside>

      {/* Cabecera Móvil Simple */}
      <div className="mob-top-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
            title="Abrir menú"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="mob-logo">GLASSE.co</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={handleLogout} 
            className="btn-logout-mobile"
            title="Cerrar sesión"
            style={{ width: '32px', height: '32px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
          
          <NavLink to="/ventas" style={{ position: 'relative', display: 'flex', alignItems: 'center', color: 'var(--text)', textDecoration: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {cartSize > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: -6, 
                right: -6, 
                background: 'var(--accent)', 
                color: '#000', 
                fontSize: '10px', 
                fontWeight: 900, 
                borderRadius: '50%', 
                minWidth: '16px', 
                height: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 0 8px var(--accent-glow)'
              }}>
                {cartSize}
              </span>
            )}
          </NavLink>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="main-content" style={{ paddingBottom: '90px' }}>
        <Outlet />
      </div>

      {/* Barra de Navegación Inferior Flotante Móvil */}
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span>Inicio</span>
        </NavLink>
        <NavLink to="/inventario" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="7" cy="14" r="4"/><circle cx="17" cy="14" r="4"/>
            <path d="M3 14V10l3-6M21 14V10l-3-6M11 14h2"/>
          </svg>
          <span>Stock</span>
        </NavLink>
        <NavLink to="/ventas" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M12 12v3M10 14h4"/>
          </svg>
          <span>Ventas</span>
        </NavLink>
        <NavLink to="/compras" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <span>Compras</span>
        </NavLink>
        <NavLink to="/clientes" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <span>Clientes</span>
        </NavLink>
        <NavLink to="/proveedores" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="1" y="3" width="15" height="13" rx="2" ry="2"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <span>Provs</span>
        </NavLink>
      </nav>

      {/* Tweak Panel Flotante */}
      <div className="tweak-panel">
        <span className="tweak-title">Tweak</span>
        <div className="tweak-options">
          <button 
            className={`tweak-btn btn-pink ${activeTheme === 'pink' ? 'active' : ''}`} 
            onClick={() => changeTheme('pink')}
            title="Rosa Neón"
          />
          <button 
            className={`tweak-btn btn-lilac ${activeTheme === 'lilac' ? 'active' : ''}`} 
            onClick={() => changeTheme('lilac')}
            title="Lila Neón"
          />
          <button 
            className={`tweak-btn btn-lime ${activeTheme === 'lime' ? 'active' : ''}`} 
            onClick={() => changeTheme('lime')}
            title="Verde Lima"
          />
        </div>
      </div>
    </div>
  )
}
