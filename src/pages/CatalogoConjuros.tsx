import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Search } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
import '../styles/CatalogoConjuros.css'

type Conjuro = {
  id?: string
  nombre?: string
  nivel?: number
  tipo?: string
  escuela?: string
  tiempoLanzamiento?: string
  alcance?: string
  componentes?: string
  componenteMaterial?: string
  duracion?: string
  concentracion?: boolean
  ritual?: boolean
  clases?: string[]
  descripcion?: string
  libroOrigen?: string
  paginaOrigen?: number
}
type Entrada = { clave: string; conjuro: Conjuro; libroId: string; libro: string; codigo: string; idioma: string }
const limpio = (valor: unknown) => typeof valor === 'string' ? valor : ''
const textoSeguro = (valor: unknown) => limpio(valor).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')

export default function CatalogoConjuros() {
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [nivel, setNivel] = useState('todos')
  const [seleccion, setSeleccion] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      const { data, error: fallo } = await supabase.from('libros')
        .select('id,codigo,libro_versiones(id,idioma,titulo,conjuros)')
        .eq('estado', 'publicado')
      if (!activo) return
      if (fallo) { setError('No se pudieron cargar los conjuros publicados.'); setCargando(false); return }
      const items: Entrada[] = []
      for (const libro of data ?? []) {
        for (const version of libro.libro_versiones ?? []) {
          if (!Array.isArray(version.conjuros)) continue
          version.conjuros.forEach((valor: unknown, indice: number) => {
            if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return
            const conjuro = valor as Conjuro
            if (!limpio(conjuro.nombre).trim()) return
            items.push({
              clave: `${libro.id}:${version.id}:${conjuro.id || indice}`,
              conjuro, libroId: libro.id, libro: limpio(version.titulo),
              codigo: limpio(libro.codigo), idioma: limpio(version.idioma)
            })
          })
        }
      }
      items.sort((x,y) => limpio(x.conjuro.nombre).localeCompare(limpio(y.conjuro.nombre),'es'))
      setEntradas(items)
      setSeleccion(items[0]?.clave ?? '')
      setCargando(false)
    }
    void cargar()
    return () => { activo = false }
  }, [])
  const filtradas = useMemo(() => entradas.filter(e => {
    const coincide = `${e.conjuro.nombre} ${e.libro} ${e.codigo} ${e.conjuro.escuela || ''}`.toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es'))
    return coincide && (nivel === 'todos' || Number(e.conjuro.nivel ?? 0) === Number(nivel))
  }), [entradas, busqueda, nivel])
  const actual = filtradas.find(e => e.clave === seleccion) ?? filtradas[0]
  const c = actual?.conjuro
  return <AppLayout title="Biblioteca" subtitle="Conjuros de libros publicados">
    <div className="catalogo-conjuros">
      <Link className="catalogo-conjuros__volver" to="/biblioteca"><ArrowLeft size={17}/> Volver a Biblioteca</Link>
      <div className="catalogo-conjuros__paneles">
        <aside className="catalogo-conjuros__lista" aria-label="Listado de conjuros">
          <h2>Conjuros <small>({filtradas.length})</small></h2>
          <label className="catalogo-conjuros__buscar"><Search size={17}/><input aria-label="Buscar conjuros" placeholder="Buscar nombre, escuela o libro..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/></label>
          <label className="catalogo-conjuros__filtro">Nivel <select value={nivel} onChange={e=>setNivel(e.target.value)}><option value="todos">Todos</option>{Array.from({length:10},(_,i)=><option key={i} value={i}>{i===0?'Trucos':`Nivel ${i}`}</option>)}</select></label>
          {cargando ? <p>Cargando conjuros...</p> : error ? <p role="alert">{error}</p> : filtradas.length === 0 ? <p>No se encontraron conjuros publicados.</p> : <div className="catalogo-conjuros__resultados">
            {filtradas.map(e=><button type="button" key={e.clave} className={`catalogo-conjuros__item ${actual?.clave===e.clave?'catalogo-conjuros__item--activo':''}`} onClick={()=>setSeleccion(e.clave)}>
              <strong>{e.conjuro.nombre}</strong><span>{Number(e.conjuro.nivel ?? 0)===0?'Truco':`Nivel ${e.conjuro.nivel}`} · {e.conjuro.escuela || 'Sin escuela'}</span><small>{e.codigo || e.libro}</small>
            </button>)}
          </div>}
        </aside>
        <section className="catalogo-conjuros__detalle" aria-live="polite">
          {!c ? <p>Seleccioná un conjuro del listado para ver su ficha.</p> : <>
            <div className="catalogo-conjuros__cabecera"><h2>{c.nombre}</h2><span>{c.libroOrigen || actual.codigo}{c.paginaOrigen ? ` · pág. ${c.paginaOrigen}` : ''}</span></div>
            <p className="catalogo-conjuros__escuela"><em>{Number(c.nivel ?? 0)===0?'Truco':`Conjuro de nivel ${c.nivel}`}{c.escuela ? ` · ${c.escuela}` : ''}{c.ritual?' (ritual)':''}</em></p>
            <div className="catalogo-conjuros__datos">
              {c.tiempoLanzamiento && <p><strong>Tiempo de lanzamiento:</strong> {c.tiempoLanzamiento}</p>}
              {c.alcance && <p><strong>Alcance:</strong> {c.alcance}</p>}
              {c.componentes && <p><strong>Componentes:</strong> {c.componentes}{c.componenteMaterial ? ` (${c.componenteMaterial})` : ''}</p>}
              {c.duracion && <p><strong>Duración:</strong> {c.concentracion?'Concentración, ':''}{c.duracion}</p>}
            </div>
            {c.descripcion && <p className="catalogo-conjuros__descripcion">{textoSeguro(c.descripcion)}</p>}
            {Array.isArray(c.clases) && c.clases.length>0 && <p><strong>Clases:</strong> {c.clases.join(', ')}</p>}
            <div className="catalogo-conjuros__origen"><span>Libro: {actual.libro}{actual.idioma ? ` · ${actual.idioma}` : ''}</span><Link to={`/biblioteca/libros/leer/${actual.libroId}`}><BookOpen size={16}/> Leer libro</Link></div>
          </>}
        </section>
      </div>
    </div>
  </AppLayout>
}
