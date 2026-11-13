import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  FileText,
  LibraryBig,
  Pencil,
  Plus,
  RefreshCw,
  History,
  Share2,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from 'lucide-react'

import AppLayout from '../components/layout/AppLayout'
import ColaboradoresBorrador from '../components/biblioteca/ColaboradoresBorrador'
import HistorialBorrador from '../components/biblioteca/HistorialBorrador'
import { supabase } from '../lib/supabase'
import { enviarBorradorAprobacion } from '../services/libros'
import '../styles/Libros.css'

type BooksTab = 'catalogo' | 'propuestas' | 'compartidos' | 'administracion'

type EstadoLibro = 'pendiente' | 'publicado' | 'oculto' | 'eliminado'

type PropuestaNueva = {
  id: string
  tipo: 'libro_nuevo' | 'modificacion' | 'traduccion'
  estado: string
  pendiente_aprobacion: boolean
  revision_resultante_id?: string | null
  titulo: string
  idioma: string
  autor_id: string
  creado_en: string
  metadatos_libro: {
    codigo?: string
    edicion?: string
    editorial?: string
    clasificacion?: string
  }
}

type VersionLibro = {
  id: string
  idioma: string
  titulo: string
  descripcion: string
}

type Libro = {
  id: string
  codigo: string | null
  edicion: string | null
  editorial: string | null
  clasificacion: string
  creado_por: string
  estado: EstadoLibro
  libro_versiones: VersionLibro[]
}

const tabs: { id: BooksTab; label: string; icon: LucideIcon }[] = [
  { id: 'catalogo', label: 'Catálogo', icon: LibraryBig },
  { id: 'propuestas', label: 'Mis propuestas', icon: FileText },
  { id: 'compartidos', label: 'Compartidos conmigo', icon: BookOpen },
  { id: 'administracion', label: 'Administración', icon: Shield },
]

const etiquetasEstado: Record<EstadoLibro, string> = {
  pendiente: 'Pendiente de aprobación',
  publicado: 'Publicado',
  oculto: 'Oculto',
  eliminado: 'Eliminado',
}

const mensajesEstado: Record<EstadoLibro, string> = {
  pendiente: 'El libro volvió a estar pendiente.',
  publicado: 'El libro está publicado.',
  oculto: 'El libro fue ocultado.',
  eliminado: 'El libro fue enviado a la papelera.',
}

