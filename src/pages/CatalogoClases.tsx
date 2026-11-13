import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowUp, BookOpen, Search } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
import '../styles/CatalogoConjuros.css'
import './CatalogoClases.css'

type Registro = Record<string, unknown>
type Entrada = { clave: string; elemento: Registro; subclases: Registro[]; libroId: string; libro: string; codigo: string }
const obj = (v: unknown): Registro => v && typeof v==='object' && !Array.isArray(v) ? v as Registro : {}
const lista = (v: unknown): Registro[] => Array.isArray(v) ? v.filter(x=>x && typeof x==='object' && !Array.isArray(x)) : []
const txt = (v: unknown): string => typeof v==='string' ? v : typeof v==='number' ? String(v) : ''
const nombre = (v: Registro) => txt(v.nombre)||txt(v.titulo)||'Sin nombre'
const palabras = (v: unknown): string => Array.isArray(v) ? v.map(txt).filter(Boolean).join(', ') : txt(v)
function Descripcion({ valor }: { valor: unknown }) {
  const contenido = txt(valor).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&')
  return contenido ? <p className="catalogo-conjuros__descripcion">{contenido}</p> : null
}
const claveRasgo = (rasgo: Registro, origen: string) => `${origen}-${txt(rasgo.id)||`${txt(rasgo.nivel)}-${nombre(rasgo)}`}`
function irARasgo(rasgo: Registro, origen: string) {
  const destino = document.getElementById(`catalogo-rasgo-${claveRasgo(rasgo,origen)}`)
  destino?.scrollIntoView({behavior:'smooth',block:'start'})
}
function Rasgos({ clase, subclase }: { clase: Registro; subclase?: Registro }) {
  const base: Registro[]=lista(obj(clase.datos).rasgos).map(r=>({...r,origen:'Clase'}))
  const extras: Registro[]=subclase?lista(obj(subclase.datos).rasgos).map(r=>({...r,origen:nombre(subclase)})):[]
  const rasgos=[...base,...extras].sort((a,b)=>Number(a.nivel||0)-Number(b.nivel||0))
  return rasgos.length ? <section className="catalogo-clases__bloque"><h3>Características por nivel</h3>
    {rasgos.map((rasgo,i)=><article key={`${txt(rasgo.origen)}:${txt(rasgo.id)||i}`} id={`catalogo-rasgo-${claveRasgo(rasgo,txt(rasgo.origen)==='Clase'?'base':'sub')}`} className={`catalogo-clases__rasgo ${txt(rasgo.origen)==='Clase'?'':'catalogo-clases__rasgo--subclase'}`}>
      <h4>Nivel {txt(rasgo.nivel)} · {nombre(rasgo)} <small>{txt(rasgo.origen)}</small></h4>
      <Descripcion valor={rasgo.descripcion}/>
    </article>)}
  </section> : null
}
function FichaClase({ clase, subclase }: { clase: Registro; subclase?: Registro }) {
  const datos=obj(clase.datos), competencias=obj(datos.competencias)
  const campos: [string,unknown][] = [
    ['Dado de golpe',datos.dadoGolpe ? 'd'+txt(datos.dadoGolpe) : ''],
    ['Características principales',palabras(datos.caracteristicasPrincipales)||txt(datos.caracteristicaPrincipal)],
    ['Salvaciones',palabras(datos.salvaciones)],
    ['Armaduras',palabras(competencias.armaduras)||palabras(datos.armaduras)],
    ['Armas',palabras(competencias.armasCategorias)||palabras(datos.armas)],
    ['Herramientas',palabras(datos.herramientas)],
    ['Habilidades disponibles',palabras(competencias.habilidadesOpciones)||palabras(datos.habilidades)],
    ['Habilidades a elegir',txt(competencias.habilidadesCantidad)]
  ]
  const filas=lista(datos.progresion), columnas=lista(datos.columnasProgresion), celdas=obj(datos.celdasProgresion)
  const rasgosBase=lista(datos.rasgos)
  const rasgosSubclase=subclase?lista(obj(subclase.datos).rasgos):[]
  return <>
    <Descripcion valor={clase.descripcion||clase.resumen}/>
    <section className="catalogo-clases__bloque"><h3>Datos generales</h3><dl className="catalogo-clases__datos">{campos.filter(([,v])=>Boolean(v)).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{txt(v)}</dd></div>)}</dl></section>
    {(lista(datos.equipoOpciones).length>0 || txt(datos.equipoInicial)) && <section className="catalogo-clases__bloque"><h3>Equipo inicial</h3>
      <Descripcion valor={datos.equipoInicial}/>
      {lista(datos.equipoOpciones).map((grupo,i)=><div key={i}><strong>Grupo {i+1} · Elegir {txt(grupo.elegir)||'1'}</strong>{lista(grupo.opciones).map((opcion,j)=><p key={j}>Opción {j+1}: {lista(opcion.objetos).map(item=>`${txt(item.cantidad)||'1'} × ${txt(item.nombre)||txt(item.objetoId)}`).join(', ')}{Number(opcion.oro)>0?` · ${txt(opcion.oro)} po`:''}</p>)}</div>)}
    </section>}
    {filas.length>0 && <section className="catalogo-clases__bloque"><h3>Tabla de progresión</h3><div className="catalogo-clases__tabla-scroll"><table><thead><tr><th>Nivel</th><th>Características</th>{columnas.map((col,i)=><th key={i}>{nombre(col)}</th>)}</tr></thead><tbody>
      {filas.map((fila,i)=>{const celda=obj(celdas[txt(fila.nivel)]);return <tr key={i}><th>{txt(fila.nivel)}</th><td>{(() => { const base=rasgosBase.filter(r=>Number(r.nivel)===Number(fila.nivel)); const extra=rasgosSubclase.filter(r=>Number(r.nivel)===Number(fila.nivel)); return base.length||extra.length ? <>{base.map((r,j)=><button type="button" key={`base-${j}`} className="catalogo-clases__tabla-rasgo catalogo-clases__tabla-enlace" onClick={()=>irARasgo(r,'base')} title={`Ver ${nombre(r)}`}>{nombre(r)}</button>)}{extra.map((r,j)=><button type="button" key={`sub-${j}`} className="catalogo-clases__tabla-rasgo catalogo-clases__tabla-enlace catalogo-clases__tabla-rasgo--subclase" onClick={()=>irARasgo(r,'sub')} title={`Ver ${nombre(r)}`}>{nombre(r)}</button>)}</> : '—' })()}</td>{columnas.map((col,j)=><td key={j}>{txt(celda[txt(col.id)])|| (txt(col.id)==='competencia' ? '+'+txt(fila.bonificadorCompetencia) : txt(col.id)==='notas'?txt(fila.notas):'—')}</td>)}</tr>})}
    </tbody></table></div></section>}
    <Rasgos clase={clase} subclase={subclase}/>
  </>
}
function FichaSeleccionada({ entrada }: { entrada: Entrada }) {
  const [subclaseId,setSubclaseId]=useState('')
  const subclase=entrada.subclases.find((s,i)=>(txt(s.id)||String(i))===subclaseId)
  return <>
    <div className="catalogo-conjuros__cabecera"><h2>{nombre(entrada.elemento)}</h2><span>{entrada.codigo}</span></div>
    <p className="catalogo-conjuros__escuela">Clase</p>
    {entrada.subclases.length>0 && <section className="catalogo-clases__selector">
      <h3>Elegir subclase</h3>
      <div className="catalogo-clases__opciones" role="group" aria-label="Elegir subclase">
        <button type="button" className={`catalogo-clases__opcion ${!subclaseId?'catalogo-clases__opcion--activa':''}`} aria-pressed={!subclaseId} onClick={()=>setSubclaseId('')}>Sin subclase</button>
        {entrada.subclases.map((s,i)=>{const id=txt(s.id)||String(i);return <button type="button" key={id} className={`catalogo-clases__opcion ${subclaseId===id?'catalogo-clases__opcion--activa':''}`} aria-pressed={subclaseId===id} onClick={()=>setSubclaseId(id)}>{nombre(s)}</button>})}
      </div>
      {subclase && <><h3>{nombre(subclase)}</h3><Descripcion valor={subclase.descripcion}/></>}
    </section>}
    <FichaClase clase={entrada.elemento} subclase={subclase}/>
    <div className="catalogo-conjuros__origen"><span>Libro: {entrada.libro}</span><Link to={`/biblioteca/libros/leer/${entrada.libroId}`}><BookOpen size={16}/> Leer libro</Link></div>
  </>
}
export default function CatalogoClases() {
  const [entradas,setEntradas]=useState<Entrada[]>([])
  const [busqueda,setBusqueda]=useState('')
  const [seleccion,setSeleccion]=useState('')
  const [cargando,setCargando]=useState(true)
  const [error,setError]=useState('')
  const [mostrarVolverArriba,setMostrarVolverArriba]=useState(false)
  useEffect(()=>{
    const contenedor=document.querySelector<HTMLElement>('.app-layout-content')
    if(!contenedor)return
    const comprobar=()=>setMostrarVolverArriba(contenedor.scrollTop>350)
    comprobar()
    contenedor.addEventListener('scroll',comprobar,{passive:true})
    return()=>contenedor.removeEventListener('scroll',comprobar)
  },[])
  useEffect(()=>{
    let activo=true
    async function cargar(){
      const {data,error:fallo}=await supabase.from('libros').select('id,codigo,libro_versiones(id,titulo,clases,subclases)').eq('estado','publicado')
      if(!activo)return
      if(fallo){setError('No se pudieron cargar las clases publicadas.');setCargando(false);return}
      const items:Entrada[]=[]
      for(const libro of data??[])for(const version of libro.libro_versiones??[]){
        const clases=lista(version.clases)
        const subclases=lista(version.subclases)
        clases.forEach((elemento,i)=>{
          const relacionadas=subclases.filter(sub=>txt(obj(sub.datos).claseId)===txt(elemento.id))
          items.push({clave:`${libro.id}:${version.id}:clase:${txt(elemento.id)||i}`,elemento,subclases:relacionadas,libroId:libro.id,libro:txt(version.titulo),codigo:txt(libro.codigo)})
        })
      }
      items.sort((x,y)=>nombre(x.elemento).localeCompare(nombre(y.elemento),'es'))
      setEntradas(items);setSeleccion(items[0]?.clave||'');setCargando(false)
    }
    void cargar();return()=>{activo=false}
  },[])
  const filtradas=useMemo(()=>entradas.filter(e=>`${nombre(e.elemento)} ${e.subclases.map(nombre).join(' ')} ${e.libro} ${e.codigo}`.toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es'))),[entradas,busqueda])
  const actual=filtradas.find(e=>e.clave===seleccion)||filtradas[0]
  return <AppLayout title="Biblioteca" subtitle="Clases y subclases de libros publicados">
    <div className="catalogo-conjuros catalogo-clases">
      <Link className="catalogo-conjuros__volver" to="/biblioteca"><ArrowLeft size={17}/> Volver a Biblioteca</Link>
      <div className="catalogo-conjuros__paneles">
        <aside className="catalogo-conjuros__lista"><h2>Clases <small>({filtradas.length})</small></h2>
          <label className="catalogo-conjuros__buscar"><Search size={17}/><input aria-label="Buscar clases" placeholder="Buscar clase, subclase o libro..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/></label>
          {cargando?<p>Cargando...</p>:error?<p role="alert">{error}</p>:filtradas.length===0?<p>No se encontraron clases publicadas.</p>:<div className="catalogo-conjuros__resultados">{filtradas.map(e=><button key={e.clave} type="button" className={`catalogo-conjuros__item ${actual?.clave===e.clave?'catalogo-conjuros__item--activo':''}`} onClick={()=>setSeleccion(e.clave)}>
            <strong>{nombre(e.elemento)}</strong><span>Clase · {e.subclases.length} subclase(s)</span><small>{e.codigo||e.libro}</small>
          </button>)}</div>}
        </aside>
        <section className="catalogo-conjuros__detalle" aria-live="polite">
          {!actual?<p>Seleccioná una clase.</p>:<FichaSeleccionada key={actual.clave} entrada={actual}/>} 
        </section>
      </div>
      {mostrarVolverArriba && <button type="button" className="catalogo-clases__volver-arriba" aria-label="Volver arriba" title="Volver arriba" onClick={()=>document.querySelector<HTMLElement>('.app-layout-content')?.scrollTo({top:0,behavior:'smooth'})}><ArrowUp size={21}/></button>}
    </div>
  </AppLayout>
}
