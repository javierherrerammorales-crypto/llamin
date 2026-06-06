'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Transaccion, Categoria } from '@/lib/types'
import Navbar from '@/components/Navbar'

export default function TransaccionesPage() {
  const router = useRouter()
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1)
  const [filtroAno] = useState(new Date().getFullYear())
  const [filtroCat, setFiltroCat] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const uid = session.user.id

      const inicioMes = `${filtroAno}-${String(filtroMes).padStart(2,'0')}-01`
      const finMes = new Date(filtroAno, filtroMes, 0).toISOString().split('T')[0]

      const [{ data: txs }, { data: cats }] = await Promise.all([
        supabase.from('transacciones').select('*, categorias(id,nombre,icono,color)')
          .eq('user_id', uid).gte('fecha', inicioMes).lte('fecha', finMes).order('fecha', { ascending: false }),
        supabase.from('categorias').select('*').eq('es_sistema', true),
      ])
      setTransacciones(txs || [])
      setCategorias(cats || [])
      setLoading(false)
    }
    load()
  }, [router, filtroMes, filtroAno])

  const cambiarCategoria = async (id: string, catId: string) => {
    await supabase.from('transacciones').update({ categoria_id: catId }).eq('id', id)
    setTransacciones(prev => prev.map(t => {
      if (t.id !== id) return t
      const cat = categorias.find(c => c.id === catId)
      return { ...t, categoria_id: catId, categorias: cat }
    }))
    setEditandoId(null)
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta transacción?')) return
    await supabase.from('transacciones').delete().eq('id', id)
    setTransacciones(prev => prev.filter(t => t.id !== id))
  }

  const filtradas = filtroCat ? transacciones.filter(t => t.categorias?.nombre === filtroCat) : transacciones
  const total = filtradas.reduce((s, t) => s + Number(t.monto), 0)

  return (
    <div className="min-h-screen bg-crema">
      <Navbar />
      <main className="md:ml-56 p-4 md:p-8 pb-24 md:pb-8">
        <h1 className="text-2xl font-black text-marron mb-6">Mis movimientos 📋</h1>

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-crema mb-4 flex flex-wrap gap-3 items-center">
          <div className="flex gap-1">
            {meses.map((m, i) => (
              <button key={i} onClick={() => setFiltroMes(i + 1)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filtroMes === i + 1 ? 'bg-terracota text-white' : 'text-gray-500 hover:bg-crema'
                }`}>{m}</button>
            ))}
          </div>
          <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-terracota">
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.nombre}>{c.icono} {c.nombre}</option>)}
          </select>
        </div>

        {/* Resumen */}
        <div className="bg-terracota text-white rounded-2xl p-4 mb-4 flex justify-between items-center">
          <span className="font-bold">{filtradas.length} movimientos</span>
          <span className="text-xl font-black">S/ {total.toFixed(2)}</span>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-2xl shadow-sm border border-crema overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : filtradas.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 mb-2">Sin movimientos en este período</p>
              <a href="/importar" className="text-terracota font-bold text-sm hover:underline">+ Importar extracto</a>
            </div>
          ) : (
            filtradas.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-4 border-b border-crema last:border-0 hover:bg-crema/30">
                <span className="text-2xl flex-shrink-0">{t.categorias?.icono || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{t.descripcion}</p>
                  {editandoId === t.id ? (
                    <select autoFocus onChange={e => cambiarCategoria(t.id, e.target.value)} onBlur={() => setEditandoId(null)}
                      className="border border-terracota rounded-lg px-2 py-0.5 text-xs mt-1 focus:outline-none">
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
                    </select>
                  ) : (
                    <button onClick={() => setEditandoId(t.id)}
                      className="text-xs text-gray-400 hover:text-terracota mt-0.5">
                      {t.categorias?.nombre || 'Sin categoría'} • {t.fecha} ✏️
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-black text-terracota text-sm">S/ {Number(t.monto).toFixed(2)}</span>
                  <button onClick={() => eliminar(t.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
