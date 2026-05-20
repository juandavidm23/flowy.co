import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getVentaById } from '../../services/ventas.service'
import { formatCOP, formatDate } from '../../lib/utils'
import type { DetalleVenta } from '../../types/database'

interface Props {
  ventaId: string
  onClose: () => void
}

export default function Factura({ ventaId, onClose }: Props) {
  const facturaRef = useRef<HTMLDivElement>(null)

  const { data: venta, isLoading } = useQuery({
    queryKey: ['ventas', ventaId],
    queryFn: () => getVentaById(ventaId),
  })

  const handlePrint = () => window.print()

  const handlePDF = async () => {
    if (!facturaRef.current) return
    const { default: html2canvas } = await import('html2canvas')
    const { jsPDF } = await import('jspdf')
    
    // Forzar temporalmente colores oscuros para la exportación o mantener el estilo blanco del ticket
    const canvas = await html2canvas(facturaRef.current, { 
      scale: 2, 
      backgroundColor: '#ffffff' 
    })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ unit: 'mm', format: 'a5' })
    const w = pdf.internal.pageSize.getWidth()
    const h = (canvas.height * w) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, w, h)
    pdf.save(`factura-${ventaId.slice(0, 8)}.pdf`)
  }

  if (isLoading || !venta) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Cargando factura…</div>
        </div>
      </div>
    )
  }

  const detalles = (venta.detalle_ventas ?? []) as DetalleVenta[]
  const subtotal = detalles.reduce((s, d) => s + d.precio_unitario * d.cantidad, 0)
  const descuentoTotal = detalles.reduce((s, d) => s + d.descuento, 0)
  const cliente = venta.clientes as { nombre: string; telefono: string | null } | null

  // Calcular cantidad total de unidades vendidas
  const totalUnidades = detalles.reduce((sum, d) => sum + d.cantidad, 0)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 440, background: 'rgba(10, 10, 20, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
        
        {/* Header superior del modal */}
        <div className="modal-header no-print">
          <span className="modal-title">Factura registrada</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px 20px 24px' }}>
          
          {/* Banner de éxito estilo Mockup */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              background: 'rgba(57, 255, 20, 0.06)', 
              border: '1px solid rgba(57, 255, 20, 0.15)', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              marginBottom: '20px' 
            }}
          >
            <div style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              background: '#39ff14', 
              color: '#000', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: '900',
              fontSize: '13px'
            }}>
              ✓
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#39ff14' }}>Venta registrada</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                Stock actualizado - {totalUnidades} {totalUnidades === 1 ? 'und. salió' : 'unds. salieron'}
              </div>
            </div>
          </div>

          {/* Ticket térmico físico */}
          <div 
            id="factura-print" 
            ref={facturaRef} 
            className="receipt-container"
            style={{ 
              marginBottom: '24px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}
          >
            {/* Header del Ticket */}
            <div style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '1px dashed #bbb', marginBottom: '16px' }}>
              <div style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', color: '#0b0b14' }}>
                GLASSE<span style={{ color: '#ff007f' }}>.co</span>
              </div>
              <div style={{ fontSize: '10px', color: '#666', letterSpacing: '1px', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase' }}>
                Gafas Y2K - Medellín, Colombia
              </div>
              <div style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>
                NIT 1.025.xxx.xxx &middot; @glasse.co
              </div>
            </div>

            {/* Metadatos de la venta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '12px', color: '#333' }}>
              <div>
                <div><span style={{ fontWeight: 800 }}>Factura:</span> #{ventaId.slice(0, 8).toUpperCase()}</div>
                <div style={{ marginTop: '3px' }}><span style={{ fontWeight: 800 }}>Fecha:</span> {formatDate(venta.created_at)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div><span style={{ fontWeight: 800 }}>Cliente:</span> {cliente?.nombre ?? 'Consumidor final'}</div>
                {cliente?.telefono && <div style={{ marginTop: '3px' }}><span style={{ fontWeight: 800 }}>Tel:</span> {cliente.telefono}</div>}
              </div>
            </div>

            {/* Items del Ticket con Miniaturas */}
            <div style={{ borderBottom: '1px dashed #bbb', paddingBottom: '12px', marginBottom: '14px' }}>
              {detalles.map(d => {
                const v = d.variantes
                const nombre = v?.productos?.nombre ?? 'Producto'
                const fotoUrl = v?.foto_url || v?.productos?.foto_url
                const linea = d.precio_unitario * d.cantidad - d.descuento

                return (
                  <div 
                    key={d.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '8px 0',
                      borderBottom: '1px solid #f2f2f2'
                    }}
                  >
                    {/* Miniatura de la gafa */}
                    {fotoUrl ? (
                      <img 
                        src={fotoUrl} 
                        alt="" 
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }} 
                      />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eaeaea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                        🕶️
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#0b0b14', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {nombre}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                        {v?.color || 'General'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '11px', color: '#777' }}>
                        {d.cantidad} &times; {formatCOP(d.precio_unitario)}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#0b0b14', marginTop: '1px' }}>
                        {formatCOP(linea)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Subtotales y Totales */}
            <div>
              {descuentoTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  <span>Subtotal</span><span>{formatCOP(subtotal)}</span>
                </div>
              )}
              {descuentoTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#e53e3e', marginBottom: '4px' }}>
                  <span>Descuentos</span><span>- {formatCOP(descuentoTotal)}</span>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#0b0b14' }}>TOTAL</span>
                <span style={{ fontFamily: 'Syne', fontSize: '26px', fontWeight: 900, color: '#ff007f', letterSpacing: '-0.5px' }}>
                  {formatCOP(venta.total)}
                </span>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666' }}>
                <span>Pagado vía</span>
                <span style={{ fontWeight: 800, textTransform: 'uppercase', color: '#0b0b14' }}>
                  {venta.metodo_pago}
                </span>
              </div>
            </div>

            {/* Nota de pie */}
            <div style={{ marginTop: '24px', paddingTop: '14px', borderTop: '1px dashed #bbb', textAlign: 'center' }}>
              <p style={{ fontSize: '9px', color: '#888', letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: '1.4', margin: 0 }}>
                Gracias por comprar en GLASSE.co + devoluciones 8 días
              </p>
              <p style={{ fontSize: '9px', color: '#ff007f', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '4px', margin: 0 }}>
                follow @glasse.co para nuevos drops
              </p>
            </div>

            {/* Código de barras vectorizado */}
            <div className="receipt-barcode">
              <div className="barcode-lines">
                {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 2].map((w, idx) => (
                  <div 
                    key={idx} 
                    className="barcode-line" 
                    style={{ width: `${w}px` }} 
                  />
                ))}
              </div>
              <div style={{ fontSize: '9px', color: '#666', letterSpacing: '1.5px', marginTop: '6px', fontFamily: 'monospace' }}>
                {ventaId.slice(0, 8).toUpperCase()}-2026-05
              </div>
            </div>

            {/* Borde zigzag inferior de corte */}
            <div className="receipt-zigzag" />
          </div>

          {/* Acciones del Modal */}
          <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={handlePrint}
              style={{ 
                borderRadius: '16px', 
                padding: '12px', 
                fontWeight: 800, 
                background: 'rgba(255,255,255,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Imprimir
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handlePDF}
              style={{ 
                borderRadius: '16px', 
                padding: '12px', 
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
              </svg>
              Compartir
            </button>
          </div>
          
        </div>
      </div>
    </div>
  )
}
