import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, ClipboardCheck, Plus, ScrollText } from 'lucide-react'
import type { ElementoActivo, SeccionLibro } from './tipos'

type Props = {
  secciones: SeccionLibro[]
  vista: string
  activo: ElementoActivo
  problemas: number
  onDatos: () => void
  /** Capítulos del libro (texto y ubicación de las fichas). */
  onCapitulos: () => void
  capitulos: number
  onContenido: () => void
  onRevisar: () => void
  onCategoria: (id: string) => void
  onElemento: (categoria: string, id: string) => void
  onAgregar: (categoria: string) => void
  /** Categorías que el libro todavía no tiene. */
  disponibles: { id: string; titulo: string }[]
  onAgregarCategoria: (id: string) => void
}

/** Índice del libro: datos, categorías activas con sus elementos y revisión. */
export default function IndiceLibro({ secciones, vista, activo, problemas, onDatos, onCapitulos, capitulos, onContenido, onRevisar, onCategoria, onElemento, onAgregar, disponibles, onAgregarCategoria }: Props) {
  const [eligiendoCategoria, setEligiendoCategoria] = useState(false)
  const categoriaActual = vista.startsWith('cat:') ? vista.slice(4) : null
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set(categoriaActual ? [categoriaActual] : []))
  const estaAbierta = (id: string) => abiertas.has(id) || id === categoriaActual
  const alternar = (id: string) => setAbiertas(actual => {
    const siguiente = new Set(actual)
    if (estaAbierta(id)) siguiente.delete(id); else siguiente.add(id)
    return siguiente
  })

  return (
    <nav className="indice-libro" aria-label="Índice del libro">
      <button type="button" className={`indice-libro__entrada${vista === 'datos' ? ' indice-libro__entrada--activa' : ''}`} aria-current={vista === 'datos' ? 'page' : undefined} onClick={onDatos}>
        <BookOpen size={18} aria-hidden="true" />Datos del libro
      </button>
      <button type="button" className={`indice-libro__entrada${vista === 'capitulos' ? ' indice-libro__entrada--activa' : ''}`} aria-current={vista === 'capitulos' ? 'page' : undefined} onClick={onCapitulos}>
        <ScrollText size={18} aria-hidden="true" />Capítulos<span className="indice-libro__cantidad">{capitulos}</span>
      </button>

      <button type="button" className={`indice-libro__grupo indice-libro__grupo--boton${vista === 'contenido' ? ' indice-libro__grupo--activo' : ''}`} aria-current={vista === 'contenido' ? 'page' : undefined} onClick={onContenido}>
        Contenido<span>Ver todo</span>
      </button>
      {secciones.length === 0 && <p className="indice-libro__vacio">Elegí qué incluye el libro en “Datos del libro”.</p>}
      {secciones.map(seccion => {
        const abierta = estaAbierta(seccion.id)
        const conProblemas = seccion.elementos.some(e => e.incompleto)
        return (
          <div key={seccion.id} className="indice-libro__seccion">
            <div className={`indice-libro__categoria${categoriaActual === seccion.id && !activo?.id ? ' indice-libro__categoria--activa' : ''}`}>
              <button type="button" className="indice-libro__flecha" aria-label={abierta ? `Contraer ${seccion.titulo}` : `Desplegar ${seccion.titulo}`} aria-expanded={abierta} onClick={() => alternar(seccion.id)}>
                {abierta ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
              </button>
              <button type="button" className="indice-libro__nombre-categoria" onClick={() => { onCategoria(seccion.id); setAbiertas(a => new Set(a).add(seccion.id)) }}>
                <span>{seccion.titulo}</span>
                {conProblemas && <span className="indice-libro__alerta" title="Hay elementos incompletos" aria-label="Hay elementos incompletos" />}
                <span className="indice-libro__cantidad">{seccion.sinEditor ? '–' : seccion.elementos.length}</span>
              </button>
            </div>
            {abierta && !seccion.sinEditor && <ul className="indice-libro__elementos">
              {seccion.elementos.map(elemento => {
                const esActivo = activo?.categoria === seccion.id && activo.id === elemento.id
                return <li key={elemento.id}>
                  <button type="button" className={`indice-libro__elemento${esActivo ? ' indice-libro__elemento--activo' : ''}`} aria-current={esActivo ? 'page' : undefined} onClick={() => onElemento(seccion.id, elemento.id)}>
                    <span className="indice-libro__elemento-nombre">{elemento.nombre.trim() || 'Sin nombre'}</span>
                    {elemento.incompleto && <span className="indice-libro__alerta" title="Incompleto" aria-label="Incompleto" />}
                  </button>
                </li>
              })}
              {seccion.agregar && <li>
                <button type="button" className={`indice-libro__agregar${activo?.categoria === seccion.id && activo.id === null ? ' indice-libro__elemento--activo' : ''}`} onClick={() => onAgregar(seccion.id)}>
                  <Plus size={14} aria-hidden="true" />Agregar {seccion.singular}
                </button>
              </li>}
            </ul>}
          </div>
        )
      })}

      {disponibles.length > 0 && <div className="indice-libro__nueva-categoria">
        <button type="button" className="indice-libro__agregar-categoria" aria-expanded={eligiendoCategoria} onClick={() => setEligiendoCategoria(!eligiendoCategoria)}>
          <Plus size={15} aria-hidden="true" />Agregar categoría
        </button>
        {eligiendoCategoria && <ul className="indice-libro__opciones" aria-label="Categorías para agregar">
          {disponibles.map(categoria => <li key={categoria.id}>
            <button type="button" onClick={() => { setEligiendoCategoria(false); onAgregarCategoria(categoria.id) }}>{categoria.titulo}</button>
          </li>)}
        </ul>}
      </div>}

      <button type="button" className={`indice-libro__entrada indice-libro__revisar${vista === 'revisar' ? ' indice-libro__entrada--activa' : ''}`} aria-current={vista === 'revisar' ? 'page' : undefined} onClick={onRevisar}>
        <ClipboardCheck size={18} aria-hidden="true" />Revisar y enviar
        {problemas > 0 && <span className="indice-libro__problemas" aria-label={`${problemas} para corregir`}>{problemas}</span>}
      </button>
    </nav>
  )
}
