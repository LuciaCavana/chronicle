import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import { soyAdminMotor } from '../services/chronicleLibros'

type Usuario = { user_id: string; email: string; es_admin: boolean }

export default function Administracion() {
  const { session, loading: cargandoSesion } = useAuth()
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true)

  async function cargarUsuarios() {
    const { data, error: errorLista } = await supabase.rpc('chronicle_listar_usuarios_admin')
    if (errorLista) throw errorLista
    setUsuarios((data ?? []) as Usuario[])
  }

  useEffect(() => {
    if (cargandoSesion) return
    if (!session) { setAutorizado(false); return }
    let activo = true
    setAutorizado(null)
    setCargandoUsuarios(true)
    async function iniciar() {
      try {
        const esAdmin = await soyAdminMotor()
        if (!activo) return
        setAutorizado(esAdmin)
        if (!esAdmin) return
        const { data, error: errorLista } = await supabase.rpc('chronicle_listar_usuarios_admin')
        if (errorLista) throw errorLista
        if (activo) setUsuarios((data ?? []) as Usuario[])
      } catch (err) {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudieron consultar los usuarios.')
      } finally {
        if (activo) setCargandoUsuarios(false)
      }
    }
    void iniciar()
    return () => { activo = false }
  }, [session?.user.id, cargandoSesion])

  const filtrados = useMemo(() => usuarios.filter(u =>
    u.email.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())
  ), [usuarios, busqueda])

  async function otorgar(usuario: Usuario) {
    if (guardandoId || usuario.es_admin) return
    setGuardandoId(usuario.user_id)
    setError(''); setMensaje('')
    try {
      const { error: errorAsignacion } = await supabase.rpc('chronicle_otorgar_administrador', { p_email: usuario.email })
      if (errorAsignacion) throw errorAsignacion
      await cargarUsuarios()
      setMensaje(`Se otorgó el permiso de administrador a ${usuario.email}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar el permiso.')
    } finally { setGuardandoId(null) }
  }

  if (cargandoSesion || autorizado === null) return <AppLayout title="Administración"><p>Verificando permisos...</p>{error && <p role="alert">{error}</p>}</AppLayout>
  if (!session) return <Navigate to="/login" replace />
  if (!autorizado) return <Navigate to="/home" replace />

  return <AppLayout title="Administración" subtitle="Administración general de Chronicle">
    <section style={{ maxWidth: 900, display: 'grid', gap: 18 }}>
      <div>
        <h2>Usuarios</h2>
        <p>Buscá un usuario registrado y asignale permisos de administrador.</p>
      </div>
      <label htmlFor="buscar-usuarios">Buscar por correo electrónico</label>
      <input id="buscar-usuarios" type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar usuarios..." style={{ padding: 12, borderRadius: 8, width: '100%', boxSizing: 'border-box' }}/>
      {error && <p role="alert" style={{ color: '#e57373' }}>{error}</p>}
      {mensaje && <p role="status">{mensaje}</p>}
      {cargandoUsuarios ? <p>Cargando usuarios...</p> : <>
        <p>{filtrados.length} de {usuarios.length} usuarios</p>
        <div style={{ display: 'grid', gap: 8 }}>
          {filtrados.map(usuario => <div key={usuario.user_id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
            padding: 16, border: '1px solid var(--border-color, #5555)', borderRadius: 10, flexWrap: 'wrap'
          }}>
            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <strong>{usuario.email}</strong>
              <div style={{ opacity: .75, fontSize: 13 }}>{usuario.es_admin ? 'Administrador' : 'Usuario'}</div>
            </div>
            {usuario.es_admin
              ? <span aria-label="Ya es administrador">Administrador ✓</span>
              : <button type="button" disabled={guardandoId !== null} onClick={() => void otorgar(usuario)}>
                  {guardandoId === usuario.user_id ? 'Asignando...' : 'Hacer administrador'}
                </button>}
          </div>)}
          {filtrados.length === 0 && <p>No se encontraron usuarios.</p>}
        </div>
      </>}
    </section>
  </AppLayout>
}
