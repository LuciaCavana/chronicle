import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronRight, Feather, ScrollText } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
import '../styles/LectorLibro.css'

type Registro = Record<string, unknown>
type Version = {
  id: string
  idioma: string
  titulo: string
  descripcion: string
  categorias: unknown
  especies: unknown
  conjuros: unknown
}
type LibroPublicado = {
  id: string
  codigo: string | null
  edicion: string | null
  editorial: string | null
  clasificacion: string | null
  estado: string
  libro_versiones: Version[]
}
type Seccion = { id: string; titulo: string; elementos: Registro[] }
const esObjeto = (valor: unknown): valor is Registro => typeof valor === 'object' && valor !== null && !Array.isArray(valor)
const lista = (valor: unknown): Registro[] => Array.isArray(valor) ? valor.filter(esObjeto) : []
const texto = (valor: unknown): string => typeof valor === 'string' ? valor : typeof valor === 'number' ? String(valor) : ''
const tituloElemento = (valor: Registro, indice: number) => texto(valor.nombre) || texto(valor.titulo) || `Entrada ${indice + 1}`
function TextoSeguro({ valor }: { valor: unknown }) {
  const contenido = texto(valor)
  if (!contenido) return null
  // El contenido enriquecido se presenta como texto hasta disponer de un renderizador HTML seguro.
  const limpio = contenido.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  return <p className="lector-libro__texto">{limpio}</p>
}
function SeccionContenido({ seccion }: { seccion: Seccion }) {
  return <section id={seccion.id} className="lector-libro__seccion">
    <div className="lector-libro__seccion-encabezado"><Feather size={20}/><h2>{seccion.titulo}</h2></div>
    {seccion.elementos.length === 0
      ? <p className="lector-libro__vacio">Todavía no hay contenido publicado en esta sección.</p>
      : <div className="lector-libro__entradas">{seccion.elementos.map((elemento, i) => <article className="lector-libro__entrada" key={texto(elemento.id) || i}>
        <h3>{tituloElemento(elemento, i)}</h3>
        <TextoSeguro valor={elemento.descripcion || elemento.texto || elemento.resumen}/>
        {Array.isArray(elemento.rasgos) && elemento.rasgos.length > 0 && <div className="lector-libro__rasgos">{lista(elemento.rasgos).map((rasgo,j)=><div key={texto(rasgo.id)||j}><strong>{tituloElemento(rasgo,j)}</strong><TextoSeguro valor={rasgo.descripcion}/></div>)}</div>}
      </article>)}</div>}
  </section>
}
export default function LectorLibro() {
  const { libroId } = useParams<{ libroId: string }>()
  const [libro,setLibro] = useState<LibroPublicado|null>(null)
  const [cargando,setCargando] = useState(true)
  const [error,setError] = useState('')
  const [versionId,setVersionId] = useState('')
  useEffect(()=>{
    let activo=true
    async function cargar() {
      setCargando(true);setError('')
      const {data,error:fallo}=await supabase.from('libros')
        .select('id,codigo,edicion,editorial,clasificacion,estado,libro_versiones(id,idioma,titulo,descripcion,categorias,especies,conjuros)')
        .eq('id',libroId ?? '').eq('estado','publicado').maybeSingle()
      if(!activo)return
      if(fallo)setError('No se pudo cargar el libro publicado.')
      else if(!data)setError('Este libro no está disponible en el catálogo.')
      else {const resultado=data as LibroPublicado;setLibro(resultado);setVersionId(resultado.libro_versiones[0]?.id || '')}
      setCargando(false)
    }
    void cargar()
    return ()=>{activo=false}
  },[libroId])
  const version=libro?.libro_versiones.find(v=>v.id===versionId) ?? libro?.libro_versiones[0]
  const secciones:Seccion[] = version ? [
    {id:'especies',titulo:'Especies',elementos:lista(version.especies)},
    {id:'conjuros',titulo:'Conjuros',elementos:lista(version.conjuros)}
  ] : []
  const categorias=Array.isArray(version?.categorias) ? version.categorias.map(c=>typeof c==='string'?c:esObjeto(c)?texto(c.label)||texto(c.nombre)||texto(c.id):'').filter(Boolean) : []
  return <AppLayout title="Biblioteca" subtitle="Lectura de libros publicados">
    <main className="lector-libro">
      <Link className="lector-libro__volver" to="/biblioteca/libros"><ArrowLeft size={17}/> Volver al catálogo</Link>
      {cargando ? <div className="lector-libro__estado">Abriendo libro...</div>
      : error ? <div className="lector-libro__estado" role="alert">{error}</div>
      : libro && version ? <>
        <header className="lector-libro__portada">
          <div className="lector-libro__sello"><BookOpen size={30} strokeWidth={1.5}/></div>
          <span className="lector-libro__sobre">CHRONICLE · BIBLIOTECA</span>
          <h1>{version.titulo || 'Libro sin título'}</h1>
          <div className="lector-libro__ornamento"><span/>✦<span/></div>
          <p className="lector-libro__subtitulo">{libro.editorial || 'Una obra de la comunidad'}</p>
          <div className="lector-libro__metadatos">
            {libro.edicion && <span>Edición {libro.edicion}</span>}
            {libro.codigo && <span>{libro.codigo}</span>}
            {libro.clasificacion && <span>{libro.clasificacion}</span>}
          </div>
        </header>
        <div className="lector-libro__disposicion">
          <aside className="lector-libro__indice" aria-label="Índice del libro">
            <div className="lector-libro__indice-titulo"><ScrollText size={18}/> CONTENIDO</div>
            <a href="#introduccion"><span>01</span> Introducción <ChevronRight size={14}/></a>
            {secciones.filter(s=>s.elementos.length>0).map((seccion,i)=><a key={seccion.id} href={`#${seccion.id}`}><span>{String(i+2).padStart(2,'0')}</span>{seccion.titulo}<ChevronRight size={14}/></a>)}
            {libro.libro_versiones.length>1 && <div className="lector-libro__idioma"><label htmlFor="lector-version">Versión / idioma</label><select id="lector-version" value={version.id} onChange={e=>setVersionId(e.target.value)}>{libro.libro_versiones.map(v=><option key={v.id} value={v.id}>{v.idioma.toUpperCase()} · {v.titulo}</option>)}</select></div>}
          </aside>
          <div className="lector-libro__paginas">
            <section id="introduccion" className="lector-libro__introduccion">
              <span className="lector-libro__eyebrow">PREFACIO</span>
              <h2>Introducción</h2>
              <TextoSeguro valor={version.descripcion || 'Un nuevo mundo de aventuras te espera entre estas páginas.'}/>
              {categorias.length>0 && <div className="lector-libro__categorias">{categorias.map(c=><span key={c}>{c}</span>)}</div>}
            </section>
            {secciones.filter(s=>s.elementos.length>0).map(s=><SeccionContenido key={s.id} seccion={s}/>)}
            {secciones.every(s=>s.elementos.length===0) && <p className="lector-libro__vacio">Este libro todavía no tiene entradas estructuradas disponibles para leer.</p>}
            <footer className="lector-libro__pie">✦ <span>Chronicle · Fin del contenido disponible</span> ✦</footer>
          </div>
        </div>
      </> : null}
    </main>
  </AppLayout>
}
