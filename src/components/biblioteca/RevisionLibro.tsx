import { useLanguage } from '../../i18n/useLanguage'

type Categoria = {
  id: string
  label: string
}

type RevisionLibroProps = {
  titulo: string
  codigo: string
  edicion: string
  editorial: string
  clasificacion: string
  idioma: string
  descripcion: string
  categorias: Categoria[]
  cantidadEspecies: number
  cantidadConjuros: number
  cantidadClases?: number
  cantidadSubclases?: number
  cantidadObjetos?: number
}

export default function RevisionLibro({
  titulo,
  codigo,
  edicion,
  editorial,
  clasificacion,
  idioma,
  descripcion,
  categorias,
  cantidadEspecies,
  cantidadConjuros,
  cantidadClases = 0,
  cantidadSubclases = 0,
  cantidadObjetos = 0,
}: RevisionLibroProps) {
  const { t } = useLanguage()
  const clasificaciones: Record<string, string> = {
    source: 'Source',
    partnered: 'Partnered',
    other: 'Other',
    homebrew: 'Homebrew',
  }

  const idiomas: Record<string, string> = {
    es: 'Español',
    en: 'Inglés',
    pt: 'Portugués',
    fr: 'Francés',
    de: 'Alemán',
    it: 'Italiano',
  }


const advertencias: string[] = []

if (categorias.length === 0) {
  advertencias.push(t('review.warningCategory'))
}

if (
  categorias.some((categoria) => categoria.id === 'especies') &&
  cantidadEspecies === 0
) {
  advertencias.push(
    t('review.warningSpecies')
  )
}

if (categorias.some(categoria => categoria.id === 'objetos') && cantidadObjetos === 0) {
  advertencias.push(t('review.warningItems'))
}

if (categorias.some(categoria => categoria.id === 'subclases') && cantidadSubclases === 0) {
  advertencias.push(t('review.warningSubclasses'))
}

if (categorias.some(categoria => categoria.id === 'clases') && cantidadClases === 0) {
  advertencias.push(t('review.warningClasses'))
}

if (
  categorias.some((categoria) => categoria.id === 'conjuros') &&
  cantidadConjuros === 0
) {
  advertencias.push(
    t('review.warningSpells')
  )
}


  return (
    <div className="revision-libro">
      <section className="nueva-propuesta-panel">
        <h3>{t('review.general')}</h3>

        <p><strong>{t('review.title')}</strong> {titulo || t('review.incomplete')}</p>
        <p><strong>{t('review.reference')}</strong> {codigo || t('review.unspecifiedF')}</p>
        <p><strong>{t('review.edition')}</strong> {edicion || t('review.unspecifiedF')}</p>
        <p><strong>{t('review.publisher')}</strong> {editorial || t('review.unspecifiedM')}</p>
        <p>
          <strong>{t('review.classification')}</strong>{' '}
          {clasificaciones[clasificacion] || t('review.incomplete')}
        </p>
        <p><strong>{t('review.language')}</strong> {idiomas[idioma] || idioma}</p>
        <p><strong>{t('review.description')}</strong> {descripcion || t('review.noDescription')}</p>
      </section>

      <section className="nueva-propuesta-panel">
        <h3>{t('review.content')}</h3>

        {categorias.length === 0 ? (
          <p>{t('review.noCategories')}</p>
        ) : (
          <ul>
            {categorias.map((categoria) => (
              <li key={categoria.id}>
                {categoria.label}
                {categoria.id === 'especies'
                ? ` — ${cantidadEspecies} ${t('review.species')}`
                : categoria.id === 'clases'
                    ? ` — ${cantidadClases} ${t('review.classes')}`
                : categoria.id === 'subclases'
                    ? ` — ${cantidadSubclases} ${t('review.subclasses')}`
                : categoria.id === 'objetos'
                    ? ` — ${cantidadObjetos} ${t('review.items')}`
                : categoria.id === 'conjuros'
                    ? ` — ${cantidadConjuros} ${t('review.spells')}`
                    : ` — ${t('review.noElements')}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      {advertencias.length > 0 && (
        <section className="nueva-propuesta-panel">
          <h3>{t('review.warnings')}</h3>
          <ul>
            {advertencias.map((advertencia) => (
              <li key={advertencia}>{advertencia}</li>
            ))}
          </ul>
          <p>
            {t('review.warningInfo')}
          </p>
        </section>
      )}
      
    </div>
  )
}
