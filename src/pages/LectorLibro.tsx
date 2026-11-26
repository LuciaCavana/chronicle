import { Fragment, useEffect, useRef, useState } from 'react'
import { datosDeEfecto } from '../lib/efectosConjuro'
import { tamanosEspecie, velocidadesEspecie, visionEspecie } from '../lib/datosEspecie'
import { normalizarDote, resumenBeneficio } from '../lib/dotes'
import type { Dote } from '../types/trasfondo'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowUp, BookOpen, ChevronRight, Feather, Footprints, ScrollText, WandSparkles, X } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
import { calcularFormula } from '../lib/formulasProgresion'
import '../styles/biblioteca/LectorLibro.css'
import logoOscuro from '../assets/logo-oscuro.svg'
import TextoConFormato, { formatoEnLinea } from '../components/biblioteca/capitulos/TextoConFormato'
import { leerCapitulos, type Bloque, type Capitulo } from '../types/capitulo'

type Registro = Record<string, unknown>
type Version = {
  id: string
  idioma: string
  titulo: string
  descripcion: string
  categorias: unknown
  especies: unknown
  conjuros: unknown
  clases: unknown
  subclases: unknown
  objetos: unknown
  contenido_extra?: unknown
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
const valoresTexto = (valor: unknown): string[] => Array.isArray(valor) ? valor.map(texto).filter(Boolean) : []
const valorObjeto = (valor: unknown): Registro => esObjeto(valor) ? valor : {}
const mostrar = (valor: unknown): string => texto(valor) || 'No especificado'

function DatoClase({ etiqueta, valor }: { etiqueta: string; valor: unknown }) {
  const contenido = Array.isArray(valor) ? valoresTexto(valor).join(', ') : texto(valor)
  return <div className="lector-libro__dato"><dt>{etiqueta}</dt><dd>{contenido || 'No especificado'}</dd></div>
}

function ClaseCompleta({ clase, conjuros = [] }: { clase: Registro; conjuros?: Registro[] }) {
  const [rasgoAbierto, setRasgoAbierto] = useState<Registro | null>(null)
  useEffect(() => {
    if (!rasgoAbierto) return
    const cerrar = (evento: KeyboardEvent) => { if (evento.key === 'Escape') setRasgoAbierto(null) }
    document.addEventListener('keydown', cerrar)
    return () => document.removeEventListener('keydown', cerrar)
  }, [rasgoAbierto])
  // El editor guarda el contenido específico en elemento.datos.
  const datos = valorObjeto(clase.datos)
  const competencias = valorObjeto(datos.competencias)
  const catalogo = lista(datos.objetosCatalogo)
  const nombreObjeto = (id: unknown) => {
    const objeto = catalogo.find(item => texto(item.id) === texto(id))
    return objeto ? mostrar(objeto.nombre) : `Objeto no disponible (${texto(id)})`
  }
  const equipo = lista(datos.equipoOpciones)
  const rasgos = lista(datos.rasgos).sort((a,b) => Number(a.nivel || 0)-Number(b.nivel || 0))
  const progresion = lista(datos.progresion)
  const columnas = lista(datos.columnasProgresion)
  const celdas = valorObjeto(datos.celdasProgresion)
  const ocultas = valorObjeto(datos.caracteristicasOcultas)
  const principales = valoresTexto(datos.caracteristicasPrincipales)
  const categoriasArmas = valoresTexto(competencias.armasCategorias)
  const armaduras = valoresTexto(competencias.armaduras)
  const habilidades = valoresTexto(competencias.habilidadesOpciones)
  const armasEspecificas = valoresTexto(competencias.armasEspecificas).map(nombreObjeto)
  const gruposEquipo = equipo.flatMap(grupo => lista(grupo.opciones).map(opcion => ({grupo, opcion})))
  return <>
    {rasgoAbierto && <div className="lector-libro__modal-capa" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setRasgoAbierto(null) }}>
      <div className="lector-libro__modal-rasgo" role="dialog" aria-modal="true" aria-labelledby="lector-rasgo-titulo">
        <button type="button" className="lector-libro__modal-cerrar" onClick={() => setRasgoAbierto(null)} aria-label="Cerrar definición"><X size={20} aria-hidden="true"/></button>
        <div className="lector-libro__modal-cabecera">
          <h3 id="lector-rasgo-titulo">{tituloElemento(rasgoAbierto, 0)}</h3>
          <span className="lector-libro__rasgo-nivel">Nivel {mostrar(rasgoAbierto.nivel)}</span>
        </div>
        <div className="lector-libro__modal-cuerpo">
          <TextoSeguro valor={rasgoAbierto.descripcion}/>
          {!texto(rasgoAbierto.descripcion) && <p className="lector-libro__vacio">Esta característica todavía no tiene descripción.</p>}
        </div>
      </div>
    </div>}
    <TextoSeguro valor={clase.descripcion || clase.texto || clase.resumen}/>
    <section className="lector-libro__clase-bloque">
      <h4>Datos generales</h4>
      <dl className="lector-libro__datos-grid">
        <DatoClase etiqueta="Dado de golpe" valor={datos.dadoGolpe ? `d${datos.dadoGolpe}` : ''}/>
        <DatoClase etiqueta="Características principales" valor={principales.length ? principales : datos.caracteristicaPrincipal}/>
        <DatoClase etiqueta="Salvaciones" valor={datos.salvaciones}/>
        <DatoClase etiqueta="Herramientas" valor={datos.herramientas}/>
        <DatoClase etiqueta="Armaduras" valor={armaduras.length ? armaduras : datos.armaduras}/>
        <DatoClase etiqueta="Armas" valor={[...categoriasArmas,...armasEspecificas].length ? [...categoriasArmas,...armasEspecificas] : datos.armas}/>
        <DatoClase etiqueta="Habilidades disponibles" valor={habilidades.length ? habilidades : datos.habilidades}/>
        <DatoClase etiqueta="Habilidades a elegir" valor={competencias.habilidadesCantidad}/>
      </dl>
    </section>
    <section className="lector-libro__clase-bloque">
      <h4>Equipo inicial</h4>
      {gruposEquipo.length ? <>
        <p className="lector-libro__nota">Opciones de equipamiento. Cantidad de elecciones: {equipo.reduce((n,g)=>n+Number(g.elegir || 0),0)}.</p>
        <div className="lector-libro__opciones">{gruposEquipo.map(({opcion},i) => <div className="lector-libro__opcion" key={texto(opcion.id)||i}>
          <strong>Opción {String.fromCharCode(65+i)}</strong>
          <ul>{lista(opcion.objetos).map((item,j)=><li key={j}>{Number(item.cantidad || 1)} × {nombreObjeto(item.objetoId)}</li>)}
            {Number(opcion.oro || 0)>0 && <li>{Number(opcion.oro)} po</li>}
          </ul>
        </div>)}</div>
      </> : <TextoSeguro valor={datos.equipoInicial || 'No se especificó equipamiento inicial.'}/>}
    </section>
    {progresion.length>0 && <section className="lector-libro__clase-bloque">
      <h4>Tabla de progresión</h4>
      <div className="lector-libro__tabla-scroll"><table className="lector-libro__tabla">
        <thead><tr><th scope="col">Nivel</th>{columnas.map((columna,i)=><th scope="col" key={texto(columna.id)||i}>{mostrar(columna.nombre)}</th>)}</tr></thead>
        <tbody>{progresion.map((fila,i)=>{
          const nivel=Number(fila.nivel || 0)
          const filaCeldas=valorObjeto(celdas[String(nivel)])
          const filaOcultas=valorObjeto(ocultas[String(nivel)])
          return <tr key={texto(fila.nivel)||i}><th scope="row">{nivel}</th>
            {columnas.map((columna,j)=>{
              const id=texto(columna.id)
              const rasgosVisibles=rasgos.filter(r=>Number(r.nivel)===nivel && !valoresTexto(filaOcultas[id]).includes(texto(r.id)))
              const valor=columna.tipo==='formula' ? calcularFormula(texto(columna.formula),nivel) : texto(filaCeldas[id]) || (id==='competencia' ? `+${Number(fila.bonificadorCompetencia || 0)}` : id==='notas' ? texto(fila.notas) : '')
              return <td key={id||j}>{columna.tipo==='caracteristicas'
                ? <div className="lector-libro__etiquetas">{rasgosVisibles.map((rasgo,k)=><button type="button" className="lector-libro__rasgo-enlace" key={texto(rasgo.id)||k} onClick={() => setRasgoAbierto(rasgo)} title={`Leer ${tituloElemento(rasgo,k)}`}>{tituloElemento(rasgo,k)}</button>)}</div>
                : valor || '—'}</td>
            })}</tr>
        })}</tbody>
      </table></div>
    </section>}
    {rasgos.length>0 && <section className="lector-libro__clase-bloque">
      <h4>Características de clase</h4>
      <div className="lector-libro__rasgos">{rasgos.map((rasgo,i)=><article className="lector-libro__rasgo" key={texto(rasgo.id)||i}>
        <div className="lector-libro__rasgo-encabezado"><span className="lector-libro__rasgo-nivel">Nivel {mostrar(rasgo.nivel)}</span><strong>{tituloElemento(rasgo,i)}</strong></div>
        <TextoSeguro valor={rasgo.descripcion}/>
      </article>)}</div>
    </section>}
    <ListaConjurosClase clase={clase} conjuros={conjuros}/>
  </>
}
const normalizar = (valor: string) => valor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
/** Lista de conjuros de una clase: se arma sola con los conjuros del libro que la nombran. */
function ListaConjurosClase({ clase, conjuros }: { clase: Registro; conjuros: Registro[] }) {
  const nombre = normalizar(tituloElemento(clase, 0))
  const propios = conjuros.filter(c => valoresTexto(c.clases).some(x => normalizar(x) === nombre))
  if (!propios.length) return null
  const niveles = [...new Set(propios.map(c => Number(c.nivel ?? 0)))].sort((a, b) => a - b)
  return <section className="lector-libro__clase-bloque">
    <h4>Lista de conjuros de {tituloElemento(clase, 0).toLowerCase()}</h4>
    <div className="lector-capitulo__lista-conjuros">{niveles.map(nivel => <div key={nivel}>
      <h5>{nivel === 0 ? 'Trucos' : `Nivel ${nivel}`}</h5>
      <p>{propios.filter(c => Number(c.nivel ?? 0) === nivel).map((c, i) => tituloElemento(c, i)).sort((a, b) => a.localeCompare(b, 'es')).join(', ')}</p>
    </div>)}</div>
  </section>
}
function ClasesDesplegables({ seccion, conjuros = [], sinEncabezado }: { seccion: Seccion; conjuros?: Registro[]; sinEncabezado?: boolean }) {
  return <section id={seccion.id} className="lector-libro__seccion">
    {!sinEncabezado && <div className="lector-libro__seccion-encabezado"><Feather size={20} aria-hidden="true"/><h2>{seccion.titulo}</h2></div>}
    <div className="lector-libro__clases">
      {seccion.elementos.map((clase, indice) => (
        <details className="lector-libro__clase" key={texto(clase.id) || indice}>
          <summary className="lector-libro__clase-resumen">
            <span className="lector-libro__clase-insignia"><BookOpen size={20} aria-hidden="true"/></span>
            <span className="lector-libro__clase-titulo">{tituloElemento(clase, indice)}</span>
            <ChevronRight className="lector-libro__clase-flecha" size={20} aria-hidden="true"/>
          </summary>
          <div className="lector-libro__clase-contenido"><ClaseCompleta clase={clase} conjuros={conjuros}/></div>
        </details>
      ))}
    </div>
  </section>
}
function SubclasesDesplegables({ seccion, clases, sinEncabezado }: { seccion: Seccion; clases: Registro[]; sinEncabezado?: boolean }) {
  return <section id={seccion.id} className="lector-libro__seccion">
    {!sinEncabezado && <div className="lector-libro__seccion-encabezado"><Feather size={20} aria-hidden="true"/><h2>Subclases</h2></div>}
    <div className="lector-libro__clases">{seccion.elementos.map((subclase,i) => {
      const datos=valorObjeto(subclase.datos)
      const clase=clases.find(c => texto(c.id)===texto(datos.claseId))
      const rasgos=lista(datos.rasgos).sort((a,b)=>Number(a.nivel||0)-Number(b.nivel||0))
      return <details className="lector-libro__clase" key={texto(subclase.id)||i}>
        <summary className="lector-libro__clase-resumen"><span className="lector-libro__clase-insignia"><BookOpen size={20} aria-hidden="true"/></span><span className="lector-libro__clase-titulo">{tituloElemento(subclase,i)} <span className="lector-libro__clase-detalle">· {clase ? tituloElemento(clase,0) : 'Clase no disponible'}</span></span><ChevronRight className="lector-libro__clase-flecha" size={20} aria-hidden="true"/></summary>
        <div className="lector-libro__clase-contenido"><TextoSeguro valor={subclase.descripcion}/>
          {rasgos.length>0 && <section className="lector-libro__clase-bloque"><h4>Características de subclase</h4><div className="lector-libro__rasgos">{rasgos.map((rasgo,j)=><article className="lector-libro__rasgo" key={texto(rasgo.id)||j}><div className="lector-libro__rasgo-encabezado"><span className="lector-libro__rasgo-nivel">Nivel {mostrar(rasgo.nivel)}</span><strong>{tituloElemento(rasgo,j)}</strong></div><TextoSeguro valor={rasgo.descripcion}/></article>)}</div></section>}
        </div>
      </details>
    })}</div>
  </section>
}
function SeccionContenido({ seccion, sinEncabezado }: { seccion: Seccion; sinEncabezado?: boolean }) {
  return <section id={seccion.id} className="lector-libro__seccion">
    {!sinEncabezado && <div className="lector-libro__seccion-encabezado"><Feather size={20} aria-hidden="true"/><h2>{seccion.titulo}</h2></div>}
    {seccion.elementos.length === 0
      ? <p className="lector-libro__vacio">Todavía no hay contenido publicado en esta sección.</p>
      : <div className="lector-libro__entradas">{seccion.elementos.map((elemento, i) => <article className="lector-libro__entrada" key={texto(elemento.id) || i}>
        <h3>{tituloElemento(elemento, i)}</h3>
        <TextoSeguro valor={elemento.descripcion || elemento.texto || elemento.resumen}/>
        {Array.isArray(elemento.rasgos) && elemento.rasgos.length > 0 && <div className="lector-libro__rasgos">{lista(elemento.rasgos).map((rasgo,j)=><div key={texto(rasgo.id)||j}><strong>{tituloElemento(rasgo,j)}</strong><TextoSeguro valor={rasgo.descripcion}/></div>)}</div>}
      </article>)}</div>}
  </section>
}
function EspeciesDesplegables({ seccion, sinEncabezado }: { seccion: Seccion; sinEncabezado?: boolean }) {
  return <section className="lector-libro__seccion" id={seccion.id}>
    {!sinEncabezado && <div className="lector-libro__seccion-encabezado"><Feather size={20} aria-hidden="true"/><h2>Especies</h2></div>}
    <div className="lector-libro__clases">{seccion.elementos.map((especie, i) => {
      const tipos = valoresTexto(especie.tiposCriatura).join(', ')
      const datos: [string, string][] = ([
        ['Tipo de criatura', tipos], ['Tamaño', tamanosEspecie(especie)], ['Velocidad', velocidadesEspecie(especie)], ['Visión en la oscuridad', visionEspecie(especie)],
      ] as [string, string][]).filter(([, v]) => v)
      const pagina = texto(especie.pagina)
      return <details className="lector-libro__clase" key={texto(especie.id) || i}>
        <summary className="lector-libro__clase-resumen"><span className="lector-libro__clase-insignia"><Footprints size={20} aria-hidden="true"/></span><span className="lector-libro__clase-titulo">{tituloElemento(especie, i)}{tipos && <span className="lector-libro__clase-detalle"> · {tipos}</span>}</span><ChevronRight className="lector-libro__clase-flecha" size={20} aria-hidden="true"/></summary>
        <article className="lector-libro__conjuro" aria-label={tituloElemento(especie, i)}>
          {pagina && <header className="lector-libro__conjuro-cabecera"><span className="lector-libro__conjuro-fuente">pág. {pagina}</span></header>}
          {datos.length > 0 && <dl className="lector-libro__conjuro-datos">
            {datos.map(([etiqueta, valor]) => <div key={etiqueta} className="lector-libro__conjuro-dato"><dt>{etiqueta}</dt><dd>{valor}</dd></div>)}
          </dl>}
          <TextoSeguro valor={especie.descripcion}/>
          {lista(especie.rasgos).length > 0 && <div className="lector-libro__rasgos">
            <h4>Rasgos</h4>
            {lista(especie.rasgos).map((rasgo, j) => <div key={texto(rasgo.id) || j}><strong>{tituloElemento(rasgo, j)}</strong><TextoSeguro valor={rasgo.descripcion}/></div>)}
          </div>}
          {lista(especie.linajes).length > 0 && <div className="lector-libro__rasgos">
            <h4>Linajes</h4>
            {lista(especie.linajes).map((linaje, j) => <div key={texto(linaje.id) || j}><strong>{tituloElemento(linaje, j)}</strong><TextoSeguro valor={linaje.descripcion}/>
              {lista(linaje.beneficios).map((b, k) => <p key={texto(b.id) || k} className="lector-libro__texto"><em>Nivel {texto(b.nivel) || '1'}.</em> {texto(b.descripcion).replace(/<[^>]*>/g, ' ')}</p>)}
            </div>)}
          </div>}
          {lista(especie.transformaciones).length > 0 && <div className="lector-libro__rasgos">
            <h4>Transformaciones</h4>
            {lista(especie.transformaciones).map((tr, j) => <div key={texto(tr.id) || j}><strong>{tituloElemento(tr, j)}</strong><TextoSeguro valor={tr.descripcion}/></div>)}
          </div>}
        </article>
      </details>
    })}</div>
  </section>
}
const CATEGORIAS_DOTE: Record<string, string> = { origen: 'Dote de origen', general: 'Dote general', epica: 'Dote épica', estilo_combate: 'Dote de estilo de combate' }
/** Dotes: categoría, prerrequisitos, descripción y cada beneficio con lo que da. */
function DotesDesplegables({ seccion, conjuros, sinEncabezado }: { seccion: Seccion; conjuros?: Registro[]; sinEncabezado?: boolean }) {
  const nombreConjuro = (id: string) => texto((conjuros ?? []).find(c => texto(c.id) === id)?.nombre)
  return <section className="lector-libro__seccion" id={seccion.id}>
    {!sinEncabezado && <div className="lector-libro__seccion-encabezado"><Feather size={20} aria-hidden="true"/><h2>Dotes</h2></div>}
    <div className="lector-libro__clases">{seccion.elementos.map((guardada, i) => {
      const dote = normalizarDote(guardada as unknown as Dote)
      const categoria = CATEGORIAS_DOTE[texto(dote.categoria)] ?? texto(dote.categoria)
      const requisitos = valoresTexto(dote.requisitos)
      const datos: [string, string][] = ([
        ['Categoría', categoria], ['Prerrequisito', requisitos.join(', ')],
        ['Lista de conjuros', valoresTexto(dote.seleccionConjuros?.listasPermitidas).join(', ')], ['Repetible', dote.repetible ? 'Sí' : ''],
      ] as [string, string][]).filter(([, v]) => v)
      return <details className="lector-libro__clase" key={texto(dote.id) || i}>
        <summary className="lector-libro__clase-resumen"><span className="lector-libro__clase-insignia"><ScrollText size={20} aria-hidden="true"/></span><span className="lector-libro__clase-titulo">{tituloElemento(guardada, i)}{categoria && <span className="lector-libro__clase-detalle"> · {categoria}</span>}</span><ChevronRight className="lector-libro__clase-flecha" size={20} aria-hidden="true"/></summary>
        <article className="lector-libro__conjuro" aria-label={tituloElemento(guardada, i)}>
          {datos.length > 0 && <dl className="lector-libro__conjuro-datos">
            {datos.map(([etiqueta, valor]) => <div key={etiqueta} className="lector-libro__conjuro-dato"><dt>{etiqueta}</dt><dd>{valor}</dd></div>)}
          </dl>}
          <TextoSeguro valor={dote.descripcion}/>
          {dote.beneficios.length > 0 && <div className="lector-libro__rasgos">
            {dote.beneficios.map(b => <div key={b.id}>
              <p className="lector-libro__texto">{b.nombre && <strong>{b.nombre}. </strong>}{b.descripcion.replace(/<[^>]*>/g, ' ')}</p>
              {resumenBeneficio(b, nombreConjuro) && <p className="lector-libro__texto lector-libro__nota"><em>{resumenBeneficio(b, nombreConjuro)}</em></p>}
            </div>)}
          </div>}
        </article>
      </details>
    })}</div>
  </section>
}
function ConjurosDesplegables({ seccion, sinEncabezado }: { seccion: Seccion; sinEncabezado?: boolean }) {
  return <section className="lector-libro__seccion" id={seccion.id}>
    {!sinEncabezado && <div className="lector-libro__seccion-encabezado"><Feather size={20} aria-hidden="true"/><h2>Conjuros</h2></div>}
    <div className="lector-libro__clases">{seccion.elementos.map((conjuro,i) => {
      const nivel = Number(conjuro.nivel ?? 0)
      const origen = texto(conjuro.libroOrigen)
      const pagina = Number(conjuro.paginaOrigen)
      const componentes = texto(conjuro.componentes)
      const material = texto(conjuro.componenteMaterial)
      const clases = valoresTexto(conjuro.clases)
      return <details className="lector-libro__clase" key={texto(conjuro.id)||i}>
        <summary className="lector-libro__clase-resumen"><span className="lector-libro__clase-insignia"><WandSparkles size={20} aria-hidden="true"/></span><span className="lector-libro__clase-titulo">{tituloElemento(conjuro,i)} <span className="lector-libro__clase-detalle">· {nivel===0 ? 'Truco' : `Nivel ${nivel}`}</span></span><ChevronRight className="lector-libro__clase-flecha" size={20} aria-hidden="true"/></summary>
        <article className="lector-libro__conjuro" aria-label={tituloElemento(conjuro,i)}>
          <header className="lector-libro__conjuro-cabecera">
            <p className="lector-libro__conjuro-escuela">{nivel===0 ? 'Truco' : `Conjuro de nivel ${nivel}`}{texto(conjuro.escuela) ? ` · ${texto(conjuro.escuela)}` : ''}{conjuro.ritual ? ' (ritual)' : ''}</p>
            {(origen || (Number.isInteger(pagina) && pagina>0)) && <span className="lector-libro__conjuro-fuente">{origen}{origen && pagina>0 ? ' · ' : ''}{pagina>0 ? `pág. ${pagina}` : ''}</span>}
          </header>
          <dl className="lector-libro__conjuro-datos">
            {texto(conjuro.tiempoLanzamiento) && <div className="lector-libro__conjuro-dato"><dt>Tiempo de lanzamiento</dt><dd>{texto(conjuro.tiempoLanzamiento)}</dd></div>}
            {texto(conjuro.alcance) && <div className="lector-libro__conjuro-dato"><dt>Alcance</dt><dd>{texto(conjuro.alcance)}</dd></div>}
            {componentes && <div className="lector-libro__conjuro-dato"><dt>Componentes</dt><dd>{componentes}{material ? ` (${material})` : ''}</dd></div>}
            {texto(conjuro.duracion) && <div className="lector-libro__conjuro-dato"><dt>Duración</dt><dd>{conjuro.concentracion ? 'Concentración, ' : ''}{texto(conjuro.duracion)}</dd></div>}
            {datosDeEfecto(conjuro).map(d => <div key={d.etiqueta + d.valor} className="lector-libro__conjuro-dato"><dt>{d.etiqueta}</dt><dd>{d.valor}</dd></div>)}
          </dl>
          <TextoSeguro valor={conjuro.descripcion}/>
          {clases.length>0 && <p className="lector-libro__conjuro-clases">Clases: {clases.map(c => <span key={c}>{c}</span>)}</p>}
        </article>
      </details>
    })}</div>
  </section>
}
export default function LectorLibro() {
  const { libroId, propuestaId } = useParams<{ libroId?: string; propuestaId?: string }>()
  const esBorrador = Boolean(propuestaId)
  const [parametros] = useSearchParams()
  const origen = parametros.get('origen')
  const desdeRevision = esBorrador && origen === 'revision'
  const desdeAdministracion = origen === 'administracion'
  const desdeCompartidos = esBorrador && origen === 'compartidos'
  // Vista previa abierta desde el editor: se vuelve al editor, que a su vez recuerda su pestaña de origen.
  const desdeEditor = esBorrador && origen === 'editor'
  const origenDelEditor = parametros.get('desde')
  const seccion = parametros.get('seccion')
  const seccionAdmin = seccion === 'publicados' || seccion === 'ocultos' || seccion === 'borrados' ? seccion : 'pendientes'
  const destinoVolver = desdeEditor
    ? `/biblioteca/libros/editar-borrador/${propuestaId}${origenDelEditor ? `?origen=${encodeURIComponent(origenDelEditor)}` : ''}`
    : desdeRevision
    ? `/biblioteca/libros/revision/${propuestaId}`
    : desdeAdministracion ? `/administracion/revision?seccion=${seccionAdmin}`
    : desdeCompartidos ? '/biblioteca/libros?tab=compartidos'
    : esBorrador ? '/biblioteca/libros?tab=propuestas' : '/biblioteca/libros'
  const [libro,setLibro] = useState<LibroPublicado|null>(null)
  const [cargando,setCargando] = useState(true)
  const [error,setError] = useState('')
  const [versionId,setVersionId] = useState('')
  const [mostrarVolverArriba, setMostrarVolverArriba] = useState(false)
  useEffect(() => {
    const contenedor = document.querySelector<HTMLElement>('.app-layout-content')
    if (!contenedor) return
    const comprobarScroll = () => setMostrarVolverArriba(contenedor.scrollTop > 350)
    comprobarScroll()
    contenedor.addEventListener('scroll', comprobarScroll, { passive: true })
    return () => contenedor.removeEventListener('scroll', comprobarScroll)
  }, [])
  useEffect(()=>{
    let activo=true
    async function cargar() {
      setCargando(true);setError('')
      if (propuestaId) {
        const { data, error: fallo } = await supabase.from('propuestas')
          .select('id,estado,titulo,descripcion,idioma,categorias,metadatos_libro,contenido')
          .eq('id', propuestaId).eq('estado', 'borrador').maybeSingle()
        if (!activo) return
        if (fallo) setError('No se pudo cargar el borrador.')
        else if (!data) setError('No tenés acceso a este borrador o ya no está disponible.')
        else {
          const meta = esObjeto(data.metadatos_libro) ? data.metadatos_libro : {}
          const contenido = esObjeto(data.contenido) ? data.contenido : {}
          const version: Version = {
            id: data.id, idioma: data.idioma ?? 'es', titulo: data.titulo ?? '',
            descripcion: data.descripcion ?? '', categorias: data.categorias ?? [],
            especies: contenido.especies ?? [], conjuros: contenido.conjuros ?? [],
            clases: contenido.clases ?? [], subclases: contenido.subclases ?? [],
            objetos: contenido.objetos ?? [],
            contenido_extra: { dotes: contenido.dotes ?? [], trasfondos: contenido.trasfondos ?? [], criaturas: contenido.criaturas ?? [], caracteristicas: contenido.caracteristicas ?? [], capitulos: contenido.capitulos ?? [] },
          }
          setLibro({ id: data.id, codigo: texto(meta.codigo) || null,
            edicion: texto(meta.edicion) || null, editorial: texto(meta.editorial) || null,
            clasificacion: texto(meta.clasificacion) || null, estado: 'borrador', libro_versiones: [version] })
          setVersionId(version.id)
        }
        setCargando(false)
        return
      }
      const {data,error:fallo}=await supabase.from('libros')
        .select('id,codigo,edicion,editorial,clasificacion,estado,libro_versiones(id,idioma,titulo,descripcion,categorias,especies,conjuros,clases,subclases,objetos,contenido_extra)')
        .eq('id',libroId ?? '').eq('estado','publicado').maybeSingle()
      if(!activo)return
      if(fallo)setError('No se pudo cargar el libro publicado.')
      else if(!data)setError('Este libro no está disponible en el catálogo.')
      else {const resultado=data as LibroPublicado;setLibro(resultado);setVersionId(resultado.libro_versiones[0]?.id || '')}
      setCargando(false)
    }
    void cargar()
    return ()=>{activo=false}
  },[libroId,propuestaId])
  const version=libro?.libro_versiones.find(v=>v.id===versionId) ?? libro?.libro_versiones[0]
  const extras = valorObjeto(version?.contenido_extra)
  const categoriasActivas = Array.isArray(version?.categorias) ? version.categorias.filter((categoria): categoria is string => typeof categoria === 'string') : []
  // Fichas del libro por categoría (para las categorías activas).
  const porCategoria: Record<string, Registro[]> = {}
  if (version) {
    const todas: Record<string, unknown> = { especies: version.especies, clases: version.clases, subclases: version.subclases, objetos: version.objetos, conjuros: version.conjuros,
      dotes: extras.dotes, trasfondos: extras.trasfondos, criaturas: extras.criaturas, caracteristicas: extras.caracteristicas }
    for (const [id, valor] of Object.entries(todas)) porCategoria[id] = categoriasActivas.includes(id) ? lista(valor) : []
  }
  const capitulosLibro = categoriasActivas.includes('capitulos') ? leerCapitulos(extras.capitulos) : []
  // Las categorías que ningún capítulo ubica se leen al final, cada una como un capítulo propio.
  const ubicadas = new Set(capitulosLibro.flatMap(c => c.bloques.flatMap(b => b.tipo === 'fichas' ? [b.categoria] : [])))
  const automaticos: Capitulo[] = ORDEN_CATEGORIAS.filter(id => !ubicadas.has(id) && (porCategoria[id]?.length ?? 0) > 0)
    .map(id => ({ id: `auto-${id}`, etiqueta: '', titulo: TITULOS_CATEGORIA[id] ?? id, bloques: [{ id: `auto-${id}`, tipo: 'fichas' as const, categoria: id, ids: [] }] }))
  const capitulosLector = [...capitulosLibro, ...automaticos]
  const sinCapitulos = capitulosLibro.length === 0
  const indice = [
    ...(sinCapitulos ? [{ id: 'introduccion', titulo: 'Introducción', secciones: [] as { id: string; titulo: string }[] }] : []),
    ...capitulosLector.map(c => ({
      id: `cap-${c.id}`,
      titulo: [c.etiqueta, c.titulo].filter(Boolean).join(': ') || 'Capítulo',
      secciones: c.bloques.flatMap(b => b.tipo === 'titulo' && b.texto.trim() ? [{ id: `sec-${b.id}`, titulo: b.texto }] : []),
    })),
  ]
  const idsIndice = indice.flatMap(item => [item.id, ...item.secciones.map(s => s.id)]).join('|')
  // Sección que se está leyendo: la última cuyo comienzo ya pasó el borde superior.
  const [seccionActiva, setSeccionActiva] = useState('')
  const indiceRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const contenedor = document.querySelector<HTMLElement>('.app-layout-content')
    if (!contenedor || !idsIndice) return
    const ids = idsIndice.split('|')
    const actualizar = () => {
      const borde = contenedor.getBoundingClientRect().top + 120
      let actual = ids[0]
      for (const id of ids) {
        const elemento = document.getElementById(id)
        if (elemento && elemento.getBoundingClientRect().top <= borde) actual = id
      }
      setSeccionActiva(actual)
    }
    actualizar()
    contenedor.addEventListener('scroll', actualizar, { passive: true })
    return () => contenedor.removeEventListener('scroll', actualizar)
  }, [idsIndice])
  const capituloActivo = indice.find(item => item.id === seccionActiva || item.secciones.some(s => s.id === seccionActiva))?.id ?? indice[0]?.id
  // En celular el índice es una fila desplazable: se acomoda para que se vea el capítulo actual.
  useEffect(() => {
    const fila = indiceRef.current
    const enlace = fila?.querySelector<HTMLElement>(`[data-seccion="${capituloActivo}"]`)
    if (!fila || !enlace || fila.scrollWidth <= fila.clientWidth) return
    fila.scrollTo({ left: enlace.offsetLeft - 8, behavior: 'smooth' })
  }, [capituloActivo])
  const categorias = categoriasActivas.filter(c => c !== 'capitulos').map(c => TITULOS_CATEGORIA[c] ?? c)
  const textoVolver = desdeEditor ? 'Editor' : desdeRevision ? 'Revisión' : desdeAdministracion ? 'Revisión de libros' : desdeCompartidos ? 'Compartidos conmigo' : esBorrador ? 'Mis propuestas' : 'Libros y propuestas'
  return <AppLayout title={version?.titulo || 'Biblioteca'} subtitle={esBorrador ? "Vista previa del borrador" : "Lectura de libros publicados"} migaAnterior={{ texto: textoVolver, ruta: destinoVolver }}>
    <main className="lector-libro">
      {desdeEditor && <div className="lector-libro__aviso-previa" role="status">
        <span>Vista previa de lo último que guardaste.</span>
        <Link to={destinoVolver} className="lector-libro__volver-editor">Volver al editor</Link>
      </div>}
      {cargando ? <div className="lector-libro__estado">Abriendo libro...</div>
      : error ? <div className="lector-libro__estado" role="alert">{error}</div>
      : libro && version ? <>
        <header className="lector-libro__portada">
          <img className="lector-libro__sello" src={logoOscuro} alt="" width={200} height={200}/>
          <span className={`lector-libro__sobre${esBorrador ? ' lector-libro__sobre--borrador' : ''}`}>{esBorrador ? 'Vista previa · borrador sin publicar' : 'Biblioteca de Chronicle'}</span>
          <h1>{version.titulo || 'Libro sin título'}</h1>
          <p className="lector-libro__subtitulo">{libro.editorial || 'Una obra de la comunidad'}</p>
          <div className="lector-libro__metadatos">
            {libro.edicion && <span>Edición {libro.edicion}</span>}
            {libro.codigo && <span>{libro.codigo}</span>}
            {libro.clasificacion && <span>{libro.clasificacion}</span>}
          </div>
          {libro.libro_versiones.length>1 && <div className="lector-libro__idioma"><label htmlFor="lector-version">Versión / idioma</label><select id="lector-version" value={version.id} onChange={e=>setVersionId(e.target.value)}>{libro.libro_versiones.map(v=><option key={v.id} value={v.id}>{v.idioma.toUpperCase()} · {v.titulo}</option>)}</select></div>}
        </header>
        <div className="lector-libro__disposicion">
          <nav className="lector-libro__indice" aria-label="Índice del libro" ref={indiceRef}>
            <div className="lector-libro__indice-titulo"><ScrollText size={16} aria-hidden="true"/> Índice</div>
            {indice.map(item => <Fragment key={item.id}>
              <a href={`#${item.id}`} data-seccion={item.id}
                className={capituloActivo === item.id ? 'lector-libro__indice-actual' : undefined}
                aria-current={seccionActiva === item.id ? 'location' : undefined}>{item.titulo}</a>
              {capituloActivo === item.id && item.secciones.map(sec => <a key={sec.id} href={`#${sec.id}`} data-seccion={sec.id}
                className={`lector-libro__indice-sub${seccionActiva === sec.id ? ' lector-libro__indice-sub--actual' : ''}`}
                aria-current={seccionActiva === sec.id ? 'location' : undefined}>
                {seccionActiva === sec.id && <Pluma/>}{sec.titulo}</a>)}
            </Fragment>)}
          </nav>
          <div className="lector-libro__paginas">
            {sinCapitulos && <section id="introduccion" className="lector-libro__introduccion">
              <span className="lector-libro__eyebrow">Prefacio</span>
              <h2>Introducción</h2>
              <TextoSeguro valor={version.descripcion || 'Un nuevo mundo de aventuras te espera entre estas páginas.'}/>
              {categorias.length>0 && <div className="lector-libro__categorias">{categorias.map(c=><span key={c}>{c}</span>)}</div>}
            </section>}
            {capitulosLector.map(c => <CapituloLector key={c.id} capitulo={c} porCategoria={porCategoria}/>)}
            {capitulosLector.length===0 && <p className="lector-libro__vacio">Este libro todavía no tiene entradas estructuradas disponibles para leer.</p>}
            <footer className="lector-libro__pie"><Ornamento/><img src={logoOscuro} alt="" width={36} height={36}/>Fin del contenido disponible</footer>
          </div>
        </div>
      </> : null}
      {mostrarVolverArriba && (
        <button type="button" className="lector-libro__volver-arriba"
          title="Volver al comienzo" aria-label="Volver al comienzo de la lectura"
          onClick={() => document.querySelector<HTMLElement>('.app-layout-content')?.scrollTo({ top: 0, behavior: 'smooth' })}>
          <ArrowUp size={21} aria-hidden="true" />
        </button>
      )}
    </main>
  </AppLayout>
}

