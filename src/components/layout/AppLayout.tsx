
import type { ReactNode } from 'react'
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
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="app-layout-main">
        <Header title={title} subtitle={subtitle} />

        <main className="app-layout-content">
          {children}
        </main>
      </div>
    </div>
  )
}
