import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import '../../styles/BackToHome.css'

export default function BackToHome() {
  const { session, loading } = useAuth()

  if (loading) return null

  return (
    <Link
      to={session ? '/home' : '/login'}
      className="back-to-home"
      title="Volver a la pantalla principal"
      aria-label="Volver a la pantalla principal"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v12h14V9" />
        <path d="M9 21v-7h6v7" />
      </svg>
    </Link>
  )
}