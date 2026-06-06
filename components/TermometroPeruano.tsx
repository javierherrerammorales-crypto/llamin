'use client'

interface Props {
  porcentajeGastado: number // 0-100+
}

export default function TermometroPeruano({ porcentajeGastado }: Props) {
  const estado = porcentajeGastado <= 60
    ? { label: '🏔️ Estás en la cima del Huascarán', color: 'text-verde', bg: 'bg-verde', nivel: 'Excelente' }
    : porcentajeGastado <= 80
    ? { label: '🚣 Navegando el Titicaca con calma', color: 'text-azul', bg: 'bg-azul', nivel: 'Bien' }
    : porcentajeGastado <= 100
    ? { label: '🌫️ Hay neblina en el Callao', color: 'text-dorado', bg: 'bg-dorado', nivel: 'Cuidado' }
    : { label: '⛈️ Tormenta en los Andes', color: 'text-terracota', bg: 'bg-terracota', nivel: 'Alerta' }

  const pct = Math.min(porcentajeGastado, 100)

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-crema">
      <h3 className="font-bold text-marron mb-1 text-sm uppercase tracking-wide">Termómetro Peruano</h3>
      <p className={`text-base font-semibold mb-3 ${estado.color}`}>{estado.label}</p>
      <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
        <div
          className={`h-4 rounded-full transition-all duration-700 ${estado.bg}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>0%</span>
        <span className="font-bold">{porcentajeGastado.toFixed(0)}% del presupuesto total</span>
        <span>100%</span>
      </div>
    </div>
  )
}
