import { diferenciasTexto } from '../../../lib/diferencias'
type Props = { antes: string; despues: string }
const textoPlano = (valor: string) => valor.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
export default function TextoDiff({antes, despues}: Props) {
 return <span>{diferenciasTexto(textoPlano(antes), textoPlano(despues)).map((parte,i) =>
  parte.tipo === 'agregado' ? <ins key={i}>{parte.texto}</ins> :
  parte.tipo === 'retirado' ? <del key={i}>{parte.texto}</del> : <span key={i}>{parte.texto}</span>)}</span>
}
