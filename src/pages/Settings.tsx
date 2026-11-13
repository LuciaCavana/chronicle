import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { useAuth } from '../contexts/useAuth'
import '../styles/Profile.css'

export default function Settings() {
  const { session } = useAuth()
  return (
    <AppLayout title="Configuración" subtitle="Opciones de cuenta y seguridad">
      <div className="profile-page">
        <section className="profile-hero">
          <div>
            <h2 style={{ margin: '0 0 8px' }}>Configuración de cuenta</h2>
            <p className="profile-description" style={{ margin: 0 }}>Gestioná tus opciones de acceso a Chronicle.</p>
          </div>
          <Link className="profile-settings-link" to="/perfil"><ArrowLeft size={18} /> Volver a mi perfil</Link>
        </section>
        <section className="profile-card">
          <h2><ShieldCheck size={19} aria-hidden="true" /> Cuenta y seguridad</h2>
          <div className="profile-settings-grid">
            <div className="profile-settings-item">
              <div><strong>Correo electrónico</strong><p>{session?.user.email ?? 'No disponible'}</p></div>
            </div>
            <div className="profile-settings-item">
              <div><strong>Discord y Google</strong><p>Vinculá cuentas externas para usar distintos métodos de inicio de sesión.</p></div>
              <span className="profile-settings-note">Próximamente</span>
            </div>
            <div className="profile-settings-item">
              <div><strong>Privacidad</strong><p>Tu perfil es privado. Solo vos podés consultar y editar tus datos desde esta sección.</p></div>
              <span className="profile-settings-note">Perfil privado</span>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
