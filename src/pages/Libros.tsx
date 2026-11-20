import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Undo2,
  XCircle,
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
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from 'lucide-react'

import AppLayout from '../components/layout/AppLayout'
import ColaboradoresBorrador from '../components/biblioteca/ColaboradoresBorrador'
import HistorialBorrador from '../components/biblioteca/HistorialBorrador'
import HistorialAprobaciones from '../components/biblioteca/HistorialAprobaciones'
import ModalBorrador from '../components/biblioteca/ModalBorrador'
import { supabase } from '../lib/supabase'
import { crearPropuestaCorreccion, enviarBorradorAprobacion, retirarDeAprobacion } from '../services/libros'
import '../styles/biblioteca/Libros.css'
import { useLanguage } from '../i18n/useLanguage'
import type { TranslationKey } from '../i18n/translations'
import { invalidarPendientesRevision } from '../hooks/usePendientesRevision'

type BooksTab = 'catalogo' | 'propuestas' | 'compartidos' | 'administracion'

type EstadoLibro = 'pendiente' | 'publicado' | 'oculto' | 'eliminado' | 'rechazado'

type PropuestaNueva = {
  id: string
  tipo: 'libro_nuevo' | 'modificacion' | 'traduccion'
  estado: string
  pendiente_aprobacion: boolean
  revision_resultante_id?: string | null
  motivo_resolucion?: string | null
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
  motivo_rechazo: string | null
  libro_versiones: VersionLibro[]
}

const tabs: { id: Exclude<BooksTab, 'administracion'>; label: TranslationKey; icon: LucideIcon }[] = [
  { id: 'catalogo', label: 'books.catalog', icon: LibraryBig },
  { id: 'propuestas', label: 'books.proposals', icon: FileText },
  { id: 'compartidos', label: 'books.shared', icon: BookOpen },
]

const mensajesEstado: Record<EstadoLibro, string> = {
  pendiente: 'El libro volvió a estar pendiente.',
  publicado: 'El libro está publicado.',
  oculto: 'El libro fue ocultado.',
  eliminado: 'El libro fue enviado a la papelera.',
  rechazado: 'El libro fue rechazado.',
}

type Props = {
  /** 'administracion': la revisión de libros, que se abre desde Gestión y no es una pestaña de Libros. */
  modo?: 'biblioteca' | 'administracion'
}

/** Pestaña de la biblioteca según ?tab=. La revisión ya no es una pestaña de Libros. */
function pestanaDeUrl(tab: string | null): BooksTab {
  return tab === 'compartidos' || tab === 'propuestas' ? tab : 'catalogo'
}

