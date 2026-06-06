'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { categorizarDescripcion } from '@/lib/categorizer'
import { Categoria } from '@/lib/types'
import Navbar from '@/components/Navbar'
import LlaminMascot from '@/components/LlaminMascot'

interface FilaPreview {
  fecha: string
  descripcion: string
  monto: number
  categoria: string
  categoria_id: string | null
}

export default function ImportarPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [filas, setFilas] = useState<FilaPreview[]>([])
  const [paso, setPaso] = useState<'upload' | 'preview' | 'guardando' | 'listo'>('upload')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      setUserId(session.user.id)
      const { data } = await supabase.from('categorias').select('*').eq('es_sistema', true)
      setCategorias(data || [])
    }
    init()
  }, [router])

  const parsearCSV = (text: string): FilaPreview[] => {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const rows: FilaPreview[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;|\t]/).map(c => c.replace(/"/g, '').trim())
      if (cols.length < 3) continue

      // Try to find date, description, amount in columns
      let fecha = '', descripcion = '', monto = 0
      for (const col of cols) {
        if (/^\d{2}[\/\-]\d{2}[\/\-]\d{2,4}$/.test(col) || /^\d{4}-\d{2}-\d{2}$/.test(col)) {
          fecha = col
        } else if (/^[\d,.]+$/.test(col.replace(/\s/g, '')) && parseFloat(col.replace(',', '.')) > 0) {
          const val = parseFloat(col.replace(/\./g, '').replace(',', '.'))
          if (val > 0 && val < 100000) monto = val
        } else if (col.length > 3 && !fecha) {
          descripcion = col
        } else if (col.length > 3 && !descripcion) {
          descripcion = col
        }
      }

      if (!fecha) fecha = new Date().toISOString().split('T')[0]
      if (!descripcion) descripcion = cols.join(' ')
      if (monto <= 0) continue

      const catNombre = categorizarDescripcion(descripcion)
      const cat = categorias.find(c => c.nombre === catNombre) || categorias.find(c => c.nombre === 'Otros')
      rows.push({ fecha: normalizarFecha(fecha), descripcion, monto, categoria: catNombre, categoria_id: cat?.id || null })
    }
    return rows
  }

  const normalizarFecha = (f: string): string => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f
    const partes = f.split(/[\/\-]/)
    if (partes.length === 3) {
      if (partes[2].length === 4) return `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`
      if (partes[0].length === 4) return `${partes[0]}-${partes[1].padStart(2,'0')}-${partes[2].padStart(2,'0')}`
    }
    return new Date().toISOString().split('T')[0]
  }

  const procesarArchivo = async (file: File) => {
    setError('')
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv' || ext === 'txt') {
      const text = await file.text()
      const rows = parsearCSV(text)
      if (rows.length === 0) { setError('No se encontraron transacciones válidas en el archivo.'); return }
      setFilas(rows)
      setPaso('preview')
    } else if (ext === 'xlsx' || ext === 'xls') {
      const { read, utils } = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json: string[][] = utils.sheet_to_json(ws, { header: 1 })
      const csvText = json.map(r => r.join(',')).join('\n')
      const rows = parsearCSV(csvText)
      if (rows.length === 0) { setError('No se encontraron transacciones válidas en el Excel.'); return }
      setFilas(rows)
      setPaso('preview')
    } else {
      setError('Solo se aceptan archivos CSV o Excel (.xlsx, .xls)')
    }
  }

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) await procesarArchivo(file)
  }, [categorias])

  const onFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await procesarArchivo(file)
  }

  const actualizarCategoria = (idx: number, catNombre: string) => {
    const cat = categorias.find(c => c.nombre === catNombre)
    setFilas(prev => prev.map((f, i) => i === idx ? { ...f, categoria: catNombre, categoria_id: cat?.id || null } : f))
  }

  const guardar = async () => {
    if (!userId) return
    setPaso('guardando')
    const registros = filas.map(f => ({
      user_id: userId,
      fecha: f.fecha,
      descripcion: f.descripcion,
      monto: f.monto,
      moneda: 'PEN',
      categoria_id: f.categoria_id,
      tipo: 'gasto' as const,
      fuente: 'importado',
    }))
    const { error: err } = await supabase.from('transacciones').insert(registros)
    if (err) { setError('Error al guardar: ' + err.message); setPaso('preview'); return }

    // Actualizar racha
    await supabase.from('profiles').update({
      ultima_actividad: new Date().toISOString().split('T')[0],
      puntos: 10,
    }).eq('id', userId)

    setPaso('listo')
  }

  return (
    <div className="min-h-screen bg-crema">
      <Navbar />
      <main className="md:ml-56 p-4 md:p-8 pb-24 md:pb-8">
        <h1 className="text-2xl font-black text-marron mb-2">Importar extracto 📂</h1>
        <p className="text-gray-500 text-sm mb-6">Sube tu estado de cuenta del banco o Yape en formato CSV o Excel</p>

        {paso === 'upload' && (
          <>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{error}</div>}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`border-4 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
                dragging ? 'border-terracota bg-red-50' : 'border-gray-300 bg-white hover:border-dorado hover:bg-amber-50'
              }`}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input id="fileInput" type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={onFileInput} />
              <LlaminMascot expresion="analizando" size={80} className="mx-auto mb-4" />
              <p className="text-xl font-black text-marron mb-2">Arrastra tu archivo aquí</p>
              <p className="text-gray-500 text-sm mb-4">o haz clic para seleccionarlo</p>
              <p className="text-xs text-gray-400">Formatos: CSV, Excel (.xlsx, .xls) • BCP, Interbank, BBVA, Scotiabank, Yape</p>
            </div>

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="font-bold text-amber-800 mb-2">💡 ¿Cómo descargar tu extracto?</p>
              <ul className="text-sm text-amber-700 space-y-1">
                <li><b>BCP:</b> App BCP → Mis productos → Cuenta → Descargar movimientos</li>
                <li><b>Interbank:</b> Banca por internet → Cuentas → Exportar movimientos</li>
                <li><b>BBVA:</b> App BBVA → Consultas → Movimientos → Descargar</li>
                <li><b>Yape:</b> App Yape → Actividad → Descargar historial</li>
              </ul>
            </div>
          </>
        )}

        {paso === 'preview' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-crema p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <LlaminMascot expresion="emocionada" size={60} />
                <div>
                  <p className="font-black text-marron">¡Llamín encontró {filas.length} transacciones!</p>
                  <p className="text-sm text-gray-500">Revisa las categorías y corrige si es necesario</p>
                </div>
              </div>

              {error && <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-3 text-sm">{error}</div>}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-crema">
                      <th className="text-left py-2 px-2 text-marron font-black">Fecha</th>
                      <th className="text-left py-2 px-2 text-marron font-black">Descripción</th>
                      <th className="text-right py-2 px-2 text-marron font-black">Monto</th>
                      <th className="text-left py-2 px-2 text-marron font-black">Categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, i) => (
                      <tr key={i} className="border-b border-crema hover:bg-crema/50">
                        <td className="py-2 px-2 text-gray-600">{f.fecha}</td>
                        <td className="py-2 px-2 text-gray-800 font-medium max-w-xs truncate">{f.descripcion}</td>
                        <td className="py-2 px-2 text-right text-terracota font-bold">S/ {f.monto.toFixed(2)}</td>
                        <td className="py-2 px-2">
                          <select
                            value={f.categoria}
                            onChange={e => actualizarCategoria(i, e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-terracota"
                          >
                            {categorias.map(c => <option key={c.id} value={c.nombre}>{c.icono} {c.nombre}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setFilas([]); setPaso('upload') }}
                className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:border-terracota hover:text-terracota transition-all">
                ← Volver
              </button>
              <button onClick={guardar}
                className="flex-1 bg-terracota text-white font-black py-3 rounded-xl hover:opacity-90 transition-all shadow-lg">
                ✅ Guardar {filas.length} movimientos
              </button>
            </div>
          </>
        )}

        {paso === 'guardando' && (
          <div className="text-center py-20">
            <LlaminMascot expresion="analizando" size={100} className="mx-auto mb-4 animate-pulse" />
            <p className="text-xl font-black text-marron">Guardando tus movimientos...</p>
          </div>
        )}

        {paso === 'listo' && (
          <div className="text-center py-12">
            <LlaminMascot expresion="emocionada" size={120} className="mx-auto mb-4" />
            <h2 className="text-2xl font-black text-marron mb-2">¡Todo listo, causa! 🎉</h2>
            <p className="text-gray-600 mb-6">Se guardaron {filas.length} movimientos. ¡Llamín está feliz!</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => { setFilas([]); setPaso('upload') }}
                className="border-2 border-terracota text-terracota font-bold px-6 py-3 rounded-xl hover:bg-red-50">
                📂 Importar otro archivo
              </button>
              <a href="/dashboard" className="bg-terracota text-white font-black px-6 py-3 rounded-xl hover:opacity-90 shadow-lg">
                🏠 Ver mi dashboard
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
