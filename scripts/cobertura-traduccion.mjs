// Mide cuánto de la interfaz está traducido al inglés y lo guarda en src/i18n/cobertura.ts
// (solo números: nombres de archivos y código no se publican). Corre antes de cada build («prebuild»).
// Para verlo a mano: node scripts/cobertura-traduccion.mjs
//
// Cuenta dos cosas:
//  - Las claves de traducción (src/i18n/translations.ts): una clave está traducida si tiene
//    texto en inglés y no es igual al español con letras propias del castellano.
//  - Los textos escritos directo en las pantallas (.tsx), sin pasar por t(): esos todavía no se
//    pueden traducir. Es una estimación: se cuentan los textos que se muestran en la pantalla
//    (dentro del JSX y en placeholder, title, aria-label, alt y label).
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import ts from 'typescript'

const raiz = new URL('..', import.meta.url).pathname
const src = join(raiz, 'src')

// ---------- Claves de traducción ----------
const fuente = ts.createSourceFile('translations.ts', readFileSync(join(src, 'i18n', 'translations.ts'), 'utf8'), ts.ScriptTarget.Latest, true)
const idiomas = {}
fuente.forEachChild(function buscar(n) {
  if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && (n.name.text === 'es' || n.name.text === 'en') && ts.isObjectLiteralExpression(n.initializer)) {
    const claves = {}
    for (const p of n.initializer.properties) {
      if (!ts.isPropertyAssignment(p)) continue
      const clave = ts.isStringLiteral(p.name) || ts.isIdentifier(p.name) ? p.name.text : null
      const valor = ts.isStringLiteralLike(p.initializer) ? p.initializer.text : ''
      if (clave) claves[clave] = valor
    }
    idiomas[n.name.text] = claves
  }
  n.forEachChild(buscar)
})
const es = idiomas.es ?? {}, en = idiomas.en ?? {}
const CASTELLANO = /[áéíóúñ¿¡]/i
const clavesTotal = Object.keys(es).length
const clavesSinTraducir = Object.keys(es).filter(k => !en[k]?.trim() || (en[k] === es[k] && CASTELLANO.test(es[k])))

// ---------- Textos fijos en las pantallas ----------
const ATRIBUTOS = new Set(['placeholder', 'title', 'aria-label', 'alt', 'label'])
const conLetras = t => /\p{L}{2,}/u.test(t)
const archivos = []
;(function recorrer(dir) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) recorrer(ruta)
    else if (nombre.endsWith('.tsx')) archivos.push(ruta)
  }
})(src)

/** ¿El texto termina en la pantalla? Sube por condicionales, paréntesis y && / || hasta el JSX. */
function seMuestra(n) {
  let p = n.parent
  while (p && (ts.isParenthesizedExpression(p) || ts.isConditionalExpression(p) ||
    (ts.isBinaryExpression(p) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(p.operatorToken.kind)) ||
    ts.isTemplateSpan(p) || ts.isTemplateExpression(p))) {
    // En una condición (cond ? a : b) solo cuentan las ramas, no la condición.
    if (ts.isConditionalExpression(p) && p.condition === n) return false
    n = p; p = p.parent
  }
  if (!p) return false
  if (ts.isJsxExpression(p)) {
    const attr = p.parent
    if (ts.isJsxAttribute(attr)) return ATRIBUTOS.has(attr.name.getText())
    return true
  }
  if (ts.isJsxAttribute(p)) return ATRIBUTOS.has(p.name.getText())
  return false
}

const fijos = {}
let fijosTotal = 0
for (const ruta of archivos) {
  const archivo = ts.createSourceFile(ruta, readFileSync(ruta, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let cuenta = 0
  archivo.forEachChild(function visitar(n) {
    if (ts.isJsxText(n)) { if (conLetras(n.text)) cuenta++ }
    else if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && conLetras(n.text) && seMuestra(n)) cuenta++
    else if (ts.isTemplateExpression(n) && conLetras(n.head.text + n.templateSpans.map(s => s.literal.text).join(' ')) && seMuestra(n)) { cuenta++; return }
    n.forEachChild(visitar)
  })
  if (cuenta) { fijos[relative(src, ruta).split(sep).join('/')] = cuenta; fijosTotal += cuenta }
}

// ---------- Resultado ----------
const total = clavesTotal + fijosTotal
const traducidos = clavesTotal - clavesSinTraducir.length
const ingles = {
  porcentaje: total ? Math.round((traducidos / total) * 1000) / 10 : 100,
  traducidos,
  total,
  clavesSinTraducir: clavesSinTraducir.length,
  textosFijos: fijosTotal,
}
writeFileSync(join(src, 'i18n', 'cobertura.ts'),
  `// Generado por scripts/cobertura-traduccion.mjs antes de cada build. No editar a mano.\n` +
  `export const coberturaTraduccion = ${JSON.stringify({ en: ingles }, null, 2)} as const\n`)
console.log(`Inglés: ${ingles.porcentaje} % (${traducidos} de ${total} textos; ${fijosTotal} escritos directo en las pantallas, ${clavesSinTraducir.length} claves sin traducir)`)
// Dónde falta más (solo en la consola).
for (const [archivo, textos] of Object.entries(fijos).sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${String(textos).padStart(4)}  ${archivo}`)
