'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LlaminMascot from '@/components/LlaminMascot'

export default function AuthPage() {
  const router = useRouter()
  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/dashboard')
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMensaje('')
    setLoading(true)

    if (modo === 'registro') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } },
      })
      if (signUpError) { setError(signUpError.message); setLoading(false); return }
      setMensaje('¡Cuenta creada! Revisa tu correo para confirmar y luego inicia sesión.')
      setModo('login')
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError('Correo o contraseña incorrectos'); setLoading(false); return }
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #2C1810 0%, #5D2E0C 50%, #C0392B 100%)' }}>
      
      {/* Stars background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white opacity-60"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3 animate-bounce">
            <LlaminMascot expresion="feliz" size={110} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Llamín</h1>
          <p className="text-amber-200 mt-1 font-medium">Tu llama financiera peruana 🦙</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-black text-marron mb-6 text-center">
            {modo === 'login' ? '¡Bienvenido de vuelta!' : '¡Únete a Llamín!'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm text-center">{error}</div>
          )}
          {mensaje && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-4 text-sm text-center">{mensaje}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {modo === 'registro' && (
              <div>
                <label className="text-sm font-bold text-gray-600 mb-1 block">Tu nombre</label>
                <input
                  type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="¿Cómo te llamas, causa?" required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-terracota transition-colors text-gray-800"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block">Correo electrónico</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com" required
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-terracota transition-colors text-gray-800"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block">Contraseña</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" required minLength={6}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-terracota transition-colors text-gray-800"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-terracota text-white font-black py-4 rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-60 text-lg mt-2">
              {loading ? '⏳ Un momento...' : modo === 'login' ? '🦙 Entrar' : '🎉 Crear mi cuenta'}
            </button>
          </form>

          <p className="text-center mt-5 text-sm text-gray-500">
            {modo === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(''); setMensaje('') }}
              className="text-terracota font-bold hover:underline">
              {modo === 'login' ? 'Regístrate gratis' : 'Inicia sesión'}
            </button>
          </p>
        </div>

        <p className="text-center text-amber-200/60 text-xs mt-6">
          100% peruano • 100% gratuito para empezar 🇵🇪
        </p>
      </div>
    </div>
  )
}
