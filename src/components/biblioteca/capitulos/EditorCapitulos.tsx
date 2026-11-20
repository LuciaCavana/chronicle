import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ClipboardPaste, FileUp, Layers, Plus, Trash2, X } from 'lucide-react'
import {
  CATEGORIAS_FICHAS, TIPOS_BLOQUE, convertirBloque, nuevoBloque, nuevoCapitulo, textoBloque,
  type Bloque, type Capitulo, type TipoBloque,
} from '../../../types/capitulo'
import { comoRecuadro, detectarBloques, limpiarTextoEscaneado, type Correccion } from '../../../lib/pegarDesdeLibro'
import ImportarPdf, { type CambioFicha } from './ImportarPdf'
import type { Existentes } from '../../../lib/conciliarFichas'
import '../../../styles/biblioteca/EditorCapitulos.css'

export type FichasDisponibles = { categoria: string; titulo: string; elementos: { id: string; nombre: string }[] }

type Props = {
  capitulos: Capitulo[]
  onChange: (capitulos: Capitulo[]) => void
  /** Fichas cargadas en el libro, para ubicarlas en un capítulo. */
  fichas: FichasDisponibles[]
  soloLectura?: boolean
  /** Fichas completas del libro, para que la importación complete en vez de duplicar. */
  existentes: Existentes
  /** Crea o completa fichas reconocidas al importar. */
  onAplicarFichas: (cambios: CambioFicha[]) => void
}

const mover = <T,>(lista: T[], desde: number, hasta: number) => {
  if (hasta < 0 || hasta >= lista.length) return lista
  const copia = [...lista]
  const [item] = copia.splice(desde, 1)
  copia.splice(hasta, 0, item)
  return copia
}

