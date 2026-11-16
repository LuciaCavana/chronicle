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
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import '../styles/Biblioteca.css'
import { useLanguage } from '../i18n/useLanguage'
import type { TranslationKey } from '../i18n/translations'

const categories: { id: string; name: TranslationKey; description: TranslationKey; icon: typeof LibraryBig }[] = [
  { id: 'libros', name: 'library.books', description: 'library.booksDescription', icon: LibraryBig },
  { id: 'especies', name: 'library.species', description: 'library.speciesDescription', icon: Dna },
  { id: 'clases', name: 'library.classes', description: 'library.classesDescription', icon: Shield },
  { id: 'trasfondos', name: 'library.backgrounds', description: 'library.backgroundsDescription', icon: ScrollText },
  { id: 'dotes', name: 'library.feats', description: 'library.featsDescription', icon: Award },
  { id: 'conjuros', name: 'library.spells', description: 'library.spellsDescription', icon: WandSparkles },
  { id: 'monstruos', name: 'library.monsters', description: 'library.monstersDescription', icon: Skull },
  { id: 'objetos', name: 'library.items', description: 'library.itemsDescription', icon: Swords },
  { id: 'reglas', name: 'library.rules', description: 'library.rulesDescription', icon: BookOpen },
  { id: 'otras-opciones', name: 'library.other', description: 'library.otherDescription', icon: Sparkles },
]

export default function Biblioteca() {
  const [search, setSearch] = useState('')
  const { t } = useLanguage()

  const filteredCategories = categories.filter((category) =>
    `${t(category.name)} ${t(category.description)}`
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  )

  return (
    <AppLayout title={t('library.title')} subtitle={t('library.subtitle')}>
      <div className="biblioteca">
        <div className="biblioteca-search">
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            placeholder={t('library.search')}
            aria-label={t('library.searchLabel')}
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

                <h2>{t(category.name)}</h2>
                <p>{t(category.description)}</p>
                </>
            )

            if (category.id === 'libros' || category.id === 'conjuros' || category.id === 'clases') {
                return (
                <Link
                    key={category.id}
                    to={category.id === "libros" ? "/biblioteca/libros" : category.id === "clases" ? "/biblioteca/clases" : "/biblioteca/conjuros"}
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
            {t('library.empty')}
          </p>
        )}
      </div>
    </AppLayout>
  )
}
