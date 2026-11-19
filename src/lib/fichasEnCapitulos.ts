import { nuevoId, type Bloque, type Capitulo } from '../types/capitulo'
import {
  armasEnTexto, leerClase, leerEspecie, leerSubclase, NIVEL_RASGO, objetoDeTermino,
  type CategoriaFicha, type FichaDetectada,
} from './fichasLibro'

/**
 * Fichas que en el libro ocupan secciones enteras (especies, clases con sus subclases) o
 * entradas dentro del texto (equipo con precio, filas de la tabla de armas). Se reconocen
 * sobre el capítulo ya armado y su texto se reemplaza por la ficha, en el mismo lugar.
 */
type Encabezado = Extract<Bloque, { tipo: 'titulo' | 'subtitulo' }>
const esEncabezado = (b: Bloque): b is Encabezado => b.tipo === 'titulo' || b.tipo === 'subtitulo'
const textoDe = (b: Bloque): string => b.tipo === 'parrafo' ? b.texto : b.tipo === 'recuadro' ? `${b.titulo}\n\n${b.texto}` : esEncabezado(b) ? b.texto : ''
const nivel = (b: Bloque) => b.tipo === 'titulo' ? 1 : b.tipo === 'subtitulo' ? 2 : 3
/** Hasta dónde llega la sección que abre el encabezado de la posición i. */
const finDeSeccion = (bloques: Bloque[], i: number) => {
  let j = i + 1
  while (j < bloques.length && !(esEncabezado(bloques[j]) && nivel(bloques[j]) <= nivel(bloques[i]))) j++
  return j
}
const NO_ES_SUBCLASE = /^(rasgos|lista de conjuros|opciones de|convertirse|nivel \d|caracter[ií]sticas de|tabla|multiclase)/i

function bloqueFichas(categoria: CategoriaFicha, ids: string[]): Bloque {
  return { id: nuevoId(), tipo: 'fichas', categoria, ids }
}