export default function Libros() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<BooksTab>(
    searchParams.get('tab') === 'administracion' ? 'administracion' : searchParams.get('tab') === 'compartidos' ? 'compartidos' : searchParams.get('tab') === 'propuestas' ? 'propuestas' : 'catalogo'
  )
  const [search, setSearch] = useState('')

  const [libros, setLibros] = useState<Libro[]>([])
  const [propuestasNuevas, setPropuestasNuevas] = useState<PropuestaNueva[]>([])
  const [borradoresCompartidos, setBorradoresCompartidos] = useState<(PropuestaNueva & { rolColaborador: 'editor' | 'lector' })[]>([])
  const [borradoresAdministracion, setBorradoresAdministracion] = useState<PropuestaNueva[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [esAdministrador, setEsAdministrador] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [actualizandoId, setActualizandoId] = useState<string | null>(null)
  const [mensajeAdmin, setMensajeAdmin] = useState('')
  const [compartiendoId, setCompartiendoId] = useState<string | null>(null)
  const [historialId, setHistorialId] = useState<string | null>(null)

  const [propuestaParaBorrar, setPropuestaParaBorrar] = useState<{
    id: string
    origen: 'nueva' | 'anterior'
  } | null>(null)


  const librosVisibles = libros.filter((libro) => {
    if (activeTab === 'catalogo') {
      return libro.estado === 'publicado'
    }

    if (activeTab === 'administracion') {
      return esAdministrador && libro.estado !== 'eliminado'
    }

    return false // Las propuestas editables están en 'propuestas'; no mezclar libros publicados.
  })

  const textoBusqueda = search.trim().toLowerCase()

  const librosFiltrados = librosVisibles.filter((libro) => {
    if (!textoBusqueda) return true

    return (
      libro.codigo?.toLowerCase().includes(textoBusqueda) ||
      libro.edicion?.toLowerCase().includes(textoBusqueda) ||
      libro.editorial?.toLowerCase().includes(textoBusqueda) ||
      libro.libro_versiones.some((version) =>
        version.titulo.toLowerCase().includes(textoBusqueda)
      )
    )
  })

  async function cargarLibros() {
    setCargando(true)
    setError('')

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError) throw authError

      const usuario = authData.user

      if (!usuario) {
        setUserId(null)
        setEsAdministrador(false)
        setLibros([])
        setBorradoresAdministracion([])
        setBorradoresCompartidos([])
        return
      }

      setUserId(usuario.id)
      const {data: membresias,error: errorMembresias} = await supabase.from('propuesta_colaboradores').select('propuesta_id,rol').eq('usuario_id',usuario.id)
      if(errorMembresias) throw errorMembresias
      const idsCompartidos = (membresias ?? []).map(m => m.propuesta_id as string)
      if(idsCompartidos.length) {
        const {data: compartidos,error: errorCompartidos} = await supabase.from('propuestas').select('id,tipo,estado,titulo,idioma,autor_id,creado_en,metadatos_libro,pendiente_aprobacion,revision_resultante_id').in('id',idsCompartidos).eq('estado','borrador').order('creado_en',{ascending:false})
        if(errorCompartidos) throw errorCompartidos
        setBorradoresCompartidos(((compartidos ?? []) as PropuestaNueva[]).map(p => ({...p,rolColaborador: (membresias ?? []).find(m=>m.propuesta_id===p.id)?.rol as 'editor'|'lector'})))
      } else setBorradoresCompartidos([])

      const { data: rol, error: errorRol } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', usuario.id)
        .maybeSingle()

      if (errorRol) throw errorRol

      const { data: adminMotor, error: errorAdminMotor } = await supabase.rpc('chronicle_es_admin')
      if (errorAdminMotor) throw errorAdminMotor
      const puedeAdministrar = Boolean(adminMotor) || rol?.role === 'creator' || rol?.role === 'admin'
      setEsAdministrador(puedeAdministrar)
      if (puedeAdministrar) {
        const { data: borradores, error: errorBorradores } = await supabase.rpc('chronicle_listar_propuestas_pendientes')
        if (errorBorradores) throw errorBorradores
        setBorradoresAdministracion((borradores ?? []) as PropuestaNueva[])
      } else {
        setBorradoresAdministracion([])
      }

      const { data, error: errorLibros } = await supabase
        .from('libros')
        .select(
          `
          id,
          codigo,
          edicion,
          editorial,
          clasificacion,
          creado_por,
          estado,
          libro_versiones (
            id,
            idioma,
            titulo,
            descripcion
          )
        `
        )
        .order('creado_en', { ascending: false })

      if (errorLibros) throw errorLibros

      setLibros((data ?? []) as Libro[])
      
      const { data: propuestas, error: errorPropuestas } =
        await supabase
          .from('propuestas')
          .select(`
            id,
            tipo,
            estado,
            titulo,
            idioma,
            autor_id,
            creado_en,
            metadatos_libro,
            pendiente_aprobacion,
            revision_resultante_id
          `)
          .eq('autor_id', usuario.id)
          .order('creado_en', { ascending: false })

      if (errorPropuestas) throw errorPropuestas

      setPropuestasNuevas(
        (propuestas ?? []) as PropuestaNueva[]
      )

    } catch (err) {
      console.error('Error al cargar libros:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los libros.'
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarLibros()
  }, [])

  function changeTab(tab: BooksTab) {
    setActiveTab(tab)
    setSearch('')

    if (tab === 'catalogo') {
      setSearchParams({})
    } else {
      setSearchParams({ tab })
    }
  }


