// Categorizador basado en reglas (sin IA) para el MVP
// La IA de Claude se añadirá en la siguiente versión

const REGLAS: Record<string, string> = {
  // Supermercados
  'WONG': 'Alimentación', 'METRO': 'Alimentación', 'TOTTUS': 'Alimentación',
  'PLAZA VEA': 'Alimentación', 'VIVANDA': 'Alimentación', 'MASS': 'Alimentación',
  'TAMBO': 'Alimentación', 'LISTO': 'Alimentación', 'LA POSITIVA': 'Alimentación',

  // Delivery / Restaurantes
  'RAPPI': 'Delivery', 'UBER EATS': 'Delivery', 'PEDIDOSYA': 'Delivery',
  'KFC': 'Restaurantes', 'MCDONALDS': 'Restaurantes', 'BEMBOS': 'Restaurantes',
  'BURGER': 'Restaurantes', 'PIZZA': 'Restaurantes', 'POLLO': 'Restaurantes',
  'CHIFA': 'Restaurantes', 'CEVICHE': 'Restaurantes', 'SUSHI': 'Restaurantes',

  // Transporte
  'UBER': 'Transporte', 'INDRIVER': 'Transporte', 'BEAT': 'Transporte',
  'CABIFY': 'Transporte', 'TAXI': 'Transporte', 'METROPOLITANO': 'Transporte',
  'ATU': 'Transporte', 'PEAJE': 'Transporte', 'GASOLINA': 'Transporte',
  'GRIFO': 'Transporte', 'PETROLEO': 'Transporte', 'REPSOL': 'Transporte',

  // Entretenimiento
  'NETFLIX': 'Entretenimiento', 'SPOTIFY': 'Entretenimiento', 'HBO': 'Entretenimiento',
  'DISNEY': 'Entretenimiento', 'AMAZON PRIME': 'Entretenimiento', 'CINEPLANET': 'Entretenimiento',
  'CINEMARK': 'Entretenimiento', 'UVK': 'Entretenimiento', 'STEAM': 'Entretenimiento',
  'YOUTUBE': 'Entretenimiento', 'APPLE': 'Entretenimiento',

  // Servicios
  'CLARO': 'Servicios', 'MOVISTAR': 'Servicios', 'ENTEL': 'Servicios',
  'BITEL': 'Servicios', 'LUZ DEL SUR': 'Servicios', 'ENEL': 'Servicios',
  'SEDAPAL': 'Servicios', 'INTERNET': 'Servicios',

  // Salud
  'INKAFARMA': 'Salud', 'MIFARMA': 'Salud', 'FARMACIA': 'Salud',
  'BOTICA': 'Salud', 'CLINICA': 'Salud', 'HOSPITAL': 'Salud',
  'POSTA': 'Salud', 'DENTAL': 'Salud', 'MEDICO': 'Salud',
  'SMART FIT': 'Salud', 'GIMNASIO': 'Salud',

  // Educación
  'COLEGIO': 'Educación', 'UNIVERSIDAD': 'Educación', 'INSTITUTO': 'Educación',
  'UDEMY': 'Educación', 'COURSERA': 'Educación', 'PUCP': 'Educación',
  'UPC': 'Educación', 'UPN': 'Educación', 'SENATI': 'Educación',

  // Moda
  'SAGA': 'Moda', 'RIPLEY': 'Moda', 'OECHSLE': 'Moda', 'H&M': 'Moda',
  'ZARA': 'Moda', 'BATA': 'Moda', 'ROPA': 'Moda',

  // Deudas
  'CUOTA': 'Deudas/Cuotas', 'PRESTAMO': 'Deudas/Cuotas', 'CREDITO': 'Deudas/Cuotas',
  'BCP': 'Deudas/Cuotas', 'INTERBANK': 'Deudas/Cuotas', 'BBVA': 'Deudas/Cuotas',
}

export function categorizarDescripcion(descripcion: string): string {
  const desc = descripcion.toUpperCase()
  for (const [keyword, categoria] of Object.entries(REGLAS)) {
    if (desc.includes(keyword)) return categoria
  }
  return 'Otros'
}
