import type { TranslationKey } from '../i18n/translations'

export type Miga = { etiqueta: TranslationKey; ruta?: string }

const BIBLIOTECA: Miga = { etiqueta: 'sidebar.library', ruta: '/biblioteca' }
const LIBROS: Miga = { etiqueta: 'sidebar.books', ruta: '/biblioteca/libros' }
const ADMINISTRACION: Miga = { etiqueta: 'sidebar.admin', ruta: '/administracion' }
const REVISION: Miga = { etiqueta: 'sidebar.review', ruta: '/administracion/revision' }

/** Ruta de navegación (migas) según la URL actual. La última miga es la página actual. */
export function migasDeRuta(pathname: string): Miga[] {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p === '/biblioteca') return [{ etiqueta: 'sidebar.library' }]
  if (p === '/biblioteca/clases') return [BIBLIOTECA, { etiqueta: 'sidebar.classes' }]
  if (p === '/biblioteca/conjuros') return [BIBLIOTECA, { etiqueta: 'sidebar.spells' }]
  if (p === '/administracion/revision') return [ADMINISTRACION, { etiqueta: 'sidebar.review' }]
  if (p === '/biblioteca/libros') return [BIBLIOTECA, { etiqueta: 'sidebar.books' }]
  if (p.startsWith('/biblioteca/libros/leer-borrador/')) return [BIBLIOTECA, LIBROS, { etiqueta: 'crumb.draftPreview' }]
  if (p.startsWith('/biblioteca/libros/leer/')) return [BIBLIOTECA, LIBROS, { etiqueta: 'crumb.reader' }]
  if (p.startsWith('/biblioteca/libros/revision/')) return [ADMINISTRACION, REVISION, { etiqueta: 'crumb.review' }]
  if (p === '/biblioteca/libros/editor') return [BIBLIOTECA, LIBROS, { etiqueta: 'crumb.engine' }]
  if (p === '/biblioteca/libros/nueva-propuesta') return [BIBLIOTECA, LIBROS, { etiqueta: 'crumb.newProposal' }]
  if (p.startsWith('/biblioteca/libros/editar-')) return [BIBLIOTECA, LIBROS, { etiqueta: 'crumb.editProposal' }]
  return []
}

/** Qué entrada del menú corresponde a la URL actual. */
export type SeccionMenu = 'inicio' | 'biblioteca' | 'libros' | 'clases' | 'conjuros' | 'administracion' | null

export function seccionActual(pathname: string): SeccionMenu {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p === '/home') return 'inicio'
  // La revisión de libros vive dentro de Administración.
  if (p === '/administracion' || p.startsWith('/administracion/')) return 'administracion'
  if (p.startsWith('/biblioteca/libros/revision/')) return 'administracion'
  if (p.startsWith('/biblioteca/libros')) return 'libros'
  if (p.startsWith('/biblioteca/clases')) return 'clases'
  if (p.startsWith('/biblioteca/conjuros')) return 'conjuros'
  if (p === '/biblioteca') return 'biblioteca'
  return null
}