export function extraerFichasDeBloques(capitulo: Capitulo): FichaDetectada[] {
  const fichas: FichaDetectada[] = []
  let bloques = capitulo.bloques

  // ---------- Clases y subclases ----------
  const esClase = (i: number) => esEncabezado(bloques[i]) && bloques.slice(i + 1, finDeSeccion(bloques, i)).some(b => /rasgos b[áa]sicos de/i.test(textoDe(b)))
  const inicioClases = bloques.map((_, i) => i).filter(esClase)
  if (inicioClases.length) {
    const nuevos: Bloque[] = bloques.slice(0, inicioClases[0])
    let finUltima = bloques.length
    inicioClases.forEach((inicio, k) => {
      // La clase termina en la próxima clase o en un encabezado de su mismo nivel que no tiene rasgos por nivel.
      let fin = inicioClases[k + 1] ?? bloques.length
      for (let j = inicio + 1; j < fin; j++) {
        const b = bloques[j]
        if (!esEncabezado(b) || nivel(b) > nivel(bloques[inicio])) continue
        const propio = bloques.slice(j + 1, finDeSeccion(bloques, j))
        const conRasgos = propio.some(x => /\bnivel \d{1,2}\s*:/i.test(textoDe(x)))
        if (!conRasgos && !NO_ES_SUBCLASE.test(b.texto)) { fin = j; break }
      }
      if (k === inicioClases.length - 1) finUltima = fin
      const encabezado = bloques[inicio] as Encabezado
      const tramo = bloques.slice(inicio + 1, fin)
      // Subclases: encabezados con rasgos "Nivel N:" propios, después de la parte de la clase.
      const subclases: number[] = []
      tramo.forEach((b, j) => {
        if (!esEncabezado(b) || NO_ES_SUBCLASE.test(b.texto) || NIVEL_RASGO.test(b.texto)) return
        const hasta = finDeSeccion(tramo, j)
        const propio = tramo.slice(j + 1, hasta).map(textoDe).join(' ')
        const tieneRasgos = /\bnivel \d{1,2}\s*:/i.test(propio) || tramo.slice(j + 1, hasta).some(x => esEncabezado(x) && NIVEL_RASGO.test(x.texto))
        if (tieneRasgos && j > 0) subclases.push(j)
      })
      const finClase = subclases[0] ?? tramo.length
      // La lista de conjuros de la clase se arma sola con los conjuros: no se copia.
      const partes = (desde: number, hasta: number) => {
        const lista: { titulo?: string; texto?: string }[] = []
        let saltando = false
        for (const b of tramo.slice(desde, hasta)) {
          if (esEncabezado(b)) { saltando = /^lista de conjuros/i.test(b.texto); if (!saltando) lista.push({ titulo: b.texto }); continue }
          if (saltando) continue
          if (b.tipo === 'parrafo') b.texto.split(/\n\s*\n/).forEach(p => lista.push({ texto: p.replace(/\*\*/g, '') }))
          else if (b.tipo === 'recuadro') lista.push({ texto: `${b.titulo}. ${b.texto}` })
          else if (b.tipo === 'lista') b.items.forEach(it => lista.push({ texto: `${it.termino} ${it.texto}`.trim() }))
        }
        return lista
      }
      const clase = leerClase(encabezado.texto, partes(0, finClase))
      const fichaClase: FichaDetectada = { id: nuevoId(), categoria: 'clases', nombre: encabezado.texto, datos: clase }
      fichas.push(fichaClase)
      nuevos.push(bloqueFichas('clases', [fichaClase.id]))
      const idsSub: string[] = []
      subclases.forEach((s, n) => {
        const nombre = (tramo[s] as Encabezado).texto
        const sub: FichaDetectada = { id: nuevoId(), categoria: 'subclases', nombre, clase: encabezado.texto, datos: leerSubclase(nombre, partes(s + 1, subclases[n + 1] ?? tramo.length)) }
        fichas.push(sub)
        idsSub.push(sub.id)
      })
      if (idsSub.length) nuevos.push(bloqueFichas('subclases', idsSub))
    })
    bloques = [...nuevos, ...bloques.slice(finUltima)]
  }

  // ---------- Especies: "Tipo de criatura:" dentro de la sección ----------
  for (let i = 0; i < bloques.length; i++) {
    const b = bloques[i]
    if (!esEncabezado(b) || /^rasgos de/i.test(b.texto)) continue
    const fin = finDeSeccion(bloques, i)
    const tramo = bloques.slice(i + 1, fin)
    const conTipo = tramo.findIndex(x => /tipo de criatura\s*:/i.test(textoDe(x)))
    if (conTipo < 0) continue
    const corte = tramo.findIndex(x => (esEncabezado(x) && /^rasgos de/i.test(x.texto)) || /tipo de criatura\s*:/i.test(textoDe(x)))
    const parrafos = (lista: Bloque[]) => lista.filter(x => !esEncabezado(x)).flatMap(x => textoDe(x).split(/\n\s*\n/)).filter(Boolean)
    const antes = parrafos(tramo.slice(0, corte))
    const despues = parrafos(tramo.slice(corte))
    const ficha: FichaDetectada = { id: nuevoId(), categoria: 'especies', nombre: b.texto, datos: leerEspecie(b.texto, antes, despues) }
    fichas.push(ficha)
    const previo = bloques[i - 1]
    if (previo?.tipo === 'fichas' && previo.categoria === 'especies') { previo.ids.push(ficha.id); bloques.splice(i, fin - i); i-- }
    else bloques.splice(i, fin - i, bloqueFichas('especies', [ficha.id]))
  }

  // ---------- Objetos: "Nombre (25 po). texto" y filas de la tabla de armas ----------
  const resultado: Bloque[] = []
  for (const b of bloques) {
    if (b.tipo !== 'parrafo') { resultado.push(b); continue }
    const quedan: string[] = []
    let ids: string[] = []
    const volcarObjetos = () => {
      if (!ids.length) return
      if (quedan.length) { resultado.push({ ...b, id: nuevoId(), texto: quedan.join('\n\n') }); quedan.length = 0 }
      const ultimo = resultado[resultado.length - 1]
      if (ultimo?.tipo === 'fichas' && ultimo.categoria === 'objetos') ultimo.ids.push(...ids)
      else resultado.push(bloqueFichas('objetos', ids))
      ids = []
    }
    for (const p of b.texto.split(/\n\s*\n/)) {
      const t = p.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/)
      const objeto = t ? objetoDeTermino(t[1], t[2]) : null
      if (objeto) {
        const ficha: FichaDetectada = { id: nuevoId(), categoria: 'objetos', nombre: String(objeto.nombre), datos: objeto }
        fichas.push(ficha); ids.push(ficha.id); continue
      }
      const { armas, resto } = armasEnTexto(p)
      if (armas.length) {
        for (const a of armas) { const ficha: FichaDetectada = { id: nuevoId(), categoria: 'objetos', nombre: String(a.nombre), datos: a }; fichas.push(ficha); ids.push(ficha.id) }
        if (resto.length > 60) { volcarObjetos(); quedan.push(resto) }
        continue
      }
      volcarObjetos()
      quedan.push(p)
    }
    volcarObjetos()
    if (quedan.length) resultado.push(quedan.length === b.texto.split(/\n\s*\n/).length ? b : { ...b, id: nuevoId(), texto: quedan.join('\n\n') })
  }
  capitulo.bloques = resultado
  return fichas
}
