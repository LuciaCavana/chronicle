import { crearMaestrias, crearPropiedadesArma, crearMonedas, crearReglasArmas, type CaracteristicaLibro } from '../types/caracteristicaLibro'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Eye, ListTree, Save, Send, X } from 'lucide-react'

import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
// Se importa antes de los componentes para conservar el orden de la cascada
import '../styles/biblioteca/NuevaPropuesta.css'
import IndiceLibro from '../components/biblioteca/editor/IndiceLibro'
import CategoriaContenido from '../components/biblioteca/editor/CategoriaContenido'
import ResumenContenido from '../components/biblioteca/editor/ResumenContenido'
import type { ElementoActivo, SeccionLibro } from '../components/biblioteca/editor/tipos'
import '../styles/biblioteca/EditorLibro.css'
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
  enviarBorradorAprobacion,
} from '../services/libros'

import type { Conjuro } from '../types/conjuro'
import type { Especie } from '../types/especie'
import { categoriasConObjetos, sumarObjetosDeClases } from '../lib/objetosDeClases'
import ModalBorrador from '../components/biblioteca/ModalBorrador'

type TipoPropuesta = 'nuevo' | 'traduccion'
type VersionPublicada = Awaited<ReturnType<typeof listarVersionesPublicadas>>[number]


