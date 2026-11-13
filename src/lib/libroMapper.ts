export const CLAVES_CONTENIDO = ['especies', 'conjuros', 'dotes', 'trasfondos', 'criaturas', 'clases', 'subclases', 'objetos'] as const

export const CLAVES_METADATOS = ['codigo', 'edicion', 'editorial', 'clasificacion'] as const

type Claves = readonly string[]

function seleccionarCampos<T extends object>(datos: T, claves: Claves): Record<string, unknown> {
  const fuente = datos as Record<string, unknown>
  return Object.fromEntries(claves.map(clave => [clave, fuente[clave]]))
}

export function contenidoDeLibro<T extends object>(datos: T) {
  return seleccionarCampos(datos, CLAVES_CONTENIDO)
}

export function metadatosDeLibro<T extends object>(datos: T) {
  return seleccionarCampos(datos, CLAVES_METADATOS)
}
