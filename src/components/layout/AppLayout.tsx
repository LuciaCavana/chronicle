
import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import '../../styles/AppLayout.css'

type AppLayoutProps = {
  children: ReactNode
  title: string
  subtitle?: string
}

export default function AppLayout({
  children,
  title,
  subtitle,
}: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  return (
    <div className="app-layout">
      {mobileMenuOpen && <button className="app-mobile-backdrop" type="button" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)} />}
      <Sidebar mobileOpen={mobileMenuOpen} onNavigate={() => setMobileMenuOpen(false)} />

      <div className="app-layout-main">
        <Header title={title} subtitle={subtitle} onOpenMenu={() => setMobileMenuOpen(true)} />

        <main className="app-layout-content">
          {children}
        </main>
      </div>
    </div>
  )
}
