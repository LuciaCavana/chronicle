import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { claveNombre } from '../../lib/listas'
import '../../styles/formularios/SelectorConjuros.css'
import '../../styles/formularios/SelectorClases.css'

type Props = {
  abierto: boolean
  /** Nombres de clase disponibles (del libro, de libros publicados y de las listas de los conjuros). */
  clases: string[]
  elegidas: string[]
  titulo?: string
  onAceptar: (elegidas: string[]) => void
  onCerrar: () => void
}

/**
 * Popup con casillas para elegir de qué clases sale una lista de conjuros.
 * Conviene montarlo solo mientras está abierto: toma las clases elegidas al abrirse.
 */
export default function SelectorClases({ abierto, clases, elegidas, titulo = 'Elegir clases', onAceptar, onCerrar }: Props) {
  const [marcadas, setMarcadas] = useState<string[]>(elegidas)
  const [busqueda, setBusqueda] = useState('')
  const [otra, setOtra] = useState('')
  useEffect(() => {
    if (!abierto) return
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCerrar() } }
    document.addEventListener('keydown', escape, true)
    return () => document.removeEventListener('keydown', escape, true)
  }, [abierto, onCerrar])

  // Todas las opciones: las disponibles más las ya elegidas que no estén (por ejemplo, escritas antes a mano).
  const opciones = useMemo(() => {
    const vistas = new Map<string, string>()
    for (const nombre of [...clases, ...elegidas, ...marcadas]) {
      const clave = claveNombre(nombre)
      if (clave && !vistas.has(clave)) vistas.set(clave, nombre.trim())
    }
    return [...vistas.values()].sort((a, b) => a.localeCompare(b, 'es'))
  }, [clases, elegidas, marcadas])
  const filtradas = opciones.filter(o => claveNombre(o).includes(claveNombre(busqueda)))
  const marcada = (nombre: string) => marcadas.some(m => claveNombre(m) === claveNombre(nombre))
  const alternar = (nombre: string) => setMarcadas(actuales => marcada(nombre) ? actuales.filter(m => claveNombre(m) !== claveNombre(nombre)) : [...actuales, nombre])
  function agregarOtra() {
    const nombre = otra.trim()
    if (!nombre) return
    if (!marcada(nombre)) setMarcadas(actuales => [...actuales, nombre])
    setOtra('')
  }

  if (!abierto) return null
  return <div className="selector-conjuros-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar() }}>
    <div className="selector-conjuros-modal selector-clases" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="selector-conjuros-header">
        <h3>{titulo}</h3>
        <button type="button" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
      </div>
      <p className="selector-clases-ayuda">Los conjuros que se eligen con esta dote salen de las listas de estas clases.</p>
      {opciones.length > 6 && <div className="selector-conjuros-busqueda">
        <Search size={18} />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar clase..." autoFocus />
      </div>}
      <div className="selector-clases-lista" role="group" aria-label="Clases">
        {filtradas.map(nombre => <label key={nombre} className="selector-clases-opcion">
          <input type="checkbox" checked={marcada(nombre)} onChange={() => alternar(nombre)} />
          <span>{nombre}</span>
        </label>)}
        {opciones.length === 0 && <p className="selector-conjuros-vacio">No hay clases cargadas en este libro ni en los publicados. Agregá una abajo.</p>}
        {opciones.length > 0 && filtradas.length === 0 && <p className="selector-conjuros-vacio">Ninguna clase coincide con la búsqueda.</p>}
      </div>
      <div className="selector-clases-otra">
        <input value={otra} onChange={e => setOtra(e.target.value)} placeholder="Otra clase…" aria-label="Agregar otra clase"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarOtra() } }} />
        <button type="button" onClick={agregarOtra} disabled={!otra.trim()}>Agregar</button>
      </div>
      <div className="selector-conjuros-acciones selector-clases-acciones">
        <span>{marcadas.length} {marcadas.length === 1 ? 'clase elegida' : 'clases elegidas'}</span>
        <div>
          <button type="button" className="selector-clases-cancelar" onClick={onCerrar}>Cancelar</button>
          <button type="button" className="selector-clases-aceptar" onClick={() => { onAceptar(marcadas); onCerrar() }}>Aceptar</button>
        </div>
      </div>
    </div>
  </div>
}
