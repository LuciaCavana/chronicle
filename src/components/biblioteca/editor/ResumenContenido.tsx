import { useState } from 'react'
import { ChevronRight, Plus, Search } from 'lucide-react'
import type { SeccionLibro } from './tipos'
import { coincide } from './buscar'

type Props = {
  secciones: SeccionLibro[]
  onCategoria: (id: string) => void
  onElemento: (categoria: string, id: string) => void
  onAgregar: (categoria: string) => void
}

/** Vista inicial del contenido: un cuadro por categoría con buscador y tarjetitas de lo cargado. */
export default function ResumenContenido({ secciones, onCategoria, onElemento, onAgregar }: Props) {
  const [busquedas, setBusquedas] = useState<Record<string, string>>({})
  return (
    <section className="resumen-contenido" aria-labelledby="resumen-contenido-titulo">
      <div className="editor-libro__encabezado">
        <h2 id="resumen-contenido-titulo">Contenido del libro</h2>
        <p>Todo lo cargado, por categoría. Tocá una tarjeta para editarla.</p>
      </div>
      {secciones.length === 0 && <p className="editor-libro__ayuda">El libro todavía no tiene categorías. Agregalas desde el índice o en “Datos del libro”.</p>}
      <div className="resumen-contenido__cuadros">
        {secciones.map(seccion => {
          const busqueda = busquedas[seccion.id] ?? ''
          const visibles = seccion.elementos.filter(elemento => coincide(busqueda, elemento.nombre, elemento.detalle))
          return (
            <article key={seccion.id} className="resumen-contenido__cuadro" aria-labelledby={`resumen-${seccion.id}`}>
              <header className="resumen-contenido__cabecera">
                <button type="button" id={`resumen-${seccion.id}`} className="resumen-contenido__titulo" onClick={() => onCategoria(seccion.id)}>
                  {seccion.titulo}<ChevronRight size={16} aria-hidden="true" />
                </button>
                <span className="resumen-contenido__cantidad">{seccion.sinEditor ? '–' : seccion.elementos.length}</span>
              </header>
              {seccion.sinEditor ? <p className="editor-libro__ayuda">Esta categoría todavía no tiene editor.</p> : <>
                {seccion.elementos.length > 3 && <label className="resumen-contenido__buscar">
                  <Search size={15} aria-hidden="true" />
                  <span className="editor-libro__oculto">Buscar en {seccion.titulo}</span>
                  <input type="search" value={busqueda} placeholder={`Buscar en ${seccion.titulo.toLocaleLowerCase('es')}`} onChange={e => setBusquedas(actuales => ({ ...actuales, [seccion.id]: e.target.value }))} />
                </label>}
                {seccion.elementos.length === 0 ? <p className="resumen-contenido__vacio">Todavía no hay elementos.</p>
                  : visibles.length === 0 ? <p className="resumen-contenido__vacio">Nada coincide con “{busqueda}”.</p>
                  : <ul className="resumen-contenido__tarjetas">
                    {visibles.map(elemento => <li key={elemento.id}>
                      <button type="button" className={`resumen-contenido__tarjeta${elemento.incompleto ? ' resumen-contenido__tarjeta--incompleta' : ''}`} onClick={() => onElemento(seccion.id, elemento.id)}>
                        <strong>{elemento.nombre.trim() || 'Sin nombre'}</strong>
                        {(elemento.detalle || elemento.incompleto) && <span>{elemento.incompleto ? 'Falta completar' : elemento.detalle}</span>}
                      </button>
                    </li>)}
                  </ul>}
                {seccion.agregar && <button type="button" className="resumen-contenido__agregar" onClick={() => onAgregar(seccion.id)}>
                  <Plus size={15} aria-hidden="true" />Agregar {seccion.singular}
                </button>}
              </>}
            </article>
          )
        })}
      </div>
    </section>
  )
}
