
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  FileText,
  LibraryBig,
  Plus,
  Search,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  EyeOff,
  Eye,
  Shield,
  Pencil,
  Trash2,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
import '../styles/Libros.css'

type BooksTab = 'catalogo' | 'propuestas' | 'administracion'
type EstadoLibro =
  | 'pendiente'
  | 'publicado'
  | 'oculto'
  | 'eliminado'

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

const etiquetasEstado: Record<EstadoLibro, string> = {
  pendiente: 'Pendiente de aprobación',
  publicado: 'Publicado',
  oculto: 'Oculto',
  eliminado: 'Eliminado',
}

export default function Libros() {

  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<BooksTab>(
    searchParams.get('tab') === 'propuestas'
      ? 'propuestas'
      : 'catalogo'
  )

  const [search, setSearch] = useState('')
  const [libros, setLibros] = useState<Libro[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [esAdministrador, setEsAdministrador] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [actualizandoId, setActualizandoId] = useState<string | null>(null)
  const [mensajeAdmin, setMensajeAdmin] = useState('')
  const [propuestaParaBorrar, setPropuestaParaBorrar] = useState<string | null>(null)

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
        return
      }

      setUserId(usuario.id)

      const { data: rol, error: errorRol } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', usuario.id)
        .maybeSingle()

      if (errorRol) throw errorRol

      setEsAdministrador(
        rol?.role === 'creator' || rol?.role === 'admin'
      )

      const { data, error: errorLibros } = await supabase
        .from('libros')
        .select(`
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
        `)
        .order('creado_en', { ascending: false })

      if (errorLibros) throw errorLibros

      setLibros((data ?? []) as Libro[])
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



  const librosVisibles = libros.filter((libro) => {
    if (activeTab === 'catalogo') {
      return libro.estado === 'publicado'
    }

    if (activeTab === 'administracion') {
      return (
        esAdministrador &&
        libro.estado !== 'eliminado'
      )
    }

    return (
      libro.creado_por === userId &&
      libro.estado !== 'eliminado'
    )
  })


  const librosFiltrados = librosVisibles.filter((libro) => {
    const texto = search.trim().toLowerCase()

    if (!texto) return true

    return (
      libro.codigo?.toLowerCase().includes(texto) ||
      libro.edicion?.toLowerCase().includes(texto) ||
      libro.editorial?.toLowerCase().includes(texto) ||
      libro.libro_versiones.some((version) =>
        version.titulo.toLowerCase().includes(texto)
      )
    )
  })

async function borrarPropuesta(libroId: string) {
  if (actualizandoId || !userId) return
  setActualizandoId(libroId)
  setError('')

  try {
    const { data, error: errorBorrado } = await supabase
      .from('libros')
      .update({ estado: 'eliminado' })
      .eq('id', libroId)
      .eq('creado_por', userId)
      .eq('estado', 'pendiente')
      .select('id')
      .single()

    if (errorBorrado) throw errorBorrado

    if (!data) {
      throw new Error('No se pudo borrar la propuesta.')
    }

    setLibros((actuales) =>
      actuales.map((libro) =>
        libro.id === libroId
          ? { ...libro, estado: 'eliminado' }
          : libro
      )
    )
  } catch (err) {
    console.error('Error al borrar propuesta:', err)

    setError(
      err instanceof Error
        ? err.message
        : 'No se pudo borrar la propuesta.'
    )
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

    const mensajes: Record<EstadoLibro, string> = {
      pendiente: 'El libro volvió a estar pendiente.',
      publicado: 'El libro está publicado.',
      oculto: 'El libro fue ocultado.',
      eliminado: 'El libro fue enviado a la papelera.',
    }

    setMensajeAdmin(mensajes[nuevoEstado])
  } catch (err) {
    console.error('Error al actualizar libro:', err)
    setError(
      err instanceof Error
        ? err.message
        : 'No se pudo modificar el libro.'
    )
  } finally {
    setActualizandoId(null)
  }
}


  return (
    <AppLayout
      title="Libros"
      subtitle="Explorá los libros de Chronicle"
    >
      <div className="libros">
        <Link to="/biblioteca" className="libros-back">
          <ArrowLeft size={18} />
          Volver a Biblioteca
        </Link>

        <div className="libros-tabs">
          <button
            type="button"
            className={`libros-tab ${
              activeTab === 'catalogo'
                ? 'libros-tab--active'
                : ''
            }`}
            onClick={() => changeTab('catalogo')}
          >
            <LibraryBig size={18} />
            Catálogo
          </button>

          <button
            type="button"
            className={`libros-tab ${
              activeTab === 'propuestas'
                ? 'libros-tab--active'
                : ''
            }`}
            onClick={() => changeTab('propuestas')}
          >
            <FileText size={18} />
            Mis propuestas
          </button>
          
          {esAdministrador && (
            <button
              type="button"
              className={`libros-tab ${
                activeTab === 'administracion'
                  ? 'libros-tab--active'
                  : ''
              }`}
              onClick={() => changeTab('administracion')}
            >
              <Shield size={18} />
              Administración
            </button>
          )}

        </div>

        {activeTab === 'propuestas' && (
          <div className="libros-propuestas-header">
            <div>
              <h2>Mis propuestas</h2>
              <p>
                Gestioná los libros que querés incorporar
                a Chronicle.
              </p>
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
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder={
              activeTab === 'catalogo'
                ? 'Buscar libros...'
                : 'Buscar mis propuestas...'
            }
            aria-label="Buscar"
          />
        </div>

        {esAdministrador && (
          <div className="libros-admin-info">
            <ShieldCheck size={18} />
            <span>
              Tenés permisos de administración.
            </span>
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
        ) : librosFiltrados.length === 0 ? (
          <div className="libros-empty">
            {activeTab === 'catalogo' ? (
              <>
                <BookOpen size={46} strokeWidth={1.4} />
                <h2>No hay libros disponibles</h2>
                <p>
                  Los libros publicados aparecerán
                  en este catálogo.
                </p>
              </>
            ) : (
              <>
                <FileText size={46} strokeWidth={1.4} />
                <h2>No se encontraron propuestas</h2>
                <p>
                  Podés crear una desde Nueva propuesta.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="libros-lista">
            {librosFiltrados.map((libro) => (
              <article
                key={libro.id}
                className="libros-item"
              >
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
                    {libro.edicion
                      ? ` · Edición ${libro.edicion}`
                      : ''}
                  </p>

                  <div className="libros-item-details">
                    {libro.codigo && (
                      <span>{libro.codigo}</span>
                    )}

                    {libro.libro_versiones.map((version) => (
                      <span key={version.id}>
                        {version.idioma.toUpperCase()}
                      </span>
                    ))}

                    <span>
                      {etiquetasEstado[libro.estado]}
                    </span>
                  </div>
                </div>
                

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
        onClick={() => setPropuestaParaBorrar(libro.id)}
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
        {libro.estado === 'pendiente'
          ? 'Aprobar'
          : 'Publicar'}
      </button>
    )}

    {libro.estado === 'publicado' && (
      <button
        type="button"
        className="libros-admin-button"
        disabled={actualizandoId !== null}
        onClick={() =>
          cambiarEstadoLibro(libro.id, 'oculto')
        }
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
            await borrarPropuesta(propuestaParaBorrar)
            setPropuestaParaBorrar(null)
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
