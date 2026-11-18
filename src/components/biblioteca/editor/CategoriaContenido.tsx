import { useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { SeccionLibro } from './tipos'
import { coincide } from './buscar'

type Props = { seccion: SeccionLibro; onEliminar: (id: string, nombre: string) => void }

/** Vista de una categoría: sus elementos con editar/eliminar y el botón para agregar. */
export default function CategoriaContenido({ seccion, onEliminar }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const visibles = seccion.elementos.filter(elemento => coincide(busqueda, elemento.nombre, elemento.detalle))
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

      {seccion.elementos.length > 3 && <label className="resumen-contenido__buscar categoria-contenido__buscar">
        <Search size={16} aria-hidden="true" />
        <span className="editor-libro__oculto">Buscar en {seccion.titulo}</span>
        <input type="search" value={busqueda} placeholder={`Buscar en ${seccion.titulo.toLocaleLowerCase('es')}`} onChange={e => setBusqueda(e.target.value)} />
      </label>}
      {seccion.elementos.length > 0 && visibles.length === 0 && <p className="editor-libro__ayuda">Nada coincide con “{busqueda}”.</p>}

      {visibles.length > 0 && <ul className="categoria-contenido__lista">
        {visibles.map(elemento => {
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