const singulares: Record<string, string> = {
  especies: 'especie', clases: 'clase', subclases: 'subclase', trasfondos: 'trasfondo', criaturas: 'criatura',
  dotes: 'dote', conjuros: 'conjuro', objetos: 'objeto', otras: 'característica',
}
const etiquetasCaracteristica: Record<string, string> = {
  maestria_arma: 'Maestría de arma', propiedad_arma: 'Propiedad de arma', moneda: 'Moneda', regla_arma: 'Regla de armas', otra: 'Otra característica',
}

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
  { id: 'otras', label: 'Características' },
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
    const objetosOrigen = sumarObjetosDeClases((origen.objetos ?? []) as Elemento[], (origen.clases ?? []) as Elemento[])
    setSelectedCategories(categoriasConObjetos(origen.categorias ?? [], objetosOrigen.length > (origen.objetos ?? []).length))
    setEspecies((origen.especies ?? []) as Especie[])
    setConjuros((origen.conjuros ?? []) as Conjuro[])
    setClases((origen.clases ?? []) as Elemento[])
    setSubclases((origen.subclases ?? []) as Elemento[])
    setObjetos(objetosOrigen)
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
    const conObjetosDeClase = sumarObjetosDeClases(objetos, [actualizada])
    if (conObjetosDeClase !== objetos) {
      setObjetos(conObjetosDeClase)
      setSelectedCategories(categorias => categoriasConObjetos(categorias, true))
    }
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
  // Vista del editor: 'datos', 'contenido', 'revisar' o 'cat:<categoría>'.
  // Un borrador existente abre en el contenido; uno nuevo, en los datos del libro.
  const [vista, setVista] = useState(() => modoEdicion ? 'contenido' : 'datos')
  const currentStep = vista === 'datos' ? 1 : vista === 'revisar' ? 3 : 2
  // En celular el índice es la primera pantalla.
  const [indiceMovil, setIndiceMovil] = useState(true)
  const [mensajeGuardado, setMensajeGuardado] = useState('')
  const [porEliminar, setPorEliminar] = useState<{ categoria: string; id: string; nombre: string } | null>(null)

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
      const objetosBorrador = sumarObjetosDeClases(contenido.objetos ?? [], contenido.clases ?? [])
      setSelectedCategories(categoriasConObjetos(propuesta.categorias ?? [], objetosBorrador.length > (contenido.objetos ?? []).length))
      setEspecies(contenido.especies ?? [])
      setConjuros(contenido.conjuros ?? [])
      setDotes(contenido.dotes ?? [])
      setTrasfondos(contenido.trasfondos ?? [])
      setCriaturas(contenido.criaturas ?? [])
      setClases(contenido.clases ?? [])
      setSubclases(contenido.subclases ?? [])
      setObjetos(objetosBorrador)
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
        const objetosVersion = sumarObjetosDeClases((version.objetos ?? []) as Elemento[], (version.clases ?? []) as Elemento[])
        setSelectedCategories(categoriasConObjetos(version.categorias ?? [], objetosVersion.length > (version.objetos ?? []).length))
        setEspecies((version.especies ?? []) as Especie[])
        setConjuros((version.conjuros ?? []) as Conjuro[])
        setDotes([]) // Las versiones publicadas aún no almacenan dotes.
        setTrasfondos([]) // Pendiente de publicación.
        setCriaturas([]) // Pendiente de publicación.
        setClases((version.clases ?? []) as Elemento[])
        setSubclases((version.subclases ?? []) as Elemento[])
        setObjetos(objetosVersion)
        setCaracteristicas([]) // Las versiones publicadas aún no almacenan características.
        setTipoPropuesta('nuevo')
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

  async function handleGuardarLibro(opciones: { enviar?: boolean } = {}) {
    if (guardando || cargandoLibro || accesoCompartido === 'lector' || pendienteAprobacion) {
      return
    }

    if (objetos.some(o => !o.nombre.trim())) { setErrorGuardado('Todos los objetos deben tener nombre.'); setVista('cat:objetos'); return }
    if (subclases.some(s => !s.nombre.trim() || !claseValidaSubclase((s.datos as {claseId?: string}).claseId ?? ''))) { setErrorGuardado('Cada subclase debe tener nombre y una clase principal válida.'); setVista('cat:subclases'); return }
    if (clases.some(clase => !clase.nombre.trim())) {
      setErrorGuardado('Todas las clases deben tener un nombre antes de guardar.')
      setVista('cat:clases')
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

      let idGuardado: string | null = propuestaId ?? null
      if (modoEdicionBorrador && propuestaId && rowVersion !== null) {
        if (!baseColaborativa.current) throw new Error('No se pudo recuperar la versión original del borrador.')
        const guardado = {
          titulo: datos.titulo,
          descripcion: datos.descripcion,
          idioma: datos.idioma,
          categorias: datos.categorias,
          metadatos_libro: { codigo: datos.codigo, edicion: datos.edicion, editorial: datos.editorial, clasificacion: datos.clasificacion },
          contenido: { especies, conjuros, dotes, trasfondos, criaturas, clases, subclases, objetos, caracteristicas },
        }
        const nuevaVersion = await guardarElementosCompartidos(propuestaId, baseColaborativa.current, { row_version: rowVersion, ...guardado })
        // Lo guardado pasa a ser la base para el próximo guardado por elementos.
        baseColaborativa.current = { row_version: nuevaVersion, ...guardado }
        setRowVersion(nuevaVersion)
        setVersionRemota(null)
      } else if (modoEdicionAnterior && libroId && versionId) {
        await actualizarLibro(libroId, versionId, datos)
      } else {
        const origen = versionesPublicadas.find(version => version.id === libroOriginalId)
        if (tipoPropuesta === 'traduccion' && !origen) throw new Error('Seleccioná una versión publicada como origen.')
        idGuardado = await guardarPropuesta(datos, origen ? { libroId: origen.libroId, versionId: origen.id } : undefined)
      }
      instantaneaInicial.current = instantanea()

      if (opciones.enviar && idGuardado) {
        await enviarBorradorAprobacion(idGuardado)
        navigate(destinoSalida)
        return
      }
      if (!modoEdicion && idGuardado) {
        // Un libro nuevo pasa a ser un borrador: se sigue editando ahí, conservando el origen.
        navigate(`/biblioteca/libros/editar-borrador/${idGuardado}${origenEditor ? `?origen=${origenEditor}` : ''}`, { replace: true })
        return
      }
      setMensajeGuardado('Cambios guardados.')
    } catch (error) {
      console.error('Error al guardar el libro:', error)

      setErrorGuardado(
        error instanceof Error ? error.message : 'No se pudo guardar el libro.'
      )
    } finally {
      setGuardando(false)
    }
  }

  // ---------- Barra fija del editor ----------
  const editandoElemento = editingCaracteristicaId !== null || showEspecieForm || showConjuroForm || showDoteForm ||
    showTrasfondoForm || showCriaturaForm || editingClassId !== null || editingSubclassId !== null || editingObjectId !== null
  // Estos formularios se guardan con su propio botón; volver sin guardar descarta lo cargado en el formulario.
  const elementoConFormulario = showEspecieForm || showConjuroForm || showDoteForm || showTrasfondoForm || showCriaturaForm
  const nombreDe = (lista: { id: string; nombre: string }[], id: string | null) => (id ? lista.find(x => x.id === id)?.nombre?.trim() : '') || ''
  const elementoEnEdicion: { tipo: string; nombre: string } | null =
    editingClassId !== null ? { tipo: 'Clase', nombre: nombreDe(clases, editingClassId) } :
    editingSubclassId !== null ? { tipo: 'Subclase', nombre: nombreDe(subclases, editingSubclassId) } :
    editingObjectId !== null ? { tipo: 'Objeto', nombre: nombreDe(objetos, editingObjectId) } :
    editingCaracteristicaId !== null ? { tipo: 'Característica', nombre: nombreDe(caracteristicas, editingCaracteristicaId) } :
    showEspecieForm ? { tipo: 'Especie', nombre: nombreDe(especies, editingSpeciesId) } :
    showConjuroForm ? { tipo: 'Conjuro', nombre: nombreDe(conjuros, editingConjuroId) } :
    showDoteForm ? { tipo: 'Dote', nombre: nombreDe(dotes, editingDoteId) } :
    showTrasfondoForm ? { tipo: 'Trasfondo', nombre: nombreDe(trasfondos, editingTrasfondoId) } :
    showCriaturaForm ? { tipo: 'Criatura', nombre: nombreDe(criaturas, editingCriaturaId) } : null

  // Elemento agregado desde el índice o la categoría: si se cierra sin tocarlo, no se conserva.
  const recienCreado = useRef<{ categoria: 'clases' | 'subclases' | 'objetos' | 'otras'; id: string; json: string } | null>(null)
  function descartarSiNoSeEdito() {
    const creado = recienCreado.current
    recienCreado.current = null
    if (!creado) return
    const sinCambios = (lista: { id: string }[]) => JSON.stringify(lista.find(x => x.id === creado.id)) === creado.json
    if (creado.categoria === 'clases' && sinCambios(clases)) setClases(actuales => actuales.filter(x => x.id !== creado.id))
    if (creado.categoria === 'subclases' && sinCambios(subclases)) setSubclases(actuales => actuales.filter(x => x.id !== creado.id))
    if (creado.categoria === 'objetos' && sinCambios(objetos)) setObjetos(actuales => actuales.filter(x => x.id !== creado.id))
    if (creado.categoria === 'otras' && sinCambios(caracteristicas)) setCaracteristicas(actuales => actuales.filter(x => x.id !== creado.id))
  }

  function cerrarElemento() {
    descartarSiNoSeEdito()
    setErrorGuardado('')
    setEditingCaracteristicaId(null)
    setEditingObjectId(null)
    setEditingSubclassId(null)
    setEditingClassId(null)
    setShowCriaturaForm(false); setEditingCriaturaId(null)
    setShowTrasfondoForm(false); setEditingTrasfondoId(null)
    setShowDoteForm(false); setEditingDoteId(null)
    setShowConjuroForm(false); setEditingConjuroId(null)
    cerrarFormularioEspecie()
    document.querySelector<HTMLElement>('.app-layout-content')?.scrollTo({ top: 0 })
  }

  // ---------- Índice del libro ----------
  const subclaseIncompleta = (s: Elemento) => !s.nombre.trim() || !claseValidaSubclase((s.datos as { claseId?: string }).claseId ?? '')
  const datosSecciones: Record<string, Omit<SeccionLibro, 'id' | 'titulo' | 'singular'>> = {
    especies: { elementos: especies.map(e => ({ id: e.id, nombre: e.nombre })), agregar: () => abrirFormularioEspecie(null), editar: abrirFormularioEspecie, eliminar: eliminarEspecie },
    clases: {
      elementos: clases.map(c => ({ id: c.id, nombre: c.nombre, incompleto: !c.nombre.trim() })),
      agregar: () => { const nueva: Elemento = { id: crypto.randomUUID(), tipo: 'clase', nombre: '', descripcion: '', datos: {} }; setClases(actuales => [...actuales, nueva]); recienCreado.current = { categoria: 'clases', id: nueva.id, json: JSON.stringify(nueva) }; setEditingClassId(nueva.id) },
      editar: setEditingClassId, eliminar: id => setClases(actuales => actuales.filter(c => c.id !== id)),
    },
    subclases: {
      elementos: subclases.map(s => ({ id: s.id, nombre: s.nombre, detalle: clasesDisponiblesSubclase.find(c => c.id === (s.datos as { claseId?: string }).claseId)?.nombre ?? 'Sin clase principal', incompleto: subclaseIncompleta(s) })),
      agregar: () => { const nueva: Elemento = { id: crypto.randomUUID(), tipo: 'subclase', nombre: '', descripcion: '', datos: { claseId: '', rasgos: [], recursos: [] } }; setSubclases(actuales => [...actuales, nueva]); recienCreado.current = { categoria: 'subclases', id: nueva.id, json: JSON.stringify(nueva) }; setEditingSubclassId(nueva.id) },
      editar: setEditingSubclassId, eliminar: id => setSubclases(actuales => actuales.filter(s => s.id !== id)),
    },
    trasfondos: { elementos: trasfondos.map(t => ({ id: t.id, nombre: t.nombre })), agregar: () => { setEditingTrasfondoId(null); setShowTrasfondoForm(true) }, editar: id => { setEditingTrasfondoId(id); setShowTrasfondoForm(true) }, eliminar: id => setTrasfondos(actuales => actuales.filter(t => t.id !== id)) },
    criaturas: { elementos: criaturas.map(c => ({ id: c.id, nombre: c.nombre, detalle: c.tipo })), agregar: () => { setEditingCriaturaId(null); setShowCriaturaForm(true) }, editar: id => { setEditingCriaturaId(id); setShowCriaturaForm(true) }, eliminar: id => setCriaturas(actuales => actuales.filter(c => c.id !== id)) },
    dotes: { elementos: dotes.map(d => ({ id: d.id, nombre: d.nombre, detalle: d.categoria })), agregar: () => { setEditingDoteId(null); setShowDoteForm(true) }, editar: id => { setEditingDoteId(id); setShowDoteForm(true) }, eliminar: id => setDotes(actuales => actuales.filter(d => d.id !== id)) },
    conjuros: { elementos: conjuros.map(c => ({ id: c.id, nombre: c.nombre, detalle: c.tipo === 'truco' ? 'Truco' : `Nivel ${c.nivel}` })), agregar: () => { setEditingConjuroId(null); setShowConjuroForm(true) }, editar: id => { setEditingConjuroId(id); setShowConjuroForm(true) }, eliminar: id => setConjuros(actuales => actuales.filter(c => c.id !== id)) },
    objetos: {
      elementos: objetos.map(o => ({ id: o.id, nombre: o.nombre, detalle: String(o.datos?.tipo ?? 'equipo'), incompleto: !o.nombre.trim() })),
      agregar: () => { const nuevo: Elemento = { id: crypto.randomUUID(), tipo: 'objeto', nombre: '', descripcion: '', datos: { tipo: 'equipo', rareza: 'Sin rareza', moneda: 'PO', magico: false } }; setObjetos(actuales => [...actuales, nuevo]); recienCreado.current = { categoria: 'objetos', id: nuevo.id, json: JSON.stringify(nuevo) }; setEditingObjectId(nuevo.id) },
      editar: setEditingObjectId, eliminar: id => setObjetos(actuales => actuales.filter(o => o.id !== id)),
    },
    otras: {
      elementos: caracteristicas.map(c => ({ id: c.id, nombre: c.nombre, detalle: etiquetasCaracteristica[c.tipo] ?? c.tipo })),
      agregar: () => { const nueva: CaracteristicaLibro = { id: crypto.randomUUID(), tipo: 'otra', nombre: '', descripcion: '' }; setCaracteristicas(actuales => [...actuales, nueva]); recienCreado.current = { categoria: 'otras', id: nueva.id, json: JSON.stringify(nueva) }; setEditingCaracteristicaId(nueva.id) },
      editar: setEditingCaracteristicaId, eliminar: id => setCaracteristicas(actuales => actuales.filter(c => c.id !== id)),
      extras: [
        { etiqueta: 'Agregar propiedades de armas', accion: () => setCaracteristicas(actuales => [...actuales, ...crearPropiedadesArma().filter(item => !actuales.some(c => c.tipo === item.tipo && c.codigo === item.codigo))]) },
        { etiqueta: 'Agregar monedas', accion: () => setCaracteristicas(actuales => [...actuales, ...crearMonedas().filter(item => !actuales.some(c => c.tipo === item.tipo && c.codigo === item.codigo))]) },
        { etiqueta: 'Agregar reglas de armas', accion: () => setCaracteristicas(actuales => [...actuales, ...crearReglasArmas().filter(item => !actuales.some(c => c.tipo === item.tipo && c.codigo === item.codigo))]) },
        { etiqueta: 'Agregar las 8 maestrías', accion: () => setCaracteristicas(actuales => [...actuales, ...crearMaestrias().filter(item => !actuales.some(c => c.tipo === 'maestria_arma' && c.codigo === item.codigo))]) },
      ],
    },
  }
  const secciones: SeccionLibro[] = activeCategories.map(categoria => {
    const datosSeccion = datosSecciones[categoria.id]
    return datosSeccion
      ? { id: categoria.id, titulo: categoria.label, singular: singulares[categoria.id] ?? 'elemento', ...datosSeccion }
      : { id: categoria.id, titulo: categoria.label, singular: 'elemento', elementos: [], sinEditor: true, editar: () => undefined, eliminar: () => undefined }
  })
  const seccionActual = vista.startsWith('cat:') ? secciones.find(seccion => seccion.id === vista.slice(4)) ?? null : null

  const activo: ElementoActivo =
    editingClassId !== null ? { categoria: 'clases', id: editingClassId } :
    editingSubclassId !== null ? { categoria: 'subclases', id: editingSubclassId } :
    editingObjectId !== null ? { categoria: 'objetos', id: editingObjectId } :
    editingCaracteristicaId !== null ? { categoria: 'otras', id: editingCaracteristicaId } :
    showEspecieForm ? { categoria: 'especies', id: editingSpeciesId } :
    showConjuroForm ? { categoria: 'conjuros', id: editingConjuroId } :
    showDoteForm ? { categoria: 'dotes', id: editingDoteId } :
    showTrasfondoForm ? { categoria: 'trasfondos', id: editingTrasfondoId } :
    showCriaturaForm ? { categoria: 'criaturas', id: editingCriaturaId } : null

  function irA(nuevaVista: string) {
    cerrarElemento()
    setErrorGuardado('')
    setMensajeGuardado('')
    setVista(nuevaVista)
    setIndiceMovil(false)
  }
  function abrirElemento(categoria: string, id: string | null) {
    irA(`cat:${categoria}`)
    const seccion = secciones.find(s => s.id === categoria)
    if (!seccion) return
    if (id === null) seccion.agregar?.()
    else seccion.editar(id)
  }

  // Revisión antes de enviar
  const problemas: { texto: string; categoria?: string; id?: string }[] = [
    ...(!title.trim() ? [{ texto: 'Falta el título del libro.', categoria: '' }] : []),
    ...(!bookType ? [{ texto: 'Falta la clasificación del libro.', categoria: '' }] : []),
    ...(activeCategories.length === 0 ? [{ texto: 'El libro no tiene categorías elegidas.', categoria: '' }] : []),
    ...clases.filter(c => !c.nombre.trim()).map(c => ({ texto: 'Hay una clase sin nombre.', categoria: 'clases', id: c.id })),
    ...subclases.filter(subclaseIncompleta).map(s => ({ texto: `La subclase «${s.nombre.trim() || 'sin nombre'}» necesita nombre y una clase principal.`, categoria: 'subclases', id: s.id })),
    ...objetos.filter(o => !o.nombre.trim()).map(o => ({ texto: 'Hay un objeto sin nombre.', categoria: 'objetos', id: o.id })),
  ]
  const categoriasVacias = secciones.filter(seccion => !seccion.sinEditor && seccion.elementos.length === 0)

  // Cambios sin guardar: se compara el contenido actual con el que había al abrir el editor.
  const instantanea = () => JSON.stringify([title, bookCode, edition, publisher, bookType, description, idioma, selectedCategories,
    especies, conjuros, dotes, trasfondos, criaturas, clases, subclases, objetos, caracteristicas])
  const instantaneaInicial = useRef<string | null>(null)
  useEffect(() => {
    if (!cargandoLibro && instantaneaInicial.current === null) instantaneaInicial.current = instantanea()
  })
  const hayCambios = instantaneaInicial.current !== null && instantaneaInicial.current !== instantanea()
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)
  // A dónde vuelve el editor: la pestaña desde la que se abrió (?origen=), o según el permiso si no vino.
  const [parametros] = useSearchParams()
  const origenesEditor: Record<string, { texto: string; ruta: string }> = {
    propuestas: { texto: 'Mis propuestas', ruta: '/biblioteca/libros?tab=propuestas' },
    compartidos: { texto: 'Compartidos conmigo', ruta: '/biblioteca/libros?tab=compartidos' },
    catalogo: { texto: 'Catálogo', ruta: '/biblioteca/libros?tab=catalogo' },
    administracion: { texto: 'Revisión de libros', ruta: '/biblioteca/libros?tab=administracion' },
  }
  const origenEditor = parametros.get('origen') ?? ''
  const volver = origenesEditor[origenEditor] ?? origenesEditor[accesoCompartido === 'propietario' ? 'propuestas' : 'compartidos']
  const destinoSalida = volver.ruta
  function pedirSalida() {
    const sinCambios = instantaneaInicial.current === null || instantaneaInicial.current === instantanea()
    if (sinCambios || accesoCompartido === 'lector') navigate(destinoSalida)
    else setConfirmandoSalida(true)
  }

  return (
    <AppLayout
      title={modoEdicion ? 'Editar propuesta' : 'Nueva propuesta'}
      subtitle="Proponé un libro para la Biblioteca de Chronicle"
      migaAnterior={volver}
    >
      <div className="nueva-propuesta editor-libro">
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
        <div className="editor-libro__barra">
          <button type="button" className="editor-libro__boton editor-libro__boton--sec editor-libro__salir" onClick={pedirSalida} aria-label="Salir del editor" title="Salir del editor">
            <ChevronLeft size={18} aria-hidden="true" /><span>Salir</span>
          </button>
          <button type="button" className="editor-libro__boton editor-libro__boton--sec editor-libro__indice-boton" onClick={() => setIndiceMovil(true)} aria-label="Ver el índice del libro">
            <ListTree size={18} aria-hidden="true" />
          </button>
          <div className="editor-libro__titulo">
            <strong>{title.trim() || (modoEdicion ? 'Propuesta sin título' : 'Nueva propuesta')}</strong>
            <span className="editor-libro__estado">
              <span className="editor-libro__etiqueta">{modoEdicionBorrador ? 'Borrador' : modoEdicion ? 'Propuesta' : 'Nueva'} · {idioma.toUpperCase()}</span>
              {guardando ? <span>Guardando…</span>
                : hayCambios ? <span className="editor-libro__sin-guardar">Cambios sin guardar</span>
                : mensajeGuardado ? <span className="editor-libro__guardado">{mensajeGuardado}</span> : null}
            </span>
          </div>
          <div className="editor-libro__acciones">
            {propuestaId && <button type="button" className="editor-libro__boton editor-libro__boton--sec editor-libro__solo-escritorio" disabled={hayCambios}
              title={hayCambios ? 'Guardá los cambios para verlos en la vista previa' : 'Ver cómo se lee el borrador guardado'}
              onClick={() => navigate(`/biblioteca/libros/leer-borrador/${propuestaId}?origen=editor&desde=${origenEditor || (accesoCompartido === 'propietario' ? 'propuestas' : 'compartidos')}`)}>
              <Eye size={17} aria-hidden="true" />Vista previa
            </button>}
            <button type="button" className="editor-libro__boton" disabled={guardando || cargandoLibro || (modoEdicionBorrador && rowVersion === null)} onClick={() => void handleGuardarLibro()}>
              <Save size={17} aria-hidden="true" />{guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className={`editor-libro__boton editor-libro__boton--primario${vista === 'revisar' ? ' editor-libro__boton--actual' : ''}`} onClick={() => irA('revisar')}>
              Revisar y enviar
            </button>
          </div>
        </div>

        <div className={`editor-libro__cuerpo${indiceMovil ? ' editor-libro__cuerpo--indice' : ''}`}>
          <aside className="editor-libro__lateral">
            <IndiceLibro
              secciones={secciones}
              vista={vista}
              activo={activo}
              problemas={problemas.length}
              onDatos={() => irA('datos')}
              onContenido={() => irA('contenido')}
              onRevisar={() => irA('revisar')}
              onCategoria={id => irA(`cat:${id}`)}
              onElemento={(categoria, id) => abrirElemento(categoria, id)}
              onAgregar={categoria => abrirElemento(categoria, null)}
              disponibles={categories.filter(categoria => !selectedCategories.includes(categoria.id)).map(categoria => ({ id: categoria.id, titulo: categoria.label }))}
              onAgregarCategoria={id => { setSelectedCategories(actuales => actuales.includes(id) ? actuales : [...actuales, id]); irA(`cat:${id}`) }}
            />
          </aside>
          <div className="editor-libro__principal">
        {editandoElemento && <div className="editor-libro__volver-elemento">
          <button type="button" className="editor-libro__boton editor-libro__boton--sec" onClick={cerrarElemento}>
            {elementoConFormulario ? <X size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />}
            {elementoConFormulario ? 'Cancelar' : `Volver a ${seccionActual?.titulo ?? 'la categoría'}`}
          </button>
          {elementoEnEdicion && <span className="editor-libro__elemento-actual"><span>{elementoEnEdicion.tipo}</span><strong>{elementoEnEdicion.nombre || 'Nuevo'}</strong></span>}
        </div>}

        {currentStep === 1 && (
          <>
            <div className="editor-libro__encabezado editor-libro__encabezado--con-accion">
              <div>
                <h2>Datos del libro</h2>
                <p>Lo que identifica al libro en la Biblioteca. Podés volver acá en cualquier momento.</p>
              </div>
              <button type="button" className="editor-libro__boton editor-libro__boton--primario" onClick={() => irA('contenido')}>
                Contenido del libro<ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
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
            <section className="nueva-propuesta-panel">
              <h3>Qué incluye este libro</h3>
              <p className="editor-libro__ayuda">Las categorías marcadas aparecen en el índice.</p>
              <div className="editor-libro__categorias">
                {categories.map(categoria => (
                  <label key={categoria.id} className="editor-libro__categoria">
                    <input type="checkbox" checked={selectedCategories.includes(categoria.id)} onChange={() => toggleCategory(categoria.id)} />
                    {categoria.label}
                  </label>
                ))}
              </div>
            </section>
            <div className="editor-libro__siguiente">
              <button type="button" className="editor-libro__boton editor-libro__boton--primario" onClick={() => irA('contenido')}>
                Continuar al contenido<ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
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
                <button type="button" className="nueva-propuesta-next" onClick={cerrarElemento}>Listo</button>
              </section>
            ) : editingObjectId !== null ? (
              <section className="nueva-propuesta-panel"><h3>Editar objeto</h3><div className="nueva-propuesta-field"><label>Nombre del objeto *</label><input value={objetos.find(o => o.id === editingObjectId)?.nombre ?? ''} onChange={e => setObjetos(actuales => actuales.map(o => o.id === editingObjectId ? { ...o, nombre: e.target.value } : o))}/></div><div className="nueva-propuesta-field"><label>Descripción</label><textarea rows={4} value={objetos.find(o => o.id === editingObjectId)?.descripcion ?? ''} onChange={e => setObjetos(actuales => actuales.map(o => o.id === editingObjectId ? { ...o, descripcion: e.target.value } : o))}/></div><ObjetoForm elemento={objetos.find(o => o.id === editingObjectId)!} objetos={objetos} caracteristicas={caracteristicas} onChange={actualizado => setObjetos(actuales => actuales.map(o => o.id === actualizado.id ? actualizado : o))}/><div className="nueva-propuesta-actions"><button type="button" className="nueva-propuesta-next" onClick={cerrarElemento}>Listo</button></div></section>
            ) : editingSubclassId !== null ? (
              <section className="nueva-propuesta-panel"><h3>Editar subclase</h3><div className="nueva-propuesta-field"><label>Nombre de la subclase *</label><input value={subclases.find(s => s.id === editingSubclassId)?.nombre ?? ''} onChange={e => setSubclases(actuales => actuales.map(s => s.id === editingSubclassId ? { ...s, nombre: e.target.value } : s))}/></div><div className="nueva-propuesta-field"><label>Descripción</label><textarea rows={3} value={subclases.find(s => s.id === editingSubclassId)?.descripcion ?? ''} onChange={e => setSubclases(actuales => actuales.map(s => s.id === editingSubclassId ? { ...s, descripcion: e.target.value } : s))}/></div><SubclaseForm elemento={subclases.find(s => s.id === editingSubclassId)!} clases={clasesDisponiblesSubclase} conjurosDisponibles={[...conjuros.map(c => ({ id: c.id, nombre: c.nombre, nivel: c.nivel })), ...versionesPublicadas.flatMap(v => ((v.conjuros ?? []) as Conjuro[]).filter(c => !conjuros.some(local => local.id === c.id)).map(c => ({ id: c.id, nombre: c.nombre, nivel: c.nivel, libro: v.titulo })))]} onChange={actualizada => setSubclases(actuales => actuales.map(s => s.id === actualizada.id ? actualizada : s))}/><div className="nueva-propuesta-actions"><button type="button" className="nueva-propuesta-next" onClick={cerrarElemento}>Listo</button></div></section>
            ) : editingClassId !== null ? (
              <section className="nueva-propuesta-panel">
                <h3>Editar clase</h3>
                <div className="nueva-propuesta-field"><label>Nombre de la clase *</label><input value={clases.find(c => c.id === editingClassId)?.nombre ?? ""} onChange={e => setClases(actuales => actuales.map(c => c.id === editingClassId ? { ...c, nombre: e.target.value } : c))} /></div>
                <div className="nueva-propuesta-field"><label>Descripción</label><textarea rows={3} value={clases.find(c => c.id === editingClassId)?.descripcion ?? ""} onChange={e => setClases(actuales => actuales.map(c => c.id === editingClassId ? { ...c, descripcion: e.target.value } : c))} /></div>
                <ClaseForm elemento={clases.find(c => c.id === editingClassId)!} onChange={actualizarClaseConObjetos} conjurosDisponibles={[...conjuros.map(c => ({ id: c.id, nombre: c.nombre, nivel: c.nivel })), ...versionesPublicadas.flatMap(v => ((v.conjuros ?? []) as Conjuro[]).filter(c => !conjuros.some(local => local.id === c.id)).map(c => ({ id: c.id, nombre: c.nombre, nivel: c.nivel, libro: v.titulo })))]} />
                <div className="nueva-propuesta-actions"><button type="button" className="nueva-propuesta-next" onClick={cerrarElemento}>Listo</button></div>
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
              seccionActual ? <CategoriaContenido seccion={seccionActual} onEliminar={(id, nombre) => setPorEliminar({ categoria: seccionActual.id, id, nombre })} />
              : <ResumenContenido secciones={secciones} onCategoria={id => irA(`cat:${id}`)} onElemento={abrirElemento} onAgregar={categoria => abrirElemento(categoria, null)} />
            )}
          </>
        )}

        {currentStep === 3 && <div className="editor-libro__encabezado">
          <h2>Revisar y enviar</h2>
          <p>Antes de enviar el borrador a aprobación, Chronicle revisa que esté completo.</p>
        </div>}
        {currentStep === 3 && <section className="nueva-propuesta-panel editor-libro__controles">
          <h3>Antes de enviar</h3>
          {problemas.length === 0 && categoriasVacias.length === 0 && <p className="editor-libro__ok">Todo listo: no hay nada para corregir.</p>}
          <ul>
            {problemas.map((problema, i) => <li key={i} className="editor-libro__control editor-libro__control--error">
              <span>{problema.texto}</span>
              <button type="button" className="editor-libro__enlace" onClick={() => problema.categoria ? abrirElemento(problema.categoria, problema.id ?? null) : irA('datos')}>Ir a corregir</button>
            </li>)}
            {categoriasVacias.map(seccion => <li key={seccion.id} className="editor-libro__control editor-libro__control--aviso">
              <span>«{seccion.titulo}» está marcada pero no tiene elementos.</span>
              <button type="button" className="editor-libro__enlace" onClick={() => irA(`cat:${seccion.id}`)}>Ver</button>
            </li>)}
          </ul>
        </section>}
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
        {currentStep === 3 && <div className="editor-libro__enviar">
          {problemas.length > 0 && <span className="editor-libro__ayuda">Corregí lo marcado para poder enviar.</span>}
          <button type="button" className="editor-libro__boton" disabled={guardando || cargandoLibro} onClick={() => void handleGuardarLibro()}>
            <Save size={17} aria-hidden="true" />Solo guardar
          </button>
          {!modoEdicionAnterior && <button type="button" className="editor-libro__boton editor-libro__boton--primario" disabled={guardando || cargandoLibro || problemas.length > 0} onClick={() => void handleGuardarLibro({ enviar: true })}>
            <Send size={17} aria-hidden="true" />{guardando ? 'Guardando…' : 'Guardar y enviar a aprobación'}
          </button>}
        </div>}

        {errorGuardado && (
          <p role="alert" style={{ color: '#e57373' }}>
            {errorGuardado}
          </p>
        )}


          </div>
        </div>

        {porEliminar && <ModalBorrador titulo="Eliminar elemento" onClose={() => setPorEliminar(null)}>
          <div className="nueva-propuesta-salida">
            <h3>¿Eliminar «{porEliminar.nombre}»?</h3>
            <p>Se quita del borrador. Si te arrepentís, no guardes los cambios.</p>
            <div className="nueva-propuesta-salida-acciones">
              <button type="button" className="nueva-propuesta-cancel" onClick={() => setPorEliminar(null)}>Cancelar</button>
              <button type="button" className="nueva-propuesta-salida-confirmar" onClick={() => { secciones.find(seccion => seccion.id === porEliminar.categoria)?.eliminar(porEliminar.id); setPorEliminar(null) }}>Eliminar</button>
            </div>
          </div>
        </ModalBorrador>}

        {confirmandoSalida && <ModalBorrador titulo="Salir del editor" onClose={() => setConfirmandoSalida(false)}>
          <div className="nueva-propuesta-salida">
            <h3>¿Salir sin guardar?</h3>
            <p>Hay cambios en esta propuesta que todavía no guardaste. Si salís ahora, se pierden.</p>
            <div className="nueva-propuesta-salida-acciones">
              <button type="button" className="nueva-propuesta-cancel" onClick={() => setConfirmandoSalida(false)}>Seguir editando</button>
              <button type="button" className="nueva-propuesta-salida-confirmar" onClick={() => navigate(destinoSalida)}>Salir sin guardar</button>
            </div>
          </div>
        </ModalBorrador>}
        </>}
      </div>
    </AppLayout>
  )
}
/** Valor apto para un <input type="number">: los booleanos no se muestran. */
function valorCampoNumero(valor: string | number | boolean | undefined) {
  return typeof valor === 'number' || typeof valor === 'string' ? valor : ''
}
