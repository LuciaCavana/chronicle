import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  LibraryBig,
  Dna,
  Shield,
  ScrollText,
  Award,
  WandSparkles,
  Swords,
  BookOpen,
  Sparkles,
  Search,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import '../styles/Biblioteca.css'

const categories = [
  { id: 'libros', name: 'Libros', description: 'Explorá los libros disponibles', icon: LibraryBig },
  { id: 'especies', name: 'Especies', description: 'Descubrí las especies jugables', icon: Dna },
  { id: 'clases', name: 'Clases', description: 'Clases y subclases', icon: Shield },
  { id: 'trasfondos', name: 'Trasfondos', description: 'El origen de cada aventura', icon: ScrollText },
  { id: 'dotes', name: 'Dotes', description: 'Talentos y capacidades', icon: Award },
  { id: 'conjuros', name: 'Conjuros', description: 'El poder de la magia', icon: WandSparkles },
  { id: 'objetos', name: 'Objetos y equipo', description: 'Herramientas para la aventura', icon: Swords },
  { id: 'reglas', name: 'Reglas', description: 'Consultá las mecánicas', icon: BookOpen },
  { id: 'otras-opciones', name: 'Otras opciones y características', description: 'Más posibilidades para tu personaje', icon: Sparkles },
]

export default function Biblioteca() {
  const [search, setSearch] = useState('')

  const filteredCategories = categories.filter((category) =>
    `${category.name} ${category.description}`
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  )

  return (
    <AppLayout title="Biblioteca" subtitle="Explorá el conocimiento de Chronicle">
      <div className="biblioteca">
        <div className="biblioteca-search">
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar en la Biblioteca..."
            aria-label="Buscar categorías"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="biblioteca-grid">
            {filteredCategories.map((category) => {
            const Icon = category.icon

            const content = (
                <>
                <div className="biblioteca-card-icon">
                    <Icon size={26} strokeWidth={1.7} aria-hidden="true" />
                </div>

                <h2>{category.name}</h2>
                <p>{category.description}</p>
                </>
            )

            if (category.id === 'libros') {
                return (
                <Link
                    key={category.id}
                    to="/biblioteca/libros"
                    className="biblioteca-card biblioteca-card--link"
                >
                    {content}
                </Link>
                )
            }

            return (
                <article className="biblioteca-card" key={category.id}>
                {content}
                </article>
            )
            })}
        </div>

        {filteredCategories.length === 0 && (
          <p className="biblioteca-empty">
            No encontramos categorías que coincidan con tu búsqueda.
          </p>
        )}
      </div>
    </AppLayout>
  )
}
