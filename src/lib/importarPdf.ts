import type { Fragmento, PaginaPdf } from './analizarPdf'

/**
 * Lee la capa de texto de un PDF en el navegador (el archivo no se sube a ningún lado) con
 * pdf.js, que se carga solo cuando hace falta. Devuelve cada página con la posición y el
 * tamaño de cada trozo de texto, para que analizarPaginas reconozca la estructura.
 */
export type PdfAbierto = {
  total: number
  leer: (desde: number, hasta: number, alProgresar?: (hechas: number, total: number) => void, cancelado?: () => boolean) => Promise<PaginaPdf[]>
  cerrar: () => Promise<void>
  /**
   * Dibuja una página en un canvas con el ancho pedido (en píxeles de pantalla). Devuelve la
   * escala usada (píxeles por punto del PDF) para ubicar encima lo que se leyó. Si se pide otra
   * página antes de terminar, el dibujo anterior se cancela.
   */
  dibujar: (numero: number, canvas: HTMLCanvasElement, ancho: number) => Promise<{ escala: number; ancho: number; alto: number } | null>
}

export async function abrirPdf(archivo: File): Promise<PdfAbierto> {
  const pdfjs = await import('pdfjs-dist')
  const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  const datos = new Uint8Array(await archivo.arrayBuffer())
  // Sin evaluar código del PDF ni cargar sus fuentes: solo se lee el texto.
  const documento = await pdfjs.getDocument({ data: datos, isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise

  let dibujoEnCurso: { cancel: () => void } | null = null

  return {
    total: documento.numPages,
    cerrar: () => documento.destroy(),
    async dibujar(numero, canvas, ancho) {
      dibujoEnCurso?.cancel()
      const pagina = await documento.getPage(Math.max(1, Math.min(numero, documento.numPages)))
      const base = pagina.getViewport({ scale: 1 })
      const escala = ancho / base.width
      // Más píxeles en pantallas de alta densidad, con un tope para no gastar memoria de más.
      const densidad = Math.min(window.devicePixelRatio || 1, 2)
      const vista = pagina.getViewport({ scale: escala * densidad })
      canvas.width = Math.floor(vista.width)
      canvas.height = Math.floor(vista.height)
      canvas.style.width = `${Math.floor(vista.width / densidad)}px`
      canvas.style.height = `${Math.floor(vista.height / densidad)}px`
      const contexto = canvas.getContext('2d')
      if (!contexto) return null
      const tarea = pagina.render({ canvasContext: contexto, viewport: vista })
      dibujoEnCurso = tarea
      try {
        await tarea.promise
      } catch {
        return null // cancelado porque se pidió otra página
      } finally {
        if (dibujoEnCurso === tarea) dibujoEnCurso = null
      }
      return { escala, ancho: vista.width / densidad, alto: vista.height / densidad }
    },
    async leer(desde, hasta, alProgresar, cancelado) {
      const inicio = Math.max(1, Math.min(desde, documento.numPages))
      const fin = Math.max(inicio, Math.min(hasta, documento.numPages))
      const paginas: PaginaPdf[] = []
      for (let n = inicio; n <= fin; n++) {
        if (cancelado?.()) break
        const pagina = await documento.getPage(n)
        const vista = pagina.getViewport({ scale: 1 })
        const contenido = await pagina.getTextContent()
        const fragmentos: Fragmento[] = []
        for (const item of contenido.items) {
          if (!('str' in item) || !item.str.trim()) continue
          const [a, b, c, d, e, f] = item.transform as number[]
          // Texto girado (leyendas legales al costado, sellos): no es parte de la lectura.
          if (Math.abs(b) > Math.abs(a) * 0.2 || Math.abs(c) > Math.abs(d) * 0.2) continue
          const h = Math.hypot(c, d) || item.height
          const [x0, base] = vista.convertToViewportPoint(e, f)
          const [x1] = vista.convertToViewportPoint(e + item.width, f)
          fragmentos.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), base, h, texto: item.str })
        }
        paginas.push({ numero: n, ancho: vista.width, alto: vista.height, fragmentos })
        pagina.cleanup()
        alProgresar?.(n - inicio + 1, fin - inicio + 1)
      }
      return paginas
    },
  }
}
