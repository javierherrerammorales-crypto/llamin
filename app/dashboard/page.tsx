'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Profile, Transaccion, Presupuesto, Categoria, NIVELES } from '@/lib/types'
import Navbar from '@/components/Navbar'
import LlaminMascot from '@/components/LlaminMascot'
import TermometroPeruano from '@/components/TermometroPeruano'

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)

  const mes = new Date().getMonth() + 1
  const ano = new Date().getFullYear()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const uid = session.user.id

      const [{ data: prof }, { data: txs }, { data: presu }, { data: cats }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('transacciones').select('*, categorias(nombre,icono,color)').eq('user_id', uid)
          .eq('tipo', 'gasto').gte('fecha', `${ano}-${String(mes).padStart(2,'0')}-01`).order('fecha', { ascending: false }),
        supabase.from('presupuestos').select('*, categorias(nombre,icono,color)').eq('user_id', uid).eq('mes', mes).eq('ano', ano),
        supabase.from('categorias').select('*').eq('es_sistema', true),
      ])

      if (!prof) { router.push('/'); return }
      setProfile(prof)
      setTransacciones(txs || [])
      setPresupuestos(presu || [])
      setCategorias(cats || [])
      setLoading(false)
    }
    load()
  }, [router, mes, ano])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-crema">
      <div className="text-center">
        <LlaminMascot expresion="analizando" size={100} className="mx-auto mb-3" />
        <p className="text-marron font-bold">Llamín está analizando tus finanzas...</p>
      </div>
    </div>
  )

  const totalGastos = transacciones.reduce((s, t) => s + Number(t.monto), 0)
  const totalPresupuesto = presupuestos.reduce((s, p) => s + Number(p.monto), 0)
  const pctGastado = totalPresupuesto > 0 ? (totalGastos / totalPresupuesto) * 100 : 0

  const nivelInfo = NIVELES[Math.min(profile!.nivel - 1, NIVELES.length - 1)]
  const expresion = pctGastado <= 60 ? 'feliz' : pctGastado <= 80 ? 'emocionada' : pctGastado <= 100 ? 'preocupada' : 'alerta'

  const gastosPorCategoria = transacciones.reduce((acc, t) => {
    const nombre = t.categorias?.nombre || 'Otros'
    acc[nombre] = (acc[nombre] || 0) + Number(t.monto)
    return acc
  }, {} as Record<string, number>)

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div className="min-h-screen bg-crema">
      <Navbar />
      <main className="md:ml-56 p-4 md:p-8 pb-24 md:pb-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-marron">¡Hola, {profile!.nombre}! 👋</h1>
            <p className="text-gray-500 text-sm">{meses[mes-1]} {ano}</p>
          </div>
          <div className="text-right">
            <span className="bg-terracota text-white text-xs font-bold px-3 py-1 rounded-full">
              {nivelInfo.icono} {nivelInfo.nombre}
            </span>
            <p className="text-xs text-gray-400 mt-1">🔥 {profile!.racha_dias} días de racha</p>
          </div>
        </div>

        {/* Llamín + Termómetro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-crema flex items-center gap-4">
            <LlaminMascot expresion={expresion as any} size={80} />
            <div>
              <p className="font-bold text-marron text-sm">
                {pctGastado <= 60 ? `¡Vas bacán, ${profile!.nombre}!` :
                 pctGastado <= 80 ? 'Ojo con los gastos' :
                 pctGastado <= 100 ? '¡Ya casi el límite!' : '¡Presupuesto superado!'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {pctGastado <= 60 ? 'Sigues bien dentro de tu presupuesto 🌟' :
                 pctGastado <= 80 ? 'Llamín te cuida los soles 👀' :
                 pctGastado <= 100 ? 'Sin querer queriendo... ajustemos' : 'Hay que reevaluar los gastos'}
              </p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="bg-terracota text-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm opacity-80 font-medium">Gastos este mes</p>
            <p className="text-3xl font-black mt-1">S/ {totalGastos.toFixed(2)}</p>
            <p className="text-xs opacity-70 mt-1">{transacciones.length} movimientos</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-crema">
            <p className="text-sm text-gray-500 font-medium">Presupuesto mensual</p>
            <p className="text-3xl font-black text-marron mt-1">S/ {totalPresupuesto.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Disponible: S/ {Math.max(0, totalPresupuesto - totalGastos).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Termómetro */}
        <div className="mb-6">
          <TermometroPeruano porcentajeGastado={pctGastado} />
        </div>

        {/* Presupuestos progress */}
        {presupuestos.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-crema mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-marron">Presupuestos del mes</h2>
              <Link href="/presupuestos" className="text-terracota text-sm font-bold hover:underline">Ver todos →</Link>
            </div>
            <div className="flex flex-col gap-3">
              {presupuestos.slice(0, 4).map(p => {
                const gastado = gastosPorCategoria[p.categorias?.nombre || ''] || 0
                const pct = Math.min((gastado / p.monto) * 100, 100)
                const color = pct < 80 ? '#27AE60' : pct < 100 ? '#F39C12' : '#C0392B'
                return (
                  <div key={p.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-gray-700">{p.categorias?.icono} {p.categorias?.nombre}</span>
                      <span className="text-gray-500">S/ {gastado.toFixed(0)} / S/ {p.monto.toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Últimas transacciones */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-crema mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-marron">Últimos movimientos</h2>
            <Link href="/transacciones" className="text-terracota text-sm font-bold hover:underline">Ver todos →</Link>
          </div>
          {transacciones.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">Aún no hay movimientos este mes</p>
              <Link href="/importar" className="inline-block mt-3 bg-terracota text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90">
                📂 Importar extracto
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {transacciones.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-crema last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.categorias?.icono || '📦'}</span>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{t.descripcion}</p>
                      <p className="text-xs text-gray-400">{t.categorias?.nombre || 'Sin categoría'} • {t.fecha}</p>
                    </div>
                  </div>
                  <span className="font-black text-terracota text-sm">-S/ {Number(t.monto).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA si no hay datos */}
        {transacciones.length === 0 && presupuestos.length === 0 && (
          <div className="bg-gradient-to-r from-terracota to-amber-600 text-white rounded-2xl p-6 text-center shadow-lg">
            <p className="text-2xl mb-2">🦙</p>
            <p className="font-black text-lg">{`¡Empecemos, ${profile!.nombre}!`}</p>
            <p className="text-sm opacity-90 mt-1 mb-4">Sube tu extracto bancario y Llamín se encarga del resto</p>
            <Link href="/importar" className="inline-block bg-white text-terracota font-black px-6 py-3 rounded-xl hover:opacity-90 transition-all">
              📂 Importar mi primer extracto
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
