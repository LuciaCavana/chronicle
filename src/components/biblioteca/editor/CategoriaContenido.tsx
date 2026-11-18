import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { SeccionLibro } from './tipos'

type Props = { seccion: SeccionLibro; onEliminar: (id: string, nombre: string) => void }

/** Vista de una categoría: sus elementos con editar/eliminar y el botón para agregar. */
export default function CategoriaContenido({ seccion, onEliminar }: Props) {
  return (
    <section className="categoria-contenido" aria-labelledby="categoria-contenido-titulo">
      <header className="categoria-contenido__cabecera">
        <div>
          <h2 id="categoria-contenido-titulo">{seccion.titulo}</h2>
          <p>{seccion.sinEditor ? 'Esta categoría todavía no tiene editor.' : seccion.elementos.length === 0 ? 'Todavía no hay elementos.' : `${seccion.elementos.length} ${seccion.elementos.length === 1 ? 'elemento' : 'elementos'}`}</p>
        </div>
        {seccion.agregar && <button type="button" className="editor-libro__boton editor-libro__boton--primario" onClick={seccion.agregar}>
          <Plus size={17} aria-hidden="true" />Agregar {seccion.singular}
        </button>}
      </header>

      {seccion.extras && seccion.extras.length > 0 && <div className="categoria-contenido__extras">
        {seccion.extras.map(extra => <button key={extra.etiqueta} type="button" className="editor-libro__boton" onClick={extra.accion}>{extra.etiqueta}</button>)}
      </div>}

      {seccion.elementos.length > 0 && <ul className="categoria-contenido__lista">
        {seccion.elementos.map(elemento => {
          const nombre = elemento.nombre.trim() || 'Sin nombre'
          return <li key={elemento.id} className={`categoria-contenido__item${elemento.incompleto ? ' categoria-contenido__item--incompleto' : ''}`}>
            <button type="button" className="categoria-contenido__abrir" onClick={() => seccion.editar(elemento.id)}>
              <strong>{nombre}</strong>
              {(elemento.detalle || elemento.incompleto) && <span>{elemento.incompleto ? 'Falta completar' : elemento.detalle}</span>}
            </button>
            <button type="button" className="categoria-contenido__icono" aria-label={`Editar ${nombre}`} onClick={() => seccion.editar(elemento.id)}><Pencil size={16} aria-hidden="true" /></button>
            <button type="button" className="categoria-contenido__icono categoria-contenido__icono--peligro" aria-label={`Eliminar ${nombre}`} onClick={() => onEliminar(elemento.id, nombre)}><Trash2 size={16} aria-hidden="true" /></button>
          </li>
        })}
      </ul>}
    </section>
  )
}
