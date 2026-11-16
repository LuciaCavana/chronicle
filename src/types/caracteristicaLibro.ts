export type CaracteristicaLibro = {
  id: string
  tipo: 'maestria_arma' | 'propiedad_arma' | 'moneda' | 'regla_arma' | 'otra'
  codigo?: string
  nombre: string
  descripcion: string
  datos?: Record<string, string | number | boolean>
}

export const MAESTRIAS_ARMA = [
  { codigo: 'Sap', nombre: 'Debilitar', descripcion: 'Si aciertas a una criatura con esta arma, tendrá desventaja en su próxima tirada de ataque antes del principio de tu siguiente turno.' },
  { codigo: 'Topple', nombre: 'Derribar', descripcion: 'Si aciertas a una criatura con esta arma, puedes obligarla a hacer una tirada de salvación de Constitución (CD 8 más el modificador por característica usado en la tirada de ataque y tu bonificador por competencia). Si la falla, tendrá el estado de derribada.' },
  { codigo: 'Push', nombre: 'Empujar', descripcion: 'Si aciertas a una criatura con esta arma, puedes empujarla hasta 3 m respecto a ti en línea recta si es Grande o más pequeña.' },
  { codigo: 'Cleave', nombre: 'Hender', descripcion: 'Si aciertas a una criatura con una tirada de ataque cuerpo a cuerpo con esta arma, puedes hacer una tirada de ataque cuerpo a cuerpo con el arma contra una segunda criatura que se encuentre a 1,5 m o menos de la primera y que también esté a tu alcance. Si aciertas, la segunda criatura sufrirá el daño del arma, pero no sumarás tu modificador por característica a ese daño salvo que el modificador sea negativo. Solo puedes hacer este ataque extra una vez por turno.' },
  { codigo: 'Nick', nombre: 'Mellar', descripcion: 'Cuando hagas el ataque extra de la propiedad “ligera”, puedes hacerlo como parte de la acción de atacar en vez de como acción adicional. Solo puedes hacer este ataque extra una vez por turno.' },
  { codigo: 'Vex', nombre: 'Molestar', descripcion: 'Si aciertas a una criatura con esta arma y le causas daño, tendrás ventaja en tu siguiente tirada de ataque contra esa criatura antes del final de tu siguiente turno.' },
  { codigo: 'Slow', nombre: 'Ralentizar', descripcion: 'Si aciertas a una criatura con esta arma y le causas daño, puedes reducir su velocidad en 3 m hasta el principio de tu siguiente turno. Si la criatura sufre más de un ataque con armas que tengan esta propiedad, la reducción de su velocidad no superará los 3 m.' },
  { codigo: 'Graze', nombre: 'Rozar', descripcion: 'Si tu tirada de ataque con esta arma no acierta a una criatura, puedes causarle una cantidad de daño igual al modificador por característica que hayas usado para hacer la tirada de ataque. Este daño es del mismo tipo que inflija el arma y solo se puede incrementar si aumentas el modificador por característica.' },
] as const

export function crearMaestrias(): CaracteristicaLibro[] {
  return MAESTRIAS_ARMA.map(maestria => ({
    id: crypto.randomUUID(), tipo: 'maestria_arma', ...maestria,
  }))
}

export const PROPIEDADES_ARMA = [
  ['A dos manos','Estas armas requieren el uso de las dos manos.'],
  ['Alcance','El alcance normal y largo de un arma a distancia se indican en metros. Atacar más allá del alcance normal impone desventaja y no se puede atacar más allá del alcance largo.'],
  ['Arrojadiza','Puedes lanzar el arma para atacar a distancia y desenvainarla como parte del ataque. Si es cuerpo a cuerpo, usa el mismo modificador por característica que en sus ataques cuerpo a cuerpo.'],
  ['Gran alcance','Tu alcance aumenta 1,5 m para los ataques y los ataques de oportunidad con esta arma.'],
  ['Ligera','Al atacar con un arma ligera, puedes hacer un ataque adicional con otra arma ligera como acción adicional; no sumas el modificador al daño salvo que sea negativo.'],
  ['Munición','Requiere munición, consume una unidad por ataque y permite recuperar la mitad de la utilizada tras dedicar 1 minuto después del combate.'],
  ['Pesada','Impone desventaja si no alcanzas Fuerza 13 para armas cuerpo a cuerpo o Destreza 13 para armas a distancia.'],
  ['Recarga','Solo puedes disparar una unidad de munición por acción, acción adicional o reacción utilizada para atacar.'],
  ['Sutil','Puedes elegir Fuerza o Destreza para las tiradas de ataque y daño, usando el mismo modificador en ambas.'],
  ['Versátil','Puede utilizarse con una o dos manos y tiene un valor de daño específico al usarla con ambas.'],
] as const

export const MONEDAS = [
  { codigo:'PC', nombre:'Pieza de cobre', valorOro:0.01 },
  { codigo:'PP', nombre:'Pieza de plata', valorOro:0.1 },
  { codigo:'PE', nombre:'Pieza de electro', valorOro:0.5 },
  { codigo:'PO', nombre:'Pieza de oro', valorOro:1 },
  { codigo:'PPT', nombre:'Pieza de platino', valorOro:10 },
] as const

export function crearPropiedadesArma(): CaracteristicaLibro[] {
  return PROPIEDADES_ARMA.map(([nombre,descripcion]) => ({id:crypto.randomUUID(),tipo:'propiedad_arma',codigo:nombre,nombre,descripcion}))
}
export function crearMonedas(): CaracteristicaLibro[] {
  return MONEDAS.map(m => ({id:crypto.randomUUID(),tipo:'moneda',codigo:m.codigo,nombre:m.nombre,descripcion:'Una moneda pesa aproximadamente 10 g.',datos:{valorOro:m.valorOro,pesoGramos:10}}))
}
export function crearReglasArmas(): CaracteristicaLibro[] {
  return [{id:crypto.randomUUID(),tipo:'regla_arma',codigo:'improvisadas',nombre:'Armas improvisadas',descripcion:'Cuando se utiliza un objeto como arma improvisada o un arma de una forma atípica, se aplican las reglas de armas improvisadas del glosario.'}]
}
