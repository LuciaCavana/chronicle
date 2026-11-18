import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Crown, Lock, Search, ShieldCheck, ShieldOff, UserRound, UsersRound, X, type LucideIcon } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import NavAdministracion from '../components/administracion/NavAdministracion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import { urlAvatar } from '../services/avatar'
import '../styles/paginas/Administracion.css'

type Rol = 'creator' | 'admin' | 'user'
type Usuario = {
  user_id: string
  email: string | null
  display_name: string | null
  username: string | null
  rol: Rol
  avatar_url?: string | null
  avatar_source?: string | null
}
type Filtro = 'todos' | Rol
type Cambio = { usuario: Usuario; nuevoRol: Rol }

const etiquetas: Record<Rol, string> = { creator: 'Equipo creador', admin: 'Administración', user: 'Usuario' }
const ordenRol: Record<Rol, number> = { creator: 0, admin: 1, user: 2 }
const filtros: { valor: Filtro; etiqueta: string; Icono: LucideIcon }[] = [
  { valor: 'todos', etiqueta: 'Todos', Icono: UsersRound },
  { valor: 'creator', etiqueta: 'Equipo creador', Icono: Crown },
  { valor: 'admin', etiqueta: 'Administración', Icono: ShieldCheck },
  { valor: 'user', etiqueta: 'Usuarios', Icono: UserRound },
]

const nombreDe = (u: Usuario) => u.display_name?.trim() || u.username || 'Sin nombre'
const normalizar = (valor: string) => valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es')

