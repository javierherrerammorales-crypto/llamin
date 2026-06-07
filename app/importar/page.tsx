'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { categorizarDescripcion } from '@/lib/categorizer'
import { Categoria } from '@/lib/types'
import Navbar from '@/components/Navbar'
import LlaminMascot from '@/components/LlaminMascot'

// ─────────────────────────────────────────────
// CONSTANTES Y CATÁLOGOS
// ─────────────────────────────────────────────

const TIPOS_PRODUCTO = [
  { id: 'credito', label: 'Tarjeta de crédito', icon: '💳', desc: 'Visa, Mastercard, etc.' },
  { id: 'debito',  label: 'Tarjeta de débito',  icon: '🏦', desc: 'Cuenta de ahorros o corriente' },
  { id: 'wallet',  label: 'Billetera digital',   icon: '📱', desc: 'Yape, Plin, Tunki...' },
]

const BANCOS = [
  { id: 'bcp',        label: 'BCP',          icon: '🔵' },
  { id: 'io',         label: 'IO (BCP)',      icon: '🟠' },
  { id: 'bbva',       label: 'BBVA',          icon: '🔷' },
  { id: 'interbank',  label: 'Interbank',     icon: '🟢' },
  { id: 'scotiabank', label: 'Scotiabank',    icon: '🔴' },
  { id: 'banbif',     label: 'BanBif',        icon: '🟡' },
  { id: 'yape',       label: 'Yape',          icon: '🦙' },
  { id: 'plin',       label: 'Plin',          icon: '💜' },
  { id: 'tunki',      label: 'Tunki',         icon: '🐦' },
  { id: 'otro',       label: 'Otro',          icon: '🏛️' },
]

// Comercios conocidos con categoría obvia → auto-clasificar sin preguntar
const MERCHANT_MAP: [string[], string][] = [
  [['LUZ DEL SUR','ENEL','EDELNOR','ELECTROCENTRO','HIDRANDINA','ELECTROSUR','SEAL','ELECTRONOROESTE'], 'Servicios'],
  [['SEDAPAL','EPS TACNA','EMAPA','SEDALIB'], 'Servicios'],
  [['CALIDDA','CÁLIDDA','GAS NATURAL','GNLC'], 'Servicios'],
  [['MOVISTAR','CLARO','ENTEL','BITEL','WIN','AMERICATEL','PGRECIBO'], 'Telefonía'],
  [['TOTTUS','METRO ','WONG ','PLAZA VEA','VIVANDA',' MASS ','MAKRO','COSTCO','VIVANDA','LA COLONIA'], 'Supermercados'],
  [['KFC',"MC DONALD'S",'MCDONALD','BURGER KING','PIZZA HUT','BEMBOS','NORKY','POPEYE','PAPA JOHN','DOMINOS','CHINA WOK','TELEPIZZA','PARDO','MEDITERRAN'], 'Alimentación'],
  [['CHIFA','CARNICERIA','CARNICERÍA','BODEGA ','PANADERIA','PANADERÍA','POLLERIA','POLLERÍAS','CEVICHERIA','CEVICHERÍA','SANGUCHERIA','RESTAU','CAFETE','D JOSE','BRONZINO','QUEIROLO'], 'Alimentación'],
  [['STARBUCKS','DUNKIN','JUAN VALDEZ','ALTOMAYO','CAFE VERDE','THE COFFEE'], 'Alimentación'],
  [['CINEMARK','CINEPLANET','UVK','MULTICINES'], 'Entretenimiento'],
  [['NETFLIX','SPOTIFY','YOUTUBE','DISNEY','HBO','AMAZON PRIME','APPLE.COM','GOOGLE PLAY','MICROSOFT','STEAM','PLAYSTATION','XBOX','NINTENDO','PRIME VIDEO','TWITCH','PARAMOUNT','STAR+','DAZN'], 'Entretenimiento'],
  [['COURSERA','UDEMY','PLATZI','DUOLINGO','PREUNIVERSIT','ACADEMIA','PEARSON','LINKEDIN LEARN'], 'Educación'],
  [['INKAFARMA','MIFARMA','BOTICAS Y SALUD','BOTICAS ','CLINICA','CLÍNICA','LABORATORIO','FARMACIA','DENTIST','HOSPITAL','DEYBI','ALDO DE MELO'], 'Salud'],
  [['REPSOL','PETROPER','PETROPERU','PRIMAX','PECSA','SHELL','GRIFO','COMBUSTIBLE','GASOLINERA','TEXACO','COESTI','LINEA AMARILLA','ELBEKA'], 'Transporte'],
  [['UBER','CABIFY','BEAT ','INDRIVER','RAPPI TAXI'], 'Transporte'],
  [['RAPPI','PEDIDOS YA','GLOVO','JUSTO','BUEN PRECIO'], 'Alimentación'],
  [['FALABELLA','RIPLEY','H&M','ZARA','FOREVER 21','PRIMARK','ADIDAS','NIKE','PUMA','REEBOK','JOCKEY PLAZA','LARCO MAR','PLAZA NORTE'], 'Compras'],
  [['SODIMAC','PROMART','MAESTRO','IKEA','CASA IDEAL'], 'Hogar'],
  [['CAMARA DE COMERCIO'], 'Negocios'],
]

const INTERNACIONALES = ['NETFLIX','SPOTIFY','COURSERA','UDEMY','AMAZON','GOOGLE','APPLE','MICROSOFT','DISNEY','HBO','YOUTUBE','PLAYSTATION','XBOX','STEAM','TWITCH','PAYPAL','DROPBOX']

const MESES_ES: Record<string, string> = {
  ENE:'01', FEB:'02', MAR:'03', ABR:'04', MAY:'05', JUN:'06',
  JUL:'07', AGO:'08', SEP:'09', OCT:'10', NOV:'11', DIC:'12'
}

// Tasas conocidas de IO/BCP (fuente: Hoja Resumen IO julio 2025)
const TASAS_IO = {
  teaSolesMin: 33.0, teaSolesMax: 111.9,
  teaDolaresMin: 33.0, teaDolaresMax: 76.9,
  tceaSolesMax: 119.2, tceaDolaresMax: 83.1,
  tnamMoratoriaSoles: 9.61, tnamMoratoriaDolares: 9.61,
  seguroDesgravamen: 0.3, // % sobre saldo deudor promedio diario, máx S/20
}

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

