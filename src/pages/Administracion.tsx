import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import { soyAdminMotor } from '../services/chronicleLibros'
import '../styles/Administracion.css'

type Rol = 'creator' | 'admin' | 'user'
type Usuario = {
  user_id: string
  email: string | null
  display_name: string | null
  username: string | null
  rol: Rol
}
type Filtro = 'todos' | Rol
const etiquetas: Record<Rol, string> = { creator: 'Creador', admin: 'Administrador', user: 'Usuario' }

export default function Administracion() {
  const { session, loading: cargandoSesion } = useAuth()
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [esPropietario, setEsPropietario] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true)

  async function cargarUsuarios() {
    const { data, error: errorLista } = await supabase.rpc('chronicle_listar_usuarios_roles')
    if (errorLista) throw errorLista
    setUsuarios((data ?? []) as Usuario[])
  }

  useEffect(() => {
    if (cargandoSesion) return
    if (!session) { setAutorizado(false); setCargandoUsuarios(false); return }
    let activo = true
    setAutorizado(null)
    setCargandoUsuarios(true)
    setError('')
    async function iniciar() {
      try {
        const [{ data: propietario, error: errorPropietario }, admin] = await Promise.all([
          supabase.rpc('chronicle_es_propietario'),
          soyAdminMotor(),
        ])
        if (errorPropietario) throw errorPropietario
        if (!activo) return
        const owner = Boolean(propietario)
        setEsPropietario(owner)
        setAutorizado(owner || admin)
        if (!owner && !admin) return
        const { data, error: errorLista } = await supabase.rpc('chronicle_listar_usuarios_roles')
        if (errorLista) throw errorLista
        if (activo) setUsuarios((data ?? []) as Usuario[])
      } catch (err) {
        if (activo) { setError(err instanceof Error ? err.message : 'No se pudieron consultar los usuarios.'); setAutorizado(false) }
      } finally {
        if (activo) setCargandoUsuarios(false)
      }
    }
    void iniciar()
    return () => { activo = false }
  }, [session?.user.id, cargandoSesion])

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase()
    return usuarios.filter(u =>
      (filtro === 'todos' || u.rol === filtro) &&
      [u.email, u.display_name, u.username].some(valor => (valor ?? '').toLocaleLowerCase().includes(termino))
    )
  }, [usuarios, busqueda, filtro])

  async function cambiarRol(usuario: Usuario) {
    if (!esPropietario || guardandoId || usuario.rol === 'creator') return
    const nuevoRol: Rol = usuario.rol === 'admin' ? 'user' : 'admin'
    const descripcion = nuevoRol === 'admin' ? 'dar permisos de administrador a' : 'quitar los permisos de administrador a'
    if (!window.confirm(`¿Confirmás que querés ${descripcion} ${usuario.email ?? usuario.username ?? 'este usuario'}?`)) return
    setGuardandoId(usuario.user_id)
    setError('')
    setMensaje('')
    try {
      const { error: cambioError } = await supabase.rpc('chronicle_cambiar_rol_usuario', {
        p_user_id: usuario.user_id,
        p_nuevo_rol: nuevoRol,
      })
      if (cambioError) throw cambioError
      await cargarUsuarios()
      setMensaje('Rol actualizado correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo modificar el rol.')
    } finally {
      setGuardandoId(null)
    }
  }

  if (cargandoSesion || autorizado === null) return <AppLayout title="Administración"><p>Verificando permisos...</p></AppLayout>
  if (!session) return <Navigate to="/login" replace />
  if (!autorizado && !error) return <Navigate to="/home" replace />
  if (!autorizado) return <AppLayout title="Administración"><p role="alert">{error}</p></AppLayout>

  return (
    <AppLayout title="Administración" subtitle="Gestión de usuarios y permisos de Chronicle">
      <div className="admin-page">
        <section className="admin-hero">
          <div>
            <h2>Usuarios de Chronicle</h2>
            <p>{esPropietario ? 'Consultá usuarios y administrá sus roles.' : 'Consultá usuarios y sus roles. Solo el creador puede modificarlos.'}</p>
          </div>
          <div className="admin-counter"><strong>{usuarios.length}</strong><span>Usuarios registrados</span></div>
        </section>
        <section className="admin-panel">
          <div className="admin-toolbar">
            <div className="admin-control">
              <label htmlFor="buscar-usuarios">Buscar usuarios</label>
              <input id="buscar-usuarios" type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Correo, nombre o @usuario" />
            </div>
            <div className="admin-control">
              <label htmlFor="filtrar-rol">Filtrar por rol</label>
              <select id="filtrar-rol" value={filtro} onChange={e => setFiltro(e.target.value as Filtro)}>
                <option value="todos">Todos los roles</option>
                <option value="creator">Creadores</option>
                <option value="admin">Administradores</option>
                <option value="user">Usuarios</option>
              </select>
            </div>
          </div>
          {error && <p role="alert" className="admin-alert admin-alert--error">{error}</p>}
          {mensaje && <p role="status" className="admin-alert admin-alert--success">{mensaje}</p>}
          {cargandoUsuarios ? <p className="admin-muted">Cargando usuarios...</p> : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Usuario</th><th>Rol</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {filtrados.map(usuario => (
                      <tr key={usuario.user_id}>
                        <td>
                          <div className="admin-user-name">{usuario.display_name || usuario.username || 'Sin nombre'}</div>
                          <div className="admin-user-sub">{usuario.username ? `@${usuario.username} · ` : ''}{usuario.email || 'Sin correo'}</div>
                        </td>
                        <td><span className={`admin-role admin-role--${usuario.rol}`}>{etiquetas[usuario.rol]}</span></td>
                        <td>
                          {usuario.rol === 'creator' ? <span className="admin-muted">Protegido</span>
                            : esPropietario ? (
                              <button className={`admin-action ${usuario.rol === 'admin' ? 'admin-action--remove' : ''}`}
                                type="button" disabled={guardandoId !== null} onClick={() => void cambiarRol(usuario)}>
                                {guardandoId === usuario.user_id ? 'Guardando...' : usuario.rol === 'admin' ? 'Quitar administrador' : 'Hacer administrador'}
                              </button>
                            ) : <span className="admin-muted">Solo lectura</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtrados.length === 0 && <div className="admin-empty">No se encontraron usuarios con esos filtros.</div>}
              </div>
              <div className="admin-footer">Mostrando {filtrados.length} de {usuarios.length} usuarios.</div>
            </>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
