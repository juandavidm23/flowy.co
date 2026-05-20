import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-1)', padding: 16 }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 400, padding: 32, backdropFilter: 'blur(20px)', border: '1px solid var(--border-bright)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-dim)', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb), 0.25)', boxShadow: '0 0 15px rgba(var(--accent-rgb), 0.1)', marginBottom: 16 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="7" cy="14" r="4"/><circle cx="17" cy="14" r="4"/>
              <path d="M3 14V10l3-6M21 14V10l-3-6M11 14h2"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 900, background: 'linear-gradient(135deg, var(--text) 30%, rgba(var(--accent-rgb), 0.8) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 6px 0', textTransform: 'uppercase' }}>GLASSE.co</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Panel de Administración</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Correo Electrónico</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ background: 'rgba(8, 8, 20, 0.5)', border: '1px solid var(--border-bright)', color: 'var(--text)' }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 20 }}>
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ background: 'rgba(8, 8, 20, 0.5)', border: '1px solid var(--border-bright)', color: 'var(--text)' }}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: 'var(--red)', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error === 'Invalid login credentials' ? 'Credenciales incorrectas' : error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '12px' }} disabled={loading}>
            {loading ? 'Iniciando sesión…' : 'Ingresar al sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}