interface FilaPreview {
  fecha: string; descripcion: string; monto: number
  categoria: string; categoria_id: string | null
}

interface MovimientoTC {
  fecha: string; descripcion: string; soles: number; dolares: number
  categoria: string; categoria_id: string | null; sinCategoria: boolean
}

interface CuotaFutura {
  periodo: string; descripcion: string; nroCuota: string; soles: number; dolares: number
}

interface ResumenTC {
  cicloDesde: string; cicloHasta: string
  lineaCredito: number; saldoDisponible: number; lineaUtilizada: number
  ultimoDiaPago: string
  totalSoles: number; totalDolares: number; pagoMinimo: number
  // Tasas extraídas del PDF (o de la hoja resumen IO si no están en el PDF)
  teaSoles: number | null; teaDolares: number | null
  tnamMoratoria: number | null; tceaSoles: number | null
}

interface EstadoCuentaTC {
  resumen: ResumenTC
  abonos:    MovimientoTC[]
  sinCuotas: MovimientoTC[]
  enCuotas:  MovimientoTC[]
  planCuotas: CuotaFutura[]
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const autoCategoria = (desc: string, cats: Categoria[]): { categoria: string; categoria_id: string | null; sinCategoria: boolean } => {
  const up = desc.toUpperCase()
  // Primero: buscar en mapa de comercios conocidos
  for (const [kws, nombre] of MERCHANT_MAP) {
    if (kws.some(k => up.includes(k.trim()))) {
      const cat = cats.find(c => c.nombre === nombre)
      if (cat) return { categoria: cat.nombre, categoria_id: cat.id, sinCategoria: false }
    }
  }
  // Segundo: usar categorizador genérico
  const nombre = categorizarDescripcion(desc)
  if (nombre && nombre !== 'Otros') {
    const cat = cats.find(c => c.nombre === nombre)
    if (cat) return { categoria: cat.nombre, categoria_id: cat.id, sinCategoria: false }
  }
  // Tercero: sin categoría → el usuario debe clasificar
  const catOtros = cats.find(c => c.nombre === 'Otros')
  return { categoria: 'Otros', categoria_id: catOtros?.id || null, sinCategoria: true }
}

const esMerchanInternacional = (desc: string) =>
  INTERNACIONALES.some(m => desc.toUpperCase().includes(m))

const parsearMonto = (s: string) => parseFloat(s.replace(/,/g, '')) || 0

const parsearFechaTC = (token: string): string => {
  const m = token.match(/(\d{2})-(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)/i)
  if (!m) return new Date().toISOString().split('T')[0]
  const anio = new Date().getFullYear()
  return `${anio}-${MESES_ES[m[2].toUpperCase()]}-${m[1]}`
}

const parsearPeriodo = (token: string): string => {
  // Convierte "DIC-24" o "ENE-25" a formato legible "Dic 2024"
  const m = token.match(/(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)-?(\d{2,4})/i)
  if (!m) return token
  const meses: Record<string, string> = {
    ENE:'Ene', FEB:'Feb', MAR:'Mar', ABR:'Abr', MAY:'May', JUN:'Jun',
    JUL:'Jul', AGO:'Ago', SEP:'Sep', OCT:'Oct', NOV:'Nov', DIC:'Dic'
  }
  const anio = m[2].length === 2 ? '20' + m[2] : m[2]
  return `${meses[m[1].toUpperCase()]} ${anio}`
}

const normalizarFecha = (f: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f
  const p = f.split(/[\/\-]/)
  if (p.length === 3) {
    if (p[2].length === 4) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`
    if (p[0].length === 4) return `${p[0]}-${p[1].padStart(2,'0')}-${p[2].padStart(2,'0')}`
  }
  return new Date().toISOString().split('T')[0]
}

// ─────────────────────────────────────────────
// PARSER TARJETA DE CRÉDITO (BCP/IO)
// ─────────────────────────────────────────────

const parsearEstadoCuentaTC = (text: string, cats: Categoria[], banco: string): EstadoCuentaTC => {
  const T = text.replace(/\s+/g, ' ')

  const extractNum = (rx: RegExp): number => {
    const m = T.match(rx)
    return m ? parsearMonto(m[1].replace(/\s/g, '')) : 0
  }
  const extractStr = (rx: RegExp): string => {
    const m = T.match(rx)
    return m ? m[1].trim() : ''
  }

  // ── Resumen financiero ──
  const resumen: ResumenTC = {
    cicloDesde:      extractStr(/ciclo de facturaci[oó]n[:\s]+(\d{2}\/\d{2}\/\d{4})/i),
    cicloHasta:      extractStr(/al\s+(\d{2}\/\d{2}\/\d{4})/i),
    lineaCredito:    extractNum(/l[ií]nea de cr[eé]dito actual[^:]*?[:\s]+([\d,. ]+)/i),
    saldoDisponible: extractNum(/saldo disponible[^:]*?[:\s]+([\d,. ]+)/i),
    lineaUtilizada:  0,
    ultimoDiaPago:   extractStr(/[uú]ltimo d[ií]a de pago[:\s]+(\d{2}\/\d{2}\/\d{4})/i),
    totalSoles:      extractNum(/total[^$\n]*?S\/[:\s]*([\d,. ]+)/i),
    totalDolares:    extractNum(/total[^$\n]*?\$[:\s]*([\d,. ]+)/i),
    pagoMinimo:      extractNum(/pago m[ií]nimo[^S\n]*?S\/[:\s]*([\d,. ]+)/i),
    // Tasas: intentar extraer del PDF; si no, usar las conocidas de IO
    teaSoles:    extractNum(/TEA[^%\n]{0,40}soles[^%\n]{0,20}([\d.]+)\s*%/i) || null,
    teaDolares:  extractNum(/TEA[^%\n]{0,40}d[oó]lar[^%\n]{0,20}([\d.]+)\s*%/i) || null,
    tnamMoratoria: extractNum(/TNAM[^%\n]{0,40}([\d.]+)\s*%/i) ||
                   extractNum(/tasa[^%\n]{0,40}moratoria[^%\n]{0,40}([\d.]+)/i) || null,
    tceaSoles:   extractNum(/TCEA[^%\n]{0,40}soles[^%\n]{0,20}([\d.]+)\s*%/i) || null,
  }
  resumen.lineaUtilizada = Math.max(0, resumen.lineaCredito - resumen.saldoDisponible)

  // Si no encontró tasas en el PDF y es banco IO/BCP, usar las conocidas
  if ((banco === 'io' || banco === 'bcp') && !resumen.tnamMoratoria) {
    resumen.tnamMoratoria = TASAS_IO.tnamMoratoriaSoles
  }

  // ── Extraer sección de texto ──
  const seccion = (inicio: string, fines: string[]): string => {
    const rx = new RegExp(inicio, 'i')
    const s = T.search(rx)
    if (s === -1) return ''
    let e = T.length
    for (const f of fines) {
      const idx = T.search(new RegExp(f, 'i'))
      if (idx > s && idx < e) e = idx
    }
    return T.slice(s, e)
  }

  // ── Parser de movimientos (Abonos / Sin cuotas / En cuotas) ──
  const parseMovs = (txt: string): MovimientoTC[] => {
    if (!txt) return []
    const DATE_RX = /\b(\d{2}-(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC))\b/gi
    const positions: { idx: number; token: string }[] = []
    let dm: RegExpExecArray | null
    while ((dm = DATE_RX.exec(txt)) !== null)
      positions.push({ idx: dm.index, token: dm[1] })

    const rows: MovimientoTC[] = []
    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].idx
      const end = i + 1 < positions.length ? positions[i + 1].idx : txt.length
      let rowText = txt.slice(start, end).trim()
      const fecha = parsearFechaTC(positions[i].token)
      rowText = rowText.replace(/\b\d{2}-(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\b/gi, '').trim()

      const amtRx = /\b(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})\b/g
      const amounts: { val: number; pos: number }[] = []
      let am: RegExpExecArray | null
      while ((am = amtRx.exec(rowText)) !== null) {
        const val = parsearMonto(am[1])
        if (val > 0 && val < 500000) amounts.push({ val, pos: am.index })
      }
      if (!amounts.length) continue

      const firstAmtPos = amounts[0].pos
      let desc = rowText.slice(0, firstAmtPos)
        .replace(/SUBTOTAL|FECHA|DESCRIPCI[OÓ]N|SOLES|D[OÓ]LARES/gi, '')
        .replace(/\s+/g, ' ').trim()
      if (desc.length < 2) {
        desc = rowText.replace(/[\d,]+\.\d{2}/g, '').replace(/\s+/g, ' ').trim()
      }
      if (desc.length < 2) continue

      let soles = 0, dolares = 0
      if (amounts.length >= 2) {
        soles = amounts[0].val; dolares = amounts[1].val
      } else {
        if (esMerchanInternacional(desc)) dolares = amounts[0].val
        else soles = amounts[0].val
      }

      const { categoria, categoria_id, sinCategoria } = autoCategoria(desc, cats)
      rows.push({ fecha, descripcion: desc, soles, dolares, categoria, categoria_id, sinCategoria })
    }
    return rows
  }

  // ── Parser de Plan de cuotas próximos meses ──
  const parsePlanCuotas = (txt: string): CuotaFutura[] => {
    if (!txt) return []
    // Busca filas con periodo (MES-AÑO), descripción, número cuota, montos
    const PERIODO_RX = /\b(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)-?\d{2,4}\b/gi
    const positions: { idx: number; token: string }[] = []
    let dm: RegExpExecArray | null
    while ((dm = PERIODO_RX.exec(txt)) !== null)
      positions.push({ idx: dm.index, token: dm[0] })

    const rows: CuotaFutura[] = []
    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].idx
      const end = i + 1 < positions.length ? positions[i + 1].idx : txt.length
      let rowText = txt.slice(start, end).trim()
      rowText = rowText.replace(PERIODO_RX, '').trim()

      const amtRx = /\b(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})\b/g
      const amounts: number[] = []
      let am: RegExpExecArray | null
      while ((am = amtRx.exec(rowText)) !== null) {
        const val = parsearMonto(am[1])
        if (val > 0 && val < 500000) amounts.push(val)
      }

      // Detectar "6/12" o "N° cuota" pattern
      const cuotaRx = /(\d+\/\d+|\d+\s+de\s+\d+)/i
      const cuotaM = rowText.match(cuotaRx)
      const nroCuota = cuotaM ? cuotaM[1] : ''

      const desc = rowText
        .replace(cuotaRx, '')
        .replace(/[\d,]+\.\d{2}/g, '')
        .replace(/\s+/g, ' ').trim()

      if (!amounts.length && !desc) continue

      rows.push({
        periodo: parsearPeriodo(positions[i].token),
        descripcion: desc || '—',
        nroCuota,
        soles:   amounts[0] || 0,
        dolares: amounts[1] || 0,
      })
    }
    return rows
  }

  const FINS = ['SUBTOTAL','Resumen de movimientos','Informaci[oó]n sobre Tasas','Informaci[oó]n Importante']

  return {
    resumen,
    abonos:     parseMovs(seccion('Abonos',            ['Consumos directos','Consumos en cuotas',...FINS])),
    sinCuotas:  parseMovs(seccion('Consumos directos', ['Consumos en cuotas',...FINS])),
    enCuotas:   parseMovs(seccion('Consumos en cuotas',['Plan de cuotas',...FINS])),
    planCuotas: parsePlanCuotas(seccion('Plan de cuotas',FINS)),
  }
}

// ─────────────────────────────────────────────
// PARSER GENÉRICO (CSV / EXCEL / PDF simple)
// ─────────────────────────────────────────────

const parsearCSV = (text: string, cats: Categoria[]): FilaPreview[] => {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const rows: FilaPreview[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;|\t]/).map(c => c.replace(/"/g, '').trim())
    if (cols.length < 3) continue
    let fecha = '', desc = '', monto = 0
    for (const col of cols) {
      if (/^\d{2}[\/\-]\d{2}[\/\-]\d{2,4}$/.test(col) || /^\d{4}-\d{2}-\d{2}$/.test(col)) fecha = col
      else if (/^[\d,.]+$/.test(col.replace(/\s/g,'')) && parseFloat(col.replace(',','.')) > 0) {
        const v = parseFloat(col.replace(/\./g,'').replace(',','.')); if (v>0&&v<100000) monto=v
      } else if (col.length > 3 && !desc) desc = col
    }
    if (!fecha) fecha = new Date().toISOString().split('T')[0]
    if (!desc) desc = cols.join(' ')
    if (monto <= 0) continue
    const { categoria, categoria_id } = autoCategoria(desc, cats)
    rows.push({ fecha: normalizarFecha(fecha), descripcion: desc, monto, categoria, categoria_id })
  }
  return rows
}

const parsearTexto = (text: string, cats: Categoria[]): FilaPreview[] => {
  const rows: FilaPreview[] = []
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean)
  const dateRx = /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/
  for (const line of lines) {
    const dm = line.match(dateRx); if (!dm) continue
    const amtRx = /(\d{1,3}(?:[,.]\d{3})*[,.]\d{2})/g
    const amounts: number[] = []; let am: RegExpExecArray | null
    while ((am = amtRx.exec(line)) !== null) {
      const v = parseFloat(am[1].replace(/\./g,'').replace(',','.')); if (v>0&&v<100000) amounts.push(v)
    }
    if (!amounts.length) continue
    const monto = amounts[amounts.length - 1]
    const desc = line.replace(dm[0],'').replace(/(\d{1,3}(?:[,.]\d{3})*[,.]\d{2})/g,'').replace(/\s+/g,' ').trim()
    if (desc.length < 2) continue
    const { categoria, categoria_id } = autoCategoria(desc, cats)
    rows.push({ fecha: normalizarFecha(dm[1]), descripcion: desc, monto, categoria, categoria_id })
  }
  return rows
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

type Paso = 'tipo' | 'institucion' | 'upload' | 'password' | 'preview_tc' | 'preview' | 'guardando' | 'listo'

export default function ImportarPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])

  const [paso, setPaso] = useState<Paso>('tipo')
  const [tipoProducto, setTipoProducto] = useState('')
  const [banco, setBanco] = useState('')

  const [dragging, setDragging] = useState(false)
  const [pdfPendiente, setPdfPendiente] = useState<File | null>(null)
  const [pdfContrasena, setPdfContrasena] = useState('')
  const [pdfError, setPdfError] = useState('')
  const dniRef = useRef<HTMLInputElement>(null)

  const [filas, setFilas] = useState<FilaPreview[]>([])
  const [estadoTC, setEstadoTC] = useState<EstadoCuentaTC | null>(null)

  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUserId(session.user.id)
      supabase.from('categorias').select('*').eq('es_sistema', true)
        .then(({ data }) => setCategorias(data || []))
    })
  }, [router])

  useEffect(() => { if (pdfPendiente) setTimeout(() => dniRef.current?.focus(), 100) }, [pdfPendiente])

  // ── PDF loader ──
  const cargarPDFJS = async () => {
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        s.onload = () => res(); s.onerror = () => rej(new Error('No se pudo cargar PDF.js'))
        document.head.appendChild(s)
      })
    }
    const lib = (window as any).pdfjsLib
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    return lib
  }

  const extraerTextoPDF = async (file: File, password?: string): Promise<string> => {
    const lib = await cargarPDFJS()
    const buf = await file.arrayBuffer()
    const pdf = await lib.getDocument({ data: new Uint8Array(buf), ...(password ? { password } : {}) }).promise
    let txt = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      txt += content.items.map((x: any) => x.str || '').join(' ') + '\n'
    }
    return txt
  }

  // ── Procesar archivo ──
  const procesarArchivo = async (file: File, password?: string) => {
    setError(''); setCargando(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const esTCCredito = tipoProducto === 'credito'

      if (ext === 'pdf') {
        let txt: string
        try { txt = await extraerTextoPDF(file, password) }
        catch (e: any) {
          if ((e.message || '').toLowerCase().includes('password') || (e.message || '').toLowerCase().includes('encrypted')) {
            setPdfPendiente(file); setPdfContrasena(''); setPdfError('')
            setCargando(false); return
          }
          throw e
        }

        const esTCPDF = esTCCredito && (
          banco === 'io' || banco === 'bcp' ||
          txt.toLowerCase().includes('ciclo de facturación') ||
          txt.toLowerCase().includes('línea de crédito')
        )

        if (esTCPDF) {
          const estado = parsearEstadoCuentaTC(txt, categorias, banco)
          setEstadoTC(estado)
          setPaso('preview_tc')
        } else {
          const rows = parsearTexto(txt, categorias)
          if (!rows.length) { setError('No se encontraron transacciones. Intenta con CSV.'); setCargando(false); return }
          setFilas(rows); setPaso('preview')
        }

      } else if (ext === 'csv' || ext === 'txt') {
        const txt = await file.text()
        const rows = parsearCSV(txt, categorias)
        if (!rows.length) { setError('No se encontraron transacciones válidas.'); setCargando(false); return }
        setFilas(rows); setPaso('preview')

      } else if (ext === 'xlsx' || ext === 'xls') {
        const { read, utils } = await import('xlsx')
        const wb = read(await file.arrayBuffer())
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json: string[][] = utils.sheet_to_json(ws, { header: 1 })
        const rows = parsearCSV(json.map(r => r.join(',')).join('\n'), categorias)
        if (!rows.length) { setError('No se encontraron transacciones en el Excel.'); setCargando(false); return }
        setFilas(rows); setPaso('preview')

      } else {
        setError('Formatos soportados: CSV, Excel (.xlsx, .xls), PDF')
      }
    } catch (e: any) {
      setError('Error al leer el archivo: ' + (e.message || ''))
    }
    setCargando(false)
  }

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) procesarArchivo(file)
  }, [categorias, tipoProducto, banco])

  const abrirConContrasena = async () => {
    if (!pdfPendiente || !pdfContrasena.trim()) return
    setPdfError('')
    try {
      await procesarArchivo(pdfPendiente, pdfContrasena.trim())
      setPdfPendiente(null)
    } catch {
      setPdfError('DNI incorrecto. Verifica e intenta de nuevo.')
    }
  }

  // ── Categorización ──
  const actualizarCatFilas = (idx: number, catNombre: string) => {
    const cat = categorias.find(c => c.nombre === catNombre)
    setFilas(prev => prev.map((f, i) => i===idx ? { ...f, categoria: catNombre, categoria_id: cat?.id||null } : f))
  }

  const actualizarCatTC = (seccion: 'sinCuotas'|'enCuotas'|'abonos', idx: number, catNombre: string) => {
    if (!estadoTC) return
    const cat = categorias.find(c => c.nombre === catNombre)
    setEstadoTC(prev => {
      if (!prev) return prev
      const arr = [...prev[seccion]]
      arr[idx] = { ...arr[idx], categoria: catNombre, categoria_id: cat?.id||null, sinCategoria: false }
      return { ...prev, [seccion]: arr }
    })
  }

  // ── Guardar ──
  const guardar = async () => {
    if (!userId) return
    setPaso('guardando')
    let registros: any[] = []

    if (estadoTC) {
      const toReg = (m: MovimientoTC, tipo: string) => ({
        user_id: userId, fecha: m.fecha, descripcion: m.descripcion,
        monto: m.soles || m.dolares, moneda: m.dolares && !m.soles ? 'USD' : 'PEN',
        categoria_id: m.categoria_id, tipo, fuente: 'importado',
      })
      registros = [
        ...estadoTC.abonos.map(m => toReg(m, 'ingreso')),
        ...estadoTC.sinCuotas.map(m => toReg(m, 'gasto')),
        ...estadoTC.enCuotas.map(m => toReg(m, 'gasto')),
      ]
    } else {
      registros = filas.map(f => ({
        user_id: userId, fecha: f.fecha, descripcion: f.descripcion, monto: f.monto,
        moneda: 'PEN', categoria_id: f.categoria_id, tipo: 'gasto', fuente: 'importado',
      }))
    }

    if (!registros.length) { setError('No hay movimientos para guardar.'); setPaso(estadoTC ? 'preview_tc' : 'preview'); return }

    const { error: err } = await supabase.from('transacciones').insert(registros)
    if (err) { setError('Error al guardar: ' + err.message); setPaso(estadoTC ? 'preview_tc' : 'preview'); return }
    await supabase.from('profiles').update({ ultima_actividad: new Date().toISOString().split('T')[0], puntos: 10 }).eq('id', userId)
    setPaso('listo')
  }

  const totalMovimientos = estadoTC
    ? estadoTC.abonos.length + estadoTC.sinCuotas.length + estadoTC.enCuotas.length
    : filas.length

  const sinCategoriaCount = estadoTC
    ? [...estadoTC.abonos, ...estadoTC.sinCuotas, ...estadoTC.enCuotas].filter(m => m.sinCategoria).length
    : 0

  // ─────────────────────────────────────────────
  // SUB-COMPONENTES
  // ─────────────────────────────────────────────

  // Tabla de movimientos TC (Abonos / Sin cuotas / En cuotas)
  const TablaTC = ({ titulo, color, movs, seccion }: {
    titulo: string; color: string
    movs: MovimientoTC[]; seccion: 'sinCuotas'|'enCuotas'|'abonos'
  }) => {
    if (!movs.length) return null
    const sinCat = movs.filter(m => m.sinCategoria).length
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-crema mb-5 overflow-hidden">
        <div className={`px-5 py-3 ${color} flex items-center justify-between`}>
          <p className="font-black text-white text-sm">{titulo} <span className="font-normal opacity-80">({movs.length})</span></p>
          {sinCat > 0 && (
            <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
              ⚠️ {sinCat} sin categoría
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-crema/50 border-b border-crema">
                <th className="text-left py-2 px-3 text-marron font-black text-xs uppercase tracking-wide">Fecha</th>
                <th className="text-left py-2 px-3 text-marron font-black text-xs uppercase tracking-wide">Descripción</th>
                <th className="text-right py-2 px-3 text-marron font-black text-xs uppercase tracking-wide">S/</th>
                <th className="text-right py-2 px-3 text-marron font-black text-xs uppercase tracking-wide">$</th>
                <th className="text-left py-2 px-3 text-marron font-black text-xs uppercase tracking-wide">Categoría</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m, i) => (
                <tr key={i} className={`border-b border-crema/70 hover:bg-crema/30 transition-colors ${m.sinCategoria ? 'bg-amber-50/60' : ''}`}>
                  <td className="py-2 px-3 text-gray-500 text-xs whitespace-nowrap">{m.fecha}</td>
                  <td className="py-2 px-3 text-gray-800 font-medium text-xs max-w-xs">
                    <span>{m.descripcion}</span>
                    {m.sinCategoria && <span className="ml-2 text-[10px] text-amber-600 font-bold bg-amber-100 px-1.5 py-0.5 rounded">CLASIFICA</span>}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-xs text-terracota whitespace-nowrap">
                    {m.soles > 0 ? `S/ ${m.soles.toFixed(2)}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-xs text-blue-600 whitespace-nowrap">
                    {m.dolares > 0 ? `$ ${m.dolares.toFixed(2)}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={m.categoria}
                      onChange={e => actualizarCatTC(seccion, i, e.target.value)}
                      className={`border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-terracota w-full max-w-[140px] ${
                        m.sinCategoria
                          ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
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
    )
  }

  // Tabla de Plan de cuotas (estructura diferente)
  const TablaPlanCuotas = ({ cuotas }: { cuotas: CuotaFutura[] }) => {
    if (!cuotas.length) return null
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-crema mb-5 overflow-hidden">
        <div className="px-5 py-3 bg-azul flex items-center justify-between">
          <p className="font-black text-white text-sm">📅 Plan de cuotas próximos meses <span className="font-normal opacity-80">({cuotas.length} cuotas)</span></p>
        </div>
        <p className="text-xs text-gray-500 px-5 py-2 bg-blue-50 border-b border-crema">
          Estos son los montos que se descontarán automáticamente de tu línea en los próximos meses por tus compras en cuotas.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-crema/50 border-b border-crema">
                <th className="text-left py-2 px-3 text-marron font-black text-xs uppercase tracking-wide">Período</th>
                <th className="text-left py-2 px-3 text-marron font-black text-xs uppercase tracking-wide">Descripción</th>
                <th className="text-center py-2 px-3 text-marron font-black text-xs uppercase tracking-wide">Cuota</th>
                <th className="text-right py-2 px-3 text-marron font-black text-xs uppercase tracking-wide">S/</th>
                <th className="text-right py-2 px-3 text-marron font-black text-xs uppercase tracking-wide">$</th>
              </tr>
            </thead>
            <tbody>
              {cuotas.map((c, i) => (
                <tr key={i} className="border-b border-crema/70 hover:bg-crema/30 transition-colors">
                  <td className="py-2 px-3 text-gray-500 text-xs whitespace-nowrap font-medium">{c.periodo}</td>
                  <td className="py-2 px-3 text-gray-800 font-medium text-xs max-w-xs">{c.descripcion}</td>
                  <td className="py-2 px-3 text-center text-xs text-blue-600 font-bold whitespace-nowrap">{c.nroCuota || '—'}</td>
                  <td className="py-2 px-3 text-right font-bold text-xs text-terracota whitespace-nowrap">
                    {c.soles > 0 ? `S/ ${c.soles.toFixed(2)}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-xs text-blue-600 whitespace-nowrap">
                    {c.dolares > 0 ? `$ ${c.dolares.toFixed(2)}` : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-crema">
      <Navbar />
      <main className="md:ml-56 p-4 md:p-8 pb-24 md:pb-8">
        <h1 className="text-2xl font-black text-marron mb-1">Importar extracto 📂</h1>
        <p className="text-gray-500 text-sm mb-6">Sube tu estado de cuenta en formato CSV, Excel o PDF</p>

        {/* ── PASO 1: TIPO DE PRODUCTO ── */}
        {paso === 'tipo' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <LlaminMascot expresion="analizando" size={60} />
              <div>
                <p className="font-black text-marron text-lg">¿Qué tipo de producto financiero es?</p>
                <p className="text-sm text-gray-500">Así Llamín sabrá cómo leer mejor tu extracto</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {TIPOS_PRODUCTO.map(t => (
                <button key={t.id} onClick={() => { setTipoProducto(t.id); setPaso('institucion') }}
                  className="bg-white rounded-2xl p-6 text-left border-2 border-crema hover:border-terracota hover:shadow-md transition-all group">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{t.icon}</div>
                  <p className="font-black text-marron text-lg">{t.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── PASO 2: INSTITUCIÓN ── */}
        {paso === 'institucion' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <LlaminMascot expresion="feliz" size={60} />
              <div>
                <p className="font-black text-marron text-lg">¿De qué banco o proveedor?</p>
                <p className="text-sm text-gray-500">
                  {TIPOS_PRODUCTO.find(t => t.id === tipoProducto)?.icon}{' '}
                  {TIPOS_PRODUCTO.find(t => t.id === tipoProducto)?.label}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-4">
              {BANCOS.map(b => (
                <button key={b.id} onClick={() => { setBanco(b.id); setPaso('upload') }}
                  className="bg-white rounded-2xl p-4 text-center border-2 border-crema hover:border-terracota hover:shadow-md transition-all group">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{b.icon}</div>
                  <p className="font-bold text-marron text-sm">{b.label}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setPaso('tipo')} className="text-sm text-gray-400 hover:text-terracota transition-colors">← Volver</button>
          </>
        )}

        {/* ── PASO 3: UPLOAD ── */}
        {paso === 'upload' && (
          <>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{error}</div>}

            {/* Chips de producto/banco */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <span className="bg-terracota text-white rounded-full px-3 py-1 text-xs font-bold">
                {TIPOS_PRODUCTO.find(t => t.id === tipoProducto)?.icon} {TIPOS_PRODUCTO.find(t => t.id === tipoProducto)?.label}
              </span>
              <span className="text-gray-400">·</span>
              <span className="bg-dorado/20 text-amber-800 rounded-full px-3 py-1 text-xs font-bold">
                {BANCOS.find(b => b.id === banco)?.icon} {BANCOS.find(b => b.id === banco)?.label}
              </span>
              <button onClick={() => setPaso('tipo')} className="ml-1 text-xs text-gray-400 hover:text-terracota transition-colors">✏️ Cambiar</button>
            </div>

            {pdfPendiente ? (
              <div className="bg-white rounded-2xl shadow-sm border-2 border-dorado p-6 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <LlaminMascot expresion="analizando" size={60} />
                  <div>
                    <p className="font-black text-marron text-lg">Este PDF está protegido 🔒</p>
                    <p className="text-sm text-gray-500">Ingresa tu DNI para abrirlo (contraseña del banco)</p>
                  </div>
                </div>
                <label className="block text-sm font-bold text-marron mb-2">Tu DNI</label>
                <input ref={dniRef} type="text" inputMode="numeric" maxLength={8}
                  value={pdfContrasena} onChange={e => setPdfContrasena(e.target.value.replace(/\D/g,''))}
                  onKeyDown={e => e.key === 'Enter' && abrirConContrasena()}
                  placeholder="Ej: 12345678"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest focus:outline-none focus:border-terracota mb-2" />
                {pdfError && <p className="text-red-600 text-sm mb-2">{pdfError}</p>}
                <p className="text-xs text-gray-400 mb-4">🔐 Tu DNI solo se usa localmente para abrir el PDF, nunca se envía a ningún servidor</p>
                <div className="flex gap-3">
                  <button onClick={() => { setPdfPendiente(null); setPdfContrasena(''); setPdfError('') }}
                    className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:border-terracota hover:text-terracota transition-all">
                    ← Cancelar
                  </button>
                  <button onClick={abrirConContrasena} disabled={pdfContrasena.length < 7}
                    className="flex-1 bg-terracota text-white font-black py-3 rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-40">
                    🔓 Abrir PDF
                  </button>
                </div>
              </div>
            ) : cargando ? (
              <div className="text-center py-16">
                <LlaminMascot expresion="analizando" size={80} className="mx-auto mb-4 animate-pulse" />
                <p className="font-black text-marron">Llamín está leyendo tu archivo...</p>
                <p className="text-sm text-gray-400 mt-1">Extrayendo movimientos y clasificando...</p>
              </div>
            ) : (
              <div onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)} onDrop={onDrop}
                className={`border-4 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
                  dragging ? 'border-terracota bg-red-50' : 'border-gray-300 bg-white hover:border-dorado hover:bg-amber-50'
                }`}
                onClick={() => document.getElementById('fileInput')?.click()}>
                <input id="fileInput" type="file" accept=".csv,.xlsx,.xls,.txt,.pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) procesarArchivo(f) }} />
                <LlaminMascot expresion="analizando" size={80} className="mx-auto mb-4" />
                <p className="text-xl font-black text-marron mb-2">Arrastra tu extracto aquí</p>
                <p className="text-gray-500 text-sm mb-4">o haz clic para seleccionarlo</p>
                <p className="text-xs text-gray-400">PDF · CSV · Excel (.xlsx, .xls)</p>
              </div>
            )}

            {!pdfPendiente && !cargando && (
              <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <p className="font-bold text-amber-800 mb-2">💡 ¿Cómo descargar tu estado de cuenta?</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li><b>IO / BCP:</b> App BCP → Mis productos → Tarjeta IO → Estado de cuenta → Descargar PDF</li>
                  <li><b>BBVA:</b> Banca por internet → Mis productos → Tarjeta → Descargar estado</li>
                  <li><b>Interbank:</b> Banca por internet → Cuentas → Exportar movimientos</li>
                  <li><b>Yape:</b> App Yape → Actividad → Descargar historial</li>
                </ul>
              </div>
            )}
          </>
        )}

        {/* ── PASO PREVIEW TARJETA DE CRÉDITO ── */}
        {paso === 'preview_tc' && estadoTC && (
          <>
            {/* ── TARJETA RESUMEN FINANCIERO ── */}
            <div className="bg-gradient-to-br from-marron to-amber-900 text-white rounded-2xl p-5 mb-5 shadow-xl">
              {/* Encabezado */}
              <div className="flex items-center gap-3 mb-4">
                <LlaminMascot expresion="emocionada" size={50} />
                <div>
                  <p className="font-black text-lg">Estado de Cuenta — {BANCOS.find(b => b.id === banco)?.label}</p>
                  {estadoTC.resumen.cicloDesde ? (
                    <p className="text-amber-200 text-sm">
                      Ciclo: {estadoTC.resumen.cicloDesde} al {estadoTC.resumen.cicloHasta}
                    </p>
                  ) : (
                    <p className="text-amber-300 text-sm">Tarjeta de crédito importada</p>
                  )}
                </div>
              </div>

              {/* Grid de métricas principales */}
                            {/* Línea de crédito - 3 cajitas */}
              {estadoTC.resumen.lineaCredito > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/10 rounded-2xl p-4">
                    <p className="text-xs text-amber-300 mb-1">Tu <b>línea de crédito</b> actual es:</p>
                    <p className="font-black text-2xl text-white">S/ {estadoTC.resumen.lineaCredito.toLocaleString('es-PE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  {estadoTC.resumen.saldoDisponible > 0 && (
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-xs text-amber-300 mb-1">Tu <b>saldo disponible</b> al {estadoTC.resumen.cicloHasta} es:</p>
                      <p className="font-black text-2xl text-green-400">S/ {estadoTC.resumen.saldoDisponible.toLocaleString('es-PE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                  )}
                  {estadoTC.resumen.lineaUtilizada > 0 && (
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-xs text-amber-300 mb-1">Tu <b>línea de crédito utilizada</b> al {estadoTC.resumen.cicloHasta} es:</p>
                      <p className="font-black text-2xl text-red-300">S/ {estadoTC.resumen.lineaUtilizada.toLocaleString('es-PE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Último día de pago + totales */}
              {estadoTC.resumen.ultimoDiaPago && (estadoTC.resumen.totalSoles > 0 || estadoTC.resumen.pagoMinimo > 0) && (
                <div className="flex flex-wrap gap-3 mb-4 items-stretch">
                  <div className="bg-white/10 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[140px]">
                    <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wide mb-2">Último día de pago</p>
                    <p className="font-black text-base text-white text-center">{estadoTC.resumen.ultimoDiaPago}</p>
                  </div>
                  <div className="text-2xl text-white/40 self-center hidden md:flex">→</div>
                  <div className="flex-1 bg-white/10 rounded-2xl p-4">
                    <div className="flex gap-6">
                      <div className="flex-1">
                        <p className="text-xs font-black text-white uppercase mb-2">Soles</p>
                        <p className="text-[10px] text-amber-300">Pago total del mes</p>
                        <p className="font-black text-xl text-white">S/{estadoTC.resumen.totalSoles.toLocaleString('es-PE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        <p className="text-[10px] text-amber-300 mt-2">Pago mínimo</p>
                        <p className="font-bold text-base text-white">S/{estadoTC.resumen.pagoMinimo.toLocaleString('es-PE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                      </div>
                      {estadoTC.resumen.totalDolares > 0 && (
                        <div className="flex-1 border-l border-white/20 pl-6">
                          <p className="text-xs font-black text-white uppercase mb-2">Dólares</p>
                          <p className="text-[10px] text-amber-300">Pago total del mes</p>
                          <p className="font-black text-xl text-white">$\{estadoTC.resumen.totalDolares.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                      )}
                    </div>
                    {estadoTC.resumen.totalDolares > 0 && (
                      <p className="text-[10px] text-amber-200 mt-3">ℹ️ Debes realizar un pago en soles y otro en dólares. Ambos son independientes entre sí.</p>
                    )}
                  </div>
                </div>
              )}


              {/* Tasas de interés */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {estadoTC.resumen.teaSoles ? (
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-amber-300 text-xs mb-1">📊 TEA compensatoria</p>
                    <p className="font-black text-sm">{estadoTC.resumen.teaSoles.toFixed(2)}% anual</p>
                    <p className="text-amber-300 text-xs">Soles</p>
                  </div>
                ) : (banco === 'io' || banco === 'bcp') ? (
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-amber-300 text-xs mb-1">📊 TEA compensatoria</p>
                    <p className="font-black text-sm">{TASAS_IO.teaSolesMin}% – {TASAS_IO.teaSolesMax}%</p>
                    <p className="text-amber-300 text-xs">Soles (rango IO)</p>
                  </div>
                ) : null}
                {(estadoTC.resumen.tnamMoratoria || (banco === 'io' || banco === 'bcp')) && (
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-amber-300 text-xs mb-1">🚨 Tasa moratoria</p>
                    <p className="font-black text-sm">{(estadoTC.resumen.tnamMoratoria ?? TASAS_IO.tnamMoratoriaSoles).toFixed(2)}%</p>
                    <p className="text-amber-300 text-xs">TNAM anual (por mora)</p>
                  </div>
                )}
              </div>

              {/* Advertencia pago mínimo */}
              <div className="bg-red-500/25 border border-red-400/40 rounded-xl p-3 text-sm">
                <p className="font-bold mb-1">⚠️ Importante sobre el pago mínimo</p>
                <p className="text-amber-100 text-xs leading-relaxed">
                  Si solo pagas el mínimo (S/ {estadoTC.resumen.pagoMinimo.toFixed(2)}), el saldo restante 
                  de S/ {(estadoTC.resumen.totalSoles - estadoTC.resumen.pagoMinimo).toFixed(2)} generará intereses 
                  al {(estadoTC.resumen.tnamMoratoria ?? TASAS_IO.tnamMoratoriaSoles).toFixed(2)}% TNAM en el siguiente ciclo.
                  <b className="ml-1">¡Llamín te recomienda pagar el total!</b>
                </p>
              </div>
            </div>

            {/* Aviso de categorías pendientes */}
            {sinCategoriaCount > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4 flex items-start gap-3">
                <span className="text-2xl">🦙</span>
                <div>
                  <p className="font-bold text-amber-800">
                    {sinCategoriaCount} {sinCategoriaCount === 1 ? 'movimiento necesita' : 'movimientos necesitan'} tu clasificación
                  </p>
                  <p className="text-amber-700 text-sm">
                    Llamín no reconoció esos comercios. Selecciona la categoría correcta en las tablas de abajo — así Llamín aprende para la próxima.
                  </p>
                </div>
              </div>
            )}

            {/* ── TABLAS DE MOVIMIENTOS ── */}
            <TablaTC titulo="💰 Abonos y Pagos" color="bg-verde" movs={estadoTC.abonos} seccion="abonos" />
            <TablaTC titulo="🛍️ Consumos directos (sin cuotas)" color="bg-terracota" movs={estadoTC.sinCuotas} seccion="sinCuotas" />
            <TablaTC titulo="📦 Consumos en cuotas" color="bg-marron" movs={estadoTC.enCuotas} seccion="enCuotas" />
            <TablaPlanCuotas cuotas={estadoTC.planCuotas} />

            {error && <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-3 text-sm border border-red-200">{error}</div>}

            <div className="flex gap-3 mt-4">
              <button onClick={() => { setEstadoTC(null); setPaso('upload') }}
                className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:border-terracota hover:text-terracota transition-all">
                ← Volver
              </button>
              <button onClick={guardar} disabled={sinCategoriaCount > 0}
                className="flex-1 bg-terracota text-white font-black py-3 rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {sinCategoriaCount > 0
                  ? `⚠️ Clasifica ${sinCategoriaCount} movimientos primero`
                  : `✅ Guardar ${totalMovimientos} movimientos`}
              </button>
            </div>
            {sinCategoriaCount > 0 && (
              <p className="text-xs text-center text-gray-400 mt-2">Clasifica todos los movimientos marcados con ⚠️ para poder guardar</p>
            )}
          </>
        )}

        {/* ── PASO PREVIEW SIMPLE (débito/wallet/CSV) ── */}
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-crema/50 border-b border-crema">
                      <th className="text-left py-2 px-2 text-marron font-black text-xs uppercase tracking-wide">Fecha</th>
                      <th className="text-left py-2 px-2 text-marron font-black text-xs uppercase tracking-wide">Descripción</th>
                      <th className="text-right py-2 px-2 text-marron font-black text-xs uppercase tracking-wide">Monto</th>
                      <th className="text-left py-2 px-2 text-marron font-black text-xs uppercase tracking-wide">Categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, i) => (
                      <tr key={i} className="border-b border-crema hover:bg-crema/50">
                        <td className="py-2 px-2 text-gray-500 text-xs">{f.fecha}</td>
                        <td className="py-2 px-2 text-gray-800 font-medium text-xs max-w-xs truncate">{f.descripcion}</td>
                        <td className="py-2 px-2 text-right text-terracota font-bold text-xs">S/ {f.monto.toFixed(2)}</td>
                        <td className="py-2 px-2">
                          <select value={f.categoria} onChange={e => actualizarCatFilas(i, e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-terracota">
                            {categorias.map(c => <option key={c.id} value={c.nombre}>{c.icono} {c.nombre}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {error && <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-3 text-sm">{error}</div>}
            <div className="flex gap-3">
              <button onClick={() => { setFilas([]); setPaso('upload') }}
                className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:border-terracota hover:text-terracota transition-all">← Volver</button>
              <button onClick={guardar}
                className="flex-1 bg-terracota text-white font-black py-3 rounded-xl hover:opacity-90 transition-all shadow-lg">
                ✅ Guardar {filas.length} movimientos
              </button>
            </div>
          </>
        )}

        {/* ── GUARDANDO ── */}
        {paso === 'guardando' && (
          <div className="text-center py-20">
            <LlaminMascot expresion="analizando" size={100} className="mx-auto mb-4 animate-pulse" />
            <p className="text-xl font-black text-marron">Guardando tus movimientos...</p>
          </div>
        )}

        {/* ── LISTO ── */}
        {paso === 'listo' && (
          <div className="text-center py-12">
            <LlaminMascot expresion="emocionada" size={120} className="mx-auto mb-4" />
            <h2 className="text-2xl font-black text-marron mb-2">¡Todo listo! 🎉</h2>
            <p className="text-gray-600 mb-6">Se guardaron {totalMovimientos} movimientos. ¡Llamín está feliz!</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => { setFilas([]); setEstadoTC(null); setPaso('tipo') }}
                className="border-2 border-terracota text-terracota font-bold px-6 py-3 rounded-xl hover:bg-red-50 transition-all">
                📂 Importar otro archivo
              </button>
              <a href="/dashboard" className="bg-terracota text-white font-black px-6 py-3 rounded-xl hover:opacity-90 shadow-lg transition-all">
                🏠 Ver mi dashboard
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
