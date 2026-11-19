import { AlertTriangle, Link2 } from 'lucide-react'

export type LibroPublicadoOpcion = { libroId: string; versionId: string; titulo: string; codigo: string | null; idioma: string
 /** Se basa en otro libro (no es un original). */
 derivado?: boolean }

type Props = {
 titulo: string
 codigo: string
 libros: LibroPublicadoOpcion[]
 /** Libro publicado elegido como original ('' si ninguno). */
 valor: string
 onChange: (libroId: string) => void
 deshabilitado?: boolean
 /** Abre una corrección del libro publicado, en vez de crear un libro nuevo. */
 onCorregir?: (libro: LibroPublicadoOpcion) => void
 corrigiendo?: boolean
}

/** Sin mayúsculas, tildes, espacios ni signos: "PHB'24" y "phb 24" son iguales. */
export const normalizarNombre = (texto: string | null | undefined) =>
 (texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '')

/**
 * "Basado en": el autor de un libro nuevo indica el libro publicado del que parte, así el
 * administrador puede compararlo. Si el título o el código coinciden con uno publicado, avisa.
 */
export default function BasadoEnLibro({ titulo, codigo, libros, valor, onChange, deshabilitado, onCorregir, corrigiendo }: Props) {
 // Una opción por libro (no por idioma).
 const unicos = libros.filter((libro, i) => libros.findIndex(l => l.libroId === libro.libroId) === i)
 const t = normalizarNombre(titulo)
 const c = normalizarNombre(codigo)
 // Primero por título; entre los que coinciden por código, los originales antes que los derivados.
 const coincidencia = valor ? undefined
  : libros.find(l => t && normalizarNombre(l.titulo) === t)
  ?? [...libros].sort((a, b) => Number(!!a.derivado) - Number(!!b.derivado)).find(l => c && normalizarNombre(l.codigo) === c)
 const motivo = coincidencia && (t && normalizarNombre(coincidencia.titulo) === t ? 'llamado' : 'con el código')

 return <>
  {coincidencia && <div className="basado-en__aviso" role="status">
   <AlertTriangle size={20} aria-hidden="true"/>
   <p>Ya hay un libro publicado {motivo === 'llamado' ? <>llamado «<strong>{coincidencia.titulo}</strong>»</> : <>con el código <strong>{coincidencia.codigo}</strong> («{coincidencia.titulo}»)</>}.
    {onCorregir ? ' Si querés corregirlo, es mejor proponer cambios a ese libro.' : ''} Si es otro libro basado en él, vinculalo como libro original.</p>
   <div className="basado-en__acciones">
    <button type="button" className="editor-libro__boton" disabled={deshabilitado} onClick={() => onChange(coincidencia.libroId)}>
     <Link2 size={16} aria-hidden="true"/>Vincular como libro original
    </button>
    {onCorregir && <button type="button" className="editor-libro__boton" disabled={deshabilitado || corrigiendo} onClick={() => onCorregir(coincidencia)}>
     {corrigiendo ? 'Abriendo…' : 'Proponer cambios a ese libro'}
    </button>}
   </div>
  </div>}
  <div className="nueva-propuesta-field">
   <label htmlFor="basado-en">Basado en (opcional)</label>
   <select id="basado-en" value={valor} disabled={deshabilitado} onChange={e => onChange(e.target.value)} aria-describedby="basado-en-ayuda">
    <option value="">Ningún libro original</option>
    {unicos.map(libro => <option key={libro.libroId} value={libro.libroId}>{[libro.titulo, libro.codigo].filter(Boolean).join(' · ')}</option>)}
   </select>
   <small id="basado-en-ayuda" className="basado-en__ayuda">Sirve para que el administrador compare tu libro con el publicado.</small>
  </div>
 </>
}
