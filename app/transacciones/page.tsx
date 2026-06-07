'use client'
import { useEffect, useMemo, useCallback, useState } from 'react'
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedIdx, setLastClickedIdx] = useState<number | null>(null)

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
    setSelectedIds(new Set())
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

  const eliminarSeleccionados = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`¿Eliminar ${selectedIds.size} transacción(es) seleccionada(s)?`)) return
    const ids = Array.from(selectedIds)
    await supabase.from('transacciones').delete().in('id', ids)
    setTransacciones(prev => prev.filter(t => !selectedIds.has(t.id)))
    setSelectedIds(new Set())
  }

  const filtradas = useMemo(() =>
    filtroCat
      ? transacciones.filter(t => t.categorias?.nombre === filtroCat)
      : transacciones,
    [transacciones, filtroCat]
  )

  const total = useMemo(() =>
    filtradas.reduce((s, t) => s + Number(t.monto), 0),
    [filtradas]
  )

  const { conteoPorCat, promPorCat } = useMemo(() => {
    const sumaPorCat: Record<string, number> = {}
    const conteoPorCat: Record<string, number> = {}
    for (const t of filtradas) {
      const k = t.categoria_id || 'sin'
      sumaPorCat[k] = (sumaPorCat[k] || 0) + Number(t.monto)
      conteoPorCat[k] = (conteoPorCat[k] || 0) + 1
    }
    const promPorCat: Record<string, number> = {}
    for (const k in sumaPorCat) {
      promPorCat[k] = sumaPorCat[k] / conteoPorCat[k]
    }
    return { conteoPorCat, promPorCat }
  }, [filtradas])

  const esSobrePromedio = useCallback((t: Transaccion) => {
    const k = t.categoria_id || 'sin'
    return conteoPorCat[k] > 1 && Number(t.monto) > promPorCat[k]
  }, [conteoPorCat, promPorCat])

  const toggleSelect = (id: string, idx: number, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (shiftKey && lastClickedIdx !== null) {
        const start = Math.min(lastClickedIdx, idx)
        const end = Math.max(lastClickedIdx, idx)
        const shouldSelect = !prev.has(filtradas[idx].id)
        for (let i = start; i <= end; i++) {
          if (i < filtradas.length) {
            if (shouldSelect) next.add(filtradas[i].id)
            else next.delete(filtradas[i].id)
          }
        }
      } else {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      }
      return next
    })
    setLastClickedIdx(idx)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtradas.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtradas.map(t => t.id)))
    }
  }

  return (
    <div className="min-h-screen bg-crema">
      <Navbar />
      <main className="md:ml-56 p-4 md:p-8 pb-24 md:pb-8">
        <h1 className="text-2xl font-black text-marron mb-6">Mis movimientos 📋</h1>

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-crema mb-4 flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 flex-wrap">
            {meses.map((m, i) => (
              <button key={i}
                onClick={() => { setFiltroMes(i + 1); setSelectedIds(new Set()) }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filtroMes === i + 1 ? 'bg-terracota text-white' : 'text-gray-500 hover:bg-crema'
                }`}>{m}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-terracota">
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c.id} value={c.nombre}>{c.icono} {c.nombre}</option>)}
            </select>
            {selectedIds.size > 0 && (
              <button onClick={eliminarSeleccionados}
                title={`Eliminar ${selectedIds.size} seleccionados`}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95">
                🗑️ <span>{selectedIds.size}</span>
              </button>
            )}
          </div>
        </div>

        {/* Resumen */}
        <div className="bg-terracota text-white rounded-2xl p-4 mb-4 flex justify-between items-center">
          <span className="font-bold text-sm">
            {selectedIds.size > 0
              ? `${selectedIds.size} seleccionado${selectedIds.size > 1 ? 's' : ''} de ${filtradas.length}`
              : `${filtradas.length} movimiento${filtradas.length !== 1 ? 's' : ''}`
            }
          </span>
          <span className="text-xl font-black">S/ {total.toFixed(2)}</span>
        </div>

        {/* Leyenda sobre-promedio */}
        {filtradas.some(esSobrePromedio) && (
          <div className="flex items-center gap-2 mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <span className="font-bold">↑</span>
            <span>Los movimientos con borde naranja están por encima del promedio de su categoría en este mes</span>
          </div>
        )}

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
            <>
              {/* Header seleccionar todos */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-crema bg-gray-50/60">
                <input
                  type="checkbox"
                  checked={filtradas.length > 0 && selectedIds.size === filtradas.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded accent-terracota cursor-pointer"
                />
                <span className="text-xs text-gray-400 font-medium select-none">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} seleccionado${selectedIds.size > 1 ? 's' : ''} — Shift+clic para rango`
                    : 'Seleccionar todos'
                  }
                </span>
              </div>

              {filtradas.map((t, idx) => {
                const sobrePromedio = esSobrePromedio(t)
                const seleccionado = selectedIds.has(t.id)
                return (
                  <div
                    key={t.id}
                    onClick={(e) => toggleSelect(t.id, idx, e.shiftKey)}
                    className={`flex items-center gap-3 p-4 border-b border-crema last:border-0 cursor-pointer transition-colors select-none
                      ${seleccionado
                        ? 'bg-red-50'
                        : sobrePromedio
                          ? 'bg-amber-50 hover:bg-amber-100/60'
                          : 'hover:bg-crema/40'
                      }
                      ${sobrePromedio ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-transparent'}
                    `}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={() => {}}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 rounded accent-terracota flex-shrink-0 cursor-pointer"
                    />

                    {/* Icono categoría */}
                    <span className="text-2xl flex-shrink-0">{t.categorias?.icono || '📦'}</span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm truncate">{t.descripcion}</p>
                        {sobrePromedio && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                            ↑ sobre prom.
                          </span>
                        )}
                      </div>
                      {editandoId === t.id ? (
                        <select
                          autoFocus
                          onChange={e => { e.stopPropagation(); cambiarCategoria(t.id, e.target.value) }}
                          onBlur={() => setEditandoId(null)}
                          onClick={e => e.stopPropagation()}
                          className="border border-terracota rounded-lg px-2 py-0.5 text-xs mt-1 focus:outline-none">
                          {categorias.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
                        </select>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setEditandoId(t.id) }}
                          className="text-xs text-gray-400 hover:text-terracota mt-0.5 transition-colors">
                          {t.categorias?.nombre || 'Sin categoría'} • {t.fecha} ✏️
                        </button>
                      )}
                    </div>

                    {/* Monto + eliminar individual */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-black text-terracota text-sm">S/ {Number(t.monto).toFixed(2)}</span>
                      <button
                        onClick={e => { e.stopPropagation(); eliminar(t.id) }}
                        className="text-gray-300 hover:text-red-400 text-lg leading-none transition-colors">
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
