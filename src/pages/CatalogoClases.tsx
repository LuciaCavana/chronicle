import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Search } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
import '../styles/CatalogoConjuros.css'
import './CatalogoClases.css'

type Registro = Record<string, unknown>
type Entrada = { clave: string; tipo: 'clase'|'subclase'; elemento: Registro; clase?: Registro; libroId: string; libro: string; codigo: string }
const obj = (v: unknown): Registro => v && typeof v==='object' && !Array.isArray(v) ? v as Registro : {}
const lista = (v: unknown): Registro[] => Array.isArray(v) ? v.filter(x=>x && typeof x==='object' && !Array.isArray(x)) : []
const txt = (v: unknown): string => typeof v==='string' ? v : typeof v==='number' ? String(v) : ''
const nombre = (v: Registro) => txt(v.nombre)||txt(v.titulo)||'Sin nombre'
const palabras = (v: unknown): string => Array.isArray(v) ? v.map(txt).filter(Boolean).join(', ') : txt(v)
function Descripcion({ valor }: { valor: unknown }) {
  const contenido = txt(valor).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&')
  return contenido ? <p className="catalogo-conjuros__descripcion">{contenido}</p> : null
}
function Rasgos({ datos }: { datos: Registro }) {
  const rasgos = lista(datos.rasgos).sort((a,b)=>Number(a.nivel||0)-Number(b.nivel||0))
  return rasgos.length ? <section className="catalogo-clases__bloque"><h3>Características por nivel</h3>
    {rasgos.map((rasgo,i)=><article key={txt(rasgo.id)||i} className="catalogo-clases__rasgo"><h4>Nivel {txt(rasgo.nivel)} · {nombre(rasgo)}</h4><Descripcion valor={rasgo.descripcion}/></article>)}
  </section> : null
}
function FichaClase({ clase }: { clase: Registro }) {
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
  return <>
    <Descripcion valor={clase.descripcion||clase.resumen}/>
    <section className="catalogo-clases__bloque"><h3>Datos generales</h3><dl className="catalogo-clases__datos">{campos.filter(([,v])=>Boolean(v)).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{txt(v)}</dd></div>)}</dl></section>
    {(lista(datos.equipoOpciones).length>0 || txt(datos.equipoInicial)) && <section className="catalogo-clases__bloque"><h3>Equipo inicial</h3>
      <Descripcion valor={datos.equipoInicial}/>
      {lista(datos.equipoOpciones).map((grupo,i)=><div key={i}><strong>Grupo {i+1} · Elegir {txt(grupo.elegir)||'1'}</strong>{lista(grupo.opciones).map((opcion,j)=><p key={j}>Opción {j+1}: {lista(opcion.objetos).map(item=>`${txt(item.cantidad)||'1'} × ${txt(item.nombre)||txt(item.objetoId)}`).join(', ')}{Number(opcion.oro)>0?` · ${txt(opcion.oro)} po`:''}</p>)}</div>)}
    </section>}
    {filas.length>0 && <section className="catalogo-clases__bloque"><h3>Tabla de progresión</h3><div className="catalogo-clases__tabla-scroll"><table><thead><tr><th>Nivel</th>{columnas.map((col,i)=><th key={i}>{nombre(col)}</th>)}</tr></thead><tbody>
      {filas.map((fila,i)=>{const celda=obj(celdas[txt(fila.nivel)]);return <tr key={i}><th>{txt(fila.nivel)}</th>{columnas.map((col,j)=><td key={j}>{txt(celda[txt(col.id)])|| (txt(col.id)==='competencia' ? '+'+txt(fila.bonificadorCompetencia) : txt(col.id)==='notas'?txt(fila.notas):'—')}</td>)}</tr>})}
    </tbody></table></div></section>}
    <Rasgos datos={datos}/>
  </>
}
export default function CatalogoClases() {
  const [entradas,setEntradas]=useState<Entrada[]>([])
  const [busqueda,setBusqueda]=useState('')
  const [tipo,setTipo]=useState('todos')
  const [seleccion,setSeleccion]=useState('')
  const [cargando,setCargando]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{
    let activo=true
    async function cargar(){
      const {data,error:fallo}=await supabase.from('libros').select('id,codigo,libro_versiones(id,titulo,clases,subclases)').eq('estado','publicado')
      if(!activo)return
      if(fallo){setError('No se pudieron cargar las clases publicadas.');setCargando(false);return}
      const items:Entrada[]=[]
      for(const libro of data??[])for(const version of libro.libro_versiones??[]){
        const clases=lista(version.clases)
        for(const [tipo,elementos] of [['clase',clases],['subclase',lista(version.subclases)]] as const){
          elementos.forEach((elemento,i)=>{
            const clase=tipo==='subclase'?clases.find(c=>txt(c.id)===txt(obj(elemento.datos).claseId)):undefined
            items.push({clave:`${libro.id}:${version.id}:${tipo}:${txt(elemento.id)||i}`,tipo,elemento,clase,libroId:libro.id,libro:txt(version.titulo),codigo:txt(libro.codigo)})
          })
        }
      }
      items.sort((x,y)=>nombre(x.elemento).localeCompare(nombre(y.elemento),'es'))
      setEntradas(items);setSeleccion(items[0]?.clave||'');setCargando(false)
    }
    void cargar();return()=>{activo=false}
  },[])
  const filtradas=useMemo(()=>entradas.filter(e=>(tipo==='todos'||e.tipo===tipo)&&`${nombre(e.elemento)} ${e.clase?nombre(e.clase):''} ${e.libro} ${e.codigo}`.toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es'))),[entradas,busqueda,tipo])
  const actual=filtradas.find(e=>e.clave===seleccion)||filtradas[0]
  return <AppLayout title="Biblioteca" subtitle="Clases y subclases de libros publicados">
    <div className="catalogo-conjuros catalogo-clases">
      <Link className="catalogo-conjuros__volver" to="/biblioteca"><ArrowLeft size={17}/> Volver a Biblioteca</Link>
      <div className="catalogo-conjuros__paneles">
        <aside className="catalogo-conjuros__lista"><h2>Clases y subclases <small>({filtradas.length})</small></h2>
          <label className="catalogo-conjuros__buscar"><Search size={17}/><input aria-label="Buscar clases" placeholder="Buscar clase, subclase o libro..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/></label>
          <label className="catalogo-conjuros__filtro">Mostrar <select value={tipo} onChange={e=>setTipo(e.target.value)}><option value="todos">Todas</option><option value="clase">Clases</option><option value="subclase">Subclases</option></select></label>
          {cargando?<p>Cargando...</p>:error?<p role="alert">{error}</p>:filtradas.length===0?<p>No se encontraron clases o subclases publicadas.</p>:<div className="catalogo-conjuros__resultados">{filtradas.map(e=><button key={e.clave} type="button" className={`catalogo-conjuros__item ${actual?.clave===e.clave?'catalogo-conjuros__item--activo':''}`} onClick={()=>setSeleccion(e.clave)}>
            <strong>{nombre(e.elemento)}</strong><span>{e.tipo==='clase'?'Clase':`Subclase de ${e.clase?nombre(e.clase):'clase no disponible'}`}</span><small>{e.codigo||e.libro}</small>
          </button>)}</div>}
        </aside>
        <section className="catalogo-conjuros__detalle" aria-live="polite">
          {!actual?<p>Seleccioná una clase o subclase.</p>:<>
            <div className="catalogo-conjuros__cabecera"><h2>{nombre(actual.elemento)}</h2><span>{actual.codigo}</span></div>
            <p className="catalogo-conjuros__escuela">{actual.tipo==='clase'?'Clase':`Subclase · ${actual.clase?nombre(actual.clase):'Clase no disponible'}`}</p>
            {actual.tipo==='clase'?<FichaClase clase={actual.elemento}/>:<><Descripcion valor={actual.elemento.descripcion}/><Rasgos datos={obj(actual.elemento.datos)}/></>}
            <div className="catalogo-conjuros__origen"><span>Libro: {actual.libro}</span><Link to={`/biblioteca/libros/leer/${actual.libroId}`}><BookOpen size={16}/> Leer libro</Link></div>
          </>}
        </section>
      </div>
    </div>
  </AppLayout>
}
