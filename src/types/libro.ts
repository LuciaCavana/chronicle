
import type { Especie } from './especie'

export type IdiomaLibro = {
  codigo: string
  nombre: string
}

export type VersionLibro = {
  id: string
  idioma: IdiomaLibro
  titulo: string
  descripcion: string
  especies: Especie[]
}

export type Libro = {
  id: string
  codigo: string
  edicion: string
  editorial: string
  clasificacion: string
  idiomaPrincipal: string
  versiones: VersionLibro[]
}
