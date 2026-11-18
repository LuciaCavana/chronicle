// Evaluador limitado a números, nivel, operaciones aritméticas y comparaciones.
// No ejecuta JavaScript ni permite acceder a propiedades o funciones externas.
export function calcularFormula(formula: string, nivel: number): string {
  try {
    const expresion = formula.trim().replace(/^=/, '').trim()
    if (!expresion || expresion.length > 300) return 'Error de fórmula'
    const tokens = expresion.match(/>=|<=|==|!=|[()+*/<>-]|\d+(?:\.\d+)?|nivel/gi) ?? []
    if (tokens.join('').toLowerCase() !== expresion.replace(/\s+/g, '').toLowerCase()) return 'Error de fórmula'
    let pos = 0
    const consumir = (token: string) => tokens[pos] === token && (pos++, true)
    const primario = (): number => {
      if (consumir('+')) return primario()
      if (consumir('-')) return -primario()
      if (consumir('(')) {
        const valor = comparacion()
        if (!consumir(')')) throw Error('Paréntesis')
        return valor
      }
      const token = tokens[pos++]
      if (token?.toLowerCase() === 'nivel') return nivel
      if (!token || !/^\d+(?:\.\d+)?$/.test(token)) throw Error('Valor')
      return Number(token)
    }
    const producto = (): number => {
      let valor = primario()
      while (tokens[pos] === '*' || tokens[pos] === '/') {
        const op = tokens[pos++]
        const otro = primario()
        valor = op === '*' ? valor * otro : valor / otro
      }
      return valor
    }
    const suma = (): number => {
      let valor = producto()
      while (tokens[pos] === '+' || tokens[pos] === '-') {
        const op = tokens[pos++]
        const otro = producto()
        valor = op === '+' ? valor + otro : valor - otro
      }
      return valor
    }
    const comparacion = (): number => {
      let valor = suma()
      while (['>=', '<=', '>', '<', '==', '!='].includes(tokens[pos])) {
        const op = tokens[pos++]
        const otro = suma()
        valor = Number(op === '>=' ? valor >= otro : op === '<=' ? valor <= otro :
          op === '>' ? valor > otro : op === '<' ? valor < otro :
          op === '==' ? valor === otro : valor !== otro)
      }
      return valor
    }
    const resultado = comparacion()
    if (pos !== tokens.length || !Number.isFinite(resultado)) throw Error('Expresión')
    return String(Number(resultado.toFixed(6)))
  } catch {
    return 'Error de fórmula'
  }
}
