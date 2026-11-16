export type CaracteristicaLibro = {
  id: string
  tipo: 'maestria_arma' | 'otra'
  codigo?: string
  nombre: string
  descripcion: string
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
