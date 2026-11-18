import { useLanguage } from '../../i18n/useLanguage'
import type { TranslationKey } from '../../i18n/translations'

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
  /** Cantidad de elementos por categoría. Las categorías que todavía no tienen editor no figuran. */
  cantidades: Record<string, number>
}

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

/**
 * Resumen de lo que se va a enviar a aprobación. Los problemas a corregir se
 * muestran aparte, en "Antes de enviar", con enlaces para ir a corregirlos.
 */
export default function RevisionLibro({
  titulo,
  codigo,
  edicion,
  editorial,
  clasificacion,
  idioma,
  descripcion,
  categorias,
  cantidades,
}: RevisionLibroProps) {
  const { t } = useLanguage()
  // Las etiquetas traen ":" al final (se usaban en línea); en la grilla no hace falta.
  const rotulo = (clave: TranslationKey) => t(clave).replace(/:\s*$/, '')

  const datos: { clave: TranslationKey; valor: string; falta?: boolean }[] = [
    { clave: 'review.title', valor: titulo || t('review.incomplete'), falta: !titulo },
    { clave: 'review.reference', valor: codigo || t('review.unspecifiedF'), falta: !codigo },
    { clave: 'review.edition', valor: edicion || t('review.unspecifiedF'), falta: !edicion },
    { clave: 'review.publisher', valor: editorial || t('review.unspecifiedM'), falta: !editorial },
    { clave: 'review.classification', valor: clasificaciones[clasificacion] || t('review.incomplete'), falta: !clasificaciones[clasificacion] },
    { clave: 'review.language', valor: idiomas[idioma] || idioma },
  ]

  return (
    <div className="revision-libro">
      <section className="nueva-propuesta-panel revision-libro__panel">
        <h3>{t('review.general')}</h3>
        <dl className="revision-libro__datos">
          {datos.map(({ clave, valor, falta }) => (
            <div key={clave} className="revision-libro__dato">
              <dt>{rotulo(clave)}</dt>
              <dd className={falta ? 'revision-libro__falta' : undefined}>{valor}</dd>
            </div>
          ))}
          <div className="revision-libro__dato revision-libro__dato--ancho">
            <dt>{rotulo('review.description')}</dt>
            <dd className={descripcion ? 'revision-libro__descripcion' : 'revision-libro__falta'}>{descripcion || t('review.noDescription')}</dd>
          </div>
        </dl>
      </section>

      <section className="nueva-propuesta-panel revision-libro__panel">
        <h3>{t('review.content')}</h3>
        {categorias.length === 0 ? (
          <p className="revision-libro__falta">{t('review.noCategories')}</p>
        ) : (
          <ul className="revision-libro__categorias">
            {categorias.map((categoria) => {
              const cantidad = cantidades[categoria.id]
              return (
                <li key={categoria.id} className="revision-libro__categoria">
                  <span>{categoria.label}</span>
                  {cantidad !== undefined && <span className={cantidad === 0 ? 'revision-libro__cantidad revision-libro__cantidad--vacia' : 'revision-libro__cantidad'}>
                    {cantidad === 0 ? t('review.noElements') : cantidad === 1 ? t('review.elementOne') : `${cantidad} ${t('review.elements')}`}
                  </span>}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
