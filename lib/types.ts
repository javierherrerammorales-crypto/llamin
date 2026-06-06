export interface Profile {
  id: string
  nombre: string
  nivel: number
  racha_dias: number
  ultima_actividad: string | null
  puntos: number
}

export interface Categoria {
  id: string
  nombre: string
  icono: string
  color: string
  es_sistema: boolean
}

export interface Transaccion {
  id: string
  user_id: string
  fecha: string
  descripcion: string
  monto: number
  moneda: string
  categoria_id: string | null
  tipo: 'gasto' | 'ingreso'
  fuente: string
  categorias?: Categoria
}

export interface Presupuesto {
  id: string
  user_id: string
  categoria_id: string
  monto: number
  mes: number
  ano: number
  categorias?: Categoria
}

export interface MetaAhorro {
  id: string
  user_id: string
  nombre: string
  monto_objetivo: number
  monto_actual: number
  fecha_objetivo: string | null
  completada: boolean
}

export const NIVELES = [
  { nivel: 1, nombre: 'Explorador de Miraflores', icono: '🏙️', puntos_min: 0 },
  { nivel: 2, nombre: 'Viajero del Titicaca', icono: '⛵', puntos_min: 100 },
  { nivel: 3, nombre: 'Guardián de la Selva', icono: '🦜', puntos_min: 300 },
  { nivel: 4, nombre: 'Escalador de los Andes', icono: '🏔️', puntos_min: 600 },
  { nivel: 5, nombre: 'Guardián de Machu Picchu', icono: '🏛️', puntos_min: 1000 },
  { nivel: 6, nombre: 'Cóndor de las Finanzas', icono: '🦅', puntos_min: 2000 },
]
