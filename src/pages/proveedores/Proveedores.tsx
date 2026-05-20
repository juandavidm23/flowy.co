import { useState } from 'react'
import { useProveedores, useCreateProveedor, useUpdateProveedor, useDeleteProveedor } from '../../hooks/useProveedores'
import { formatDate } from '../../lib/utils'
import type { Proveedor } from '../../types/database'

export default function Proveedores() {
  const { data: proveedores = [], isLoading } = useProveedores()
  const createProveedor = useCreateProveedor()
  const updateProveedor = useUpdateProveedor()
  const deleteProveedor = useDeleteProveedor()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Proveedor | null>(null)
  const [search, setSearch] = useState('')

  const filtered = proveedores.filter(p =>
    search.trim() === '' ||
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.ciudad.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div className="page-actions">
          <div>
            <h1 className="page-title">Proveedores</h1>
            <p className="page-subtitle">{proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} registrado{proveedores.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            + Nuevo proveedor
          </button>
        </div>
      </div>

      <div className="page-body fade-in">
        <div className="search-wrap" style={{ maxWidth: 380, marginBottom: 20 }}>
          <svg className="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            placeholder="Buscar por nombre o ciudad…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>

        {isLoading ? (
          <div className="card" style={{ padding: 20, color: 'var(--text-muted)', fontSize: 14 }}>Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div className="empty-txt">{search ? 'Sin resultados' : 'Sin proveedores registrados'}</div>
            {!search && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => { setEditing(null); setShowForm(true) }}>
                Nuevo proveedor
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {filtered.map(p => (
              <div key={p.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{p.nombre}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--border-glow)' }}>{p.ciudad}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => { setEditing(p); setShowForm(true) }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    </button>
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => { if (confirm(`¿Eliminar a ${p.nombre}?`)) deleteProveedor.mutate(p.id) }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {p.contacto && (
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                      </svg>
                    </span>{p.contacto}
                  </div>
                )}
                {p.notas && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{p.notas}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  Registrado {formatDate(p.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ProveedorForm
          proveedor={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={async (data) => {
            if (editing) {
              await updateProveedor.mutateAsync({ id: editing.id, data })
            } else {
              await createProveedor.mutateAsync({ ...data, notas: data.notas ?? null })
            }
            setShowForm(false)
            setEditing(null)
          }}
          saving={createProveedor.isPending || updateProveedor.isPending}
        />
      )}
    </div>
  )
}

function ProveedorForm({
  proveedor,
  onClose,
  onSave,
  saving,
}: {
  proveedor: Proveedor | null
  onClose: () => void
  onSave: (data: { nombre: string; ciudad: string; contacto: string; notas: string | null }) => Promise<void>
  saving: boolean
}) {
  const [nombre, setNombre] = useState(proveedor?.nombre ?? '')
  const [ciudad, setCiudad] = useState(proveedor?.ciudad ?? 'Cali')
  const [contacto, setContacto] = useState(proveedor?.contacto ?? '')
  const [notas, setNotas] = useState(proveedor?.notas ?? '')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return setError('El nombre es obligatorio')
    try {
      await onSave({
        nombre: nombre.trim(),
        ciudad: ciudad.trim() || 'Cali',
        contacto: contacto.trim(),
        notas: notas.trim() || null,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label>Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del proveedor" required />
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Ciudad</label>
                <input value={ciudad} onChange={e => setCiudad(e.target.value)} placeholder="Cali" />
              </div>
              <div className="input-group">
                <label>Contacto (tel / WhatsApp)</label>
                <input value={contacto} onChange={e => setContacto(e.target.value)} placeholder="3001234567" />
              </div>
            </div>
            <div className="input-group">
              <label>Notas</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Condiciones, referencias, etc." />
            </div>
            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: 'var(--red)', fontSize: 13 }}>
                {error}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : (proveedor ? 'Guardar cambios' : 'Crear proveedor')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