async function borrarPropuesta(
  id: string,
  origen: 'nueva' | 'anterior'
): Promise<boolean> {
  if (actualizandoId || !userId) return false

  setActualizandoId(id)
  setError('')

  try {
    if (origen === 'nueva') {
      const { data, error } = await supabase
        .from('propuestas')
        .delete()
        .eq('id', id)
        .eq('autor_id', userId)
        .eq('estado', 'borrador')
        .select('id')
        .maybeSingle()

      if (error) throw error
      if (!data) {
        throw new Error('No se encontró un borrador que puedas borrar.')
      }

      setPropuestasNuevas((actuales) =>
        actuales.filter((propuesta) => propuesta.id !== id)
      )
    } else {
      const { data, error } = await supabase
        .from('libros')
        .update({ estado: 'eliminado' })
        .eq('id', id)
        .eq('creado_por', userId)
        .eq('estado', 'pendiente')
        .select('id')
        .maybeSingle()

      if (error) throw error
      if (!data) {
        throw new Error('No se encontró una propuesta que puedas borrar.')
      }

      setLibros((actuales) =>
        actuales.map((libro) =>
          libro.id === id ? { ...libro, estado: 'eliminado' } : libro
        )
      )
    }

    return true
  } catch (err) {
    console.error('Error al borrar propuesta:', err)

    setError(
      err instanceof Error
        ? err.message
        : 'No se pudo borrar la propuesta.'
    )

    return false
  } finally {
    setActualizandoId(null)
  }
}


  async function cambiarEstadoLibro(
    libroId: string,
    nuevoEstado: EstadoLibro
  ) {
    if (!esAdministrador || actualizandoId) return

    setActualizandoId(libroId)
    setMensajeAdmin('')
    setError('')

    try {
      const { data, error: errorCambio } = await supabase
        .from('libros')
        .update({ estado: nuevoEstado })
        .eq('id', libroId)
        .select('id, estado')
        .single()

      if (errorCambio) throw errorCambio

      if (!data) {
        throw new Error('No se pudo actualizar el libro.')
      }

      setLibros((actuales) =>
        actuales.map((libro) =>
          libro.id === libroId
            ? { ...libro, estado: data.estado as EstadoLibro }
            : libro
        )
      )

      setMensajeAdmin(mensajesEstado[nuevoEstado])
    } catch (err) {
      console.error('Error al actualizar libro:', err)

      setError(
        err instanceof Error ? err.message : 'No se pudo modificar el libro.'
      )
    } finally {
      setActualizandoId(null)
    }
  }

  async function enviarARevision(propuestaId: string) {
    if (actualizandoId) return
    setActualizandoId(propuestaId)
    setError('')
    try {
      await enviarBorradorAprobacion(propuestaId)
      setPropuestasNuevas(actuales => actuales.map(p => p.id === propuestaId ? { ...p, pendiente_aprobacion: true } : p))
      await cargarLibros()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar a aprobación.')
    } finally {
      setActualizandoId(null)
    }
  }

  async function aprobarBorrador(propuestaId: string) {
    if (!esAdministrador || actualizandoId) return
    setActualizandoId(propuestaId)
    setError('')
    setMensajeAdmin('')
    try {
      const { error: errorAprobacion } = await supabase.rpc('chronicle_aprobar_propuesta', {
        p_propuesta_id: propuestaId,
      })
      if (errorAprobacion) throw errorAprobacion
      setMensajeAdmin('Los cambios del borrador se aprobaron y se sincronizaron con el libro publicado.')
      await cargarLibros()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aprobar el borrador.')
    } finally {
      setActualizandoId(null)
    }
  }

  return (
    <AppLayout title="Libros" subtitle="Explorá los libros de Chronicle">
      <div className="libros">
        <Link to="/biblioteca" className="libros-back">
          <ArrowLeft size={18} />
          Volver a Biblioteca
        </Link>

        <div className="libros-tabs">
          {tabs
            .filter((tab) => tab.id !== 'administracion' || esAdministrador)
            .map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`libros-tab ${
                  activeTab === id ? 'libros-tab--active' : ''
                }`}
                onClick={() => changeTab(id)}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
        </div>

        {activeTab === 'propuestas' && (
          <div className="libros-propuestas-header">
            <div>
              <h2>Mis propuestas</h2>
              <p>Gestioná los libros que querés incorporar a Chronicle.</p>
            </div>

            <Link
              to="/biblioteca/libros/nueva-propuesta"
              className="libros-new-button"
            >
              <Plus size={18} />
              Nueva propuesta
            </Link>
          </div>
        )}

        <div className="libros-search">
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              activeTab === 'catalogo'
                ? 'Buscar libros...'
                : activeTab === 'administracion' ? 'Buscar pendientes...' : activeTab === 'compartidos' ? 'Buscar compartidos...' : 'Buscar mis borradores...'
            }
            aria-label="Buscar"
          />
        </div>

        {esAdministrador && (
          <div className="libros-admin-info">
            <ShieldCheck size={18} />
            <span>Tenés permisos de administración.</span>
          </div>
        )}

        {mensajeAdmin && (
          <p className="libros-admin-message" role="status">
            {mensajeAdmin}
          </p>
        )}

        {error && (
          <p className="libros-admin-error" role="alert">
            {error}
          </p>
        )}

        {cargando ? (
          <div className="libros-empty">
            <RefreshCw size={32} />
            <p>Cargando libros...</p>
          </div>
        ) : error ? (
          <div className="libros-empty">
            <h2>No se pudieron cargar los libros</h2>
            <p role="alert">{error}</p>
            <button type="button" onClick={cargarLibros}>
              Reintentar
            </button>
          </div>
        ) : librosFiltrados.length === 0 &&
        !(activeTab === 'administracion' && borradoresAdministracion.some(p => !textoBusqueda || p.titulo.toLowerCase().includes(textoBusqueda) || p.metadatos_libro?.codigo?.toLowerCase().includes(textoBusqueda))) &&
        !(activeTab === 'compartidos' && borradoresCompartidos.some(p=>!textoBusqueda || p.titulo.toLowerCase().includes(textoBusqueda))) &&
        !(activeTab === 'propuestas' &&
          propuestasNuevas.some((propuesta) => {
            if (propuesta.estado !== 'borrador') return false
            if (!textoBusqueda) return true

            return (
              propuesta.titulo.toLowerCase().includes(textoBusqueda) ||
              propuesta.metadatos_libro?.codigo
                ?.toLowerCase()
                .includes(textoBusqueda)
            )
          })) ? (
          <div className="libros-empty">
            {activeTab === 'catalogo' ? (
              <>
                <BookOpen size={46} strokeWidth={1.4} />
                <h2>No hay libros disponibles</h2>
                <p>Los libros publicados aparecerán en este catálogo.</p>
              </>
            ) : (
              <>
                <FileText size={46} strokeWidth={1.4} />
                <h2>No se encontraron propuestas</h2>
                <p>Podés crear una desde Nueva propuesta.</p>
              </>
            )}
          </div>
        ) : (
          <div className="libros-lista">
            {activeTab === 'administracion' && borradoresAdministracion
              .filter(p => !textoBusqueda || p.titulo.toLowerCase().includes(textoBusqueda) || p.metadatos_libro?.codigo?.toLowerCase().includes(textoBusqueda))
              .map(propuesta => (
                <article className="libros-item" key={`admin-borrador-${propuesta.id}`}>
                  <div className="libros-item-icon"><FileText size={24}/></div>
                  <div className="libros-item-info">
                    <h3>{propuesta.titulo || 'Libro sin título'}</h3>
                    <p>{propuesta.metadatos_libro?.editorial || 'Sin editorial'}</p>
                    <div className="libros-item-details">
                      <span>{propuesta.revision_resultante_id ? 'Borrador con copia publicada' : 'Borrador sin publicar'}</span>
                      <span>{propuesta.idioma.toUpperCase()}</span>
                      {propuesta.metadatos_libro?.codigo && <span>{propuesta.metadatos_libro.codigo}</span>}
                    </div>
                  </div>
                  <div className="libros-admin-actions">
                    <button type="button" className="libros-admin-button libros-admin-button--approve"
                      disabled={actualizandoId !== null}
                      onClick={() => void aprobarBorrador(propuesta.id)}>
                      <CheckCircle2 size={16}/> {actualizandoId === propuesta.id ? 'Guardando...' : propuesta.revision_resultante_id ? 'Aprobar cambios' : 'Aprobar y publicar'}
                    </button>
                  </div>
                </article>
              ))}

                      
            {activeTab === 'propuestas' &&
              propuestasNuevas
                .filter((propuesta) => propuesta.estado === 'borrador')
                .filter((propuesta) => {
                  if (!textoBusqueda) return true

                  return (
                    propuesta.titulo.toLowerCase().includes(textoBusqueda) ||
                    propuesta.metadatos_libro?.codigo
                      ?.toLowerCase()
                      .includes(textoBusqueda)
                  )
                })
                .map((propuesta) => (
                  <article
                    key={`propuesta-${propuesta.id}`}
                    className="libros-item"
                  >
                    <div className="libros-item-icon">
                      <FileText size={24} />
                    </div>

                    <div className="libros-item-info">
                      <h3>{propuesta.titulo}</h3>

                      <p>
                        {propuesta.metadatos_libro?.editorial ||
                          'Sin editorial'}
                      </p>

                      <div className="libros-item-details">
                        <span>{propuesta.idioma.toUpperCase()}</span>
                        <span>{propuesta.pendiente_aprobacion ? 'Pendiente de aprobación' : propuesta.revision_resultante_id ? 'Versión aprobada / Sin cambios enviados' : 'Sin enviar a aprobación'}</span>
                      </div>
                    </div>
                                      
                  {propuesta.estado === 'borrador' && (
                    <div className="libros-admin-actions">
                      {!propuesta.pendiente_aprobacion && <button type="button" className="libros-admin-button libros-admin-button--approve libros-icon-action" title="Enviar a aprobación" aria-label="Enviar a aprobación" disabled={actualizandoId !== null} onClick={() => void enviarARevision(propuesta.id)}><ClipboardCheck size={18} aria-hidden="true" /></button>}
                      <button type="button" className="libros-admin-button libros-icon-action" title={compartiendoId === propuesta.id ? 'Cerrar compartir' : 'Compartir'} aria-label={compartiendoId === propuesta.id ? 'Cerrar compartir' : 'Compartir'} aria-expanded={compartiendoId === propuesta.id} onClick={() => setCompartiendoId(actual => actual === propuesta.id ? null : propuesta.id)}><Share2 size={18} aria-hidden="true" /></button>
                      <button type="button" className="libros-admin-button libros-icon-action" title="Historial" aria-label="Historial" aria-expanded={historialId === propuesta.id} onClick={() => setHistorialId(actual => actual === propuesta.id ? null : propuesta.id)}><History size={18} aria-hidden="true" /></button>
                      <Link
                        to={`/biblioteca/libros/editar-borrador/${propuesta.id}`}
                        className="libros-admin-button libros-icon-action"
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil size={18} aria-hidden="true" />
                      </Link>
                      
                      <button
                        type="button"
                        className="libros-admin-button libros-admin-button--delete libros-icon-action"
                        title="Borrar"
                        aria-label="Borrar"
                        disabled={actualizandoId !== null}
                        onClick={() =>
                          setPropuestaParaBorrar({
                            id: propuesta.id,
                            origen: 'nueva'
                          })
                        }
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </button>

                    </div>
                  )}
                  {compartiendoId === propuesta.id && <ColaboradoresBorrador propuestaId={propuesta.id} onClose={() => setCompartiendoId(null)} />}
                  {historialId === propuesta.id && <HistorialBorrador propuestaId={propuesta.id} puedeRestaurar={!propuesta.pendiente_aprobacion} onClose={() => setHistorialId(null)} onRestaurado={() => void cargarLibros()} />}

                  </article>
                ))}

            {activeTab === 'compartidos' && borradoresCompartidos
              .filter(p=>!textoBusqueda || p.titulo.toLowerCase().includes(textoBusqueda))
              .map(p=><article className="libros-item" key={p.id}>
                <div className="libros-item-icon"><FileText size={24}/></div>
                <div className="libros-item-info"><h3>{p.titulo || 'Libro sin título'}</h3><p>{p.metadatos_libro?.editorial || 'Sin editorial'}</p><div className="libros-item-details"><span>{p.idioma.toUpperCase()}</span><span>{p.rolColaborador === 'editor' ? 'Editora' : 'Lectora'}</span><span>{p.pendiente_aprobacion ? 'Pendiente de aprobación' : 'Borrador compartido'}</span></div></div>
                <div className="libros-admin-actions"><Link className="libros-admin-button libros-icon-action" to={`/biblioteca/libros/editar-borrador/${p.id}`} title={p.rolColaborador === 'editor' ? 'Editar' : 'Ver borrador'} aria-label={p.rolColaborador === 'editor' ? 'Editar' : 'Ver borrador'}>{p.rolColaborador === 'editor' ? <Pencil size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</Link><button type="button" className="libros-admin-button libros-icon-action" title="Historial" aria-label="Historial" aria-expanded={historialId === p.id} onClick={() => setHistorialId(actual => actual === p.id ? null : p.id)}><History size={18} aria-hidden="true" /></button></div>
                {historialId === p.id && <HistorialBorrador propuestaId={p.id} puedeRestaurar={p.rolColaborador === 'editor' && !p.pendiente_aprobacion} onClose={() => setHistorialId(null)} onRestaurado={() => void cargarLibros()} />}
              </article>)}

            {librosFiltrados.map((libro) => (
              <article key={libro.id} className="libros-item">
                <div className="libros-item-icon">
                  <BookOpen size={24} />
                </div>

                <div className="libros-item-info">
                  <h3>
                    {libro.libro_versiones[0]?.titulo ??
                      'Libro sin título disponible'}
                  </h3>

                  <p>
                    {libro.editorial || 'Sin editorial'}
                    {libro.edicion ? ` · Edición ${libro.edicion}` : ''}
                  </p>

                  <div className="libros-item-details">
                    {libro.codigo && <span>{libro.codigo}</span>}

                    {libro.libro_versiones.map((version) => (
                      <span key={version.id}>
                        {version.idioma.toUpperCase()}
                      </span>
                    ))}

                    <span>{etiquetasEstado[libro.estado]}</span>
                  </div>
                </div>

                {libro.estado === 'publicado' && activeTab !== 'administracion' && (
                  <Link to={`/biblioteca/libros/leer/${libro.id}`} className="libros-admin-button"><BookOpen size={16}/> Leer libro</Link>
                )}

                {activeTab === 'propuestas' &&
                  libro.estado === 'pendiente' &&
                  libro.creado_por === userId && (
                    <div className="libros-admin-actions">
                      <Link
                        to={`/biblioteca/libros/editar-propuesta/${libro.id}`}
                        className="libros-admin-button"
                      >
                        <Pencil size={16} />
                        Editar
                      </Link>

                      <button
                        type="button"
                        className="libros-admin-button libros-admin-button--delete"
                        disabled={actualizandoId !== null}
                        onClick={() =>
                          setPropuestaParaBorrar({ id: libro.id, origen: 'anterior' })
                        }
                      >
                        <Trash2 size={16} />
                        Borrar
                      </button>
                    </div>
                  )}

                {activeTab === 'administracion' && esAdministrador && (
                  <div className="libros-admin-actions">
                    {libro.estado !== 'publicado' && (
                      <button
                        type="button"
                        className="libros-admin-button libros-admin-button--approve"
                        disabled={actualizandoId !== null}
                        onClick={() =>
                          cambiarEstadoLibro(libro.id, 'publicado')
                        }
                      >
                        <CheckCircle2 size={16} />
                        {libro.estado === 'pendiente' ? 'Aprobar' : 'Publicar'}
                      </button>
                    )}

                    {libro.estado === 'publicado' && (
                      <button
                        type="button"
                        className="libros-admin-button"
                        disabled={actualizandoId !== null}
                        onClick={() => cambiarEstadoLibro(libro.id, 'oculto')}
                      >
                        <EyeOff size={16} />
                        Ocultar
                      </button>
                    )}

                    {libro.estado === 'oculto' && (
                      <button
                        type="button"
                        className="libros-admin-button"
                        disabled={actualizandoId !== null}
                        onClick={() =>
                          cambiarEstadoLibro(libro.id, 'pendiente')
                        }
                      >
                        <Eye size={16} />
                        Volver a pendiente
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {propuestaParaBorrar && (
        <div
          className="libros-modal-overlay"
          onClick={() => setPropuestaParaBorrar(null)}
        >
          <div
            className="libros-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="libros-modal-titulo"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="libros-modal-titulo">
              ¿Seguro que querés borrar esta propuesta?
            </h2>

            <div className="libros-modal-actions">
              <button
                type="button"
                className="libros-modal-no"
                disabled={actualizandoId !== null}
                onClick={() => setPropuestaParaBorrar(null)}
              >
                No
              </button>

              <button
                type="button"
                className="libros-modal-si"
                disabled={actualizandoId !== null}

              onClick={async () => {
                if (!propuestaParaBorrar) return

                const borrado = await borrarPropuesta(
                  propuestaParaBorrar.id,
                  propuestaParaBorrar.origen
                )

                if (borrado) setPropuestaParaBorrar(null)
              }}

              >
                {actualizandoId !== null ? 'Borrando...' : 'Sí'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}