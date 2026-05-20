import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/inventario/Inventario'
import Ventas from './pages/ventas/Ventas'
import Compras from './pages/compras/Compras'
import Clientes from './pages/clientes/Clientes'
import Proveedores from './pages/proveedores/Proveedores'
import Login from './pages/Login'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedTheme = localStorage.getItem('flowy-theme') || 'pink'
    document.body.className = `theme-${savedTheme}`

    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-1)', color: 'var(--text-dim)', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14 }}>
        Cargando sistema…
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {session ? (
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="inventario" element={<Inventario />} />
              <Route path="ventas" element={<Ventas />} />
              <Route path="compras" element={<Compras />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="proveedores" element={<Proveedores />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          ) : (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
