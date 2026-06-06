'use client'

type Expresion = 'feliz' | 'emocionada' | 'preocupada' | 'dormida' | 'analizando' | 'racha' | 'alerta' | 'motivando'

interface Props {
  expresion?: Expresion
  size?: number
  className?: string
}

export default function LlaminMascot({ expresion = 'feliz', size = 120, className = '' }: Props) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <img
        src="/llamin-mascot.png"
        alt="Llamín"
        width={size}
        height={size}
        style={{ objectFit: 'contain', width: size, height: size }}
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement
          target.style.display = 'none'
          const fallback = target.nextElementSibling as HTMLElement
          if (fallback) fallback.style.display = 'flex'
        }}
      />
      <div
        style={{ display: 'none', width: size, height: size, fontSize: size * 0.7, alignItems: 'center', justifyContent: 'center' }}
      >
        🦙
      </div>
    </div>
  )
}
