import type { ReactNode } from 'react'

/** Convierte **negrita** y _cursiva_ en elementos de React (sin interpretar HTML). */
export function formatoEnLinea(texto: string): ReactNode[] {
  const partes: ReactNode[] = []
  const patron = /\*\*([^*]+)\*\*|(?<![\p{L}\p{N}])_([^_\n]+)_(?![\p{L}\p{N}])/gu
  let ultimo = 0
  let clave = 0
  for (const m of texto.matchAll(patron)) {
    const inicio = m.index ?? 0
    if (inicio > ultimo) partes.push(texto.slice(ultimo, inicio))
    partes.push(m[1] !== undefined ? <strong key={clave++}>{m[1]}</strong> : <em key={clave++}>{m[2]}</em>)
    ultimo = inicio + m[0].length
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo))
  return partes
}

/** Un texto con formato; cada línea en blanco separa párrafos. */
export default function TextoConFormato({ texto, className }: { texto: string; className?: string }) {
  const parrafos = texto.split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
  return <>{parrafos.map((p, i) => <p key={i} className={className}>{formatoEnLinea(p)}</p>)}</>
}