export default function Administracion() {
  const { session, loading: cargandoSesion, role, roleLoading } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true)
  const [cambio, setCambio] = useState<Cambio | null>(null)
  const botonConfirmar = useRef<HTMLButtonElement>(null)

  async function cargarUsuarios() {
    const { data, error: errorLista } = await supabase.rpc('chronicle_listar_usuarios_roles')
    if (errorLista) throw errorLista
    setUsuarios((data ?? []) as Usuario[])
  }

  // Permisos derivados del rol de la sesión; Supabase vuelve a verificarlos en cada RPC.
  const userId = session?.user.id
  const verificando = cargandoSesion || roleLoading
  const esPropietario = role === 'creator'
  const puedeAdministrar = role === 'creator' || role === 'admin'
  const [falloCarga, setFalloCarga] = useState(false)
  const autorizado = verificando ? null : Boolean(userId) && puedeAdministrar && !falloCarga

  useEffect(() => {
    if (verificando || !userId || !puedeAdministrar) return
    let activo = true
    void supabase.rpc('chronicle_listar_usuarios_roles').then(({ data, error: errorLista }) => {
      if (!activo) return
      if (errorLista) {
        setError(errorLista.message || 'No se pudieron consultar los usuarios.')
        setFalloCarga(true)
      } else {
        setUsuarios((data ?? []) as Usuario[])
      }
      setCargandoUsuarios(false)
    })
    return () => { activo = false }
  }, [verificando, userId, puedeAdministrar])

  useEffect(() => {
    if (!mensaje) return
    const temporizador = window.setTimeout(() => setMensaje(''), 4500)
    return () => window.clearTimeout(temporizador)
  }, [mensaje])

  useEffect(() => {
    if (!cambio) return
    botonConfirmar.current?.focus()
    const tecla = (evento: KeyboardEvent) => { if (evento.key === 'Escape' && !guardandoId) setCambio(null) }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [cambio, guardandoId])

  const conteo = useMemo(() => ({
    todos: usuarios.length,
    creator: usuarios.filter(u => u.rol === 'creator').length,
    admin: usuarios.filter(u => u.rol === 'admin').length,
    user: usuarios.filter(u => u.rol === 'user').length,
  }), [usuarios])

  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    return usuarios
      .filter(u => (filtro === 'todos' || u.rol === filtro) &&
        [u.email, u.display_name, u.username].some(valor => normalizar(valor ?? '').includes(termino)))
      .sort((a, b) => ordenRol[a.rol] - ordenRol[b.rol] || nombreDe(a).localeCompare(nombreDe(b), 'es'))
  }, [usuarios, busqueda, filtro])

  function pedirCambio(usuario: Usuario) {
    if (!esPropietario || guardandoId || usuario.rol === 'creator') return
    setError('')
    setMensaje('')
    setCambio({ usuario, nuevoRol: usuario.rol === 'admin' ? 'user' : 'admin' })
  }

  async function confirmarCambio() {
    if (!cambio || guardandoId) return
    const { usuario, nuevoRol } = cambio
    setGuardandoId(usuario.user_id)
    try {
      const { error: cambioError } = await supabase.rpc('chronicle_cambiar_rol_usuario', {
        p_user_id: usuario.user_id,
        p_nuevo_rol: nuevoRol,
      })
      if (cambioError) throw cambioError
      await cargarUsuarios()
      setMensaje(nuevoRol === 'admin'
        ? `${nombreDe(usuario)} ahora tiene permisos de administración.`
        : `${nombreDe(usuario)} ya no tiene permisos de administración.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo modificar el rol.')
    } finally {
      setGuardandoId(null)
      setCambio(null)
    }
  }

  if (cargandoSesion || autorizado === null) return <AppLayout title="Administración"><p className="admin-estado" role="status">Verificando permisos…</p></AppLayout>
  if (!session) return <Navigate to="/login" replace />
  if (!autorizado && !error) return <Navigate to="/home" replace />
  if (!autorizado) return <AppLayout title="Administración"><p role="alert" className="admin-aviso admin-aviso--error">{error}</p></AppLayout>

  const dandoPermisos = cambio?.nuevoRol === 'admin'

  return (
    <AppLayout title="Administración" subtitle="Usuarios y permisos de Chronicle">
      <div className="admin">
        <NavAdministracion />
        <div className="admin-resumen" role="group" aria-label="Filtrar por rol">
          {filtros.map(({ valor, etiqueta, Icono }) => (
            <button key={valor} type="button" className={`admin-tarjeta admin-tarjeta--${valor}`} aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>
              <span className="admin-tarjeta-icono" aria-hidden="true"><Icono size={18} /></span>
              <span className="admin-tarjeta-numero">{cargandoUsuarios ? '–' : conteo[valor]}</span>
              <span className="admin-tarjeta-etiqueta">{etiqueta}</span>
            </button>
          ))}
        </div>

        {!esPropietario && <p className="admin-aviso admin-aviso--info"><Lock size={16} aria-hidden="true" />Podés consultar usuarios y roles. Solo el equipo creador puede cambiar permisos.</p>}

        <section className="admin-panel" aria-labelledby="admin-titulo">
          <div className="admin-panel-cabecera">
            <h2 id="admin-titulo">Usuarios</h2>
            <label className="admin-buscar">
              <Search size={17} aria-hidden="true" />
              <span className="admin-oculto">Buscar usuarios</span>
              <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre, @usuario o correo" />
            </label>
          </div>

          {error && <p role="alert" className="admin-aviso admin-aviso--error">{error}</p>}

          {cargandoUsuarios ? <p className="admin-estado" role="status">Cargando usuarios…</p> : (
            <>
              <ul className="admin-lista">
                <li className="admin-fila admin-fila--titulos" aria-hidden="true">
                  <span>Usuario</span><span>Rol</span><span>Permisos</span>
                </li>
                {filtrados.map(usuario => {
                  const nombre = nombreDe(usuario)
                  const esYo = usuario.user_id === userId
                  const foto = urlAvatar({ avatar_url: usuario.avatar_url ?? null, avatar_source: usuario.avatar_source ?? null })
                  return (
                    <li key={usuario.user_id} className="admin-fila">
                      <div className="admin-usuario">
                        <span className={`admin-avatar admin-avatar--${usuario.rol}`} aria-hidden="true">{foto ? <img src={foto} alt="" loading="lazy" /> : nombre.charAt(0).toUpperCase()}</span>
                        <span className="admin-usuario-datos">
                          <span className="admin-usuario-nombre">{nombre}{esYo && <span className="admin-vos">vos</span>}</span>
                          <span className="admin-usuario-sub">{usuario.username ? `@${usuario.username} · ` : ''}{usuario.email || 'Sin correo'}</span>
                        </span>
                      </div>
                      <div><span className={`admin-rol admin-rol--${usuario.rol}`}>{etiquetas[usuario.rol]}</span></div>
                      <div className="admin-acciones">
                        {usuario.rol === 'creator' ? <span className="admin-protegido"><Lock size={14} aria-hidden="true" />Protegido</span>
                          : esPropietario ? (
                            <button type="button" className={`admin-boton${usuario.rol === 'admin' ? ' admin-boton--quitar' : ''}`}
                              disabled={guardandoId !== null} onClick={() => pedirCambio(usuario)}
                              aria-label={usuario.rol === 'admin' ? `Quitar administración a ${nombre}` : `Dar administración a ${nombre}`}>
                              {usuario.rol === 'admin' ? <ShieldOff size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
                              {guardandoId === usuario.user_id ? 'Guardando…' : usuario.rol === 'admin' ? 'Quitar administración' : 'Dar administración'}
                            </button>
                          ) : <span className="admin-protegido">Solo lectura</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {filtrados.length === 0 && <div className="admin-vacio">
                <p>No hay usuarios que coincidan.</p>
                {(busqueda || filtro !== 'todos') && <button type="button" className="admin-enlace" onClick={() => { setBusqueda(''); setFiltro('todos') }}>Quitar filtros</button>}
              </div>}
              <p className="admin-pie">Mostrando {filtrados.length} de {usuarios.length} usuarios</p>
            </>
          )}
        </section>
      </div>

      {mensaje && <div className="admin-toast" role="status">{mensaje}<button type="button" aria-label="Cerrar aviso" onClick={() => setMensaje('')}><X size={16} aria-hidden="true" /></button></div>}

      {cambio && <div className="admin-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !guardandoId) setCambio(null) }}>
        <div className="admin-dialogo" role="dialog" aria-modal="true" aria-labelledby="admin-dialogo-titulo" aria-describedby="admin-dialogo-texto">
          <span className={`admin-dialogo-icono${dandoPermisos ? '' : ' admin-dialogo-icono--quitar'}`} aria-hidden="true">
            {dandoPermisos ? <ShieldCheck size={22} /> : <ShieldOff size={22} />}
          </span>
          <h3 id="admin-dialogo-titulo">{dandoPermisos ? 'Dar permisos de administración' : 'Quitar permisos de administración'}</h3>
          <p id="admin-dialogo-texto">
            {dandoPermisos
              ? <><strong>{nombreDe(cambio.usuario)}</strong> podrá revisar, aprobar y rechazar propuestas, gestionar libros publicados y consultar esta lista de usuarios.</>
              : <><strong>{nombreDe(cambio.usuario)}</strong> dejará de poder revisar propuestas, gestionar libros publicados y entrar a Administración. Sus propios borradores no se modifican.</>}
          </p>
          <div className="admin-dialogo-acciones">
            <button type="button" className="admin-boton admin-boton--secundario" onClick={() => setCambio(null)} disabled={guardandoId !== null}>Cancelar</button>
            <button ref={botonConfirmar} type="button" className={`admin-boton admin-boton--primario${dandoPermisos ? '' : ' admin-boton--peligro'}`} onClick={() => void confirmarCambio()} disabled={guardandoId !== null}>
              {guardandoId ? 'Guardando…' : dandoPermisos ? 'Dar administración' : 'Quitar administración'}
            </button>
          </div>
        </div>
      </div>}
    </AppLayout>
  )
}
