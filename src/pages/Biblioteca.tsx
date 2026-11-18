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
  Skull,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import '../styles/biblioteca/Biblioteca.css'
import { useLanguage } from '../i18n/useLanguage'
import type { TranslationKey } from '../i18n/translations'

type Categoria = { id: string; name: TranslationKey; description: TranslationKey; icon: LucideIcon }
type CategoriaDisponible = Categoria & { ruta: string; meta: TranslationKey }

/** Categorías que ya tienen página propia. */
const disponibles: CategoriaDisponible[] = [
  { id: 'libros', name: 'library.books', description: 'library.booksDescription', meta: 'library.booksMeta', icon: LibraryBig, ruta: '/biblioteca/libros' },
  { id: 'clases', name: 'library.classes', description: 'library.classesDescription', meta: 'library.classesMeta', icon: Shield, ruta: '/biblioteca/clases' },
  { id: 'conjuros', name: 'library.spells', description: 'library.spellsDescription', meta: 'library.spellsMeta', icon: WandSparkles, ruta: '/biblioteca/conjuros' },
]

/** Categorías que todavía no tienen página: se muestran como "Pronto". */
const proximamente: Categoria[] = [
  { id: 'especies', name: 'library.species', description: 'library.speciesDescription', icon: Dna },
  { id: 'trasfondos', name: 'library.backgrounds', description: 'library.backgroundsDescription', icon: ScrollText },
  { id: 'dotes', name: 'library.feats', description: 'library.featsDescription', icon: Award },
  { id: 'monstruos', name: 'library.monsters', description: 'library.monstersDescription', icon: Skull },
  { id: 'objetos', name: 'library.items', description: 'library.itemsDescription', icon: Swords },
  { id: 'reglas', name: 'library.rules', description: 'library.rulesDescription', icon: BookOpen },
  { id: 'otras-opciones', name: 'library.other', description: 'library.otherDescription', icon: Sparkles },
]

export default function Biblioteca() {
  const [search, setSearch] = useState('')
  const { t } = useLanguage()

  const termino = search.toLowerCase().trim()
  const coincide = (categoria: Categoria) =>
    `${t(categoria.name)} ${t(categoria.description)}`.toLowerCase().includes(termino)
  const disponiblesFiltradas = disponibles.filter(coincide)
  const proximamenteFiltradas = proximamente.filter(coincide)

  return (
    <AppLayout title={t('library.title')} subtitle={t('library.subtitle')}>
      <div className="biblioteca">
        <label className="biblioteca-search">
          <Search size={20} aria-hidden="true" />
          <span className="biblioteca-oculto">{t('library.searchLabel')}</span>
          <input
            type="search"
            placeholder={t('library.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        {disponiblesFiltradas.length > 0 && (
          <section className="biblioteca-seccion" aria-labelledby="biblioteca-disponible">
            <h2 id="biblioteca-disponible" className="biblioteca-rotulo">{t('library.available')}</h2>
            <div className="biblioteca-disponibles">
              {disponiblesFiltradas.map(({ id, name, description, meta, icon: Icono, ruta }) => (
                <Link key={id} to={ruta} className="biblioteca-card">
                  <span className="biblioteca-card-cabecera">
                    <span className="biblioteca-card-icono"><Icono size={24} strokeWidth={1.8} aria-hidden="true" /></span>
                    <ChevronRight className="biblioteca-card-flecha" size={20} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="biblioteca-card-texto">
                    <span className="biblioteca-card-titulo">{t(name)}</span>
                    <span className="biblioteca-card-descripcion">{t(description)}</span>
                  </span>
                  <span className="biblioteca-card-meta">{t(meta)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {proximamenteFiltradas.length > 0 && (
          <section className="biblioteca-seccion" aria-labelledby="biblioteca-pronto">
            <div className="biblioteca-seccion-cabecera">
              <h2 id="biblioteca-pronto" className="biblioteca-rotulo">{t('library.comingSoon')}</h2>
              <p>{t('library.comingSoonDescription')}</p>
            </div>
            <ul className="biblioteca-pronto">
              {proximamenteFiltradas.map(({ id, name, icon: Icono }) => (
                <li key={id} className="biblioteca-pronto-item">
                  <Icono size={20} strokeWidth={1.8} aria-hidden="true" />
                  <span className="biblioteca-pronto-nombre">{t(name)}</span>
                  <span className="biblioteca-pronto-etiqueta">{t('sidebar.soon')}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {disponiblesFiltradas.length === 0 && proximamenteFiltradas.length === 0 && (
          <p className="biblioteca-empty">{t('library.empty')}</p>
        )}
      </div>
    </AppLayout>
  )
}
