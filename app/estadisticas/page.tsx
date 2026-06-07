'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Transaccion } from '@/lib/types'
import Navbar from '@/components/Navbar'

const PALETA = [
  '#C0392B','#E67E22','#F1C40F','#27AE60','#2980B9',
  '#8E44AD','#16A085','#D35400','#2ECC71','#3498DB',
  '#E91E63','#607D8B',
]

interface DonutSlice { label: string; value: number; color: string }

function DonutChart({ data, total }: { data: DonutSlice[]; total: number }) {
  if (total === 0 || data.length === 0)
    return <div className="text-center text-gray-300 py-8 text-sm">Sin datos</div>

  const cx = 100, cy = 100, R = 80, r = 50
  let angle = -Math.PI / 2
  const paths: { d: string; color: string; label: string; value: number }[] = []

  if (data.length === 1) {
    paths.push({
      d: `M ${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R} Z`,
      color: data[0].color, label: data[0].label, value: data[0].value,
    })
  } else {
    data.forEach(d => {
      const sweep = (d.value / total) * 2 * Math.PI
      if (sweep < 0.001) return
      const endAngle = angle + sweep
      const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle)
      const x2 = cx + R * Math.cos(endAngle), y2 = cy + R * Math.sin(endAngle)
      const ix1 = cx + r * Math.cos(endAngle), iy1 = cy + r * Math.sin(endAngle)
      const ix2 = cx + r * Math.cos(angle), iy2 = cy + r * Math.sin(angle)
      const large = sweep > Math.PI ? 1 : 0
      paths.push({
        d: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix2} ${iy2} Z`,
        color: d.color, label: d.label, value: d.value,
      })
      angle = endAngle
    })
  }

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[200px] mx-auto">
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="2">
          <title>{p.label}: S/ {p.value.toFixed(2)} ({((p.value / total) * 100).toFixed(1)}%)</title>
        </path>
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#9CA3AF" fontSize="10">Total</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#1F2937" fontSize="13" fontWeight="800">
        S/ {total.toFixed(0)}
      </text>
    </svg>
  )
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = 10, gap = 4, padL = 4
  const totalW = data.length * (barW + gap) + padL
  const chartH = 120

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 -4 ${Math.max(totalW, 280)} ${chartH + 24}`}
        style={{ width: '100%', height: `${chartH + 24}px` }}
        preserveAspectRatio="none"
      >
        {data.map((d, i) => {
          const barH = Math.max((d.value / max) * chartH, d.value > 0 ? 2 : 0)
          const x = padL + i * (barW + gap)
          const y = chartH - barH
          const isMax = d.value === max && d.value > 0
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH}
                fill={isMax ? '#C0392B' : '#F39C12'} rx="2"
                opacity={d.value > 0 ? 0.85 : 0.15} />
              {(i === 0 || (i + 1) % 5 === 0 || i === data.length - 1) && (
                <text x={x + barW / 2} y={chartH + 14} textAnchor="middle"
                  fontSize="7" fill="#9CA3AF">{d.label}</text>
              )}
              {d.value > 0 && <title>DÃ­a {d.label}: S/ {d.value.toFixed(2)}</title>}
            </g>
          )
        })}
        <line x1={padL} y1={chartH} x2={totalW} y2={chartH} stroke="#E5E7EB" strokeWidth="1" />
      </svg>
    </div>
  )
}

