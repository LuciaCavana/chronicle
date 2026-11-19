import { useEffect, useMemo, useState } from 'react'
import { agruparCambios, camposModificados, type Cambio } from '../lib/diferencias'
import { cargarRevision, type BaseRevision, type EnvioRevision, type LibroParecido, type PropuestaRevision } from '../services/revision'

export type FiltroRevision = 'todos' | 'agregar' | 'modificar' | 'retirar' | 'categorias'
/** Qué se hace con un cambio al aprobar: aplicarlo, descartarlo o aplicar solo algunos campos. */
export type Decision = { decision: 'aceptar' | 'descartar' | 'parcial'; campos?: string[] }
const ACEPTAR: Decision = { decision: 'aceptar' }
/** Un elemento modificado (la base lo llama "corregir"; algunos datos viejos, "modificar"). */
export const esModificacion = (cambio: Cambio) => cambio.accion === 'corregir' || cambio.accion === 'modificar' || cambio.accion === 'modificar_campo'
export function useRevisionPropuesta(id: string) {
 const [propuesta, setPropuesta] = useState<PropuestaRevision | null>(null)
 const [envio, setEnvio] = useState<EnvioRevision | null>(null)
 const [cambios, setCambios] = useState<Cambio[]>([])
 const [cargando, setCargando] = useState(true)
 const [error, setError] = useState('')
 const [filtro, setFiltro] = useState<FiltroRevision>('todos')
 const [busqueda, setBusqueda] = useState('')
 const [ocultarRevisados, setOcultarRevisados] = useState(false)
 const [seleccion, setSeleccion] = useState(0)
 const [revisados, setRevisados] = useState<Set<number>>(() => new Set())
 const [notas, setNotas] = useState<Record<number, string>>({})
 const [decisiones, setDecisiones] = useState<Record<number, Decision>>({})
 const [base, setBase] = useState<BaseRevision | null>(null)
 const [parecidos, setParecidos] = useState<LibroParecido[]>([])
 // Cambia al convertir la propuesta (libro nuevo ↔ corrección) para volver a cargarla.
 const [carga, setCarga] = useState(0)
 useEffect(() => {
  let vigente = true
  void cargarRevision(id).then(datos => {
   if (!vigente) return
   setPropuesta(datos.propuesta); setEnvio(datos.envio); setCambios(datos.cambios)
   setBase(datos.base); setParecidos(datos.parecidos)
   // Los cambios se recalcularon: lo decidido antes ya no corresponde.
   setSeleccion(0); setRevisados(new Set()); setNotas({}); setDecisiones({})
  }).catch(e => { if (vigente) setError(e instanceof Error ? e.message : 'Error al cargar revisión') })
   .finally(() => { if (vigente) setCargando(false) })
  return () => { vigente = false }
 }, [id, carga])
 const recargar = () => setCarga(n => n + 1)
 const filtrados = useMemo(() => cambios.map((cambio, indice) => ({ cambio, indice })).filter(({cambio, indice}) => {
  if (ocultarRevisados && revisados.has(indice)) return false
  const categoria = cambio.accion === 'activar_categoria' || cambio.accion === 'desactivar_categoria'
  if (filtro === 'categorias' && !categoria) return false
  if (filtro === 'modificar' && !esModificacion(cambio)) return false
  if (filtro === 'agregar' && cambio.accion !== 'agregar') return false
  if (filtro === 'retirar' && cambio.accion !== 'retirar') return false
  if (busqueda && ![cambio.categoria,cambio.elemento_id,JSON.stringify(cambio.antes),JSON.stringify(cambio.despues)].join(' ').toLowerCase().includes(busqueda.toLowerCase())) return false
  return true
 }), [cambios, filtro, busqueda, ocultarRevisados, revisados])
 const grupos = useMemo(() => {
  const ordenados = agruparCambios(filtrados.map(x => x.cambio))
  return ordenados.map(grupo => ({ categoria: grupo.categoria, items: filtrados.filter(x => (x.cambio.accion === 'activar_categoria' || x.cambio.accion === 'desactivar_categoria' ? 'categorias' : x.cambio.categoria) === grupo.categoria) }))
 }, [filtrados])
 const actual = cambios[seleccion]
 const navegar = (delta: number) => setSeleccion(actualIndice => {
  const indices = filtrados.map(x => x.indice)
  if (!indices.length) return actualIndice
  const posicion = indices.indexOf(actualIndice)
  return indices[(Math.max(0, posicion < 0 ? 0 : Math.min(indices.length - 1, posicion + delta)))]
 })
 const marcar = () => {
  setRevisados(actuales => new Set(actuales).add(seleccion))
  navegar(1)
 }
 const totalNotas = Object.values(notas).filter(n => n.trim()).length

 // ---------- Decisiones por cambio (aplicar / descartar / solo algunos campos) ----------
 const decisionDe = (indice: number): Decision => decisiones[indice] ?? ACEPTAR
 const decidir = (indice: number, aplicar: boolean) =>
  setDecisiones(actuales => ({ ...actuales, [indice]: aplicar ? ACEPTAR : { decision: 'descartar' } }))
 /** Marca o desmarca un campo de un elemento modificado; todos = aplicar, ninguno = descartar. */
 const alternarCampo = (indice: number, campo: string) => setDecisiones(actuales => {
  const todos = camposModificados(cambios[indice])
  const actual = actuales[indice] ?? ACEPTAR
  const elegidos = new Set(actual.decision === 'aceptar' ? todos : actual.decision === 'descartar' ? [] : actual.campos ?? [])
  if (elegidos.has(campo)) elegidos.delete(campo); else elegidos.add(campo)
  const lista = todos.filter(c => elegidos.has(c))
  const decision: Decision = lista.length === todos.length ? ACEPTAR : lista.length === 0 ? { decision: 'descartar' } : { decision: 'parcial', campos: lista }
  return { ...actuales, [indice]: decision }
 })
 const resumenDecisiones = useMemo(() => {
  const resumen = { aplicados: 0, parciales: 0, descartados: 0 }
  cambios.forEach((_, i) => {
   const d = decisiones[i]?.decision ?? 'aceptar'
   if (d === 'aceptar') resumen.aplicados++; else if (d === 'parcial') resumen.parciales++; else resumen.descartados++
  })
  return resumen
 }, [cambios, decisiones])
 /** Lo que se manda al aprobar: solo los cambios que no se aplican completos. */
 const decisionesParaEnviar = Object.entries(decisiones)
  .filter(([, d]) => d.decision !== 'aceptar')
  .map(([i, d]) => d.decision === 'parcial' ? { i: Number(i), decision: d.decision, campos: d.campos ?? [] } : { i: Number(i), decision: d.decision })

 return { propuesta, envio, cambios, base, parecidos, recargar, cargando, error, filtro, setFiltro, busqueda, setBusqueda, ocultarRevisados, setOcultarRevisados, seleccion, setSeleccion, revisados, notas, setNotas, filtrados, grupos, actual, navegar, marcar, totalNotas,
  decisiones, decisionDe, decidir, alternarCampo, resumenDecisiones, decisionesParaEnviar }
}