const ORDEN_CATEGORIAS = ['especies', 'clases', 'subclases', 'objetos', 'conjuros', 'dotes', 'trasfondos', 'criaturas', 'caracteristicas']
const TITULOS_CATEGORIA: Record<string, string> = {
  especies: 'Especies', clases: 'Clases', subclases: 'Subclases', objetos: 'Objetos y equipo', conjuros: 'Conjuros',
  dotes: 'Dotes', trasfondos: 'Trasfondos', criaturas: 'Criaturas', caracteristicas: 'Características y reglas',
}

/** Adorno dorado bajo el título de un capítulo (las curvas de las páginas del logo). */
function Ornamento() {
  return <svg className="lector-capitulo__ornamento" width="220" height="24" viewBox="0 0 240 26" fill="none" aria-hidden="true">
    <path d="M4 20 C 70 2, 170 2, 236 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M40 24 C 90 12, 150 12, 200 24" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".6"/>
    <path d="M120 4 l4 4 -4 4 -4 -4 z" fill="currentColor"/>
  </svg>
}
/** La pluma del logo: marca la sección que se está leyendo. */
function Pluma() {
  return <svg className="lector-libro__pluma" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 3C13 4 7 9 5 19l-2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M21 3c-1 6-5 11-12 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M9 11c3-1 6-3 8-6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".8"/>
  </svg>
}

