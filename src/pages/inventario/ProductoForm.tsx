import { useState, useRef } from 'react'
import { useProveedores } from '../../hooks/useProveedores'
import { useCreateProducto } from '../../hooks/useProductos'
import { uploadFoto } from '../../services/productos.service'
import type { Estilo, Producto } from '../../types/database'

interface Props {
  onClose: () => void
  onSuccess: (prod: Producto) => void
  hideInitialStock?: boolean
}

interface VarianteState {
  _key: number
  color: string
  foto_url: string | null
  stock_actual: number
  stock_minimo: number
  _fotoFile?: File
  _fotoPreview?: string
}

const ESTILOS: { value: Estilo; label: string }[] = [
  { value: 'cat-eye', label: 'Cat-eye' },
  { value: 'aviador', label: 'Aviador' },
  { value: 'redonda', label: 'Redonda' },
  { value: 'rectangular', label: 'Rectangular' },
  { value: 'otro', label: 'Otro' },
]

const defaultVariante = (): VarianteState => ({
  _key: Date.now() + Math.random(),
  color: '',
  foto_url: null,
  stock_actual: 0,
  stock_minimo: 5,
})

export default function ProductoForm({ onClose, onSuccess, hideInitialStock = false }: Props) {
  const { data: proveedores = [] } = useProveedores()
  const createProducto = useCreateProducto()

  const [nombre, setNombre] = useState('')
  const [marca, setMarca] = useState('')
  const [estilo, setEstilo] = useState<Estilo>('cat-eye')
  const [precioCosto, setPrecioCosto] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [variantes, setVariantes] = useState<VarianteState[]>([defaultVariante()])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const mainFotoRef = useRef<HTMLInputElement>(null)

  const handleMainFoto = (file: File) => {
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const addVariante = () => setVariantes(prev => [...prev, defaultVariante()])
  const removeVariante = (key: number) => setVariantes(prev => prev.filter(v => v._key !== key))

  const updateVariante = (key: number, field: string, value: string | number | null) =>
    setVariantes(prev => prev.map(v => v._key === key ? { ...v, [field]: value } : v))

  const handleVarianteFoto = (key: number, file: File) => {
    const url = URL.createObjectURL(file)
    setVariantes(prev => prev.map(v => v._key === key ? { ...v, _fotoFile: file, _fotoPreview: url } : v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nombre.trim() || !marca.trim()) return setError('Nombre y marca son obligatorios')
    if (variantes.some(v => !v.color.trim())) return setError('Cada variante debe tener un color')

    setUploading(true)
    try {
      let mainFotoFinal: string | null = null
      if (fotoFile) mainFotoFinal = await uploadFoto(fotoFile)

      const variantesFinal = await Promise.all(
        variantes.map(async v => {
          let varFotoUrl = v.foto_url
          if (v._fotoFile) varFotoUrl = await uploadFoto(v._fotoFile)
          return {
            color: v.color,
            foto_url: varFotoUrl,
            stock_actual: Number(v.stock_actual),
            stock_minimo: Number(v.stock_minimo),
          }
        })
      )

      const created = await createProducto.mutateAsync({
        producto: {
          nombre: nombre.trim(),
          marca: marca.trim(),
          estilo,
          precio_costo: Number(precioCosto),
          precio_venta: Number(precioVenta),
          proveedor_id: proveedorId || null,
          foto_url: mainFotoFinal,
          activo: true,
        },
        variantes: variantesFinal,
      })
      onSuccess(created)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">Nueva gafa</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* left col */}
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ marginBottom: 6, display: 'block' }}>Foto principal</label>
                <div
                  className="photo-zone"
                  onClick={() => mainFotoRef.current?.click()}
                >
                  <input
                    ref={mainFotoRef}
                    type="file"
                    accept="image/*"
                    onChange={e => e.target.files?.[0] && handleMainFoto(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                  {fotoPreview ? (
                    <img src={fotoPreview} className="photo-preview" alt="preview" />
                  ) : (
                    <>
                      <div style={{ fontSize: 28 }}>📷</div>
                      <div className="photo-zone-text">Toca para subir foto</div>
                    </>
                  )}
                </div>
              </div>

              <div className="input-group">
                <label>Nombre *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="ej. Modelo Tokyo" required />
              </div>

              <div className="input-group">
                <label>Marca *</label>
                <input value={marca} onChange={e => setMarca(e.target.value)} placeholder="ej. Flowy" required />
              </div>

              <div className="input-group">
                <label>Estilo</label>
                <select value={estilo} onChange={e => setEstilo(e.target.value as Estilo)}>
                  {ESTILOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>Precio costo (COP)</label>
                  <input type="number" value={precioCosto} onChange={e => setPrecioCosto(e.target.value)} placeholder="35000" min="0" />
                </div>
                <div className="input-group">
                  <label>Precio venta (COP)</label>
                  <input type="number" value={precioVenta} onChange={e => setPrecioVenta(e.target.value)} placeholder="65000" min="0" required />
                </div>
              </div>

              <div className="input-group">
                <label>Proveedor</label>
                <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
                  <option value="">Sin proveedor</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* right col — variants */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>Variantes de color</div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addVariante}>+ Agregar</button>
              </div>

              <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                {variantes.map((v, i) => (
                    <div key={v._key} className="variant-row">
                      <div className="variant-row-header">
                        <span>Variante {i + 1}</span>
                        {variantes.length > 1 && (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeVariante(v._key)}>✕</button>
                        )}
                      </div>

                      <div className="input-group" style={{ marginBottom: 10 }}>
                        <label>Color *</label>
                        <input
                          value={v.color}
                          onChange={e => updateVariante(v._key, 'color', e.target.value)}
                          placeholder="ej. Carey / Negro / Transparente"
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: hideInitialStock ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 10 }}>
                        {!hideInitialStock && (
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Stock inicial</label>
                            <input
                              type="number"
                              min="0"
                              value={v.stock_actual}
                              onChange={e => updateVariante(v._key, 'stock_actual', e.target.value)}
                            />
                          </div>
                        )}
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label>Stock mínimo</label>
                          <input
                            type="number"
                            min="0"
                            value={v.stock_minimo}
                            onChange={e => updateVariante(v._key, 'stock_minimo', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ marginBottom: 6, display: 'block' }}>Foto (opcional)</label>
                        <div
                          className="photo-zone"
                          style={{ padding: 12 }}
                          onClick={() => {
                            const inp = document.createElement('input')
                            inp.type = 'file'
                            inp.accept = 'image/*'
                            inp.onchange = (ev) => {
                              const f = (ev.target as HTMLInputElement).files?.[0]
                              if (f) handleVarianteFoto(v._key, f)
                            }
                            inp.click()
                          }}
                        >
                          {v._fotoPreview ? (
                            <img src={v._fotoPreview} className="photo-preview" alt="" style={{ maxHeight: 80 }} />
                          ) : (
                            <div className="photo-zone-text">+ foto de la variante</div>
                          )}
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ margin: '0 22px', padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: 'var(--red)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={uploading || createProducto.isPending}>
              {uploading || createProducto.isPending ? 'Guardando…' : 'Guardar gafa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
