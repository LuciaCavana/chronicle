import { useEffect, useMemo, useState } from 'react'
import { agruparCambios, type Cambio } from '../lib/diferencias'
import { cargarRevision, type EnvioRevision, type PropuestaRevision } from '../services/revision'

export type FiltroRevision = 'todos' | 'agregar' | 'modificar' | 'retirar' | 'categorias'
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
 useEffect(() => {
  let vigente = true
  void cargarRevision(id).then(datos => {
   if (!vigente) return
   setPropuesta(datos.propuesta); setEnvio(datos.envio); setCambios(datos.cambios)
  }).catch(e => { if (vigente) setError(e instanceof Error ? e.message : 'Error al cargar revisión') })
   .finally(() => { if (vigente) setCargando(false) })
  return () => { vigente = false }
 }, [id])
 const filtrados = useMemo(() => cambios.map((cambio, indice) => ({ cambio, indice })).filter(({cambio, indice}) => {
  if (ocultarRevisados && revisados.has(indice)) return false
  const categoria = cambio.accion === 'activar_categoria' || cambio.accion === 'desactivar_categoria'
  if (filtro === 'categorias' && !categoria) return false
  if (filtro === 'modificar' && cambio.accion !== 'modificar' && cambio.accion !== 'modificar_campo') return false
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
 return { propuesta, envio, cambios, cargando, error, filtro, setFiltro, busqueda, setBusqueda, ocultarRevisados, setOcultarRevisados, seleccion, setSeleccion, revisados, notas, setNotas, filtrados, grupos, actual, navegar, marcar, totalNotas }
}
