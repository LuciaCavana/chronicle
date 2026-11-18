import { crearMaestrias, crearPropiedadesArma, crearMonedas, crearReglasArmas, type CaracteristicaLibro } from '../types/caracteristicaLibro'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookPlus, ChevronRight } from 'lucide-react'

import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
// Se importa antes de los componentes para conservar el orden de la cascada
import '../styles/biblioteca/NuevaPropuesta.css'
import ContenidoLibro from '../components/biblioteca/ContenidoLibro'
import EspecieForm from '../components/biblioteca/EspecieForm'
import TrasfondoForm from '../components/biblioteca/TrasfondoForm'
import CriaturaForm from '../components/biblioteca/CriaturaForm'
import type { Criatura } from '../types/criatura'
import DoteForm from '../components/biblioteca/DoteForm'
import type { Trasfondo } from '../types/trasfondo'
import type { Dote } from '../types/trasfondo'
import ConjuroForm from '../components/biblioteca/ConjuroForm'
import ClaseForm from '../components/biblioteca/ClaseForm'
import SubclaseForm from '../components/biblioteca/SubclaseForm'
import ObjetoForm from '../components/biblioteca/ObjetoForm'
import type { Elemento } from '../services/chronicleLibros'
import RevisionLibro from '../components/biblioteca/RevisionLibro'

import {
  actualizarLibro,
  guardarPropuesta,
  listarVersionesPublicadas,
  obtenerLibroParaEditar,
  obtenerPropuestaParaEditar,
  guardarElementosCompartidos,
  retirarDeAprobacion,
} from '../services/libros'

import type { Conjuro } from '../types/conjuro'
import type { Especie } from '../types/especie'

type TipoPropuesta = 'nuevo' | 'traduccion'
type VersionPublicada = Awaited<ReturnType<typeof listarVersionesPublicadas>>[number]

const pasos = ['Información general', 'Contenido', 'Revisión']

const categories = [
  { id: 'especies', label: 'Especies' },
  { id: 'clases', label: 'Clases' },
  { id: 'subclases', label: 'Subclases' },
  { id: 'trasfondos', label: 'Trasfondos' },
  { id: 'criaturas', label: 'Monstruos y criaturas' },
  { id: 'dotes', label: 'Dotes' },
  { id: 'conjuros', label: 'Conjuros' },
  { id: 'objetos', label: 'Objetos y equipo' },
  { id: 'reglas', label: 'Reglas' },
  { id: 'otras', label: 'Otras opciones y características' },
]

const idiomas = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'pt', label: 'Portugués' },
  { value: 'fr', label: 'Francés' },
  { value: 'de', label: 'Alemán' },
  { value: 'it', label: 'Italiano' },
]

const clasificaciones = [
  { value: 'source', label: 'Source' },
  { value: 'partnered', label: 'Partnered' },
  { value: 'other', label: 'Other' },
  { value: 'homebrew', label: 'Homebrew' },
]

