import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import { soyAdminMotor } from '../services/chronicleLibros'

type Administrador = { user_id: string; email: string; asignado_en: string }

export default function Administracion() {
  const { session, loading: cargandoSesion } = useAuth()
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [administradores, setAdministradores] = useState<Administrador[]>([])
  const [email, setEmail] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function cargar() {
    const esAdmin = await soyAdminMotor()
    setAutorizado(esAdmin)
    if (!esAdmin) return
    const { data, error: errorLista } = await supabase.rpc('chronicle_listar_administradores')
    if (errorLista) throw errorLista
    setAdministradores((data ?? []) as Administrador[])
  }

  useEffect(() => {
    if (cargandoSesion) return
    if (!session) { setAutorizado(false); return }
    let activo = true
    async function iniciar() {
      try { await cargar() } catch (err) {
        if (activo) { setError(err instanceof Error ? err.message : 'No se pudo consultar la administración.'); setAutorizado(false) }
      }
    }
    void iniciar()
    return () => { activo = false }
  }, [session?.user.id, cargandoSesion])

  async function otorgar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || guardando) return
    setGuardando(true); setError(''); setMensaje('')
    try {
      const { error: errorAsignacion } = await supabase.rpc('chronicle_otorgar_administrador', { p_email: email.trim() })
      if (errorAsignacion) throw errorAsignacion
      setEmail('')
      setMensaje('Permiso de administrador asignado correctamente.')
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar el permiso.')
    } finally { setGuardando(false) }
  }

  if (cargandoSesion || autorizado === null) return <AppLayout title="Administración"><p>Verificando permisos...</p></AppLayout>
  if (!session) return <Navigate to="/login" replace />
  if (!autorizado) return <Navigate to="/home" replace />

  return <AppLayout title="Administración" subtitle="Administración general de Chronicle">
    <div style={{ maxWidth: 760, display: 'grid', gap: 24 }}>
      <section className="nueva-propuesta-panel" style={{ padding: 24 }}>
        <h2>Permisos de administrador</h2>
        <p>Otorgá acceso de administrador a una persona que ya tenga una cuenta registrada. Este permiso permite gestionar funciones administrativas de Chronicle.</p>
        <form onSubmit={otorgar} style={{ display: 'grid', gap: 12, marginTop: 18 }}>
          <label htmlFor="admin-email">Correo electrónico del usuario</label>
          <input id="admin-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@ejemplo.com" style={{ padding: 12, borderRadius: 8, width: '100%', boxSizing: 'border-box' }}/>
          <button type="submit" disabled={guardando || !email.trim()} style={{ padding: 12 }}>{guardando ? 'Asignando...' : 'Otorgar administrador'}</button>
        </form>
        {error && <p role="alert" style={{ color: '#e57373' }}>{error}</p>}
        {mensaje && <p role="status">{mensaje}</p>}
      </section>
      <section className="nueva-propuesta-panel" style={{ padding: 24 }}>
        <h2>Administradores actuales</h2>
        {administradores.length === 0 ? <p>No hay administradores para mostrar.</p> :
          <ul>{administradores.map(a => <li key={a.user_id} style={{ padding: '10px 0' }}>{a.email}</li>)}</ul>}
      </section>
    </div>
  </AppLayout>
}
