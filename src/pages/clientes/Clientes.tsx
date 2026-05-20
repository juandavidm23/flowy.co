import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente } from '../../hooks/useClientes'
import { formatDate } from '../../lib/utils'
import type { Cliente } from '../../types/database'

interface ClienteConCompras extends Cliente {
  compras_count?: number
}

export default function Clientes() {
  const { data: clientes = [], isLoading } = useClientes()
  const createCliente = useCreateCliente()
  const updateCliente = useUpdateCliente()
  const deleteCliente = useDeleteCliente()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [search, setSearch] = useState('')

  const { data: comprasPorCliente = {} } = useQuery<Record<string, number>>({
    queryKey: ['clientes-compras'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ventas')
        .select('cliente_id')
        .not('cliente_id', 'is', null)
      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        if (row.cliente_id) {
          counts[row.cliente_id] = (counts[row.cliente_id] ?? 0) + 1
        }
      }
      return counts
    },
  })

  const filtered: ClienteConCompras[] = clientes
    .filter(c =>
      search.trim() === '' ||
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (c.telefono ?? '').includes(search)
    )
    .map(c => ({ ...c, compras_count: comprasPorCliente[c.id] ?? 0 }))

  return (
    <div>
      <div className="page-header">
        <div className="page-actions">
          <div>
            <h1 className="page-title">Clientes</h1>
            <p className="page-subtitle">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            + Nuevo cliente
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
            placeholder="Buscar por nombre o teléfono…"
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
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="empty-txt">{search ? 'Sin resultados' : 'Sin clientes registrados'}</div>
            {!search && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => { setEditing(null); setShowForm(true) }}>Nuevo cliente</button>}
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Compras</th>
                    <th>Notas</th>
                    <th>Registrado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text)' }}>{c.nombre}</td>
                      <td>{c.telefono ?? '—'}</td>
                      <td>
                        <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--border-glow)' }}>{c.compras_count ?? 0}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.notas ?? '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(c.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Editar"
                            onClick={() => { setEditing(c); setShowForm(true) }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                            </svg>
                          </button>
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            title="Eliminar"
                            onClick={() => { if (confirm(`¿Eliminar a ${c.nombre}?`)) deleteCliente.mutate(c.id) }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <ClienteForm
          cliente={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={async (data) => {
            if (editing) {
              await updateCliente.mutateAsync({ id: editing.id, data })
            } else {
              await createCliente.mutateAsync({ ...data, notas: data.notas ?? null })
            }
            setShowForm(false)
            setEditing(null)
          }}
          saving={createCliente.isPending || updateCliente.isPending}
        />
      )}
    </div>
  )
}

function ClienteForm({
  cliente,
  onClose,
  onSave,
  saving,
}: {
  cliente: Cliente | null
  onClose: () => void
  onSave: (data: { nombre: string; telefono: string | null; notas: string | null }) => Promise<void>
  saving: boolean
}) {
  const [nombre, setNombre] = useState(cliente?.nombre ?? '')
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '')
  const [notas, setNotas] = useState(cliente?.notas ?? '')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return setError('El nombre es obligatorio')
    try {
      await onSave({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
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
          <span className="modal-title">{cliente ? 'Editar cliente' : 'Nuevo cliente'}</span>
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
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" required />
            </div>
            <div className="input-group">
              <label>Teléfono / WhatsApp</label>
              <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="3001234567" />
            </div>
            <div className="input-group">
              <label>Notas</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones…" />
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
              {saving ? 'Guardando…' : (cliente ? 'Guardar cambios' : 'Crear cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
