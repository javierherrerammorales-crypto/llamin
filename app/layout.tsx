import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Llamín – Tu llama financiera peruana',
  description: 'Controla tus finanzas personales de manera fácil y divertida',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-crema">{children}</body>
    </html>
  )
}