/** Capítulos del libro: orden, texto por bloques, fichas ubicadas y "Pegar desde el libro". */
export default function EditorCapitulos({ capitulos, onChange, fichas, soloLectura, existentes, onAplicarFichas }: Props) {
  const [seleccion, setSeleccion] = useState<string | null>(capitulos[0]?.id ?? null)
  const [pegando, setPegando] = useState(false)
  const [importando, setImportando] = useState(false)
  // Borrar un capítulo pide dos toques: el primero arma el botón, el segundo borra.
  const [porBorrar, setPorBorrar] = useState<string | null>(null)
  useEffect(() => {
    if (!porBorrar) return
    const t = window.setTimeout(() => setPorBorrar(null), 4000)
    return () => window.clearTimeout(t)
  }, [porBorrar])
  const tocarBorrar = (id: string) => { if (porBorrar === id) { setPorBorrar(null); borrarCapitulo(id) } else setPorBorrar(id) }
  const actual = capitulos.find(c => c.id === seleccion) ?? capitulos[0] ?? null

  const cambiarCapitulo = (id: string, cambio: (c: Capitulo) => Capitulo) =>
    onChange(capitulos.map(c => c.id === id ? cambio(c) : c))
  const cambiarBloques = (cambio: (b: Bloque[]) => Bloque[]) => actual && cambiarCapitulo(actual.id, c => ({ ...c, bloques: cambio(c.bloques) }))

  function borrarCapitulo(id: string) {
    const restantes = capitulos.filter(c => c.id !== id)
    onChange(restantes)
    setPorBorrar(null)
    if (seleccion === id) setSeleccion(restantes[0]?.id ?? null)
  }

  function agregarCapitulo() {
    const numero = capitulos.filter(c => /^cap/i.test(c.etiqueta)).length + 1
    const nuevo = nuevoCapitulo(`Capítulo ${numero}`, '')
    onChange([...capitulos, nuevo])
    setSeleccion(nuevo.id)
  }
  /** Para un libro que ya tiene fichas: un capítulo por categoría, con sus fichas adentro. */
  function crearDesdeCategorias() {
    const nuevos = fichas.filter(f => f.elementos.length > 0).map(f => {
      const c = nuevoCapitulo('', f.titulo)
      c.bloques = [{ ...nuevoBloque('fichas'), categoria: f.categoria, ids: [] } as Bloque]
      return c
    })
    onChange([...capitulos, ...nuevos])
    if (nuevos[0]) setSeleccion(nuevos[0].id)
  }

  return <div className="capitulos">
    <aside className="capitulos__lista" aria-label="Orden de los capítulos">
      <h3 className="capitulos__rotulo">Orden del libro</h3>
      {capitulos.length === 0 && <p className="capitulos__vacio">Todavía no hay capítulos. Si no agregás ninguno, el libro se lee por categorías, como hasta ahora.</p>}
      <ol>
        {capitulos.map((c, i) => {
          const fichasDelCapitulo = c.bloques.filter((b): b is Extract<Bloque, { tipo: 'fichas' }> => b.tipo === 'fichas')
            .map(b => CATEGORIAS_FICHAS.find(x => x.id === b.categoria)?.titulo ?? b.categoria)
          const textos = c.bloques.length - fichasDelCapitulo.length
          return <li key={c.id} className={`capitulos__item${actual?.id === c.id ? ' capitulos__item--activo' : ''}`}>
            <button type="button" className="capitulos__elegir" aria-current={actual?.id === c.id ? 'true' : undefined} onClick={() => setSeleccion(c.id)}>
              <span className="capitulos__nombre">{[c.etiqueta, c.titulo].filter(Boolean).join(': ') || 'Capítulo sin título'}</span>
              <span className="capitulos__detalle">{textos} {textos === 1 ? 'bloque' : 'bloques'}{fichasDelCapitulo.length ? ` · fichas: ${fichasDelCapitulo.join(', ')}` : ''}</span>
            </button>
            {!soloLectura && <span className="capitulos__mover">
              <button type="button" aria-label={`Subir ${c.titulo || 'capítulo'}`} disabled={i === 0} onClick={() => onChange(mover(capitulos, i, i - 1))}><ArrowUp size={15} aria-hidden="true" /></button>
              <button type="button" aria-label={`Bajar ${c.titulo || 'capítulo'}`} disabled={i === capitulos.length - 1} onClick={() => onChange(mover(capitulos, i, i + 1))}><ArrowDown size={15} aria-hidden="true" /></button>
              <button type="button" className={`capitulos__peligro${porBorrar === c.id ? ' capitulos__peligro--armado' : ''}`}
                aria-label={porBorrar === c.id ? `Tocá de nuevo para borrar ${c.titulo || c.etiqueta || 'el capítulo'} y sus ${c.bloques.length} bloques` : `Eliminar ${c.titulo || c.etiqueta || 'capítulo'}`}
                title={porBorrar === c.id ? 'Tocá de nuevo para borrar (las fichas no se borran)' : 'Eliminar capítulo'}
                onClick={() => tocarBorrar(c.id)} onBlur={() => { if (porBorrar === c.id) setPorBorrar(null) }}>
                <Trash2 size={15} aria-hidden="true" />{porBorrar === c.id && <span>¿Borrar?</span>}
              </button>
            </span>}
          </li>
        })}
      </ol>
      {!soloLectura && <>
        <button type="button" className="capitulos__agregar" onClick={agregarCapitulo}><Plus size={16} aria-hidden="true" />Agregar capítulo</button>
        <button type="button" className="capitulos__agregar capitulos__agregar--pdf" aria-expanded={importando} onClick={() => setImportando(v => !v)}><FileUp size={16} aria-hidden="true" />Importar desde PDF</button>
        {capitulos.length === 0 && fichas.some(f => f.elementos.length) && <button type="button" className="capitulos__agregar" onClick={crearDesdeCategorias}><Layers size={16} aria-hidden="true" />Crear un capítulo por categoría</button>}
      </>}
    </aside>

    {importando && !soloLectura ? <ImportarPdf existentes={existentes} onCancelar={() => setImportando(false)}
      onAgregar={(nuevos, cambios) => { if (cambios.length) onAplicarFichas(cambios); onChange([...capitulos, ...nuevos]); if (nuevos[0]) setSeleccion(nuevos[0].id) }} />
    : actual ? <section className="capitulos__capitulo" aria-label="Capítulo seleccionado">
      <div className="capitulos__campos">
        <label>Etiqueta<input value={actual.etiqueta} placeholder="Capítulo 1" disabled={soloLectura} maxLength={60}
          onChange={e => cambiarCapitulo(actual.id, c => ({ ...c, etiqueta: e.target.value }))} /></label>
        <label>Título del capítulo<input value={actual.titulo} placeholder="Cómo jugar" disabled={soloLectura} maxLength={160}
          onChange={e => cambiarCapitulo(actual.id, c => ({ ...c, titulo: e.target.value }))} /></label>
      </div>

      {!soloLectura && <div className="capitulos__barra" role="group" aria-label="Agregar bloque">
        <span>Agregar:</span>
        {TIPOS_BLOQUE.map(t => <button type="button" key={t.tipo} onClick={() => cambiarBloques(b => [...b, nuevoBloque(t.tipo)])}>{t.etiqueta}</button>)}
        <button type="button" className="capitulos__pegar" aria-expanded={pegando} onClick={() => setPegando(v => !v)}><ClipboardPaste size={15} aria-hidden="true" />Pegar desde el libro</button>
      </div>}
      <p className="capitulos__ayuda">En cualquier texto podés marcar <strong>**negrita**</strong> y <em>_cursiva_</em>. Una línea en blanco separa párrafos dentro de un recuadro o una carta.</p>

      {pegando && !soloLectura && <PegarDesdeLibro onCancelar={() => setPegando(false)}
        onInsertar={nuevos => { cambiarBloques(b => [...b, ...nuevos]); setPegando(false) }} />}

      {actual.bloques.length === 0 && <p className="capitulos__vacio">Este capítulo no tiene bloques. Agregá texto o pegalo desde el libro.</p>}
      <ol className="capitulos__bloques">
        {actual.bloques.map((bloque, i) => <li key={bloque.id} className="capitulos__bloque">
          <div className="capitulos__bloque-cabecera">
            <label className="capitulos__tipo"><span className="capitulos__oculto">Tipo de bloque</span>
              <select value={bloque.tipo} disabled={soloLectura} onChange={e => cambiarBloques(b => b.map(x => x.id === bloque.id ? convertirBloque(x, e.target.value as TipoBloque) : x))}>
                {TIPOS_BLOQUE.map(t => <option key={t.tipo} value={t.tipo}>{t.etiqueta}</option>)}
              </select></label>
            {!soloLectura && <span className="capitulos__mover">
              <button type="button" aria-label={`Subir bloque ${i + 1}`} disabled={i === 0} onClick={() => cambiarBloques(b => mover(b, i, i - 1))}><ArrowUp size={15} aria-hidden="true" /></button>
              <button type="button" aria-label={`Bajar bloque ${i + 1}`} disabled={i === actual.bloques.length - 1} onClick={() => cambiarBloques(b => mover(b, i, i + 1))}><ArrowDown size={15} aria-hidden="true" /></button>
              <button type="button" aria-label={`Quitar bloque ${i + 1}`} onClick={() => cambiarBloques(b => b.filter(x => x.id !== bloque.id))}><Trash2 size={15} aria-hidden="true" /></button>
            </span>}
          </div>
          <EditorBloque bloque={bloque} fichas={fichas} soloLectura={soloLectura}
            onChange={nuevo => cambiarBloques(b => b.map(x => x.id === bloque.id ? nuevo : x))} />
        </li>)}
      </ol>

      {!soloLectura && <div className="capitulos__pie">
        <button type="button" className={`capitulos__peligro${porBorrar === actual.id ? ' capitulos__peligro--armado' : ''}`}
          onClick={() => tocarBorrar(actual.id)} onBlur={() => { if (porBorrar === actual.id) setPorBorrar(null) }}>
          <Trash2 size={15} aria-hidden="true" />{porBorrar === actual.id ? `Tocá de nuevo para borrar (${actual.bloques.length} bloques; las fichas quedan)` : 'Borrar capítulo'}
        </button>
      </div>}
    </section> : <section className="capitulos__capitulo"><p className="capitulos__vacio">Agregá un capítulo para empezar.</p></section>}
  </div>
}

