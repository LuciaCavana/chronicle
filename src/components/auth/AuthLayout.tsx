
import type { ReactNode } from 'react'
import '../../styles/auth.css'

type AuthLayoutProps = {
  children: ReactNode
}

export default function AuthLayout({
  children,
}: AuthLayoutProps) {
  return (
    <main className="registro">
      <section className="registro-panel">
        <h1>CHRONICLE</h1>
        <p>Tu próxima aventura comienza aquí.</p>

        {children}
      </section>
    </main>
  )
}