export default function EstadisticasPage() {
  const router = useRouter()
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1)
  const [filtroAno] = useState(new Date().getFullYear())

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const uid = session.user.id
      const inicioMes = `${filtroAno}-${String(filtroMes).padStart(2,'0')}-01`
      const finMes = new Date(filtroAno, filtroMes, 0).toISOString().split('T')[0]
      const [{ data: txs }] = await Promise.all([
        supabase.from('transacciones').select('*, categorias(id,nombre,icono,color)')
          .eq('user_id', uid).gte('fecha', inicioMes).lte('fecha', finMes),
      ])
      setTransacciones(txs || [])
      setLoading(false)
    }
    load()
  }, [router, filtroMes, filtroAno])

  type CatStat = { nombre: string; icono: string; total: number; count: number; color: string }
  const catMap: Record<string, CatStat> = {}
  transacciones.forEach(t => {
    const k = t.categoria_id || 'sin'
    if (!catMap[k]) {
      const idx = Object.keys(catMap).length
      catMap[k] = { nombre: t.categorias?.nombre || 'Sin categorÃ­a', icono: t.categorias?.icono || 'ð¦', total: 0, count: 0, color: PALETA[idx % PALETA.length] }
    }
    catMap[k].total += Number(t.monto)
    catMap[k].count++
  })
  const catData = Object.values(catMap).sort((a, b) => b.total - a.total)

  const diasEnMes = new Date(filtroAno, filtroMes, 0).getDate()
  const porDia = Array(diasEnMes).fill(0)
  transacciones.forEach(t => {
    const d = parseInt(t.fecha.split('-')[2]) - 1
    if (d >= 0 && d < diasEnMes) porDia[d] += Number(t.monto)
  })
  const barData = porDia.map((v, i) => ({ label: String(i + 1), value: v }))

  const merchantMap: Record<string, { desc: string; total: number; count: number }> = {}
  transacciones.forEach(t => {
    const k = t.descripcion.trim().substring(0, 50)
    if (!merchantMap[k]) merchantMap[k] = { desc: k, total: 0, count: 0 }
    merchantMap[k].total += Number(t.monto)
    merchantMap[k].count++
  })
  const topMerchants = Object.values(merchantMap).sort((a, b) => b.total - a.total).slice(0, 10)
  const maxMerchant = topMerchants[0]?.total || 1

  const totalGasto = transacciones.reduce((s, t) => s + Number(t.monto), 0)
  const promDiario = totalGasto / diasEnMes
  const idxMaxDia = porDia.indexOf(Math.max(...porDia))
  const catTop = catData[0]

  const porSemana = [0, 0, 0, 0, 0]
  porDia.forEach((v, i) => { porSemana[Math.min(Math.floor(i / 7), 4)] += v })

  return (
    <div className="min-h-screen bg-crema">
      <Navbar />
      <main className="md:ml-56 p-4 md:p-8 pb-24 md:pb-8">
        <h1 className="text-2xl font-black text-marron mb-6">EstadÃ­sticas ð</h1>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-crema mb-6 flex flex-wrap gap-1">
          {meses.map((m, i) => (
            <button key={i} onClick={() => setFiltroMes(i + 1)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filtroMes === i + 1 ? 'bg-terracota text-white' : 'text-gray-500 hover:bg-crema'}`}>
              {m} {filtroAno}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-4xl mb-3 animate-bounce">ð</div>
              <p className="text-gray-400">Calculando estadÃ­sticas...</p>
            </div>
          </div>
        ) : transacciones.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-crema shadow-sm">
            <div className="text-5xl mb-4">ð¦</div>
            <p className="text-gray-500 font-semibold mb-1">Sin movimientos en {meses[filtroMes - 1]} {filtroAno}</p>
            <p className="text-gray-400 text-sm mb-4">Importa tu estado de cuenta para ver tus estadÃ­sticas</p>
            <a href="/importar" className="text-terracota font-bold text-sm hover:underline">+ Importar extracto â</a>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: 'ð¸', label: 'Total gastado', value: `S/ ${totalGasto.toFixed(2)}`, sub: `${meses[filtroMes-1]} ${filtroAno}` },
                { icon: 'ð', label: 'Movimientos', value: transacciones.length.toString(), sub: `${catData.length} categorÃ­as` },
                { icon: 'ð', label: 'Prom. diario', value: `S/ ${promDiario.toFixed(2)}`, sub: 'por dÃ­a' },
                { icon: 'ð¥', label: 'DÃ­a top', value: `DÃ­a ${idxMaxDia + 1}`, sub: `S/ ${(porDia[idxMaxDia] || 0).toFixed(2)}` },
              ].map((k, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-crema">
                  <span className="text-3xl">{k.icon}</span>
                  <p className="text-xs text-gray-400 mt-2">{k.label}</p>
                  <p className="text-lg font-black text-marron leading-tight">{k.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-crema">
              <h2 className="font-black text-marron mb-1">ð Gasto por categorÃ­a</h2>
              <p className="text-xs text-gray-400 mb-5">{meses[filtroMes-1]} {filtroAno} Â· {catData.length} categorÃ­as</p>
              <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="w-full md:w-52 flex-shrink-0">
                  <DonutChart data={catData.map(d => ({ label: d.nombre, value: d.total, color: d.color }))} total={totalGasto} />
                </div>
                <div className="flex-1 w-full space-y-2.5">
                  {catData.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-sm flex-1 min-w-0 truncate">{d.icono} {d.nombre}</span>
                      <span className="text-xs text-gray-400 w-14 text-right">{d.count} mov.</span>
                      <span className="font-bold text-sm text-gray-700 w-24 text-right">S/ {d.total.toFixed(2)}</span>
                      <span className="text-xs text-gray-400 w-10 text-right">{((d.total / totalGasto) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-crema">
              <h2 className="font-black text-marron mb-1">ð Gasto por dÃ­a</h2>
              <p className="text-xs text-gray-400 mb-4">
                DÃ­a pico: <strong className="text-marron">dÃ­a {idxMaxDia + 1}</strong> (S/ {(porDia[idxMaxDia] || 0).toFixed(2)}) Â· Prom. S/ {promDiario.toFixed(2)}/dÃ­a
              </p>
              <BarChart data={barData} />
              <div className="flex justify-between mt-4 text-center">
                {[['Sem 1','1â7'],['Sem 2','8â14'],['Sem 3','15â21'],['Sem 4','22â28'],['Sem 5+','29+']].map(([s, r], i) => (
                  <div key={i}>
                    <div className="text-xs font-bold text-gray-700">S/ {porSemana[i].toFixed(0)}</div>
                    <div className="text-[10px] text-gray-400">{s}</div>
                    <div className="text-[10px] text-gray-300">{r}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-crema">
              <h2 className="font-black text-marron mb-1">ðª Top establecimientos</h2>
              <p className="text-xs text-gray-400 mb-5">Donde mÃ¡s gastÃ¡s este mes</p>
              <div className="space-y-4">
                {topMerchants.map((m, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`text-sm font-black w-6 text-right flex-shrink-0 mt-0.5 ${i === 0 ? 'text-terracota' : i < 3 ? 'text-gray-500' : 'text-gray-300'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-sm font-semibold text-gray-800 truncate pr-2">{m.desc}</span>
                        <span className="text-sm font-black text-terracota flex-shrink-0">S/ {m.total.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-crema rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${(m.total / maxMerchant) * 100}%`, backgroundColor: i === 0 ? '#C0392B' : i < 3 ? '#E67E22' : '#F39C12' }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {m.count} transacciÃ³n{m.count > 1 ? 'es' : ''} Â· prom. S/ {(m.total / m.count).toFixed(2)} c/u
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {catTop && (
              <div className="bg-marron text-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold text-dorado mb-2">ð¦ LlamÃ­n dice</p>
                <p className="font-semibold text-sm leading-relaxed">
                  Tu mayor gasto este mes es en <strong className="text-dorado">{catTop.icono} {catTop.nombre}</strong>{' '}
                  con S/ {catTop.total.toFixed(2)}, que representa el{' '}
                  <strong className="text-dorado">{((catTop.total / totalGasto) * 100).toFixed(0)}%</strong> de tu gasto total.
                  {catData.length > 1 && (
                    <> Tu segunda categorÃ­a mÃ¡s alta es <strong className="text-dorado">{catData[1].icono} {catData[1].nombre}</strong>{' '}
                    (S/ {catData[1].total.toFixed(2)}).</>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