export default function Libros({ modo = 'biblioteca' }: Props) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useLanguage()
  const enAdministracion = modo === 'administracion'

  const [activeTab, setActiveTab] = useState<BooksTab>(
    enAdministracion ? 'administracion' : pestanaDeUrl(searchParams.get('tab'))
  )
  const [search, setSearch] = useState('')
  const [filtroAdministracion, setFiltroAdministracion] = useState<'pendientes'|'publicados'|'ocultos'|'borrados'>(() => { const valor = searchParams.get('seccion'); return valor === 'publicados' || valor === 'ocultos' || valor === 'borrados' ? valor : 'pendientes' })

  const [libros, setLibros] = useState<Libro[]>([])
  const [propuestasNuevas, setPropuestasNuevas] = useState<PropuestaNueva[]>([])
  const [borradoresCompartidos, setBorradoresCompartidos] = useState<(PropuestaNueva & { rolColaborador: 'editor' | 'lector' })[]>([])
  const [borradoresAdministracion, setBorradoresAdministracion] = useState<PropuestaNueva[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [esAdministrador, setEsAdministrador] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [actualizandoId, setActualizandoId] = useState<string | null>(null)
  const [propuestaParaEnviar, setPropuestaParaEnviar] = useState<string | null>(null)
  async function proponerCorreccion(libroId: string, versionId: string) {
    if (actualizandoId) return
    setActualizandoId(libroId)
    setError('')
    try {
      const propuestaId = await crearPropuestaCorreccion(libroId, versionId)
      navigate(`/biblioteca/libros/editar-borrador/${propuestaId}?origen=${activeTab}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la copia editable.')
    } finally {
      setActualizandoId(null)
    }
  }

  const [mensajeAdmin, setMensajeAdmin] = useState('')
  const [avisoCerrado, setAvisoCerrado] = useState(false)
  useEffect(() => {
    setAvisoCerrado(false)
    if (!mensajeAdmin && !error) return
    const temporizador = window.setTimeout(() => setAvisoCerrado(true), 5500)
    return () => window.clearTimeout(temporizador)
  }, [mensajeAdmin, error])
  const [compartiendoId, setCompartiendoId] = useState<string | null>(null)
  const [historialId, setHistorialId] = useState<string | null>(null)
  const [historialAprobacionId, setHistorialAprobacionId] = useState<string | null>(null)
  const [rechazandoLibroId,setRechazandoLibroId] = useState<string | null>(null)
  const [motivoRechazo,setMotivoRechazo] = useState('')
  const [gestionLibro, setGestionLibro] = useState<{id:string; accion:'ocultar'|'mostrar'|'eliminar'|'restaurar'; titulo:string}|null>(null)
  const [motivoGestion, setMotivoGestion] = useState('')

  const [propuestaParaBorrar, setPropuestaParaBorrar] = useState<{
    id: string
    origen: 'nueva' | 'anterior'
  } | null>(null)


  const librosVisibles = libros.filter((libro) => {
    if (activeTab === 'catalogo') {
      return libro.estado === 'publicado'
    }

    if (activeTab === 'administracion') {
      return esAdministrador && libro.estado === ({pendientes:'pendiente',publicados:'publicado',ocultos:'oculto',borrados:'eliminado'} as const)[filtroAdministracion]
    }

    if (activeTab === 'propuestas') return libro.creado_por === userId && (libro.estado === 'pendiente' || libro.estado === 'rechazado')
    return false // No mezclar libros publicados.
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
        const {data: compartidos,error: errorCompartidos} = await supabase.from('propuestas').select('id,tipo,estado,titulo,idioma,autor_id,creado_en,metadatos_libro,pendiente_aprobacion,revision_resultante_id,motivo_resolucion').in('id',idsCompartidos).eq('estado','borrador').order('creado_en',{ascending:false})
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
          motivo_rechazo,
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
            revision_resultante_id,
            motivo_resolucion
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
    // La carga corre como callback de una promesa: el efecto no actualiza estado de forma síncrona.
    void Promise.resolve().then(cargarLibros)
  }, [])

  useEffect(() => {
    setActiveTab(enAdministracion ? 'administracion' : pestanaDeUrl(searchParams.get('tab')))
    const seccion = searchParams.get('seccion')
    setFiltroAdministracion(seccion === 'publicados' || seccion === 'ocultos' || seccion === 'borrados' ? seccion : 'pendientes')
  }, [searchParams, enAdministracion])

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
      const { error } = await supabase.rpc('chronicle_borrar_borrador', { p_propuesta_id: id })
      if (error) throw error

      setPropuestasNuevas((actuales) =>
        actuales.filter((propuesta) => propuesta.id !== id)
      )
    } else {
      const { error } = await supabase.rpc('chronicle_eliminar_libro_propio', {
        p_libro_id: id,
      })

      if (error) throw error

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
      // Solo se aprueba un libro pendiente; el cambio lo valida la base (chronicle_aprobar_libro).
      if (nuevoEstado !== 'publicado') throw new Error('Ese cambio de estado se hace desde Ocultar, Mostrar o Borrar.')
      const { data, error: errorCambio } = await supabase.rpc('chronicle_aprobar_libro', { p_libro_id: libroId })

      if (errorCambio) throw errorCambio

      if (!data) {
        throw new Error('No se pudo actualizar el libro.')
      }

      setLibros((actuales) =>
        actuales.map((libro) =>
          libro.id === libroId
            ? { ...libro, estado: data as EstadoLibro }
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

  async function ejecutarGestionLibro() {
    if (!gestionLibro || !esAdministrador || actualizandoId || !motivoGestion.trim()) return
    setActualizandoId(gestionLibro.id)
    setError('')
    setMensajeAdmin('')
    try {
      const { data, error: errorGestion } = await supabase.rpc('chronicle_gestionar_estado_libro', {
        p_libro_id: gestionLibro.id, p_accion: gestionLibro.accion, p_motivo: motivoGestion.trim()
      })
      if (errorGestion) throw errorGestion
      const estado = data as EstadoLibro
      setLibros(actuales => actuales.map(libro => libro.id === gestionLibro.id ? {...libro, estado} : libro))
      setMensajeAdmin(mensajesEstado[estado])
      setGestionLibro(null)
      setMotivoGestion('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo gestionar el libro.')
    } finally { setActualizandoId(null) }
  }

  async function enviarARevision(propuestaId: string) {
    if (actualizandoId) return
    setActualizandoId(propuestaId)
    setError('')
    try {
      await enviarBorradorAprobacion(propuestaId)
      setPropuestaParaEnviar(null)
      setPropuestasNuevas(actuales => actuales.map(p => p.id === propuestaId ? { ...p, pendiente_aprobacion: true } : p))
      await cargarLibros()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar a aprobación.')
    } finally {
      setActualizandoId(null)
    }
  }

  async function actualizarBaseBorrador(propuestaId: string) {
    if (actualizandoId) return
    setActualizandoId(propuestaId)
    setError('')
    setMensajeAdmin('')
    try {
      const { data, error: fallo } = await supabase.rpc('chronicle_actualizar_base_borrador', { p_propuesta_id: propuestaId })
      if (fallo) throw fallo
      setMensajeAdmin(`Borrador sincronizado con la revisión publicada ${data}. Tus cambios propios se conservaron.`)
      await cargarLibros()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la base del borrador.')
    } finally {
      setActualizandoId(null)
    }
  }

  async function retirarDeRevision(propuestaId: string) {
    if (actualizandoId) return
    setActualizandoId(propuestaId)
    setError('')
    try {
      await retirarDeAprobacion(propuestaId)
      setPropuestasNuevas(actuales => actuales.map(p => p.id === propuestaId ? { ...p, pendiente_aprobacion: false } : p))
      await cargarLibros()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo retirar de aprobación.')
    } finally {
      setActualizandoId(null)
    }
  }

  async function rechazarLibro() {
    if(!esAdministrador||!rechazandoLibroId||actualizandoId||!motivoRechazo.trim())return
    setActualizandoId(rechazandoLibroId);setError('')
    try {
      const {error:err}=await supabase.rpc('chronicle_rechazar_libro',{p_libro_id:rechazandoLibroId,p_motivo:motivoRechazo.trim()})
      if(err)throw err
      invalidarPendientesRevision()
      setRechazandoLibroId(null);setMotivoRechazo('')
      setMensajeAdmin('Libro rechazado. El motivo quedó disponible para su autor en Mis propuestas.')
      await cargarLibros()
    } catch(e){setError(e instanceof Error?e.message:'No se pudo rechazar el libro.')}
    finally{setActualizandoId(null)}
  }

  // Enlaces viejos a la revisión dentro de Libros: se mandan a la nueva ruta.
  if (!enAdministracion && searchParams.get('tab') === 'administracion') {
    const seccion = searchParams.get('seccion')
    return <Navigate to={`/administracion/revision${seccion ? `?seccion=${encodeURIComponent(seccion)}` : ''}`} replace />
  }
  // La revisión es solo para administración; Supabase vuelve a validar cada acción.
  if (enAdministracion && !cargando && !error && !esAdministrador) return <Navigate to="/home" replace />

  return (
    <AppLayout
      title={enAdministracion ? t('books.admin') : t('books.title')}
      subtitle={enAdministracion ? undefined : t('books.subtitle')}
    >
      <div className="libros">
        {!enAdministracion && <div className="libros-tabs">
          {tabs
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
                {t(label)}
              </button>
            ))}
        </div>}

        {activeTab === 'propuestas' && (
          <div className="libros-propuestas-header">
            <div>
              <h2>{t('books.proposals')}</h2>
              <p>{t('books.manage')}</p>
            </div>

            <Link
              to="/biblioteca/libros/nueva-propuesta?origen=propuestas"
              className="libros-new-button"
            >
              <Plus size={18} />
              {t('books.new')}
            </Link>
          </div>
        )}

        {activeTab === 'administracion' && esAdministrador && (
          <div className="libros-tabs" aria-label="Secciones de administración">
            {([
              ['pendientes','Pendientes de aprobación'],
              ['publicados','Libros publicados'],
              ['ocultos','Libros ocultos'],
              ['borrados','Libros borrados']
            ] as const).map(([clave, nombre]) => (
              <button key={clave} type="button" className={`libros-tab ${filtroAdministracion === clave ? 'libros-tab--active' : ''}`} onClick={() => {setFiltroAdministracion(clave);setSearch('');setSearchParams({seccion:clave})}}>{nombre}</button>
            ))}
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
                ? t('books.searchCatalog')
                : activeTab === 'administracion' ? t('books.searchAdmin') : activeTab === 'compartidos' ? t('books.searchShared') : t('books.searchDrafts')
            }
            aria-label={t('books.search')}
          />
        </div>

        {esAdministrador && (
          <div className="libros-admin-info libros-admin-info--escritorio">
            <ShieldCheck size={18} />
            <span>{t('books.adminAccess')}</span>
          </div>
        )}

        {!avisoCerrado && (error || mensajeAdmin) && (
          <div className={`libros-toast ${error ? 'libros-toast--error' : 'libros-toast--success'}`} role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'}>
            {error ? <XCircle size={20} aria-hidden="true" /> : <CheckCircle2 size={20} aria-hidden="true" />}
            <span>{error || mensajeAdmin}</span>
            <button type="button" className="libros-toast__close" onClick={() => setAvisoCerrado(true)} aria-label="Cerrar aviso">×</button>
          </div>
        )}

        {cargando ? (
          <div className="libros-empty">
            <RefreshCw size={32} />
            <p>{t('books.loading')}</p>
          </div>
        ) : error ? (
          <div className="libros-empty">
            <h2>{t('books.loadError')}</h2>
            <p role="alert">{error}</p>
            <button type="button" onClick={cargarLibros}>
              Reintentar
            </button>
          </div>
        ) : librosFiltrados.length === 0 &&
        !(activeTab === 'administracion' && filtroAdministracion === 'pendientes' && borradoresAdministracion.some(p => !textoBusqueda || p.titulo.toLowerCase().includes(textoBusqueda) || p.metadatos_libro?.codigo?.toLowerCase().includes(textoBusqueda))) &&
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
                <h2>{t('books.emptyCatalog')}</h2>
                <p>{t('books.emptyCatalogDescription')}</p>
              </>
            ) : (
              <>
                <FileText size={46} strokeWidth={1.4} />
                <h2>{t('books.emptyProposals')}</h2>
                <p>{t('books.emptyProposalsDescription')}</p>
              </>
            )}
          </div>
        ) : (
          <div className="libros-lista">
            {activeTab === 'administracion' && filtroAdministracion === 'pendientes' && borradoresAdministracion
              .filter(p => !textoBusqueda || p.titulo.toLowerCase().includes(textoBusqueda) || p.metadatos_libro?.codigo?.toLowerCase().includes(textoBusqueda))
              .map(propuesta => (
                <article className="libros-item" key={`admin-borrador-${propuesta.id}`}>
                  <div className="libros-item-icon"><FileText size={24}/></div>
                  <div className="libros-item-info">
                    <h3>{propuesta.titulo || t('books.untitled')}</h3>
                    <p>{propuesta.metadatos_libro?.editorial || t('books.noPublisher')}</p>
                    <div className="libros-item-details">
                      <span>{propuesta.revision_resultante_id ? t('books.draftPublished') : t('books.draftUnpublished')}</span>
                      <span>{propuesta.idioma.toUpperCase()}</span>
                      {propuesta.metadatos_libro?.codigo && <span>{propuesta.metadatos_libro.codigo}</span>}
                    </div>
                  </div>
                  <div className="libros-admin-actions">
                    {propuesta.pendiente_aprobacion && <button type="button" className="libros-admin-button" onClick={() => navigate(`/biblioteca/libros/revision/${propuesta.id}`)}><BookOpen size={16}/> Revisar contenido</button>}

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
                        <span>{propuesta.pendiente_aprobacion ? t('books.pending') : propuesta.revision_resultante_id ? t('books.approvedNoChanges') : t('books.unsent')}</span>
                        {!propuesta.pendiente_aprobacion && propuesta.motivo_resolucion && <span className="libros-rechazo-motivo">{t('books.rejectedPrefix')} {propuesta.motivo_resolucion}</span>}
                      </div>
                    </div>
                                      
                  {propuestaParaEnviar === propuesta.id && (
                    <ModalBorrador titulo="Enviar a aprobación" onClose={() => setPropuestaParaEnviar(null)}>
                      <p>Chronicle detectará automáticamente los elementos agregados, modificados y retirados. No hace falta redactar los cambios.</p>
                      <button type="button" className="libros-admin-button libros-admin-button--approve"
                        disabled={actualizandoId !== null}
                        onClick={() => void enviarARevision(propuesta.id)}>
                        Confirmar envío
                      </button>
                    </ModalBorrador>
                  )}
                  {propuesta.estado === 'borrador' && (
                    <div className="libros-admin-actions libros-admin-actions--borrador">
                      <details className="libros-menu-borrador">
                        <summary className="libros-admin-button" aria-label="Acciones del borrador">Acciones ▾</summary>
                        <div className="libros-menu-borrador__opciones">
                          {!propuesta.pendiente_aprobacion && <button type="button" className="libros-admin-button" disabled={actualizandoId !== null} onClick={() => setPropuestaParaEnviar(propuesta.id)}><ClipboardCheck size={16}/> Enviar a aprobación</button>}
                          {propuesta.pendiente_aprobacion && <button type="button" className="libros-admin-button" disabled={actualizandoId !== null} onClick={() => void retirarDeRevision(propuesta.id)}><Undo2 size={16}/> Sacar de aprobación</button>}
                          <button type="button" className="libros-admin-button" onClick={() => setCompartiendoId(propuesta.id)}><Share2 size={16}/> Compartir</button>
                          <button type="button" className="libros-admin-button" onClick={() => setHistorialId(propuesta.id)}><History size={16}/> Historial de versiones</button>
                          <button type="button" className="libros-admin-button" onClick={() => setHistorialAprobacionId(propuesta.id)}><History size={16}/> Historial de aprobaciones</button>
                          {propuesta.tipo === 'modificacion' && <button type="button" className="libros-admin-button" disabled={actualizandoId !== null || propuesta.pendiente_aprobacion} title={propuesta.pendiente_aprobacion ? 'Primero sacá la propuesta de aprobación' : 'Integrar los cambios de la versión publicada'} onClick={() => void actualizarBaseBorrador(propuesta.id)}><RefreshCw size={16}/> Actualizar desde versión publicada</button>}
                          <Link to={`/biblioteca/libros/leer-borrador/${propuesta.id}?origen=propuestas`} className="libros-admin-button"><BookOpen size={16}/> Lectura del libro</Link>
                        </div>
                      </details>
                      <Link to={`/biblioteca/libros/editar-borrador/${propuesta.id}?origen=propuestas`} className="libros-admin-button libros-admin-button--editar" title="Editar borrador"><Pencil size={16}/> Editar borrador</Link>
                      <button type="button" className="libros-admin-button libros-admin-button--delete" disabled={actualizandoId !== null || propuesta.pendiente_aprobacion} title={propuesta.pendiente_aprobacion ? 'Primero sacá la propuesta de aprobación' : 'Borrar borrador'} onClick={() => setPropuestaParaBorrar({id:propuesta.id,origen:'nueva'})}><Trash2 size={16}/> Borrar borrador</button>
                    </div>
                  )}
                  {compartiendoId === propuesta.id && <ModalBorrador titulo={t('books.shareDraft')} onClose={() => setCompartiendoId(null)}><ColaboradoresBorrador propuestaId={propuesta.id} onClose={() => setCompartiendoId(null)} /></ModalBorrador>}
                  {historialAprobacionId === propuesta.id && <ModalBorrador titulo="Historial de aprobaciones" onClose={() => setHistorialAprobacionId(null)}><HistorialAprobaciones propuestaId={propuesta.id}/></ModalBorrador>}
                  {historialId === propuesta.id && <ModalBorrador titulo={t('books.versionHistory')} onClose={() => setHistorialId(null)}><HistorialBorrador propuestaId={propuesta.id} puedeRestaurar={!propuesta.pendiente_aprobacion} onClose={() => setHistorialId(null)} onRestaurado={() => void cargarLibros()} /></ModalBorrador>}

                  </article>
                ))}

            {activeTab === 'compartidos' && borradoresCompartidos
              .filter(p=>!textoBusqueda || p.titulo.toLowerCase().includes(textoBusqueda))
              .map(p=><article className="libros-item" key={p.id}>
                <div className="libros-item-icon"><FileText size={24}/></div>
                <div className="libros-item-info"><h3>{p.titulo || t('books.untitled')}</h3><p>{p.metadatos_libro?.editorial || t('books.noPublisher')}</p><div className="libros-item-details"><span>{p.idioma.toUpperCase()}</span><span>{p.rolColaborador === 'editor' ? t('books.editorRole') : t('books.readerRole')}</span><span>{p.pendiente_aprobacion ? t('books.pending') : t('books.sharedDraft')}</span></div></div>
                <div className="libros-admin-actions"><Link className="libros-admin-button libros-icon-action" to={`/biblioteca/libros/leer-borrador/${p.id}?origen=compartidos`} title={t('books.read')} aria-label={t('books.read')}><BookOpen size={18} aria-hidden="true" /></Link><Link className="libros-admin-button libros-icon-action" to={`/biblioteca/libros/editar-borrador/${p.id}?origen=compartidos`} title={p.rolColaborador === 'editor' ? t('books.edit') : t('books.viewDraft')} aria-label={p.rolColaborador === 'editor' ? t('books.edit') : t('books.viewDraft')}>{p.rolColaborador === 'editor' ? <Pencil size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</Link><button type="button" className="libros-admin-button libros-icon-action" title={t('books.history')} aria-label={t('books.history')} aria-expanded={historialId === p.id} onClick={() => setHistorialId(actual => actual === p.id ? null : p.id)}><History size={18} aria-hidden="true" /></button></div>
                {historialId === p.id && <ModalBorrador titulo={t('books.versionHistory')} onClose={() => setHistorialId(null)}><HistorialBorrador propuestaId={p.id} puedeRestaurar={p.rolColaborador === 'editor' && !p.pendiente_aprobacion} onClose={() => setHistorialId(null)} onRestaurado={() => void cargarLibros()} /></ModalBorrador>}
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
                    {libro.editorial || t('books.noPublisher')}
                    {libro.edicion ? ` · ${t('books.edition')} ${libro.edicion}` : ''}
                  </p>

                  <div className="libros-item-details">
                    {libro.codigo && <span>{libro.codigo}</span>}

                    {libro.libro_versiones.map((version) => (
                      <span key={version.id}>
                        {version.idioma.toUpperCase()}
                      </span>
                    ))}

                    <span>{t(({pendiente:'books.pending',publicado:'books.published',oculto:'books.hidden',eliminado:'books.deleted',rechazado:'books.rejected'} as const)[libro.estado])}</span>
                  </div>
                </div>

                {activeTab === 'propuestas' && libro.estado === 'rechazado' && libro.motivo_rechazo && <p className="libros-rechazo-motivo">{t('books.rejectionReason')} {libro.motivo_rechazo}</p>}

                {libro.estado === 'publicado' && activeTab !== 'administracion' && (
                  <Link to={`/biblioteca/libros/leer/${libro.id}`} className="libros-admin-button"><BookOpen size={16}/> Leer libro</Link>
                )}
                {libro.estado === 'publicado' && activeTab === 'catalogo' && (
                  <div className="libros-admin-actions">
                    {libro.libro_versiones.map((version) => (
                      <button
                        key={version.id}
                        type="button"
                        className="libros-admin-button"
                        disabled={actualizandoId !== null}
                        onClick={() => void proponerCorreccion(libro.id, version.id)}
                      >
                        <Pencil size={16} />
                        {actualizandoId === libro.id ? 'Creando copia...' : `Proponer corrección (${version.idioma.toUpperCase()})`}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'propuestas' &&
                  (libro.estado === 'pendiente' || libro.estado === 'rechazado') &&
                  libro.creado_por === userId && (
                    <div className="libros-admin-actions">
                      <Link
                        to={`/biblioteca/libros/editar-propuesta/${libro.id}?origen=propuestas`}
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
                    {libro.estado === 'pendiente' && (
                      <button type="button" className="libros-admin-button libros-admin-button--approve" disabled={actualizandoId !== null} onClick={() => cambiarEstadoLibro(libro.id,'publicado')}>
                        <CheckCircle2 size={16}/> Aprobar
                      </button>
                    )}
                    {libro.estado === 'pendiente' && (
                      <button type="button" className="libros-admin-button libros-admin-button--delete" disabled={actualizandoId !== null} onClick={() => {setRechazandoLibroId(libro.id);setMotivoRechazo('')}}><XCircle size={16}/> Rechazar</button>
                    )}

                    {libro.estado === 'publicado' && <Link to={`/biblioteca/libros/leer/${libro.id}?origen=administracion&seccion=${filtroAdministracion}`} className="libros-admin-button"><BookOpen size={16}/> Leer</Link>}
                    {libro.estado === 'publicado' && <button type="button" className="libros-admin-button" disabled={actualizandoId !== null} onClick={() => {setGestionLibro({id:libro.id,accion:'ocultar',titulo:libro.libro_versiones[0]?.titulo??libro.codigo??'Libro'});setMotivoGestion('')}}><EyeOff size={16}/> Ocultar</button>}
                    {libro.estado === 'oculto' && <button type="button" className="libros-admin-button" disabled={actualizandoId !== null} onClick={() => {setGestionLibro({id:libro.id,accion:'mostrar',titulo:libro.libro_versiones[0]?.titulo??libro.codigo??'Libro'});setMotivoGestion('')}}><Eye size={16}/> Volver a mostrar</button>}
                    {(libro.estado === 'publicado'||libro.estado === 'oculto') && <button type="button" className="libros-admin-button libros-admin-button--delete" disabled={actualizandoId !== null} onClick={() => {setGestionLibro({id:libro.id,accion:'eliminar',titulo:libro.libro_versiones[0]?.titulo??libro.codigo??'Libro'});setMotivoGestion('')}}><Trash2 size={16}/> Borrar</button>}
                    {libro.estado === 'eliminado' && <button type="button" className="libros-admin-button" disabled={actualizandoId !== null} onClick={() => {setGestionLibro({id:libro.id,accion:'restaurar',titulo:libro.libro_versiones[0]?.titulo??libro.codigo??'Libro'});setMotivoGestion('')}}><Undo2 size={16}/> Restaurar como oculto</button>}

                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {gestionLibro && <ModalBorrador titulo="Gestionar libro publicado" onClose={() => setGestionLibro(null)}>
        <div className="libros-rechazo-modal">
          <h3>{gestionLibro.titulo}</h3>
          <p>{gestionLibro.accion === 'eliminar' ? '¿Querés borrar este libro? Se conservarán sus versiones y su historial, pero dejará de estar disponible para los usuarios comunes.' : gestionLibro.accion === 'restaurar' ? 'El libro se restaurará como oculto. Podrás volver a mostrarlo después.' : gestionLibro.accion === 'ocultar' ? 'El libro dejará de estar visible en el catálogo.' : 'El libro volverá a estar visible en el catálogo.'}</p>
          <label htmlFor="motivo-gestion-libro">Motivo obligatorio</label>
          <textarea id="motivo-gestion-libro" rows={4} maxLength={2000} value={motivoGestion} onChange={e => setMotivoGestion(e.target.value)}/>
          <div className="libros-admin-actions">
            <button type="button" className="libros-admin-button" onClick={() => setGestionLibro(null)}>Cancelar</button>
            <button type="button" className="libros-admin-button libros-admin-button--approve" disabled={!motivoGestion.trim() || actualizandoId !== null} onClick={() => void ejecutarGestionLibro()}>{gestionLibro.accion === 'eliminar' ? 'Confirmar borrado' : `Confirmar ${gestionLibro.accion}`}</button>
          </div>
        </div>
      </ModalBorrador>}
      {rechazandoLibroId && <ModalBorrador titulo="Rechazar libro" onClose={()=>setRechazandoLibroId(null)}>
        <div className="libros-rechazo-modal"><h3>{t('books.rejectBook')}</h3><p>{t('books.rejectBookInfo')}</p>
        <label htmlFor="motivo-rechazo-libro">{t('books.reason')}</label>
        <textarea id="motivo-rechazo-libro" rows={5} maxLength={2000} value={motivoRechazo} onChange={e=>setMotivoRechazo(e.target.value)} placeholder={t('books.reasonPlaceholder')} />
        {error&&<p role="alert">{error}</p>}
        <div className="libros-admin-actions"><button type="button" className="libros-admin-button" onClick={()=>setRechazandoLibroId(null)}>{t('books.cancel')}</button><button type="button" className="libros-admin-button libros-admin-button--delete" disabled={!motivoRechazo.trim()||actualizandoId!==null} onClick={()=>void rechazarLibro()}>{t('books.confirmReject')}</button></div></div>
      </ModalBorrador>}

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
              ¿Seguro que querés borrar este borrador? Se conservará el registro, pero dejará de aparecer entre tus borradores.
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