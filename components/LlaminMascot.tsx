'use client'

type Expresion = 'feliz' | 'emocionada' | 'preocupada' | 'dormida' | 'analizando' | 'racha' | 'alerta' | 'motivando'

interface Props {
  expresion?: Expresion
  size?: number
  className?: string
}

export default function LlaminMascot({ expresion = 'feliz', size = 120, className = '' }: Props) {
  const expressions: Record<Expresion, { eyes: string; mouth: string; extras: string }> = {
    feliz:      { eyes: '◕ ◕', mouth: '‿', extras: '✨' },
    emocionada: { eyes: '★ ★', mouth: 'D', extras: '🎉' },
    preocupada: { eyes: '> <', mouth: '~', extras: '💧' },
    dormida:    { eyes: '- -', mouth: '·', extras: 'z z z' },
    analizando: { eyes: '@ @', mouth: '|', extras: '📊' },
    racha:      { eyes: '★ ★', mouth: 'D', extras: '🔥' },
    alerta:     { eyes: 'O O', mouth: 'O', extras: '🔔' },
    motivando:  { eyes: '◕ ◕', mouth: 'D', extras: '💪' },
  }
  const e = expressions[expresion]

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} style={{ width: size, height: size * 1.2 }}>
      <svg viewBox="0 0 100 120" width={size} height={size * 1.2} xmlns="http://www.w3.org/2000/svg">
        {/* Orejas */}
        <ellipse cx="28" cy="22" rx="10" ry="18" fill="#E8D5B0" />
        <ellipse cx="72" cy="22" rx="10" ry="18" fill="#E8D5B0" />
        <ellipse cx="28" cy="22" rx="6" ry="12" fill="#F4A0A0" />
        <ellipse cx="72" cy="22" rx="6" ry="12" fill="#F4A0A0" />
        {/* Cuerpo */}
        <ellipse cx="50" cy="88" rx="30" ry="28" fill="#F5E6C8" />
        {/* Cabeza */}
        <ellipse cx="50" cy="48" rx="28" ry="26" fill="#F5E6C8" />
        {/* Collar andino */}
        <rect x="28" y="68" width="44" height="8" rx="4" fill="#00BCD4" />
        <circle cx="35" cy="72" r="3" fill="#E91E63" />
        <circle cx="43" cy="72" r="3" fill="#F39C12" />
        <circle cx="50" cy="72" r="3" fill="#9C27B0" />
        <circle cx="57" cy="72" r="3" fill="#F39C12" />
        <circle cx="65" cy="72" r="3" fill="#E91E63" />
        {/* Ojos */}
        <circle cx="38" cy="46" r="7" fill="white" />
        <circle cx="62" cy="46" r="7" fill="white" />
        <circle cx="39" cy="47" r="4" fill="#2C1810" />
        <circle cx="63" cy="47" r="4" fill="#2C1810" />
        <circle cx="40" cy="45" r="1.5" fill="white" />
        <circle cx="64" cy="45" r="1.5" fill="white" />
        {/* Hocico */}
        <ellipse cx="50" cy="58" rx="10" ry="7" fill="#E8D5B0" />
        {/* Nariz */}
        <ellipse cx="50" cy="54" rx="4" ry="2.5" fill="#C0392B" />
        {/* Patas */}
        <rect x="30" y="108" width="12" height="10" rx="4" fill="#8B6914" />
        <rect x="58" y="108" width="12" height="10" rx="4" fill="#8B6914" />
        {/* Alforja */}
        <rect x="32" y="82" width="36" height="18" rx="6" fill="#C0392B" />
        <line x1="50" y1="82" x2="50" y2="100" stroke="#F39C12" strokeWidth="2" />
        <circle cx="50" cy="91" r="3" fill="#F7DC6F" />
        {/* Expresión especial según estado */}
        {expresion === 'dormida' && (
          <text x="68" y="35" fontSize="12" fill="#2980B9">z</text>
        )}
        {expresion === 'racha' && (
          <text x="70" y="30" fontSize="14">🔥</text>
        )}
        {expresion === 'emocionada' && (
          <>
            <text x="18" y="25" fontSize="10" fill="#F39C12">✦</text>
            <text x="72" y="20" fontSize="10" fill="#F39C12">✦</text>
          </>
        )}
      </svg>
      {/* Emoji extra */}
      <span className="absolute -top-2 -right-2 text-xl">{e.extras}</span>
    </div>
  )
}