export default function NuevaPropuesta() {
  const navigate = useNavigate()

  const { libroId, propuestaId } = useParams<{
    libroId: string
    propuestaId: string
  }>()

  const modoEdicionAnterior = Boolean(libroId)
  const modoEdicionBorrador = Boolean(propuestaId)
  const modoEdicion = modoEdicionAnterior || modoEdicionBorrador


  // Tipo de propuesta
  const [tipoPropuesta, setTipoPropuesta] = useState<TipoPropuesta>('nuevo')
  const [libroOriginalId, setLibroOriginalId] = useState('')
  const [versionesPublicadas, setVersionesPublicadas] = useState<VersionPublicada[]>([])
  const [errorVersiones, setErrorVersiones] = useState('')

  useEffect(() => {
    // Las clases externas también se necesitan al crear o editar borradores normales.
    if (tipoPropuesta === 'traduccion' && modoEdicion) return
    let activo = true
    void listarVersionesPublicadas().then(versiones => {
      if (activo) { setVersionesPublicadas(versiones); setErrorVersiones('') }
    }).catch(error => {
      if (activo) setErrorVersiones(error instanceof Error ? error.message : 'No se pudieron cargar los libros publicados.')
    })
    return () => { activo = false }
  }, [tipoPropuesta, modoEdicion])

  function seleccionarOrigen(versionId: string) {
    setLibroOriginalId(versionId)
    const origen = versionesPublicadas.find(version => version.id === versionId)
    if (!origen) return
    setTitle(origen.titulo ?? '')
    setBookCode(origen.codigo ?? '')
    setEdition(origen.edicion ?? '')
    setPublisher(origen.editorial ?? '')
    setBookType(origen.clasificacion ?? '')
    setDescription(origen.descripcion ?? '')
    setSelectedCategories(origen.categorias ?? [])
    setEspecies((origen.especies ?? []) as Especie[])
    setConjuros((origen.conjuros ?? []) as Conjuro[])
    setClases((origen.clases ?? []) as Elemento[])
    setSubclases((origen.subclases ?? []) as Elemento[])
    setObjetos((origen.objetos ?? []) as Elemento[])
    setCaracteristicas([]) // Las versiones publicadas aún no almacenan características.
    setDotes([])
    setTrasfondos([])
    setCriaturas([])
    if (idioma === origen.idioma) setIdioma(idiomas.find(item => item.value !== origen.idioma)?.value ?? idioma)
  }

  // Información general
  const [title, setTitle] = useState('')
  const [bookCode, setBookCode] = useState('')
  const [edition, setEdition] = useState('')
  const [publisher, setPublisher] = useState('')
  const [bookType, setBookType] = useState('')
  const [description, setDescription] = useState('')
  const [idioma, setIdioma] = useState('es')

  // Contenido
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [especies, setEspecies] = useState<Especie[]>([])
  const [conjuros, setConjuros] = useState<Conjuro[]>([])
  const [dotes, setDotes] = useState<Dote[]>([])
  const [trasfondos, setTrasfondos] = useState<Trasfondo[]>([])
  const [criaturas, setCriaturas] = useState<Criatura[]>([])
  const [editingCriaturaId, setEditingCriaturaId] = useState<string | null>(null)
  const [showCriaturaForm, setShowCriaturaForm] = useState(false)
  const [editingTrasfondoId, setEditingTrasfondoId] = useState<string | null>(null)
  const [showTrasfondoForm, setShowTrasfondoForm] = useState(false)
  const [editingDoteId, setEditingDoteId] = useState<string | null>(null)
  const [showDoteForm, setShowDoteForm] = useState(false)
  const [editingConjuroId, setEditingConjuroId] = useState<string | null>(null)
  const [showConjuroForm, setShowConjuroForm] = useState(false)
  const [clases, setClases] = useState<Elemento[]>([])
  const [subclases, setSubclases] = useState<Elemento[]>([])
  const [objetos, setObjetos] = useState<Elemento[]>([])
  // Las clases externas se consultan solo de versiones publicadas.
  // Los objetos creados dentro de una clase también forman parte del catálogo del libro.
  const actualizarClaseConObjetos = (actualizada: Elemento) => {
    setClases(actuales => actuales.map(c => c.id === actualizada.id ? actualizada : c))
    const catalogo = (actualizada.datos as { objetosCatalogo?: { id: string; nombre: string; descripcion?: string; tipo?: string }[] }).objetosCatalogo
    if (!Array.isArray(catalogo)) return
    setObjetos(actuales => {
      const existentes = new Set(actuales.map(o => o.id))
      const nuevos = catalogo.filter(o => o.id && o.nombre?.trim() && !existentes.has(o.id))
        .map(o => ({
          id: o.id, tipo: 'objeto', nombre: o.nombre, descripcion: o.descripcion ?? '',
          datos: { tipo: o.tipo === 'arma' ? 'arma' : 'equipo', rareza: 'Sin rareza', moneda: 'PO', magico: false },
        } as Elemento))
      return nuevos.length ? [...actuales, ...nuevos] : actuales
    })
  }
  const clasesExternas = versionesPublicadas.flatMap(version =>
    ((version.clases ?? []) as Elemento[]).filter((clase: Elemento) => clase.id && clase.nombre).map((clase: Elemento) => ({
      ...clase,
      libroOrigenId: version.libroId,
      versionOrigenId: version.id,
      libroOrigenTitulo: version.titulo,
    }))
  )
  const clasesDisponiblesSubclase = [...clases, ...clasesExternas.filter(clase => !clases.some(local => local.id === clase.id))]
  const claseValidaSubclase = (claseId: string) => clasesDisponiblesSubclase.some(clase => clase.id === claseId)

  const [caracteristicas, setCaracteristicas] = useState<CaracteristicaLibro[]>([])
  const [editingCaracteristicaId, setEditingCaracteristicaId] = useState<string | null>(null)
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null)
  const [editingSubclassId, setEditingSubclassId] = useState<string | null>(null)
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  const [showEspecieForm, setShowEspecieForm] = useState(false)
  const [editingSpeciesId, setEditingSpeciesId] = useState<string | null>(null)

  // Navegación entre pasos
  const [currentStep, setCurrentStep] = useState(1)

  // Carga (modo edición)
  const [cargandoLibro, setCargandoLibro] = useState(modoEdicion)
  const [errorCarga, setErrorCarga] = useState('')
  const [versionId, setVersionId] = useState<string | null>(null)
  const [rowVersion, setRowVersion] = useState<number | null>(null)
  const baseColaborativa = useRef<Record<string, unknown> | null>(null)
  const [versionRemota, setVersionRemota] = useState<number | null>(null)
  const [accesoCompartido, setAccesoCompartido] = useState<'propietario' | 'editor' | 'lector'>('propietario')
  const [pendienteAprobacion, setPendienteAprobacion] = useState(false)
  const [retirando, setRetirando] = useState(false)
  const [errorRetiro, setErrorRetiro] = useState('')

  // Eventos del servidor: aviso inmediato al guardarse una versión nueva.
  useEffect(() => {
    if (!propuestaId || rowVersion === null) return
    const canal = supabase.channel(`chronicle-borrador-${propuestaId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'propuestas', filter: `id=eq.${propuestaId}` }, payload => {
        const nuevaVersion = (payload.new as { row_version?: number }).row_version
        if (typeof nuevaVersion === 'number' && nuevaVersion > rowVersion) {
          setVersionRemota(nuevaVersion)
        }
      })
      .subscribe()
    return () => { void supabase.removeChannel(canal) }
  }, [propuestaId, rowVersion])

  // Consulta liviana para advertir guardados ajenos sin reemplazar ediciones locales.
  useEffect(() => {
    if (!propuestaId || rowVersion === null) return
    let activo = true
    const revisar = async () => {
      const { data, error } = await supabase.from('propuestas')
        .select('row_version').eq('id', propuestaId).maybeSingle()
      if (!activo || error || !data) return
      if (data.row_version > rowVersion) setVersionRemota(data.row_version)
    }
    void revisar()
    const intervalo = window.setInterval(() => { void revisar() }, 5000)
    return () => { activo = false; window.clearInterval(intervalo) }
  }, [propuestaId, rowVersion])

  // Guardado
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!libroId && !propuestaId) return

    let cancelado = false

    async function cargarLibro() {
      setCargandoLibro(true)
      setVersionId(null)
      setErrorCarga('')


  try {
    if (propuestaId) {
      const propuesta = await obtenerPropuestaParaEditar(propuestaId)
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Tenés que iniciar sesión.')
      if (propuesta.autor_id !== auth.user.id) {
        const {data: membresia,error: errorMembresia} = await supabase.from('propuesta_colaboradores').select('rol').eq('propuesta_id',propuestaId).eq('usuario_id',auth.user.id).single()
        if(errorMembresia || !membresia) throw new Error('No tenés acceso a este borrador.')
        setAccesoCompartido(membresia.rol as 'editor' | 'lector')
      } else setAccesoCompartido('propietario')

      if (cancelado) return

      const metadatos = propuesta.metadatos_libro as {
        codigo?: string
        edicion?: string
        editorial?: string
        clasificacion?: string
      }

      const contenido = propuesta.contenido as {
        especies?: Especie[]
        conjuros?: Conjuro[]
        dotes?: Dote[]
        trasfondos?: Trasfondo[]
        criaturas?: Criatura[]
        clases?: Elemento[]
        subclases?: Elemento[]
        objetos?: Elemento[]
        caracteristicas?: CaracteristicaLibro[]
      }

      setTitle(propuesta.titulo ?? '')
      setBookCode(metadatos.codigo ?? '')
      setEdition(metadatos.edicion ?? '')
      setPublisher(metadatos.editorial ?? '')
      setBookType(metadatos.clasificacion ?? '')
      setDescription(propuesta.descripcion ?? '')
      setIdioma(propuesta.idioma ?? 'es')
      setSelectedCategories(propuesta.categorias ?? [])
      setEspecies(contenido.especies ?? [])
      setConjuros(contenido.conjuros ?? [])
      setDotes(contenido.dotes ?? [])
      setTrasfondos(contenido.trasfondos ?? [])
      setCriaturas(contenido.criaturas ?? [])
      setClases(contenido.clases ?? [])
      setSubclases(contenido.subclases ?? [])
      setObjetos(contenido.objetos ?? [])
      setCaracteristicas(contenido.caracteristicas ?? [])
      baseColaborativa.current = {
        row_version: propuesta.row_version,
        titulo: propuesta.titulo ?? '',
        descripcion: propuesta.descripcion ?? '',
        idioma: propuesta.idioma ?? 'es',
        categorias: propuesta.categorias ?? [],
        metadatos_libro: propuesta.metadatos_libro ?? {},
        contenido: propuesta.contenido ?? {},
      }
      setRowVersion(propuesta.row_version)
      setPendienteAprobacion(Boolean(propuesta.pendiente_aprobacion))
      setTipoPropuesta('nuevo')
      setCurrentStep(1)

      return
    }

    if (!libroId) return

    const libro = await obtenerLibroParaEditar(libroId)


        if (cancelado) return

        const versiones = libro.libro_versiones ?? []
        const version =
          versiones.find((item) => item.idioma === 'es') ?? versiones[0]

        if (!version) {
          throw new Error('El libro no tiene una versión disponible.')
        }

        setVersionId(version.id)
        setTitle(version.titulo ?? '')
        setBookCode(libro.codigo ?? '')
        setEdition(libro.edicion ?? '')
        setPublisher(libro.editorial ?? '')
        setBookType(libro.clasificacion ?? '')
        setDescription(version.descripcion ?? '')
        setIdioma(version.idioma ?? 'es')
        setSelectedCategories(version.categorias ?? [])
        setEspecies((version.especies ?? []) as Especie[])
        setConjuros((version.conjuros ?? []) as Conjuro[])
        setDotes([]) // Las versiones publicadas aún no almacenan dotes.
        setTrasfondos([]) // Pendiente de publicación.
        setCriaturas([]) // Pendiente de publicación.
        setClases((version.clases ?? []) as Elemento[])
        setSubclases((version.subclases ?? []) as Elemento[])
        setObjetos((version.objetos ?? []) as Elemento[])
        setCaracteristicas([]) // Las versiones publicadas aún no almacenan características.
        setTipoPropuesta('nuevo')
        setCurrentStep(1)
      } catch (error) {
        if (cancelado) return

        setErrorCarga(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la propuesta.'
        )
      } finally {
        if (!cancelado) {
          setCargandoLibro(false)
        }
      }
    }

    cargarLibro()

    return () => {
      cancelado = true
    }
  }, [libroId, propuestaId])
  const activeCategories = categories.filter((category) =>
    selectedCategories.includes(category.id)
  )

  function toggleCategory(id: string) {
    setSelectedCategories((current) =>
      current.includes(id)
        ? current.filter((category) => category !== id)
        : [...current, id]
    )
  }

  function abrirFormularioEspecie(id: string | null) {
    setEditingSpeciesId(id)
    setShowEspecieForm(true)
  }

  function cerrarFormularioEspecie() {
    setShowEspecieForm(false)
    setEditingSpeciesId(null)
  }

  function guardarEspecie(especie: Especie) {
    setEspecies((actuales) => {
      const existe = actuales.some((item) => item.id === especie.id)

      return existe
        ? actuales.map((item) => (item.id === especie.id ? especie : item))
        : [...actuales, especie]
    })

    cerrarFormularioEspecie()
  }

  function eliminarEspecie(id: string) {
    setEspecies((actuales) => actuales.filter((especie) => especie.id !== id))
  }

  function guardarCriatura(criatura: Criatura) {
    setCriaturas(actuales => actuales.some(c => c.id === criatura.id) ? actuales.map(c => c.id === criatura.id ? criatura : c) : [...actuales, criatura])
    setShowCriaturaForm(false)
    setEditingCriaturaId(null)
  }

  function guardarTrasfondo(trasfondo: Trasfondo) {
    setTrasfondos(actuales => actuales.some(t => t.id === trasfondo.id) ? actuales.map(t => t.id === trasfondo.id ? trasfondo : t) : [...actuales, trasfondo])
    setShowTrasfondoForm(false)
    setEditingTrasfondoId(null)
  }

  function guardarDote(dote: Dote) {
    setDotes(actuales => actuales.some(d => d.id === dote.id) ? actuales.map(d => d.id === dote.id ? dote : d) : [...actuales, dote])
    setShowDoteForm(false)
    setEditingDoteId(null)
  }

  function guardarConjuro(conjuro: Conjuro) {
    setConjuros(actuales => actuales.some(c => c.id === conjuro.id) ? actuales.map(c => c.id === conjuro.id ? conjuro : c) : [...actuales, conjuro])
    setShowConjuroForm(false)
    setEditingConjuroId(null)
  }

  function crearConjuro(conjuro: Conjuro) {
    setConjuros((actuales) => [...actuales, conjuro])
    setSelectedCategories((actuales) =>
      actuales.includes('conjuros') ? actuales : [...actuales, 'conjuros']
    )
  }

  async function handleRetirarAprobacion() {
    if (!propuestaId || retirando) return
    setRetirando(true)
    setErrorRetiro('')
    try {
      await retirarDeAprobacion(propuestaId)
      setPendienteAprobacion(false)
    } catch (error) {
      setErrorRetiro(
        error instanceof Error ? error.message : 'No se pudo retirar el borrador de aprobación.'
      )
    } finally {
      setRetirando(false)
    }
  }

  async function handleGuardarLibro() {
    if (guardando || cargandoLibro || accesoCompartido === 'lector' || pendienteAprobacion) {
      return
    }

    if (objetos.some(o => !o.nombre.trim())) { setErrorGuardado('Todos los objetos deben tener nombre.'); setCurrentStep(2); return }
    if (subclases.some(s => !s.nombre.trim() || !claseValidaSubclase((s.datos as {claseId?: string}).claseId ?? ''))) { setErrorGuardado('Cada subclase debe tener nombre y una clase principal válida.'); setCurrentStep(2); return }
    if (clases.some(clase => !clase.nombre.trim())) {
      setErrorGuardado('Todas las clases deben tener un nombre antes de guardar.')
      setCurrentStep(2)
      return
    }

    if (tipoPropuesta === 'traduccion') {
      const origen = versionesPublicadas.find(version => version.id === libroOriginalId)
      if (!modoEdicion && !origen) { setErrorGuardado('Seleccioná un libro publicado como origen.'); return }
      if (origen && origen.idioma === idioma) { setErrorGuardado('La traducción debe tener un idioma distinto del original.'); return }
    }

    if (!title.trim() || !bookType || !idioma) {
      setErrorGuardado('Completá los campos obligatorios.')
      return
    }


    if (modoEdicionAnterior && (!libroId || !versionId)) {
      setErrorGuardado(
        'No se pudo identificar la propuesta que querés editar.'
      )
      return
    }

    if (
      modoEdicionBorrador &&
      (!propuestaId || rowVersion === null)
    ) {
      setErrorGuardado(
        'No se pudo identificar el borrador que querés editar.'
      )
      return
    }


    setGuardando(true)
    setErrorGuardado('')

    try {
      const datos = {
        codigo: bookCode.trim(),
        edicion: edition.trim(),
        editorial: publisher.trim(),
        clasificacion: bookType,
        idioma,
        titulo: title.trim(),
        descripcion: description.trim(),
        categorias: selectedCategories,
        especies,
        conjuros,
        dotes,
        trasfondos,
        criaturas,
        clases,
        subclases,
        objetos,
        caracteristicas,
      }

      if (modoEdicionBorrador && propuestaId && rowVersion !== null) {
        if (!baseColaborativa.current) throw new Error('No se pudo recuperar la versión original del borrador.')
        await guardarElementosCompartidos(propuestaId, baseColaborativa.current, {
          row_version: rowVersion,
          titulo: datos.titulo,
          descripcion: datos.descripcion,
          idioma: datos.idioma,
          categorias: datos.categorias,
          metadatos_libro: { codigo: datos.codigo, edicion: datos.edicion, editorial: datos.editorial, clasificacion: datos.clasificacion },
          contenido: { especies, conjuros, dotes, trasfondos, criaturas, clases, subclases, objetos, caracteristicas },
        })
      } else if (modoEdicionAnterior && libroId && versionId) {
        await actualizarLibro(libroId, versionId, datos)
      } else {
        const origen = versionesPublicadas.find(version => version.id === libroOriginalId)
        if (tipoPropuesta === 'traduccion' && !origen) throw new Error('Seleccioná una versión publicada como origen.')
        await guardarPropuesta(datos, origen ? { libroId: origen.libroId, versionId: origen.id } : undefined)
      }


      navigate(accesoCompartido === 'editor' ? '/biblioteca/libros?tab=compartidos' : '/biblioteca/libros?tab=propuestas')
    } catch (error) {
      console.error('Error al guardar el libro:', error)

      setErrorGuardado(
        error instanceof Error ? error.message : 'No se pudo guardar el libro.'
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <AppLayout
      title={modoEdicion ? 'Editar propuesta' : 'Nueva propuesta'}
      subtitle="Proponé un libro para la Biblioteca de Chronicle"
      volverA={accesoCompartido === 'propietario' ? '/biblioteca/libros?tab=propuestas' : '/biblioteca/libros?tab=compartidos'}
    >
      <div className="nueva-propuesta">
        {cargandoLibro && (
          <p className="nueva-propuesta-help">Cargando propuesta...</p>
        )}

        {versionRemota !== null && (
          <div role="alert" style={{ border: '1px solid #d8b77b', borderRadius: 10, background: '#342d24', color: '#f0dfbd', padding: 16, marginBottom: 16 }}>
            <strong>Otro colaborador guardó una versión nueva de este borrador.</strong>
            <p>Tu edición local no se reemplazó. No guardes encima de los cambios ajenos: el sistema rechazará una versión desactualizada. Para ver la versión nueva, abrí el borrador en otra pestaña. Recargar esta pestaña descartará tus cambios sin guardar.</p>
          </div>
        )}
        {errorCarga && (
          <p role="alert" style={{ color: '#e57373' }}>
            {errorCarga}
          </p>
        )}

        {modoEdicionBorrador && accesoCompartido !== 'propietario' && <p className="nueva-propuesta-help" role="status">Borrador compartido · {accesoCompartido === 'editor' ? 'Permiso de edición' : 'Solo lectura'}</p>}
        {modoEdicionBorrador && pendienteAprobacion && accesoCompartido !== 'lector' ? (
          <section className="nueva-propuesta-panel" role="status">
            <h3>{title}</h3>
            <p>
              Este borrador está enviado a aprobación. Para editarlo tenés que
              retirarlo de la revisión; después vas a tener que volver a enviarlo.
            </p>
            {errorRetiro && (
              <p role="alert" style={{ color: '#e57373' }}>{errorRetiro}</p>
            )}
            <button
              type="button"
              className="nueva-propuesta-next"
              disabled={retirando}
              onClick={() => void handleRetirarAprobacion()}
            >
              {retirando ? 'Retirando...' : 'Retirar de aprobación y editar'}
            </button>
          </section>
        ) : accesoCompartido === 'lector' ? <section className="nueva-propuesta-panel"><h3>{title}</h3><p>{description || 'Sin descripción.'}</p><p>Categorías: {selectedCategories.join(', ') || 'Sin categorías'}</p><p>Este borrador está compartido en modo lectura. No podés modificarlo ni enviarlo a aprobación.</p></section> : <>
        <div className="nueva-propuesta-heading">
          <BookPlus size={28} />
          <div>
            <h2>
              {modoEdicion
                ? 'Editar propuesta de libro'
                : 'Nueva propuesta de libro'}
            </h2>
            <p>Completá la información del libro que querés proponer.</p>
          </div>
        </div>

        <ol className="nueva-propuesta-steps" aria-label="Pasos de la propuesta">
          {pasos.map((titulo, index) => (
            <li
              key={titulo}
              className={
                currentStep === index + 1 ? 'nueva-propuesta-step--active' : currentStep > index + 1 ? 'nueva-propuesta-step--hecho' : ''
              }
              aria-current={currentStep === index + 1 ? 'step' : undefined}
            >
              <span className="nueva-propuesta-step-numero" aria-hidden="true">{index + 1}</span>
              <span className="nueva-propuesta-step-titulo">{titulo}</span>
            </li>
          ))}
        </ol>

        {currentStep === 1 && (
          <>
            <section className="nueva-propuesta-panel">
              <h3>Tipo de propuesta</h3>

              <div className="nueva-propuesta-field">
                <label htmlFor="tipo-propuesta">¿Qué querés agregar?</label>

                <select
                  id="tipo-propuesta"
                  value={tipoPropuesta}
                  onChange={(event) => {
                    setTipoPropuesta(event.target.value as TipoPropuesta)
                    setLibroOriginalId('')
                  }}
                >
                  <option value="nuevo">Un libro nuevo</option>
                  <option value="traduccion">
                    Una traducción de un libro existente
                  </option>
                </select>
              </div>

              {tipoPropuesta === 'nuevo' ? (
                <div className="nueva-propuesta-field">
                  <label htmlFor="idioma-libro">Idioma del libro *</label>

                  <select
                    id="idioma-libro"
                    value={idioma}
                    onChange={(event) => setIdioma(event.target.value)}
                  >
                    {idiomas.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="nueva-propuesta-field">
                    <label htmlFor="libro-original">Libro original *</label>

                    <select
                      id="libro-original"
                      value={libroOriginalId}
                      onChange={(event) => seleccionarOrigen(event.target.value)}
                      disabled={modoEdicion || Boolean(errorVersiones)}
                    >
                      <option value="">Seleccioná un libro aprobado</option>
                      {versionesPublicadas.map(version => (
                        <option key={version.id} value={version.id}>{version.titulo} ({version.idioma.toUpperCase()})</option>
                      ))}
                    </select>
                  </div>

                  <div className="nueva-propuesta-field">
                    <label htmlFor="idioma-traduccion">
                      Idioma de la traducción *
                    </label>

                    <select
                      id="idioma-traduccion"
                      value={idioma}
                      onChange={(event) => setIdioma(event.target.value)}
                    >
                      {idiomas.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {errorVersiones && <p role="alert">{errorVersiones}</p>}
                  <p>Se copiará el contenido de la versión publicada seleccionada a un borrador editable, conservando el vínculo con el libro original.</p>
                </>
              )}
            </section>

            <section className="nueva-propuesta-panel">
              <h3>Información general</h3>

              <div className="nueva-propuesta-field">
                <label htmlFor="book-title">Título del libro *</label>
                <input
                  id="book-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej. Manual del aventurero"
                />
              </div>

              <div className="nueva-propuesta-field">
                <label htmlFor="book-code">Referencia corta del libro</label>
                <input
                  id="book-code"
                  type="text"
                  value={bookCode}
                  onChange={(event) => setBookCode(event.target.value)}
                  placeholder="Ej. PHB'24"
                />
              </div>

              <div className="nueva-propuesta-fields-row">
                <div className="nueva-propuesta-field">
                  <label htmlFor="book-edition">Edición</label>
                  <input
                    id="book-edition"
                    type="text"
                    value={edition}
                    onChange={(event) => setEdition(event.target.value)}
                    placeholder="Ej. 2024"
                  />
                </div>

                <div className="nueva-propuesta-field">
                  <label htmlFor="book-publisher">Autor / Editorial</label>
                  <input
                    id="book-publisher"
                    type="text"
                    value={publisher}
                    onChange={(event) => setPublisher(event.target.value)}
                    placeholder="Nombre del autor o editorial"
                  />
                </div>
              </div>

              <div className="nueva-propuesta-field">
                <label htmlFor="book-type">Clasificación del libro *</label>

                <select
                  id="book-type"
                  value={bookType}
                  onChange={(event) => setBookType(event.target.value)}
                  required
                >
                  <option value="">Seleccioná una clasificación</option>
                  {clasificaciones.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="nueva-propuesta-field">
                <label htmlFor="book-description">Descripción</label>
                <textarea
                  id="book-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describí brevemente el contenido del libro..."
                  rows={4}
                />
              </div>
            </section>
          </>
        )}

        {currentStep === 2 && (
          <>
            {editingCaracteristicaId !== null ? (
              <section className="nueva-propuesta-panel">
                <h3>Editar característica</h3>
                {(() => {
                  const item = caracteristicas.find(c => c.id === editingCaracteristicaId)
                  if (!item) return null
                  const actualizar = (campo: 'nombre' | 'descripcion', valor: string) => setCaracteristicas(actuales => actuales.map(c => c.id === item.id ? {...c,[campo]:valor} : c))
                  return <div className="nueva-propuesta-field">
                    <label>Tipo</label><select value={item.tipo} onChange={e => setCaracteristicas(actuales => actuales.map(c => c.id === item.id ? {...c,tipo:e.target.value as CaracteristicaLibro['tipo']} : c))}>
                      <option value="otra">Otra característica</option><option value="propiedad_arma">Propiedad de arma</option><option value="maestria_arma">Maestría de arma</option><option value="moneda">Moneda</option><option value="regla_arma">Regla de armas</option>
                    </select>
                    <label>Nombre</label><input value={item.nombre} onChange={e=>actualizar('nombre',e.target.value)}/>
                    <label>Código estable</label><input value={item.codigo ?? ''} onChange={e=>setCaracteristicas(actuales=>actuales.map(c=>c.id===item.id?{...c,codigo:e.target.value}:c))}/>
                    <label>Descripción</label><textarea rows={7} value={item.descripcion} onChange={e=>actualizar('descripcion',e.target.value)}/>
                    {item.tipo === 'moneda' && <>
                      <label>Valor en piezas de oro</label><input type="number" min="0" step="any" value={valorCampoNumero(item.datos?.valorOro)} onChange={e=>setCaracteristicas(actuales=>actuales.map(c=>c.id===item.id?{...c,datos:{...c.datos,valorOro:Number(e.target.value)}}:c))}/>
                      <label>Peso por moneda (gramos)</label><input type="number" min="0" step="any" value={valorCampoNumero(item.datos?.pesoGramos)} onChange={e=>setCaracteristicas(actuales=>actuales.map(c=>c.id===item.id?{...c,datos:{...c.datos,pesoGramos:Number(e.target.value)}}:c))}/>
                    </>}
                  </div>
                })()}
                <button type="button" className="nueva-propuesta-next" onClick={()=>setEditingCaracteristicaId(null)}>Volver a categorías</button>
              </section>
            ) : editingObjectId !== null ? (
              <section className="nueva-propuesta-panel"><h3>Editar objeto</h3><div className="nueva-propuesta-field"><label>Nombre del objeto *</label><input value={objetos.find(o => o.id === editingObjectId)?.nombre ?? ''} onChange={e => setObjetos(actuales => actuales.map(o => o.id === editingObjectId ? { ...o, nombre: e.target.value } : o))}/></div><div className="nueva-propuesta-field"><label>Descripción</label><textarea rows={4} value={objetos.find(o => o.id === editingObjectId)?.descripcion ?? ''} onChange={e => setObjetos(actuales => actuales.map(o => o.id === editingObjectId ? { ...o, descripcion: e.target.value } : o))}/></div><ObjetoForm elemento={objetos.find(o => o.id === editingObjectId)!} objetos={objetos} caracteristicas={caracteristicas} onChange={actualizado => setObjetos(actuales => actuales.map(o => o.id === actualizado.id ? actualizado : o))}/><div className="nueva-propuesta-actions"><button type="button" className="nueva-propuesta-next" onClick={() => setEditingObjectId(null)}>Volver a categorías</button></div></section>
            ) : editingSubclassId !== null ? (
              <section className="nueva-propuesta-panel"><h3>Editar subclase</h3><div className="nueva-propuesta-field"><label>Nombre de la subclase *</label><input value={subclases.find(s => s.id === editingSubclassId)?.nombre ?? ''} onChange={e => setSubclases(actuales => actuales.map(s => s.id === editingSubclassId ? { ...s, nombre: e.target.value } : s))}/></div><div className="nueva-propuesta-field"><label>Descripción</label><textarea rows={3} value={subclases.find(s => s.id === editingSubclassId)?.descripcion ?? ''} onChange={e => setSubclases(actuales => actuales.map(s => s.id === editingSubclassId ? { ...s, descripcion: e.target.value } : s))}/></div><SubclaseForm elemento={subclases.find(s => s.id === editingSubclassId)!} clases={clasesDisponiblesSubclase} conjurosDisponibles={[...conjuros.map(c => ({ id: c.id, nombre: c.nombre, nivel: c.nivel })), ...versionesPublicadas.flatMap(v => ((v.conjuros ?? []) as Conjuro[]).filter(c => !conjuros.some(local => local.id === c.id)).map(c => ({ id: c.id, nombre: c.nombre, nivel: c.nivel, libro: v.titulo })))]} onChange={actualizada => setSubclases(actuales => actuales.map(s => s.id === actualizada.id ? actualizada : s))}/><div className="nueva-propuesta-actions"><button type="button" className="nueva-propuesta-next" onClick={() => setEditingSubclassId(null)}>Volver a categorías</button></div></section>
            ) : editingClassId !== null ? (
              <section className="nueva-propuesta-panel">
                <h3>Editar clase</h3>
                <div className="nueva-propuesta-field"><label>Nombre de la clase *</label><input value={clases.find(c => c.id === editingClassId)?.nombre ?? ""} onChange={e => setClases(actuales => actuales.map(c => c.id === editingClassId ? { ...c, nombre: e.target.value } : c))} /></div>
                <div className="nueva-propuesta-field"><label>Descripción</label><textarea rows={3} value={clases.find(c => c.id === editingClassId)?.descripcion ?? ""} onChange={e => setClases(actuales => actuales.map(c => c.id === editingClassId ? { ...c, descripcion: e.target.value } : c))} /></div>
                <ClaseForm elemento={clases.find(c => c.id === editingClassId)!} onChange={actualizarClaseConObjetos} conjurosDisponibles={[...conjuros.map(c => ({ id: c.id, nombre: c.nombre, nivel: c.nivel })), ...versionesPublicadas.flatMap(v => ((v.conjuros ?? []) as Conjuro[]).filter(c => !conjuros.some(local => local.id === c.id)).map(c => ({ id: c.id, nombre: c.nombre, nivel: c.nivel, libro: v.titulo })))]} />
                <div className="nueva-propuesta-actions"><button type="button" className="nueva-propuesta-next" onClick={() => setEditingClassId(null)}>Volver a categorías</button></div>
              </section>
            ) : showCriaturaForm ? (
              <CriaturaForm key={editingCriaturaId ?? 'nueva'} initialData={criaturas.find(c => c.id === editingCriaturaId)} criaturas={criaturas} conjuros={conjuros} onSave={guardarCriatura} onCancel={() => { setShowCriaturaForm(false); setEditingCriaturaId(null) }}/>
            ) : showTrasfondoForm ? (
              <TrasfondoForm key={editingTrasfondoId ?? 'nuevo'} initialData={trasfondos.find(t => t.id === editingTrasfondoId)} trasfondos={trasfondos} dotes={dotes} objetos={objetos} onSave={guardarTrasfondo} onCancel={() => { setShowTrasfondoForm(false); setEditingTrasfondoId(null) }} />
            ) : showDoteForm ? (
              <DoteForm key={editingDoteId ?? 'nueva'} initialData={dotes.find(d => d.id === editingDoteId)} dotes={dotes} conjuros={conjuros} clasesDisponibles={clases.map(c => c.nombre).filter(Boolean)} onCrearConjuro={crearConjuro} onSave={guardarDote} onCancel={() => { setShowDoteForm(false); setEditingDoteId(null) }} />
            ) : showConjuroForm ? (
              <ConjuroForm key={editingConjuroId ?? 'nuevo'} initialData={conjuros.find(c => c.id === editingConjuroId)} conjuros={conjuros} onSave={guardarConjuro} onCancel={() => { setShowConjuroForm(false); setEditingConjuroId(null) }} />
            ) : showEspecieForm ? (
              <EspecieForm
                bookTitle={title}
                bookCode={bookCode}
                initialData={especies.find(
                  (especie) => especie.id === editingSpeciesId
                )}
                onSave={guardarEspecie}
                onCancel={cerrarFormularioEspecie}
                conjuros={conjuros}
                onCrearConjuro={crearConjuro}
              />
            ) : (
              <ContenidoLibro
                categories={activeCategories}
                caracteristicas={caracteristicas}
                onAddCaracteristica={() => { const id = crypto.randomUUID(); setCaracteristicas(actuales => [...actuales, { id, tipo: 'otra', nombre: '', descripcion: '' }]); setEditingCaracteristicaId(id) }}
                onSeedPropiedades={() => setCaracteristicas(actuales => [...actuales, ...crearPropiedadesArma().filter(item => !actuales.some(c => c.tipo === item.tipo && c.codigo === item.codigo))])}
                onSeedMonedas={() => setCaracteristicas(actuales => [...actuales, ...crearMonedas().filter(item => !actuales.some(c => c.tipo === item.tipo && c.codigo === item.codigo))])}
                onSeedReglas={() => setCaracteristicas(actuales => [...actuales, ...crearReglasArmas().filter(item => !actuales.some(c => c.tipo === item.tipo && c.codigo === item.codigo))])}
                onSeedMaestrias={() => setCaracteristicas(actuales => [...actuales, ...crearMaestrias().filter(item => !actuales.some(c => c.tipo === 'maestria_arma' && c.codigo === item.codigo))])}
                onEditCaracteristica={setEditingCaracteristicaId}
                onDeleteCaracteristica={id => setCaracteristicas(actuales => actuales.filter(c => c.id !== id))}
                allCategories={categories}
                selectedCategories={selectedCategories}
                onToggleCategory={toggleCategory}
                speciesCount={especies.length}
                conjuros={conjuros}
                criaturas={criaturas}
                onAddCriatura={() => { setEditingCriaturaId(null); setShowCriaturaForm(true) }}
                onEditCriatura={id => { setEditingCriaturaId(id); setShowCriaturaForm(true) }}
                onDeleteCriatura={id => setCriaturas(actuales => actuales.filter(c => c.id !== id))}
                trasfondos={trasfondos}
                onAddTrasfondo={() => { setEditingTrasfondoId(null); setShowTrasfondoForm(true) }}
                onEditTrasfondo={id => { setEditingTrasfondoId(id); setShowTrasfondoForm(true) }}
                onDeleteTrasfondo={id => setTrasfondos(actuales => actuales.filter(t => t.id !== id))}
                dotes={dotes}
                onAddDote={() => { setEditingDoteId(null); setShowDoteForm(true) }}
                onEditDote={id => { setEditingDoteId(id); setShowDoteForm(true) }}
                onDeleteDote={id => setDotes(actuales => actuales.filter(d => d.id !== id))}
                species={especies.map((especie) => ({
                  id: especie.id,
                  nombre: especie.nombre,
                }))}
                clases={clases.map(c => ({ id: c.id, nombre: c.nombre }))}
                objetos={objetos.map(o => ({ id: o.id, nombre: o.nombre, tipo: String(o.datos.tipo ?? 'equipo') }))}
                onAddObject={() => { const id = crypto.randomUUID(); setObjetos(actuales => [...actuales, { id, tipo: 'objeto', nombre: '', descripcion: '', datos: { tipo: 'equipo', rareza: 'Sin rareza', moneda: 'PO', magico: false } }]); setEditingObjectId(id) }}
                onEditObject={setEditingObjectId}
                onDeleteObject={id => setObjetos(actuales => actuales.filter(o => o.id !== id))}
                subclases={subclases.map(s => ({ id: s.id, nombre: s.nombre, claseNombre: clasesDisponiblesSubclase.find(c => c.id === (s.datos as {claseId?: string}).claseId)?.nombre ?? 'Clase no disponible' }))}
                onAddSubclass={() => { const id = crypto.randomUUID(); setSubclases(actuales => [...actuales, { id, tipo: 'subclase', nombre: '', descripcion: '', datos: { claseId: '', rasgos: [], recursos: [] } }]); setEditingSubclassId(id) }}
                onEditSubclass={setEditingSubclassId}
                onDeleteSubclass={id => setSubclases(actuales => actuales.filter(s => s.id !== id))}
                onAddClass={() => {
                  const id = crypto.randomUUID()
                  setClases(actuales => [...actuales, { id, tipo: 'clase', nombre: '', descripcion: '', datos: {} }])
                  setEditingClassId(id)
                }}
                onEditClass={setEditingClassId}
                onDeleteClass={id => setClases(actuales => actuales.filter(c => c.id !== id))}
                categoryItemCounts={{
                  otras: caracteristicas.length,
                  dotes: dotes.length,
                  trasfondos: trasfondos.length,
                  criaturas: criaturas.length,
                  clases: clases.length,
                  subclases: subclases.length,
                  objetos: objetos.length,
                  especies: especies.length,
                  conjuros: conjuros.length,
                }}
                onAddSpecies={() => abrirFormularioEspecie(null)}
                onEditSpecies={abrirFormularioEspecie}
                onDeleteSpecies={eliminarEspecie}
                onAddConjuro={() => { setEditingConjuroId(null); setShowConjuroForm(true) }}
                onEditConjuro={id => { setEditingConjuroId(id); setShowConjuroForm(true) }}
                onDeleteConjuro={id => setConjuros(actuales => actuales.filter(c => c.id !== id))}
              />
            )}
          </>
        )}

        {currentStep === 3 && (
          <RevisionLibro
            titulo={title}
            codigo={bookCode}
            edicion={edition}
            editorial={publisher}
            clasificacion={bookType}
            idioma={idioma}
            descripcion={description}
            categorias={activeCategories}
            cantidadEspecies={especies.length}
            cantidadConjuros={conjuros.length}
            cantidadClases={clases.length}
            cantidadSubclases={subclases.length}
            cantidadObjetos={objetos.length}
          />
        )}

        {errorGuardado && (
          <p role="alert" style={{ color: '#e57373' }}>
            {errorGuardado}
          </p>
        )}

        <div className="nueva-propuesta-actions">
          {currentStep === 1 ? (
            <Link to="/biblioteca/libros?tab=propuestas" className="nueva-propuesta-cancel">
              Cancelar
            </Link>
          ) : (
            <button
              type="button"
              className="nueva-propuesta-cancel"
              onClick={() => {
                setErrorGuardado('')
                if (currentStep === 2 && editingSubclassId !== null) { setEditingSubclassId(null)
                } else if (currentStep === 2 && editingClassId !== null) {
                  setEditingClassId(null)
                } else if (currentStep === 2 && showCriaturaForm) {
                  setShowCriaturaForm(false); setEditingCriaturaId(null)
                } else if (currentStep === 2 && showTrasfondoForm) {
                  setShowTrasfondoForm(false); setEditingTrasfondoId(null)
                } else if (currentStep === 2 && showDoteForm) {
                  setShowDoteForm(false); setEditingDoteId(null)
                } else if (currentStep === 2 && showConjuroForm) {
                  setShowConjuroForm(false); setEditingConjuroId(null)
                } else if (currentStep === 2 && showEspecieForm) {
                  cerrarFormularioEspecie()
                } else {
                  setCurrentStep((paso) => Math.max(1, paso - 1))
                }
              }}
            >
              Anterior
            </button>
          )}

          {currentStep === 1 && (
            <button
              type="button"
              className="nueva-propuesta-next"
              disabled={
                !title.trim() ||
                !bookType ||
                (tipoPropuesta === 'traduccion' && (!libroOriginalId || versionesPublicadas.some(version => version.id === libroOriginalId && version.idioma === idioma)))
              }
              onClick={() => setCurrentStep(2)}
            >
              Continuar
              <ChevronRight size={18} />
            </button>
          )}

          {currentStep === 2 && editingCaracteristicaId === null && !showEspecieForm && !showConjuroForm && !showDoteForm && !showTrasfondoForm && !showCriaturaForm && editingClassId === null && editingSubclassId === null && editingObjectId === null && (
            <button
              type="button"
              className="nueva-propuesta-next"
              onClick={() => {
                if (objetos.some(o => !o.nombre.trim())) { setErrorGuardado('Todos los objetos deben tener nombre.'); return }
                if (subclases.some(s => !s.nombre.trim() || !claseValidaSubclase((s.datos as {claseId?: string}).claseId ?? ''))) { setErrorGuardado('Cada subclase debe tener nombre y una clase principal válida.'); return }
                if (clases.some(clase => !clase.nombre.trim())) {
                  setErrorGuardado('Todas las clases deben tener un nombre. Editá o eliminá las clases incompletas.')
                  return
                }
                setErrorGuardado('')
                setCurrentStep(3)
              }}
            >
              Continuar a revisión
              <ChevronRight size={18} />
            </button>
          )}

          {currentStep === 3 && (
            <button
              type="button"
              className="nueva-propuesta-next"
 
              disabled={
                guardando ||
                cargandoLibro ||
                (modoEdicionAnterior && !versionId) ||
                (modoEdicionBorrador && rowVersion === null) ||
                (tipoPropuesta === 'traduccion' && !libroOriginalId)
              }
              onClick={handleGuardarLibro}
            >
              {guardando
                ? 'Guardando...'
                : modoEdicion
                  ? 'Guardar cambios'
                  : 'Guardar propuesta'}
            </button>
          )}
        </div>
        </>}
      </div>
    </AppLayout>
  )
}
/** Valor apto para un <input type="number">: los booleanos no se muestran. */
function valorCampoNumero(valor: string | number | boolean | undefined) {
  return typeof valor === 'number' || typeof valor === 'string' ? valor : ''
}
