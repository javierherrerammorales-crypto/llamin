'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const links = [
  { href: '/dashboard', label: '🏠 Inicio' },
  { href: '/importar', label: '📂 Importar' },
  { href: '/transacciones', label: '📋 Movimientos' },
  { href: '/presupuestos', label: '🎯 Presupuestos' },
  { href: '/metas', label: '⭐ Metas' },
  { href: '/estadisticas', label: '📊 Estadísticas' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-white border-r border-crema shadow-sm z-40 py-6 px-4">
        <div className="mb-8 text-center">
          <div className="flex items-center gap-2 justify-center">
            <img src="/llamin-logo.png" alt="Llamín" width={40} height={40} style={{objectFit:'contain'}} onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none'}} />
            <span className="text-2xl font-black text-terracota">Llamín</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Tu llama financiera peruana</p>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                pathname === l.href
                  ? 'bg-terracota text-white shadow-sm'
                  : 'text-gray-600 hover:bg-crema hover:text-marron'
              }`}>
              {l.label}
            </Link>
          ))}
        </div>
        <button onClick={handleLogout}
          className="mt-4 px-4 py-3 rounded-xl text-sm text-gray-400 hover:text-terracota hover:bg-red-50 transition-all text-left">
          🚪 Cerrar sesión
        </button>
      </nav>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-crema z-40 flex justify-around py-2 px-1">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className={`flex flex-col items-center p-1.5 rounded-xl text-xs font-medium transition-all ${
              pathname === l.href ? 'text-terracota' : 'text-gray-400'
            }`}>
            <span className="text-xl">{l.label.split(' ')[0]}</span>
            <span className="text-[9px] mt-0.5">{l.label.split(' ')[1]}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
