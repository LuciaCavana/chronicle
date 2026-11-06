import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookPlus, ChevronRight } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import '../styles/NuevaPropuesta.css'
import ContenidoLibro from '../components/biblioteca/ContenidoLibro'
import RevisionLibro from '../components/biblioteca/RevisionLibro'
import EspecieForm from '../components/biblioteca/EspecieForm'
import type { Especie } from '../types/especie'
import {
  guardarLibro,
  actualizarLibro,
  obtenerLibroParaEditar,
} from '../services/libros'

const categories = [
  { id: 'especies', label: 'Especies' },
  { id: 'clases', label: 'Clases' },
  { id: 'subclases', label: 'Subclases' },
  { id: 'trasfondos', label: 'Trasfondos' },
  { id: 'dotes', label: 'Dotes' },
  { id: 'conjuros', label: 'Conjuros' },
  { id: 'objetos', label: 'Objetos y equipo' },
  { id: 'reglas', label: 'Reglas' },
  {
    id: 'otras',
    label: 'Otras opciones y características',
  },
]


export default function NuevaPropuesta() {
  const [title, setTitle] = useState('')
  const [edition, setEdition] = useState('')
  const [publisher, setPublisher] = useState('')
  const [description, setDescription] = useState('')
  const [bookType, setBookType] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [bookCode, setBookCode] = useState('')
  const [especies, setEspecies] = useState<Especie[]>([])
  const [showEspecieForm, setShowEspecieForm] = useState(false)
  const [editingSpeciesId, setEditingSpeciesId] = useState<string | null>(null)
  type TipoPropuesta = 'nuevo' | 'traduccion'
  const navigate = useNavigate()  
  const { libroId } = useParams<{ libroId: string }>()
  const modoEdicion = Boolean(libroId)
  const [cargandoLibro, setCargandoLibro] = useState(modoEdicion)
  const [errorCarga, setErrorCarga] = useState('')
  const [versionId, setVersionId] = useState<string | null>(null)


  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')


  const [tipoPropuesta, setTipoPropuesta] =
    useState<TipoPropuesta>('nuevo')

  const [idioma, setIdioma] = useState('es')
  const [libroOriginalId, setLibroOriginalId] = useState('')
 
  useEffect(() => {
    if (!libroId) return

    let cancelado = false

    async function cargarLibro() {
      setCargandoLibro(true)
      setVersionId(null)
      setErrorCarga('')

      try {
        const libro = await obtenerLibroParaEditar(libroId!)

        if (cancelado) return

    const versiones = libro.libro_versiones ?? []
    const version = versiones.find((item) => item.idioma === 'es')
      ?? versiones[0]

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
  }, [libroId])
  
  function toggleCategory(id: string) {
    setSelectedCategories((current) =>
      current.includes(id)
        ? current.filter((category) => category !== id)
        : [...current, id]
    )
  } 
  const activeCategories = categories.filter((category) =>
    selectedCategories.includes(category.id)
  )
  

async function handleGuardarLibro() {
  if (guardando || cargandoLibro || tipoPropuesta !== 'nuevo') {
    return
  }

  if (!title.trim() || !bookType || !idioma) {
    setErrorGuardado('Completá los campos obligatorios.')
    return
  }

  if (modoEdicion && (!libroId || !versionId)) {
    setErrorGuardado(
      'No se pudo identificar la propuesta que querés editar.'
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
    }

    if (modoEdicion && libroId && versionId) {
      await actualizarLibro(libroId, versionId, datos)
    } else {
      await guardarLibro(datos)
    }

    navigate('/biblioteca/libros?tab=propuestas')
  } catch (error) {
    console.error('Error al guardar el libro:', error)

    setErrorGuardado(
      error instanceof Error
        ? error.message
        : 'No se pudo guardar el libro.'
    )
  } finally {
    setGuardando(false)
  }
}


  return (
    <AppLayout
      title={modoEdicion ? 'Editar propuesta' : 'Nueva propuesta'}
      subtitle="Proponé un libro para la Biblioteca de Chronicle"
    >
      <div className="nueva-propuesta"> 
        
      {cargandoLibro && (
        <p className="nueva-propuesta-help">
          Cargando propuesta...
        </p>
      )}

      {errorCarga && (
        <p role="alert" style={{ color: '#e57373' }}>
          {errorCarga}
        </p>
      )}

        <Link
          to="/biblioteca/libros"
          className="nueva-propuesta-back"
        >
          <ArrowLeft size={18} />
          Volver a Libros
        </Link>

        <div className="nueva-propuesta-heading">
          <BookPlus size={28} />
          <div>
            <h2>
              {modoEdicion ? 'Editar propuesta de libro' : 'Nueva propuesta de libro'}
            </h2>
            <p>
              Completá la información del libro que querés proponer.
            </p>
          </div>
        </div>

        <div className="nueva-propuesta-steps">
          <span
            className={
              currentStep === 1 ? 'nueva-propuesta-step--active' : ''
            }
          >
            1. Información general
          </span>

          <span
            className={
              currentStep === 2 ? 'nueva-propuesta-step--active' : ''
            }
          >
            2. Contenido
          </span>

          <span
            className={
              currentStep === 3 ? 'nueva-propuesta-step--active' : ''
            }
          >
            3. Revisión
          </span>
        </div>
  {currentStep === 1 && (
    <>
    
  <section className="nueva-propuesta-panel">
    <h3>Tipo de propuesta</h3>

    <div className="nueva-propuesta-field">
      <label htmlFor="tipo-propuesta">
        ¿Qué querés agregar?
      </label>

      <select
        id="tipo-propuesta"
        value={tipoPropuesta}
        onChange={(event) => {
          setTipoPropuesta(
            event.target.value as TipoPropuesta
          )
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
        <label htmlFor="idioma-libro">
          Idioma del libro *
        </label>

        <select
          id="idioma-libro"
          value={idioma}
          onChange={(event) =>
            setIdioma(event.target.value)
          }
        >
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="pt">Portugués</option>
          <option value="fr">Francés</option>
          <option value="de">Alemán</option>
          <option value="it">Italiano</option>
        </select>
      </div>
    ) : (
      <>
        <div className="nueva-propuesta-field">
          <label htmlFor="libro-original">
            Libro original *
          </label>

          <select
            id="libro-original"
            value={libroOriginalId}
            onChange={(event) =>
              setLibroOriginalId(event.target.value)
            }
            disabled
          >
            <option value="">
              Pendiente de conectar con la Biblioteca
            </option>
          </select>
        </div>

        <div className="nueva-propuesta-field">
          <label htmlFor="idioma-traduccion">
            Idioma de la traducción *
          </label>

          <select
            id="idioma-traduccion"
            value={idioma}
            onChange={(event) =>
              setIdioma(event.target.value)
            }
          >
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="pt">Portugués</option>
            <option value="fr">Francés</option>
            <option value="de">Alemán</option>
            <option value="it">Italiano</option>
          </select>
        </div>

        <p>
          La traducción utilizará una copia del contenido
          original. Esta opción se habilitará cuando
          conectemos los libros guardados.
        </p>
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
              <label htmlFor="book-code">
                Referencia corta del libro
              </label>

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
                <label htmlFor="book-publisher">
                  Autor / Editorial
                </label>
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
              <label htmlFor="book-type">
                Clasificación del libro *
              </label>

              <select
                id="book-type"
                value={bookType}
                onChange={(event) => setBookType(event.target.value)}
                required
              >
                <option value="">Seleccioná una clasificación</option>
                <option value="source">Source</option>
                <option value="partnered">Partnered</option>
                <option value="other">Other</option>
                <option value="homebrew">Homebrew</option>
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
      {showEspecieForm ? (
        <EspecieForm
          bookTitle={title}
          bookCode={bookCode}
          initialData={especies.find(
            (especie) => especie.id === editingSpeciesId
          )}
          onSave={(especie) => {
            setEspecies((actuales) => {
              const existe = actuales.some(
                (item) => item.id === especie.id
              )

              return existe
                ? actuales.map((item) =>
                    item.id === especie.id ? especie : item
                  )
                : [...actuales, especie]
            })

            setShowEspecieForm(false)
            setEditingSpeciesId(null)
          }}
          onCancel={() => {
            setShowEspecieForm(false)
            setEditingSpeciesId(null)
          }}
        />
      ) : (
        <ContenidoLibro
          categories={activeCategories}
          allCategories={categories}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          speciesCount={especies.length}
          species={especies.map((especie) => ({
            id: especie.id,
            nombre: especie.nombre,
          }))}
          categoryItemCounts={{
            especies: especies.length,
          }}
          onAddSpecies={() => {
            setEditingSpeciesId(null)
            setShowEspecieForm(true)
          }}
          onEditSpecies={(id) => {
            setEditingSpeciesId(id)
            setShowEspecieForm(true)
          }}
          onDeleteSpecies={(id) => {
            setEspecies((actuales) =>
              actuales.filter((especie) => especie.id !== id)
            )
          }}
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
    />
  )}

  {errorGuardado && (
    <p role="alert" style={{ color: '#e57373' }}>
      {errorGuardado}
    </p>
  )}

    <div className="nueva-propuesta-actions">
      {currentStep === 1 ? (
        <Link
          to="/biblioteca/libros"
          className="nueva-propuesta-cancel"
        >
          Cancelar
        </Link>
      ) : (
        <button
          type="button"
          className="nueva-propuesta-cancel"
          onClick={() => {
            setErrorGuardado('')
            setCurrentStep((paso) => Math.max(1, paso - 1))
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
            (tipoPropuesta === 'traduccion' && !libroOriginalId)
          }
          onClick={() => setCurrentStep(2)}
        >
          Continuar
          <ChevronRight size={18} />
        </button>
      )}
      {currentStep === 2 && !showEspecieForm && (
        <button
          type="button"
          className="nueva-propuesta-next"
          onClick={() => {
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
            (modoEdicion && !versionId) ||
            tipoPropuesta !== 'nuevo'
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

      </div>
    </AppLayout>
  )
}
