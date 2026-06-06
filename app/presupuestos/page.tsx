'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Presupuesto, Categoria, Transaccion } from '@/lib/types'
import Navbar from '@/components/Navbar'
import LlaminMascot from '@/components/LlaminMascot'

export default function PresupuestosPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [gastos, setGastos] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [nuevaCatId, setNuevaCatId] = useState('')
  const [nuevoMonto, setNuevoMonto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const mes = new Date().getMonth() + 1
  const ano = new Date().getFullYear()
  const mesesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const uid = session.user.id
      setUserId(uid)

      const inicioMes = `${ano}-${String(mes).padStart(2,'0')}-01`
      const [{ data: presu }, { data: cats }, { data: txs }] = await Promise.all([
        supabase.from('presupuestos').select('*, categorias(id,nombre,icono,color)').eq('user_id', uid).eq('mes', mes).eq('ano', ano),
        supabase.from('categorias').select('*').eq('es_sistema', true),
        supabase.from('transacciones').select('monto, categoria_id, categorias(nombre)').eq('user_id', uid).gte('fecha', inicioMes).eq('tipo','gasto'),
      ])

      setCategorias(cats || [])
      setPresupuestos(presu || [])

      const g: Record<string, number> = {}
      for (const t of (txs || []) as Transaccion[]) {
        const nombre = t.categorias?.nombre || 'Otros'
        g[nombre] = (g[nombre] || 0) + Number(t.monto)
      }
      setGastos(g)
      setLoading(false)
    }
    load()
  }, [router, mes, ano])

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !nuevaCatId || !nuevoMonto) return
    setGuardando(true)
    const { data, error } = await supabase.from('presupuestos').upsert({
      user_id: userId, categoria_id: nuevaCatId, monto: parseFloat(nuevoMonto), mes, ano,
    }, { onConflict: 'user_id,categoria_id,mes,ano' }).select('*, categorias(id,nombre,icono,color)').single()

    if (!error && data) {
      setPresupuestos(prev => {
        const exists = prev.findIndex(p => p.categoria_id === nuevaCatId)
        if (exists >= 0) { const n = [...prev]; n[exists] = data; return n }
        return [...prev, data]
      })
      setNuevaCatId('')
      setNuevoMonto('')
    }
    setGuardando(false)
  }

  const eliminar = async (id: string) => {
    await supabase.from('presupuestos').delete().eq('id', id)
    setPresupuestos(prev => prev.filter(p => p.id !== id))
  }

  const catsDisponibles = categorias.filter(c => !presupuestos.find(p => p.categoria_id === c.id))
  const totalPresupuesto = presupuestos.reduce((s, p) => s + Number(p.monto), 0)
  const totalGastado = presupuestos.reduce((s, p) => s + (gastos[p.categorias?.nombre || ''] || 0), 0)

  return (
    <div className="min-h-screen bg-crema">
      <Navbar />
      <main className="md:ml-56 p-4 md:p-8 pb-24 md:pb-8">
        <h1 className="text-2xl font-black text-marron mb-1">Presupuestos 🎯</h1>
        <p className="text-gray-500 text-sm mb-6">{mesesNombre[mes-1]} {ano}</p>

        {/* Resumen */}
        {presupuestos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-crema">
              <p className="text-xs text-gray-500 font-medium">Presupuesto total</p>
              <p className="text-2xl font-black text-marron">S/ {totalPresupuesto.toFixed(0)}</p>
            </div>
            <div className={`rounded-2xl p-4 shadow-sm ${totalGastado > totalPresupuesto ? 'bg-terracota text-white' : 'bg-white border border-crema'}`}>
              <p className={`text-xs font-medium ${totalGastado > totalPresupuesto ? 'opacity-80' : 'text-gray-500'}`}>Gastado</p>
              <p className={`text-2xl font-black ${totalGastado > totalPresupuesto ? 'text-white' : 'text-terracota'}`}>S/ {totalGastado.toFixed(0)}</p>
            </div>
          </div>
        )}

        {/* Lista de presupuestos */}
        {loading ? <p className="text-gray-400 text-center py-8">Cargando...</p> : (
          <div className="flex flex-col gap-3 mb-6">
            {presupuestos.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-crema">
                <LlaminMascot expresion="pensando" size={80} className="mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aún no tienes presupuestos. ¡Crea el primero!</p>
              </div>
            )}
            {presupuestos.map(p => {
              const gastado = gastos[p.categorias?.nombre || ''] || 0
              const pct = Math.min((gastado / p.monto) * 100, 100)
              const color = pct < 80 ? '#27AE60' : pct < 100 ? '#F39C12' : '#C0392B'
              const restante = p.monto - gastado
              return (
                <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm border border-crema">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{p.categorias?.icono}</span>
                      <div>
                        <p className="font-bold text-gray-800">{p.categorias?.nombre}</p>
                        <p className="text-xs text-gray-400">
                          {restante >= 0 ? `Disponible: S/ ${restante.toFixed(2)}` : `⚠️ Excedido en S/ ${Math.abs(restante).toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-marron">S/ {p.monto.toFixed(0)}</span>
                      <button onClick={() => eliminar(p.id)} className="text-gray-300 hover:text-red-400 text-xl">×</button>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                    <div className="h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>S/ {gastado.toFixed(2)} gastado</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Agregar nuevo */}
        {catsDisponibles.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-crema">
            <h2 className="font-black text-marron mb-4">+ Agregar presupuesto</h2>
            <form onSubmit={agregar} className="flex flex-col gap-3">
              <select value={nuevaCatId} onChange={e => setNuevaCatId(e.target.value)} required
                className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-terracota text-gray-800">
                <option value="">Selecciona una categoría...</option>
                {catsDisponibles.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
              </select>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-3.5 text-gray-500 font-bold">S/</span>
                  <input type="number" value={nuevoMonto} onChange={e => setNuevoMonto(e.target.value)}
                    placeholder="0.00" required min="1" step="0.01"
                    className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-terracota text-gray-800" />
                </div>
                <button type="submit" disabled={guardando}
                  className="bg-terracota text-white font-black px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-md disabled:opacity-60">
                  {guardando ? '...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
