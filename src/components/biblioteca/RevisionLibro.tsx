
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
}: RevisionLibroProps) {
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
  advertencias.push('No seleccionaste ninguna categoría.')
}

if (
  categorias.some((categoria) => categoria.id === 'especies') &&
  cantidadEspecies === 0
) {
  advertencias.push(
    'La categoría Especies no tiene elementos cargados.'
  )
}

if (categorias.some(categoria => categoria.id === 'clases') && cantidadClases === 0) {
  advertencias.push('La categoría Clases no tiene elementos cargados.')
}

if (
  categorias.some((categoria) => categoria.id === 'conjuros') &&
  cantidadConjuros === 0
) {
  advertencias.push(
    'La categoría Conjuros no tiene elementos cargados.'
  )
}


  return (
    <div className="revision-libro">
      <section className="nueva-propuesta-panel">
        <h3>Información general</h3>

        <p><strong>Título:</strong> {titulo || 'Sin completar'}</p>
        <p><strong>Referencia:</strong> {codigo || 'No especificada'}</p>
        <p><strong>Edición:</strong> {edicion || 'No especificada'}</p>
        <p><strong>Autor / Editorial:</strong> {editorial || 'No especificado'}</p>
        <p>
          <strong>Clasificación:</strong>{' '}
          {clasificaciones[clasificacion] || 'Sin completar'}
        </p>
        <p><strong>Idioma:</strong> {idiomas[idioma] || idioma}</p>
        <p><strong>Descripción:</strong> {descripcion || 'Sin descripción'}</p>
      </section>

      <section className="nueva-propuesta-panel">
        <h3>Contenido del libro</h3>

        {categorias.length === 0 ? (
          <p>No seleccionaste categorías.</p>
        ) : (
          <ul>
            {categorias.map((categoria) => (
              <li key={categoria.id}>
                {categoria.label}
                {categoria.id === 'especies'
                ? ` — ${cantidadEspecies} especie(s)`
                : categoria.id === 'clases'
                    ? ` — ${cantidadClases} clase(s)`
                : categoria.id === 'conjuros'
                    ? ` — ${cantidadConjuros} conjuro(s)`
                    : ' — Sin elementos cargados'}
              </li>
            ))}
          </ul>
        )}
      </section>

      {advertencias.length > 0 && (
        <section className="nueva-propuesta-panel">
          <h3>Advertencias</h3>
          <ul>
            {advertencias.map((advertencia) => (
              <li key={advertencia}>{advertencia}</li>
            ))}
          </ul>
          <p>
            Estas advertencias son informativas y no impiden
            guardar la propuesta.
          </p>
        </section>
      )}
      
    </div>
  )
}