/** Un capítulo: apertura, bloques de texto y las fichas que ubica. */
function CapituloLector({ capitulo, porCategoria }: { capitulo: Capitulo; porCategoria: Record<string, Registro[]> }) {
  const primerParrafo = capitulo.bloques.findIndex(b => b.tipo === 'parrafo')
  return <section id={`cap-${capitulo.id}`} className="lector-capitulo">
    <header className="lector-capitulo__apertura">
      {capitulo.etiqueta && capitulo.titulo && <span className="lector-capitulo__etiqueta">{capitulo.etiqueta}</span>}
      <h2>{capitulo.titulo || capitulo.etiqueta || 'Capítulo'}</h2>
      <Ornamento/>
    </header>
    {capitulo.bloques.map((bloque, i) => <BloqueLector key={bloque.id} bloque={bloque} capitular={i === primerParrafo} porCategoria={porCategoria}/>)}
  </section>
}

function BloqueLector({ bloque, capitular, porCategoria }: { bloque: Bloque; capitular: boolean; porCategoria: Record<string, Registro[]> }) {
  switch (bloque.tipo) {
    case 'parrafo': return <div className={`lector-capitulo__texto${capitular ? ' lector-capitulo__texto--capitular' : ''}`}><TextoConFormato texto={bloque.texto}/></div>
    case 'titulo': return <h3 id={`sec-${bloque.id}`} className="lector-capitulo__titulo">{formatoEnLinea(bloque.texto)}</h3>
    case 'subtitulo': return <h4 className="lector-capitulo__subtitulo">{formatoEnLinea(bloque.texto)}</h4>
    case 'termino': return <p className="lector-capitulo__termino"><strong>{formatoEnLinea(bloque.termino)}</strong> {formatoEnLinea(bloque.texto)}</p>
    case 'lista': return <ol className="lector-capitulo__lista">{bloque.items.map((item, i) => <li key={i}>
      <span className="lector-capitulo__numero">{i + 1}:</span>
      <span>{item.termino && <strong>{formatoEnLinea(item.termino)} </strong>}{formatoEnLinea(item.texto)}</span></li>)}</ol>
    case 'recuadro': return <aside className="lector-capitulo__recuadro">
      {bloque.titulo && <h5>{formatoEnLinea(bloque.titulo)}</h5>}
      <TextoConFormato texto={bloque.texto}/>
    </aside>
    case 'dialogo': return <div className="lector-capitulo__dialogo" role="group" aria-label="Ejemplo de partida">
      {bloque.lineas.map((linea, i) => <p key={i}><strong className={`lector-capitulo__voz lector-capitulo__voz--${i % 3}`}>{linea.nombre}:</strong> {formatoEnLinea(linea.texto)}</p>)}
    </div>
    case 'carta': return <blockquote className="lector-capitulo__carta">
      <TextoConFormato texto={bloque.texto}/>
      {bloque.firma && <p className="lector-capitulo__firma">—{bloque.firma}</p>}
    </blockquote>
    case 'tabla': return <div className="lector-libro__tabla-scroll lector-capitulo__tabla"><table className="lector-libro__tabla">
      {bloque.titulo && <caption>{bloque.titulo}</caption>}
      <thead><tr>{bloque.columnas.map((c, i) => <th scope="col" key={i}>{formatoEnLinea(c)}</th>)}</tr></thead>
      <tbody>{bloque.filas.filter(f => f.some(Boolean)).map((fila, i) => <tr key={i}>{bloque.columnas.map((_, j) => <td key={j}>{formatoEnLinea(fila[j] ?? '')}</td>)}</tr>)}</tbody>
    </table></div>
    case 'fichas': {
      const todas = porCategoria[bloque.categoria] ?? []
      const elementos = bloque.ids.length ? todas.filter(e => bloque.ids.includes(texto(e.id))) : todas
      if (!elementos.length) return null
      const seccion: Seccion = { id: `fichas-${bloque.id}`, titulo: TITULOS_CATEGORIA[bloque.categoria] ?? bloque.categoria, elementos }
      if (bloque.categoria === 'clases') return <ClasesDesplegables seccion={seccion} conjuros={porCategoria.conjuros} sinEncabezado/>
      if (bloque.categoria === 'subclases') return <SubclasesDesplegables seccion={seccion} clases={porCategoria.clases ?? []} sinEncabezado/>
      if (bloque.categoria === 'conjuros') return <ConjurosDesplegables seccion={seccion} sinEncabezado/>
      if (bloque.categoria === 'especies') return <EspeciesDesplegables seccion={seccion} sinEncabezado/>
      if (bloque.categoria === 'dotes') return <DotesDesplegables seccion={seccion} conjuros={porCategoria.conjuros} sinEncabezado/>
      return <SeccionContenido seccion={seccion} sinEncabezado/>
    }
  }
}
