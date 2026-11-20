/** Textos para mostrar una especie (en el lector). Aceptan datos de cualquier forma: vienen de la base. */
type Registro = Record<string, unknown>
const esObjeto = (v: unknown): v is Registro => typeof v === 'object' && v !== null && !Array.isArray(v)
const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')

const NOMBRES_VELOCIDAD: [string, string][] = [['nado', 'nado'], ['vuelo', 'vuelo'], ['trepar', 'trepar'], ['excavar', 'excavar']]

/** «30 pies; nado 30 pies; vuelo 50 pies». */
export function velocidadesEspecie(especie: Registro): string {
  const caminar = texto(especie.velocidad)
  const partes = caminar ? [`${caminar} pies`] : []
  const extra = esObjeto(especie.velocidadesExtra) ? especie.velocidadesExtra : {}
  for (const [clave, nombre] of NOMBRES_VELOCIDAD) {
    const v = extra[clave]
    if (!esObjeto(v)) continue
    const pies = v.igualAVelocidad ? caminar : texto(v.pies)
    if (pies) partes.push(`${nombre} ${pies} pies`)
  }
  return partes.join('; ')
}

/** «Mediano (entre 1,20 y 2,10 m) o Pequeño». */
export function tamanosEspecie(especie: Registro): string {
  const tamanos = Array.isArray(especie.tamanos) ? especie.tamanos.filter(esObjeto) : []
  return tamanos.map(t => {
    const nombre = texto(t.nombre)
    const min = Number(t.alturaMinima), max = Number(t.alturaMaxima)
    // Las alturas se cargan en metros.
    const metros = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
    const alturas = min > 0 && max > 0 ? ` (entre ${metros(min)} y ${metros(max)} m)` : ''
    return nombre ? `${nombre}${alturas}` : ''
  }).filter(Boolean).join(' o ')
}

export function visionEspecie(especie: Registro): string {
  if (!especie.visionOscuridad) return ''
  const alcance = texto(especie.alcanceVision)
  return alcance ? `${alcance} pies` : 'Sí'
}
