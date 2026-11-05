
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookPlus, ChevronRight } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import '../styles/NuevaPropuesta.css'
import ContenidoLibro from '../components/biblioteca/ContenidoLibro'
import EspecieForm, {
  type Especie,
} from '../components/biblioteca/EspecieForm'

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
  return (
    <AppLayout
      title="Nueva propuesta"
      subtitle="Proponé un libro para la Biblioteca de Chronicle"
    >
      <div className="nueva-propuesta">
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
            <h2>Nueva propuesta de libro</h2>
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
            onSave={(especie) => {
              setEspecies((current) => [...current, especie])
              setShowEspecieForm(false)
            }}
            onCancel={() => setShowEspecieForm(false)}
          />
        ) : (
          <ContenidoLibro
            categories={activeCategories}
            allCategories={categories}
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
            speciesCount={especies.length}
            categoryItemCounts={{ especies: especies.length }}
            onAddSpecies={() => setShowEspecieForm(true)}
            speciesNames={especies.map((especie) => especie.nombre)}
          />
        )}
      </>
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
          onClick={() => setCurrentStep(1)}
        >
          Anterior
        </button>
      )}

      {currentStep === 1 && (
        <button
          type="button"
          className="nueva-propuesta-next"
          disabled={!title.trim() ||!bookType }
          onClick={() => setCurrentStep(2)}
        >
          Continuar
          <ChevronRight size={18} />
        </button>
      )}

      {currentStep === 2 && (
        <button
          type="button"
          className="nueva-propuesta-next"
          disabled
          title="La revisión estará disponible próximamente"
        >
          Ir a revisión
          <ChevronRight size={18} />
        </button>
      )}
    </div>

      </div>
    </AppLayout>
  )
}
