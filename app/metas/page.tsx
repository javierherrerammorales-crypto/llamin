'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MetaAhorro } from '@/lib/types'
import Navbar from '@/components/Navbar'
import LlaminMascot from '@/components/LlaminMascot'

export default function MetasPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [metas, setMetas] = useState<MetaAhorro[]>([])
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [actual, setActual] = useState('')
  const [fecha, setFecha] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [abonoId, setAbonoId] = useState<string | null>(null)
  const [abono, setAbono] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      setUserId(session.user.id)
      const { data } = await supabase.from('metas_ahorro').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
      setMetas(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setGuardando(true)
    const { data, error } = await supabase.from('metas_ahorro').insert({
      user_id: userId,
      nombre,
      monto_objetivo: parseFloat(objetivo),
      monto_actual: parseFloat(actual) || 0,
      fecha_objetivo: fecha || null,
    }).select().single()
    if (!error && data) { setMetas(prev => [data, ...prev]); setNombre(''); setObjetivo(''); setActual(''); setFecha('') }
    setGuardando(false)
  }

  const agregarAbono = async (id: string) => {
    const monto = parseFloat(abono)
    if (!monto || monto <= 0) return
    const meta = metas.find(m => m.id === id)!
    const nuevo = Math.min(meta.monto_actual + monto, meta.monto_objetivo)
    const completada = nuevo >= meta.monto_objetivo
    await supabase.from('metas_ahorro').update({ monto_actual: nuevo, completada }).eq('id', id)
    setMetas(prev => prev.map(m => m.id === id ? { ...m, monto_actual: nuevo, completada } : m))
    setAbonoId(null)
    setAbono('')
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta meta?')) return
    await supabase.from('metas_ahorro').delete().eq('id', id)
    setMetas(prev => prev.filter(m => m.id !== id))
  }

  const metasActivas = metas.filter(m => !m.completada)
  const metasCompletas = metas.filter(m => m.completada)

  return (
    <div className="min-h-screen bg-crema">
      <Navbar />
      <main className="md:ml-56 p-4 md:p-8 pb-24 md:pb-8">
        <h1 className="text-2xl font-black text-marron mb-1">Mi Sueño Peruano ⭐</h1>
        <p className="text-gray-500 text-sm mb-6">Define tus metas de ahorro y Llamín te ayuda a llegar</p>

        {/* Nueva meta */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-crema mb-6">
          <h2 className="font-black text-marron mb-4">✨ Nueva meta</h2>
          <form onSubmit={crear} className="flex flex-col gap-3">
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="¿Cuál es tu sueño? (ej: Viaje a Cusco)" required
              className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-terracota text-gray-800" />
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-500 font-bold text-sm">S/</span>
                <input type="number" value={objetivo} onChange={e => setObjetivo(e.target.value)}
                  placeholder="Meta total" required min="1" step="0.01"
                  className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-terracota text-gray-800" />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-500 font-bold text-sm">S/</span>
                <input type="number" value={actual} onChange={e => setActual(e.target.value)}
                  placeholder="Ya tengo..." min="0" step="0.01"
                  className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-terracota text-gray-800" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Fecha objetivo (opcional)</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-terracota text-gray-800" />
            </div>
            <button type="submit" disabled={guardando}
              className="bg-terracota text-white font-black py-3 rounded-xl hover:opacity-90 transition-all shadow-md disabled:opacity-60">
              {guardando ? '⏳ Guardando...' : '🎯 Crear meta'}
            </button>
          </form>
        </div>

        {loading ? <p className="text-gray-400 text-center py-8">Cargando...</p> : (
          <>
            {metasActivas.length === 0 && metasCompletas.length === 0 && (
              <div className="text-center py-8">
                <LlaminMascot expresion="feliz" size={90} className="mx-auto mb-3" />
                <p className="text-gray-500 text-sm">¡Crea tu primera meta y empieza a ahorrar, causa!</p>
              </div>
            )}

            {/* Metas activas */}
            {metasActivas.map(m => {
              const pct = Math.min((m.monto_actual / m.monto_objetivo) * 100, 100)
              const restante = m.monto_objetivo - m.monto_actual
              const diasRestantes = m.fecha_objetivo
                ? Math.max(0, Math.ceil((new Date(m.fecha_objetivo).getTime() - Date.now()) / 86400000))
                : null
              const ahorroSemanal = diasRestantes && diasRestantes > 0 ? restante / (diasRestantes / 7) : null

              return (
                <div key={m.id} className="bg-white rounded-2xl p-5 shadow-sm border border-crema mb-3">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-black text-marron text-lg">{m.nombre}</p>
                      {diasRestantes !== null && (
                        <p className="text-xs text-gray-400">{diasRestantes} días restantes</p>
                      )}
                    </div>
                    <button onClick={() => eliminar(m.id)} className="text-gray-300 hover:text-red-400 text-xl">×</button>
                  </div>

                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-verde">S/ {m.monto_actual.toFixed(2)} ahorrado</span>
                    <span className="text-gray-500">Meta: S/ {m.monto_objetivo.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4 mb-2 overflow-hidden">
                    <div className="h-4 rounded-full bg-verde transition-all duration-700 relative"
                      style={{ width: `${pct}%` }}>
                      {pct > 15 && <span className="absolute right-2 top-0.5 text-white text-xs font-bold">{pct.toFixed(0)}%</span>}
                    </div>
                  </div>

                  {ahorroSemanal && ahorroSemanal > 0 && (
                    <p className="text-xs text-gray-500 mb-3">
                      💡 Ahorra S/ {ahorroSemanal.toFixed(2)} por semana para llegar a tiempo
                    </p>
                  )}

                  {abonoId === m.id ? (
                    <div className="flex gap-2 mt-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-2.5 text-gray-500 text-sm">S/</span>
                        <input type="number" value={abono} onChange={e => setAbono(e.target.value)}
                          placeholder="Monto a abonar" autoFocus min="0.01" step="0.01"
                          className="w-full border-2 border-verde rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none" />
                      </div>
                      <button onClick={() => agregarAbono(m.id)}
                        className="bg-verde text-white font-bold px-4 py-2 rounded-xl hover:opacity-90 text-sm">✓</button>
                      <button onClick={() => { setAbonoId(null); setAbono('') }}
                        className="border border-gray-200 text-gray-500 px-3 py-2 rounded-xl text-sm">×</button>
                    </div>
                  ) : (
                    <button onClick={() => setAbonoId(m.id)}
                      className="w-full border-2 border-verde text-verde font-bold py-2 rounded-xl hover:bg-green-50 transition-all text-sm">
                      💰 Abonar a esta meta
                    </button>
                  )}
                </div>
              )
            })}

            {/* Metas completadas */}
            {metasCompletas.length > 0 && (
              <>
                <h2 className="font-black text-marron mt-6 mb-3">🏆 Metas logradas</h2>
                {metasCompletas.map(m => (
                  <div key={m.id} className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-dorado rounded-2xl p-4 mb-3 flex items-center gap-4">
                    <LlaminMascot expresion="emocionada" size={60} />
                    <div className="flex-1">
                      <p className="font-black text-marron">{m.nombre} ✅</p>
                      <p className="text-sm text-dorado font-semibold">S/ {m.monto_objetivo.toFixed(2)} — ¡Meta cumplida!</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