/** Edición de un bloque según su tipo. */
function EditorBloque({ bloque, onChange, fichas, soloLectura }: { bloque: Bloque; onChange: (b: Bloque) => void; fichas: FichasDisponibles[]; soloLectura?: boolean }) {
  const area = (valor: string, cambiar: (v: string) => void, etiqueta: string, filas = 3) =>
    <label className="capitulos__campo">{etiqueta}<textarea rows={filas} value={valor} disabled={soloLectura} onChange={e => cambiar(e.target.value)} /></label>
  const linea = (valor: string, cambiar: (v: string) => void, etiqueta: string) =>
    <label className="capitulos__campo">{etiqueta}<input value={valor} disabled={soloLectura} onChange={e => cambiar(e.target.value)} /></label>

  switch (bloque.tipo) {
    case 'parrafo': return area(bloque.texto, texto => onChange({ ...bloque, texto }), 'Texto', 4)
    case 'titulo': case 'subtitulo': return linea(bloque.texto, texto => onChange({ ...bloque, texto }), bloque.tipo === 'titulo' ? 'Título de sección' : 'Subtítulo')
    case 'termino': return <div className="capitulos__dos">
      {linea(bloque.termino, termino => onChange({ ...bloque, termino }), 'Término (va en negrita)')}
      {area(bloque.texto, texto => onChange({ ...bloque, texto }), 'Texto', 3)}
    </div>
    case 'recuadro': return <div className="capitulos__dos">
      {linea(bloque.titulo, titulo => onChange({ ...bloque, titulo }), 'Título del recuadro')}
      {area(bloque.texto, texto => onChange({ ...bloque, texto }), 'Texto', 4)}
    </div>
    case 'carta': return <div className="capitulos__dos">
      {area(bloque.texto, texto => onChange({ ...bloque, texto }), 'Texto (va en cursiva)', 5)}
      {linea(bloque.firma, firma => onChange({ ...bloque, firma }), 'Firma')}
    </div>
    case 'lista': return <Filas filas={bloque.items} soloLectura={soloLectura} nuevo={() => ({ termino: '', texto: '' })}
      onChange={items => onChange({ ...bloque, items })} campos={[['termino', 'Paso o término (negrita)'], ['texto', 'Explicación']]} />
    case 'dialogo': return <Filas filas={bloque.lineas} soloLectura={soloLectura} nuevo={() => ({ nombre: '', texto: '' })}
      onChange={lineas => onChange({ ...bloque, lineas })} campos={[['nombre', 'Quién habla'], ['texto', 'Lo que dice']]} />
    case 'tabla': {
      const texto = [bloque.columnas.join(' | '), ...bloque.filas.map(f => f.join(' | '))].join('\n')
      return <div className="capitulos__dos">
        {linea(bloque.titulo, titulo => onChange({ ...bloque, titulo }), 'Título de la tabla (opcional)')}
        {area(texto, valor => {
          const filas = valor.split('\n').map(f => f.split('|').map(c => c.trim()))
          onChange({ ...bloque, columnas: filas[0] ?? [], filas: filas.slice(1) })
        }, 'Una fila por renglón, celdas separadas con |. La primera fila son los encabezados.', 5)}
      </div>
    }
    case 'fichas': {
      const categoria = fichas.find(f => f.categoria === bloque.categoria)
      const elementos = categoria?.elementos ?? []
      return <div className="capitulos__fichas">
        <label className="capitulos__campo">Categoría<select value={bloque.categoria} disabled={soloLectura} onChange={e => onChange({ ...bloque, categoria: e.target.value, ids: [] })}>
          {CATEGORIAS_FICHAS.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
        </select></label>
        <fieldset className="capitulos__elegidas" disabled={soloLectura}>
          <legend>Qué fichas se muestran {bloque.ids.length === 0 ? '(todas)' : `(${bloque.ids.length})`}</legend>
          {elementos.length === 0 ? <p className="capitulos__vacio">El libro todavía no tiene fichas de esta categoría.</p>
            : elementos.map(e => <label key={e.id}><input type="checkbox" checked={bloque.ids.includes(e.id)}
              onChange={() => onChange({ ...bloque, ids: bloque.ids.includes(e.id) ? bloque.ids.filter(x => x !== e.id) : [...bloque.ids, e.id] })} />{e.nombre || 'Sin nombre'}</label>)}
          <p className="capitulos__ayuda">Sin marcar ninguna, se muestran todas. Las clases se muestran con su lista de conjuros.</p>
        </fieldset>
      </div>
    }
  }
}

/** Filas editables (lista numerada o diálogo). */
function Filas<T extends Record<string, string>>({ filas, onChange, campos, nuevo, soloLectura }: {
  filas: T[]; onChange: (f: T[]) => void; campos: [string, string][]; nuevo: () => T; soloLectura?: boolean
}) {
  return <div className="capitulos__filas">
    {filas.map((fila, i) => <div key={i} className="capitulos__fila">
      <span className="capitulos__numero" aria-hidden="true">{i + 1}</span>
      {campos.map(([campo, etiqueta]) => <label key={campo} className="capitulos__campo">{etiqueta}
        <input value={(fila as Record<string, string>)[campo] ?? ''} disabled={soloLectura} onChange={e => onChange(filas.map((f, j) => j === i ? { ...f, [campo]: e.target.value } as T : f))} /></label>)}
      {!soloLectura && <button type="button" aria-label={`Quitar fila ${i + 1}`} onClick={() => onChange(filas.filter((_, j) => j !== i))}><X size={15} aria-hidden="true" /></button>}
    </div>)}
    {!soloLectura && <button type="button" className="capitulos__mas" onClick={() => onChange([...filas, nuevo()])}><Plus size={14} aria-hidden="true" />Agregar fila</button>}
  </div>
}

/** Panel para pegar texto del libro escaneado: corrige errores y propone bloques. */
function PegarDesdeLibro({ onInsertar, onCancelar }: { onInsertar: (b: Bloque[]) => void; onCancelar: () => void }) {
  const [texto, setTexto] = useState('')
  const [propuestos, setPropuestos] = useState<Bloque[] | null>(null)
  const [correcciones, setCorrecciones] = useState<Correccion[]>([])
  const [esRecuadro, setEsRecuadro] = useState(false)
  function procesar() {
    const limpio = limpiarTextoEscaneado(texto)
    setCorrecciones(limpio.correcciones)
    const bloques = detectarBloques(limpio.texto)
    setPropuestos(esRecuadro ? comoRecuadro(bloques) : bloques)
  }
  const tiposTexto = TIPOS_BLOQUE.filter(t => t.tipo !== 'fichas')
  return <section className="capitulos__pegado" aria-labelledby="pegar-titulo">
    <h4 id="pegar-titulo">Pegar desde el libro</h4>
    <p className="capitulos__ayuda">Copiá una columna o un recuadro por vez, así no se mezclan. Se corrigen los errores típicos del escaneo y se propone el tipo de cada bloque: revisalo antes de insertar.</p>
    <label className="capitulos__campo">Texto copiado<textarea rows={7} value={texto} onChange={e => { setTexto(e.target.value); setPropuestos(null) }} /></label>
    <label className="capitulos__check"><input type="checkbox" checked={esRecuadro} onChange={e => { setEsRecuadro(e.target.checked); setPropuestos(null) }} />Es un recuadro (el primer renglón en mayúsculas es su título)</label>
    <div className="capitulos__acciones">
      <button type="button" onClick={onCancelar}>Cancelar</button>
      <button type="button" className="capitulos__primario" disabled={!texto.trim()} onClick={procesar}>Procesar texto</button>
    </div>
    {propuestos && <>
      {correcciones.length > 0 && <ul className="capitulos__correcciones" aria-label="Correcciones">
        {correcciones.map(c => <li key={`${c.de}${c.a}`}>{c.de} → {c.a}{c.veces > 1 ? ` (×${c.veces})` : ''}</li>)}
      </ul>}
      <h5 className="capitulos__rotulo">Así queda · {propuestos.length} {propuestos.length === 1 ? 'bloque' : 'bloques'}</h5>
      <ol className="capitulos__propuestos">
        {propuestos.map(b => <li key={b.id}>
          <label className="capitulos__tipo"><span className="capitulos__oculto">Tipo de bloque</span>
            <select value={b.tipo} onChange={e => setPropuestos(ps => ps && ps.map(x => x.id === b.id ? convertirBloque(x, e.target.value as TipoBloque) : x))}>
              {tiposTexto.map(t => <option key={t.tipo} value={t.tipo}>{t.etiqueta}</option>)}
            </select></label>
          <p>{b.tipo === 'termino' ? <><strong>{b.termino}</strong> {b.texto}</> : b.tipo === 'recuadro' ? <><strong>{b.titulo}</strong>{'\n'}{b.texto}</> : textoBloque(b)}</p>
          <button type="button" aria-label="Descartar este bloque" onClick={() => setPropuestos(ps => ps && ps.filter(x => x.id !== b.id))}><X size={15} aria-hidden="true" /></button>
        </li>)}
      </ol>
      <div className="capitulos__acciones">
        <button type="button" className="capitulos__primario" disabled={!propuestos.length} onClick={() => onInsertar(propuestos)}>Insertar {propuestos.length} {propuestos.length === 1 ? 'bloque' : 'bloques'} al final</button>
      </div>
    </>}
  </section>
}

