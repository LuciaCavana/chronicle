import { etiquetaBloque, leerCapitulos, textoBloque, type Bloque } from '../../../types/capitulo'
import TextoDiff from './TextoDiff'

type Fila = { clave: string; etiqueta: string; antes: string; despues: string }

/**
 * Cambios de un capítulo leídos como texto: cada bloque (párrafo, título, recuadro…) se
 * compara con el mismo bloque publicado, marcando lo agregado y lo quitado.
 */
export default function DiferenciasCapitulo({ antes, despues }: { antes: unknown; despues: unknown }) {
  const a = leerCapitulos(antes ? [antes] : [])[0]
  const d = leerCapitulos(despues ? [despues] : [])[0]
  const filas: Fila[] = []
  const dato = (clave: string, etiqueta: string, x = '', y = '') => { if (x !== y) filas.push({ clave, etiqueta, antes: x, despues: y }) }
  dato('etiqueta', 'Etiqueta', a?.etiqueta, d?.etiqueta)
  dato('titulo', 'Título', a?.titulo, d?.titulo)

  const previos = new Map((a?.bloques ?? []).map(b => [b.id, b]))
  const actuales = new Map((d?.bloques ?? []).map(b => [b.id, b]))
  // Recorre en el orden nuevo; los bloques quitados van donde estaban.
  const orden: string[] = []
  for (const b of d?.bloques ?? []) orden.push(b.id)
  ;(a?.bloques ?? []).forEach((b, i) => { if (!actuales.has(b.id)) orden.splice(Math.min(i, orden.length), 0, b.id) })
  let iguales = 0
  for (const id of orden) {
    const x: Bloque | undefined = previos.get(id)
    const y: Bloque | undefined = actuales.get(id)
    const tx = x ? textoBloque(x) : ''
    const ty = y ? textoBloque(y) : ''
    if (tx === ty && x?.tipo === y?.tipo) { iguales++; continue }
    const tipo = y ?? x
    filas.push({ clave: id, etiqueta: tipo ? `${etiquetaBloque(tipo.tipo)}${!x ? ' · nuevo' : !y ? ' · quitado' : x.tipo !== y.tipo ? ` · antes ${etiquetaBloque(x.tipo).toLowerCase()}` : ''}` : 'Bloque', antes: tx, despues: ty })
  }
  const ordenCambio = a && d && JSON.stringify((a.bloques).map(b => b.id).filter(id => actuales.has(id))) !== JSON.stringify(d.bloques.map(b => b.id).filter(id => previos.has(id)))

  return <div className="rev-diff__scroll"><table className="rev-diff__tabla">
    <thead><tr><th>Bloque</th><th colSpan={2}>Publicado → Propuesta</th></tr></thead>
    <tbody>
      {filas.map(f => <tr key={f.clave}><th scope="row">{f.etiqueta}</th>
        <td colSpan={2} style={{ whiteSpace: 'pre-line' }}>{!f.antes ? <ins>{f.despues}</ins> : !f.despues ? <del>{f.antes}</del> : <TextoDiff antes={f.antes} despues={f.despues}/>}</td></tr>)}
      {ordenCambio && <tr><th scope="row">Orden</th><td colSpan={2}>Cambió el orden de los bloques.</td></tr>}
      {filas.length === 0 && !ordenCambio && <tr><td colSpan={3}>Sin cambios en el texto.</td></tr>}
    </tbody>
  </table>
  {iguales > 0 && <p className="rev__secundario" style={{ margin: '6px 12px 10px' }}>{iguales} {iguales === 1 ? 'bloque sin cambios' : 'bloques sin cambios'}.</p>}
  </div>
}
