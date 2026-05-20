import { useState, useRef } from 'react'
import { useCompras, useCreateCompra } from '../../hooks/useCompras'
import { useProveedores } from '../../hooks/useProveedores'
import { useCreateProducto, useCreateVariante } from '../../hooks/useProductos'
import { searchProductos, uploadFoto } from '../../services/productos.service'
import { formatCOP, formatDate } from '../../lib/utils'
import type { Producto, Variante, NewDetalleCompra, Estilo, Compra } from '../../types/database'

interface FilaCompra {
  idTemporal: string
  productoSelected: Producto | null
  varianteSelected: Variante | null
  cantidad: number
  precioUnitario: number
  searchQuery: string
  showDropdown: boolean
  searchResults: Producto[]
}

const ESTILOS: { value: Estilo; label: string }[] = [
  { value: 'cat-eye', label: 'Cat-eye' },
  { value: 'aviador', label: 'Aviador' },
  { value: 'redonda', label: 'Redonda' },
  { value: 'rectangular', label: 'Rectangular' },
  { value: 'otro', label: 'Otro' },
]

export default function Compras() {
  const { data: compras = [], isLoading } = useCompras()
  const { data: proveedores = [] } = useProveedores()
  const createCompra = useCreateCompra()
  const createProductoMutation = useCreateProducto()
  const createVarianteMutation = useCreateVariante()

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'nueva' | 'historial'>('nueva')

  // Purchase master states
  const [proveedorId, setProveedorId] = useState('')
  const [fechaCompra, setFechaCompra] = useState(() => new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // New row helper
  const newFila = (): FilaCompra => ({
    idTemporal: Math.random().toString(36).substring(2, 9),
    productoSelected: null,
    varianteSelected: null,
    cantidad: 1,
    precioUnitario: 0,
    searchQuery: '',
    showDropdown: false,
    searchResults: [],
  })

  // Dynamic rows state
  const [filas, setFilas] = useState<FilaCompra[]>([newFila()])

  // Detail Modal state
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null)

  // Product Modal states
  const [showProductModal, setShowProductModal] = useState(false)
  const [activeRowIdForProduct, setActiveRowIdForProduct] = useState<string | null>(null)
  const [modalProdNombre, setModalProdNombre] = useState('')
  const [modalProdMarca, setModalProdMarca] = useState('')
  const [modalProdEstilo, setModalProdEstilo] = useState<Estilo>('otro')
  const [modalProdPrecioVenta, setModalProdPrecioVenta] = useState('')
  const [modalProdColor, setModalProdColor] = useState('')
  const [modalProdStockMinimo, setModalProdStockMinimo] = useState(5)
  const [modalFotoFile, setModalFotoFile] = useState<File | null>(null)
  const [modalFotoPreview, setModalFotoPreview] = useState<string | null>(null)
  const [modalUploading, setModalUploading] = useState(false)
  const [modalError, setModalError] = useState('')

  const prodFotoRef = useRef<HTMLInputElement>(null)

  // Variant Modal states
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [activeRowIdForVariant, setActiveRowIdForVariant] = useState<string | null>(null)
  const [modalVarColor, setModalVarColor] = useState('')
  const [modalVarStockMinimo, setModalVarStockMinimo] = useState(5)
  const [modalVarFotoFile, setModalVarFotoFile] = useState<File | null>(null)
  const [modalVarFotoPreview, setModalVarFotoPreview] = useState<string | null>(null)
  const [modalVarUploading, setModalVarUploading] = useState(false)
  const [modalVarError, setModalVarError] = useState('')

  const varFotoRef = useRef<HTMLInputElement>(null)

  // Helper: update dynamic row properties
  const updateFila = (idTemporal: string, fields: Partial<FilaCompra>) => {
    setFilas(prev => prev.map(f => f.idTemporal === idTemporal ? { ...f, ...fields } : f))
  }

  // Row search handling
  const handleSearchChange = async (idTemporal: string, text: string) => {
    updateFila(idTemporal, { searchQuery: text })

    if (!text.trim()) {
      updateFila(idTemporal, { searchResults: [], showDropdown: false })
      return
    }

    try {
      const res = await searchProductos(text)
      updateFila(idTemporal, { searchResults: res, showDropdown: true })
    } catch (err) {
      console.error('Error al buscar productos:', err)
    }
  }

  // Row product selection
  const selectProductInRow = (idTemporal: string, producto: Producto) => {
    setError('')
    const isSingleVariant = producto.variantes && producto.variantes.length === 1
    const defaultVariant = isSingleVariant ? producto.variantes![0] : null
    
    updateFila(idTemporal, {
      productoSelected: producto,
      varianteSelected: defaultVariant,
      precioUnitario: producto.precio_costo || 0,
      searchQuery: producto.nombre,
      showDropdown: false,
      searchResults: [],
    })
  }

  // Row removal
  const removeFila = (idTemporal: string) => {
    if (filas.length <= 1) return
    setFilas(prev => prev.filter(f => f.idTemporal !== idTemporal))
  }

  // Row addition
  const addFila = () => {
    setFilas(prev => [...prev, newFila()])
  }

  // Open product creation modal for a row
  const openProductModal = (idTemporal: string) => {
    setActiveRowIdForProduct(idTemporal)
    setShowProductModal(true)
  }

  // Open variant creation modal for a row
  const openVariantModal = (idTemporal: string) => {
    setActiveRowIdForVariant(idTemporal)
    setShowVariantModal(true)
  }

  // Handle Photo changes in modals
  const handleProdFotoChange = (file: File) => {
    setModalFotoFile(file)
    setModalFotoPreview(URL.createObjectURL(file))
  }

  const handleVarFotoChange = (file: File) => {
    setModalVarFotoFile(file)
    setModalVarFotoPreview(URL.createObjectURL(file))
  }

  // Create product + variant in database and select it in row
  const handleCreateProductModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setModalUploading(true)

    try {
      let uploadedUrl: string | null = null
      if (modalFotoFile) {
        uploadedUrl = await uploadFoto(modalFotoFile)
      }

      const created = await createProductoMutation.mutateAsync({
        producto: {
          nombre: modalProdNombre.trim(),
          marca: modalProdMarca.trim(),
          estilo: modalProdEstilo,
          precio_costo: 0,
          precio_venta: Number(modalProdPrecioVenta),
          proveedor_id: proveedorId || null,
          foto_url: uploadedUrl,
          activo: true,
        },
        variantes: [
          {
            color: modalProdColor.trim(),
            foto_url: uploadedUrl,
            stock_actual: 0,
            stock_minimo: modalProdStockMinimo,
          },
        ],
      })

      const firstVariant = created.variantes?.[0] || null

      if (activeRowIdForProduct) {
        updateFila(activeRowIdForProduct, {
          productoSelected: created,
          varianteSelected: firstVariant,
          searchQuery: created.nombre,
          showDropdown: false,
          searchResults: [],
        })
      }

      // Reset
      setModalProdNombre('')
      setModalProdMarca('')
      setModalProdEstilo('otro')
      setModalProdPrecioVenta('')
      setModalProdColor('')
      setModalProdStockMinimo(5)
      setModalFotoFile(null)
      setModalFotoPreview(null)
      setShowProductModal(false)
      setActiveRowIdForProduct(null)
    } catch (err: any) {
      setModalError(err.message || 'Error al crear el producto')
    } finally {
      setModalUploading(false)
    }
  }

  // Create variant in database and select it in row
  const handleCreateVariantModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalVarError('')
    setModalVarUploading(true)

    if (!activeRowIdForVariant) return
    const targetRow = filas.find(f => f.idTemporal === activeRowIdForVariant)
    if (!targetRow || !targetRow.productoSelected) {
      setModalVarError('No hay un producto seleccionado para esta variante.')
      setModalVarUploading(false)
      return
    }

    try {
      let uploadedUrl: string | null = null
      if (modalVarFotoFile) {
        uploadedUrl = await uploadFoto(modalVarFotoFile)
      }

      const newVar = await createVarianteMutation.mutateAsync({
        producto_id: targetRow.productoSelected.id,
        color: modalVarColor.trim(),
        foto_url: uploadedUrl || targetRow.productoSelected.foto_url,
        stock_actual: 0,
        stock_minimo: modalVarStockMinimo,
      })

      // Update filas state (both selected variant and the list of variants for this product)
      setFilas(prev => prev.map(f => {
        if (f.idTemporal === activeRowIdForVariant) {
          const updatedProd = f.productoSelected ? {
            ...f.productoSelected,
            variantes: [...(f.productoSelected.variantes ?? []), newVar],
          } : null
          return {
            ...f,
            productoSelected: updatedProd,
            varianteSelected: newVar,
          }
        }
        return f
      }))

      // Reset
      setModalVarColor('')
      setModalVarStockMinimo(5)
      setModalVarFotoFile(null)
      setModalVarFotoPreview(null)
      setShowVariantModal(false)
      setActiveRowIdForVariant(null)
    } catch (err: any) {
      setModalVarError(err.message || 'Error al crear la variante')
    } finally {
      setModalVarUploading(false)
    }
  }

  // Save full purchase to DB
  const handleSaveCompra = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (filas.length === 0) {
      setError('Debes agregar al menos una fila para la compra.')
      return
    }

    // Validations
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i]
      if (!f.productoSelected) {
        setError(`Fila ${i + 1}: Debes seleccionar un producto.`)
        return
      }
      if (!f.varianteSelected) {
        setError(`Fila ${i + 1}: Debes seleccionar un color/variante.`)
        return
      }
      if (!f.cantidad || f.cantidad <= 0) {
        setError(`Fila ${i + 1}: La cantidad debe ser un número entero mayor a 0.`)
        return
      }
    }

    const totalGeneral = filas.reduce((sum, f) => sum + f.cantidad * f.precioUnitario, 0)

    const detalles: NewDetalleCompra[] = filas.map(f => ({
      variante_id: f.varianteSelected!.id,
      cantidad: f.cantidad,
      precio_unitario: f.precioUnitario,
    }))

    try {
      await createCompra.mutateAsync({
        compra: {
          proveedor_id: proveedorId || null,
          total: totalGeneral,
          notas: notas || null,
          created_at: new Date(fechaCompra).toISOString(),
        },
        detalles,
      })

      // Reset Purchase panel
      setProveedorId('')
      setNotas('')
      setFechaCompra(new Date().toISOString().split('T')[0])
      setFilas([newFila()])

      setActiveTab('historial')
      setSuccess('Compra registrada con éxito. Stock de inventario actualizado.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar compra')
    }
  }

  const totalCompra = filas.reduce((sum, f) => sum + f.cantidad * f.precioUnitario, 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Compras</h1>
        <p className="page-subtitle">Gestión de adquisiciones y entrada de mercancías</p>
      </div>

      {/* Navigation tabs */}
      <div className="chips" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`chip ${activeTab === 'nueva' ? 'active' : ''}`}
          onClick={() => setActiveTab('nueva')}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          Nueva compra
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'historial' ? 'active' : ''}`}
          onClick={() => setActiveTab('historial')}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          Historial de compras
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
          <div>
            <form onSubmit={handleSaveCompra} className="card" style={{ padding: 22 }}>
              <div className="section-title" style={{ marginBottom: 16 }}>Datos de Factura</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Proveedor</label>
                  <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
                    <option value="">Sin proveedor / Distribuidor</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} — {p.ciudad}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Fecha de la Compra</label>
                  <input
                    type="date"
                    value={fechaCompra}
                    onChange={e => setFechaCompra(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 24 }}>
                <label>Notas / Observaciones</label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Detalles sobre el envío, guía de shein, factura local, etc..."
                  rows={2}
                />
              </div>

              <div className="divider" />

              <div className="section-title" style={{ marginBottom: 12 }}>Items de la Compra</div>

              <div className="table-wrap" style={{ overflowX: 'visible', marginBottom: 16 }}>
                <table style={{ width: '100%', minWidth: 800 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Producto *</th>
                      <th style={{ width: '25%' }}>Variante (Color) *</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Cantidad *</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Precio Unitario (COP) *</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Total</th>
                      <th style={{ width: 50 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila) => (
                      <tr key={fila.idTemporal}>
                        <td style={{ position: 'relative', overflow: 'visible' }}>
                          {fila.productoSelected ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: 'var(--bg-3)', borderRadius: 6 }}>
                              {fila.productoSelected.foto_url ? (
                                <img src={fila.productoSelected.foto_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                              ) : (
                                <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--bg-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 14 }}>👓</div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {fila.productoSelected.nombre}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fila.productoSelected.marca}</div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => updateFila(fila.idTemporal, { productoSelected: null, varianteSelected: null, searchQuery: '' })}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="search-wrap" style={{ margin: 0, position: 'relative' }}>
                              <input
                                type="text"
                                placeholder="Escribe para buscar gafa..."
                                value={fila.searchQuery}
                                onChange={e => handleSearchChange(fila.idTemporal, e.target.value)}
                                onFocus={() => handleSearchChange(fila.idTemporal, fila.searchQuery)}
                                onBlur={() => {
                                  setTimeout(() => {
                                    updateFila(fila.idTemporal, { showDropdown: false })
                                  }, 200)
                                }}
                                style={{ paddingLeft: 12, height: 38 }}
                              />
                              {fila.showDropdown && (
                                <div className="search-results" style={{ display: 'block', top: '100%', left: 0, right: 0, zIndex: 10 }}>
                                  {fila.searchResults.length > 0 ? (
                                    fila.searchResults.map(p => (
                                      <div
                                        key={p.id}
                                        className="search-result-item"
                                        onClick={() => selectProductInRow(fila.idTemporal, p)}
                                      >
                                        {p.foto_url ? (
                                          <img src={p.foto_url} className="search-thumb" alt="" />
                                        ) : (
                                          <div className="search-thumb-placeholder">👓</div>
                                        )}
                                        <div>
                                          <div style={{ fontWeight: 700, fontSize: 13 }}>{p.nombre}</div>
                                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.marca}</div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Sin coincidencias</div>
                                  )}
                                  <div
                                    className="search-result-item"
                                    style={{ justifyContent: 'center', borderTop: '1px solid var(--border)', color: 'var(--accent)', fontWeight: 700 }}
                                    onClick={() => openProductModal(fila.idTemporal)}
                                  >
                                    + Crear producto nuevo
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td>
                          {fila.productoSelected ? (
                            <select
                              value={fila.varianteSelected?.id ?? ''}
                              onChange={e => {
                                const val = e.target.value
                                if (val === 'NEW_VAR') {
                                  openVariantModal(fila.idTemporal)
                                } else {
                                  const variant = fila.productoSelected?.variantes?.find(v => v.id === val) || null
                                  updateFila(fila.idTemporal, { varianteSelected: variant })
                                }
                              }}
                              style={{ height: 38 }}
                            >
                              <option value="">Seleccionar color...</option>
                              {(fila.productoSelected.variantes ?? []).map(v => (
                                <option key={v.id} value={v.id}>{v.color} ({v.stock_actual} uds)</option>
                              ))}
                              <option value="NEW_VAR" style={{ fontWeight: 'bold', color: 'var(--accent)' }}>+ Nueva variante...</option>
                            </select>
                          ) : (
                            <select disabled style={{ height: 38 }}>
                              <option>Busca un producto primero</option>
                            </select>
                          )}
                        </td>

                        <td>
                          <input
                            type="number"
                            min="1"
                            value={fila.cantidad}
                            onChange={e => {
                              const val = Math.max(1, Number(e.target.value))
                              updateFila(fila.idTemporal, { cantidad: val })
                            }}
                            style={{ height: 38, textAlign: 'center' }}
                            required
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            value={fila.precioUnitario || ''}
                            placeholder="Costo COP"
                            onChange={e => {
                              const val = Number(e.target.value)
                              updateFila(fila.idTemporal, { precioUnitario: val })
                            }}
                            style={{ height: 38, textAlign: 'right' }}
                            required
                          />
                        </td>

                        <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                          <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 13 }}>
                            {formatCOP(fila.cantidad * fila.precioUnitario)}
                          </span>
                        </td>

                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => removeFila(fila.idTemporal)}
                            disabled={filas.length === 1}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addFila}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Agregar fila</span>
                </button>

                <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 900 }}>
                  <span style={{ marginRight: 12, color: 'var(--text-muted)', fontSize: 14 }}>Total General:</span>
                  <span style={{ color: 'var(--accent)', fontSize: 18 }}>{formatCOP(totalCompra)}</span>
                </div>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full"
                style={{ justifyContent: 'center', height: 42 }}
                disabled={createCompra.isPending}
              >
                {createCompra.isPending ? 'Guardando compra…' : 'Guardar compra'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            {/* History Tab */}
            {isLoading ? (
              <div className="card" style={{ padding: 20, color: 'var(--text-muted)', fontSize: 14 }}>Cargando compras...</div>
            ) : compras.length === 0 ? (
              <div className="empty">
                <div className="empty-ico">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  </svg>
                </div>
                <div className="empty-txt">Sin compras registradas</div>
              </div>
            ) : (
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha de Registro</th>
                        <th>Proveedor</th>
                        <th style={{ textAlign: 'center' }}>Referencias</th>
                        <th style={{ textAlign: 'right' }}>Total Facturado</th>
                        <th>Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compras.map(c => {
                        const prov = c.proveedores as { nombre: string } | null
                        const totalRefs = (c.detalle_compras ?? []).length
                        return (
                          <tr
                            key={c.id}
                            className="clickable-row"
                            onClick={() => setSelectedCompra(c)}
                            style={{ cursor: 'pointer' }}
                            title="Haz clic para ver el detalle completo"
                          >
                            <td style={{ fontWeight: 700 }}>{formatDate(c.created_at)}</td>
                            <td>{prov?.nombre ?? 'Sin proveedor'}</td>
                            <td style={{ textAlign: 'center' }}>{totalRefs} variante{totalRefs !== 1 ? 's' : ''}</td>
                            <td style={{ color: 'var(--accent)', fontWeight: 800, textAlign: 'right' }}>
                              {formatCOP(c.total)}
                            </td>
                            <td style={{ color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.notas ?? '—'}
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

      {/* MODAL 1: Detalle de Compra */}
      {selectedCompra && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">Detalle de Compra</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedCompra(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Proveedor</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedCompra.proveedores?.nombre ?? 'Sin proveedor'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fecha de Compra</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{formatDate(selectedCompra.created_at)}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Notas / Observaciones</div>
                  <div style={{ fontSize: 13, lineHeight: '1.4' }}>{selectedCompra.notas || '—'}</div>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Gafa</th>
                      <th>Color / Variante</th>
                      <th style={{ textAlign: 'center' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>Costo Unitario</th>
                      <th style={{ textAlign: 'right' }}>Costo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedCompra.detalle_compras ?? []).map(d => {
                      const variantInfo = d.variantes as any
                      const productInfo = variantInfo?.productos
                      return (
                        <tr key={d.id}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{productInfo?.nombre ?? 'Desconocido'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{productInfo?.marca ?? ''}</div>
                          </td>
                          <td>{variantInfo?.color ?? '—'}</td>
                          <td style={{ textAlign: 'center' }}>{d.cantidad}</td>
                          <td style={{ textAlign: 'right' }}>{formatCOP(d.precio_unitario)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }}>
                            {formatCOP(d.cantidad * d.precio_unitario)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, fontSize: 16, fontWeight: 900 }}>
                <span style={{ marginRight: 12, color: 'var(--text-muted)' }}>Total Facturado:</span>
                <span style={{ color: 'var(--accent)', fontSize: 18 }}>{formatCOP(selectedCompra.total)}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setSelectedCompra(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Producto Nuevo */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">Nuevo Producto</span>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => {
                  setShowProductModal(false)
                  setActiveRowIdForProduct(null)
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProductModal}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Left side */}
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ marginBottom: 6, display: 'block', fontWeight: 700 }}>Foto del Producto (opcional)</label>
                    <div
                      className="photo-zone"
                      onClick={() => prodFotoRef.current?.click()}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        ref={prodFotoRef}
                        type="file"
                        accept="image/*"
                        onChange={e => e.target.files?.[0] && handleProdFotoChange(e.target.files[0])}
                        style={{ display: 'none' }}
                      />
                      {modalFotoPreview ? (
                        <img src={modalFotoPreview} className="photo-preview" alt="preview" style={{ maxHeight: 120, objectFit: 'contain' }} />
                      ) : (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                          <span style={{ fontSize: 24 }}>📷</span>
                          <div className="photo-zone-text" style={{ fontSize: 11 }}>Sube una foto del modelo</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Nombre del Modelo *</label>
                    <input
                      value={modalProdNombre}
                      onChange={e => setModalProdNombre(e.target.value)}
                      placeholder="ej. Modelo Tokyo"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Marca *</label>
                    <input
                      value={modalProdMarca}
                      onChange={e => setModalProdMarca(e.target.value)}
                      placeholder="ej. Shein / Rayban"
                      required
                    />
                  </div>
                </div>

                {/* Right side */}
                <div>
                  <div className="input-group">
                    <label>Estilo *</label>
                    <select
                      value={modalProdEstilo}
                      onChange={e => setModalProdEstilo(e.target.value as Estilo)}
                    >
                      {ESTILOS.map(es => (
                        <option key={es.value} value={es.value}>{es.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Precio de Venta (Público) *</label>
                    <input
                      type="number"
                      min="0"
                      value={modalProdPrecioVenta}
                      onChange={e => setModalProdPrecioVenta(e.target.value)}
                      placeholder="ej. 45000"
                      required
                    />
                  </div>

                  <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8, color: 'var(--accent)' }}>Variante Inicial (Primera Unidad)</div>
                    
                    <div className="input-group">
                      <label>Color / Variante *</label>
                      <input
                        value={modalProdColor}
                        onChange={e => setModalProdColor(e.target.value)}
                        placeholder="ej. Negro brillante / Transparente"
                        required
                      />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label>Stock Mínimo Alerta *</label>
                      <input
                        type="number"
                        min="0"
                        value={modalProdStockMinimo}
                        onChange={e => setModalProdStockMinimo(Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {modalError && (
                <div style={{ margin: '0 24px 16px 24px', padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: 'var(--red)', fontSize: 13 }}>
                  {modalError}
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowProductModal(false)
                    setActiveRowIdForProduct(null)
                  }}
                  disabled={modalUploading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalUploading}>
                  {modalUploading ? 'Guardando gafa…' : 'Guardar y Seleccionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Nueva Variante */}
      {showVariantModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nueva Variante</span>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => {
                  setShowVariantModal(false)
                  setActiveRowIdForVariant(null)
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVariantModal}>
              <div className="modal-body">
                {activeRowIdForVariant && filas.find(f => f.idTemporal === activeRowIdForVariant)?.productoSelected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-3)', padding: 10, borderRadius: 8, marginBottom: 16 }}>
                    {filas.find(f => f.idTemporal === activeRowIdForVariant)?.productoSelected?.foto_url ? (
                      <img
                        src={filas.find(f => f.idTemporal === activeRowIdForVariant)?.productoSelected?.foto_url || ''}
                        alt=""
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4 }}
                      />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 4, background: 'var(--bg-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👓</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>
                        {filas.find(f => f.idTemporal === activeRowIdForVariant)?.productoSelected?.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {filas.find(f => f.idTemporal === activeRowIdForVariant)?.productoSelected?.marca}
                      </div>
                    </div>
                  </div>
                )}

                <div className="input-group">
                  <label>Color de la Variante *</label>
                  <input
                    value={modalVarColor}
                    onChange={e => setModalVarColor(e.target.value)}
                    placeholder="ej. Azul degradado / Rojo espejo"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Stock Mínimo Alerta *</label>
                  <input
                    type="number"
                    min="0"
                    value={modalVarStockMinimo}
                    onChange={e => setModalVarStockMinimo(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label style={{ marginBottom: 6, display: 'block', fontWeight: 700 }}>Foto de la Variante (opcional, o hereda del producto)</label>
                  <div
                    className="photo-zone"
                    onClick={() => varFotoRef.current?.click()}
                    style={{ cursor: 'pointer' }}
                  >
                    <input
                      ref={varFotoRef}
                      type="file"
                      accept="image/*"
                      onChange={e => e.target.files?.[0] && handleVarFotoChange(e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                    {modalVarFotoPreview ? (
                      <img src={modalVarFotoPreview} className="photo-preview" alt="preview" style={{ maxHeight: 100, objectFit: 'contain' }} />
                    ) : (
                      <div style={{ textAlign: 'center', padding: 14 }}>
                        <span>📷</span>
                        <div className="photo-zone-text" style={{ fontSize: 11 }}>Sube foto para este color</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {modalVarError && (
                <div style={{ margin: '0 20px 14px 20px', padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: 'var(--red)', fontSize: 13 }}>
                  {modalVarError}
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowVariantModal(false)
                    setActiveRowIdForVariant(null)
                  }}
                  disabled={modalVarUploading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalVarUploading}>
                  {modalVarUploading ? 'Creando...' : 'Crear y Seleccionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
