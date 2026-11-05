
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  FileText,
  LibraryBig,
  Plus,
  Search,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import '../styles/Libros.css'

type BooksTab = 'catalogo' | 'propuestas'

export default function Libros() {
  const [activeTab, setActiveTab] = useState<BooksTab>('catalogo')
  const [search, setSearch] = useState('')

  function changeTab(tab: BooksTab) {
    setActiveTab(tab)
    setSearch('')
  }

  return (
    <AppLayout title="Libros" subtitle="Explorá los libros de Chronicle">
      <div className="libros">
        <Link to="/biblioteca" className="libros-back">
          <ArrowLeft size={18} />
          Volver a Biblioteca
        </Link>

        <div className="libros-tabs">
          <button
            type="button"
            className={`libros-tab ${
              activeTab === 'catalogo' ? 'libros-tab--active' : ''
            }`}
            onClick={() => changeTab('catalogo')}
          >
            <LibraryBig size={18} />
            Catálogo
          </button>

          <button
            type="button"
            className={`libros-tab ${
              activeTab === 'propuestas' ? 'libros-tab--active' : ''
            }`}
            onClick={() => changeTab('propuestas')}
          >
            <FileText size={18} />
            Mis propuestas
          </button>
        </div>

        {activeTab === 'propuestas' && (
          <div className="libros-propuestas-header">
            <div>
              <h2>Mis propuestas</h2>
              <p>
                Gestioná los libros que querés incorporar a Chronicle.
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
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              activeTab === 'catalogo'
                ? 'Buscar libros...'
                : 'Buscar mis propuestas...'
            }
            aria-label="Buscar"
          />
        </div>

        <div className="libros-empty">
          {activeTab === 'catalogo' ? (
            <>
              <BookOpen size={46} strokeWidth={1.4} />
              <h2>Todavía no hay libros disponibles</h2>
              <p>
                Los libros aprobados aparecerán en este catálogo.
              </p>
            </>
          ) : (
            <>
              <FileText size={46} strokeWidth={1.4} />
              <h2>Todavía no tenés propuestas</h2>
              <p>
                Acá podrás consultar tus borradores y propuestas
                enviadas para revisión.
              </p>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
