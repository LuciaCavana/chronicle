import type { Trasfondo } from '../../types/trasfondo'
import type { Criatura } from '../../types/criatura'
import type { Dote } from '../../types/trasfondo'
import type { Conjuro } from '../../types/conjuro'
import { useState } from 'react'
import {
  Plus,
  BookOpen,
  ListChecks,
  X,
  AlertTriangle,
  Pencil,
  Trash2,
} from 'lucide-react'
import '../../styles/ContenidoLibro.css'

type Category = {
  id: string
  label: string
}

type ContenidoLibroProps = {
  categories: Category[]
  allCategories: Category[]
  selectedCategories: string[]
  onToggleCategory: (id: string) => void
  categoryItemCounts?: Record<string, number>
  onAddSpecies: () => void
  speciesCount: number
  species: { id: string; nombre: string }[]
  onEditSpecies: (id: string) => void
  onDeleteSpecies: (id: string) => void
  criaturas?: Criatura[]
  onAddCriatura?: () => void
  onEditCriatura?: (id: string) => void
  onDeleteCriatura?: (id: string) => void
  trasfondos?: Trasfondo[]
  onAddTrasfondo?: () => void
  onEditTrasfondo?: (id: string) => void
  onDeleteTrasfondo?: (id: string) => void
  dotes?: Dote[]
  onAddDote?: () => void
  onEditDote?: (id: string) => void
  onDeleteDote?: (id: string) => void
  conjuros: Conjuro[]
  onAddConjuro?: () => void
  onEditConjuro?: (id: string) => void
  onDeleteConjuro?: (id: string) => void
  clases?: { id: string; nombre: string }[]
  onAddClass?: () => void
  onEditClass?: (id: string) => void
  onDeleteClass?: (id: string) => void
  subclases?: { id: string; nombre: string; claseNombre: string }[]
  onAddSubclass?: () => void
  onEditSubclass?: (id: string) => void
  onDeleteSubclass?: (id: string) => void
  objetos?: { id: string; nombre: string; tipo: string }[]
  onAddObject?: () => void
  onEditObject?: (id: string) => void
  onDeleteObject?: (id: string) => void
}

export default function ContenidoLibro({
  categories,
  allCategories,
  selectedCategories,
  onToggleCategory,
  categoryItemCounts = {},
  onAddSpecies,
  speciesCount,
  species,
  onEditSpecies,
  onDeleteSpecies,
  criaturas = [],
  onAddCriatura,
  onEditCriatura,
  onDeleteCriatura,
  trasfondos = [],
  onAddTrasfondo,
  onEditTrasfondo,
  onDeleteTrasfondo,
  dotes = [],
  onAddDote,
  onEditDote,
  onDeleteDote,
  conjuros,
  onAddConjuro,
  onEditConjuro,
  onDeleteConjuro,
  clases = [],
  onAddClass,
  onEditClass,
  onDeleteClass,
  subclases = [],
  onAddSubclass,
  onEditSubclass,
  onDeleteSubclass,
  objetos = [],
  onAddObject,
  onEditObject,
  onDeleteObject,
}: ContenidoLibroProps) {
  const [showManager, setShowManager] = useState(false)
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<Category | null>(null)
  const [speciesToDelete, setSpeciesToDelete] = useState<{
    id: string
    nombre: string
  } | null>(null)

  function handleToggle(category: Category) {
    const isSelected = selectedCategories.includes(category.id)
    const itemCount = categoryItemCounts[category.id] ?? 0

    if (isSelected && itemCount > 0) {
      setPendingRemoval(category)
      return
    }

    onToggleCategory(category.id)
  }

  function confirmRemoval() {
    if (!pendingRemoval) return

    onToggleCategory(pendingRemoval.id)
    setPendingRemoval(null)
  }

  return (
    <section className="contenido-libro">
      <div className="contenido-libro-heading">
        <div>
          <h3>Contenido del libro</h3>
          <p>
            Organizá los elementos que contiene este libro.
          </p>
        </div>

        <button
          type="button"
          className="contenido-libro-manage"
          onClick={() => setShowManager(true)}
        >
          <ListChecks size={18} />
          Administrar categorías
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="contenido-libro-empty">No seleccionaste ninguna categoría. Usá «Administrar categorías» para agregar una.</div>
      ) : (
        <div className="contenido-libro-list">
          {categories.map(category => {
            const cantidad = category.id === 'especies' ? speciesCount : categoryItemCounts[category.id] ?? 0
            return <button key={category.id} type="button" className="contenido-libro-card contenido-libro-category-trigger" onClick={() => setOpenCategory(category.id)}>
              <BookOpen size={22}/>
              <span><strong>{category.label}</strong><small>{cantidad === 0 ? 'Sin elementos cargados' : `${cantidad} elemento(s) cargado(s)`}</small></span>
              <span aria-hidden="true">Ver elementos ›</span>
            </button>
          })}
        </div>
      )}

      {openCategory && (() => {
        const category = categories.find(c => c.id === openCategory)
        if (!category) return null
        const items: { id: string; nombre: string; detalle?: string; editar: () => void; eliminar: () => void }[] =
          openCategory === 'especies' ? species.map(x => ({ id:x.id, nombre:x.nombre, editar:()=>onEditSpecies(x.id), eliminar:()=>setSpeciesToDelete({id:x.id,nombre:x.nombre}) })) :
          openCategory === 'clases' ? clases.map(x => ({ id:x.id, nombre:x.nombre, editar:()=>onEditClass?.(x.id), eliminar:()=>{if(window.confirm(`¿Eliminar la clase «${x.nombre}»?`))onDeleteClass?.(x.id)} })) :
          openCategory === 'subclases' ? subclases.map(x => ({ id:x.id, nombre:x.nombre, detalle:x.claseNombre, editar:()=>onEditSubclass?.(x.id), eliminar:()=>{if(window.confirm(`¿Eliminar la subclase «${x.nombre}»?`))onDeleteSubclass?.(x.id)} })) :
          openCategory === 'objetos' ? objetos.map(x => ({ id:x.id, nombre:x.nombre, detalle:x.tipo, editar:()=>onEditObject?.(x.id), eliminar:()=>{if(window.confirm(`¿Eliminar el objeto «${x.nombre}»?`))onDeleteObject?.(x.id)} })) :
          openCategory === 'criaturas' ? criaturas.map(x => ({ id:x.id, nombre:x.nombre, detalle:x.tipo, editar:()=>onEditCriatura?.(x.id), eliminar:()=>{if(window.confirm(`¿Eliminar la criatura «${x.nombre}»?`))onDeleteCriatura?.(x.id)} })) :
          openCategory === 'trasfondos' ? trasfondos.map(x => ({ id:x.id, nombre:x.nombre, editar:()=>onEditTrasfondo?.(x.id), eliminar:()=>{if(window.confirm(`¿Eliminar el trasfondo «${x.nombre}»?`))onDeleteTrasfondo?.(x.id)} })) :
          openCategory === 'dotes' ? dotes.map(x => ({ id:x.id, nombre:x.nombre, detalle:x.categoria, editar:()=>onEditDote?.(x.id), eliminar:()=>{if(window.confirm(`¿Eliminar la dote «${x.nombre}»?`))onDeleteDote?.(x.id)} })) :
          openCategory === 'conjuros' ? conjuros.map(x => ({ id:x.id, nombre:x.nombre, detalle:x.tipo === 'truco' ? 'Truco' : `Nivel ${x.nivel}`, editar:()=>onEditConjuro?.(x.id), eliminar:()=>{if(window.confirm(`¿Eliminar el conjuro «${x.nombre}»?`))onDeleteConjuro?.(x.id)} })) : []
        const agregar: Record<string, (() => void) | undefined> = {
          especies:onAddSpecies, clases:onAddClass, subclases:onAddSubclass, objetos:onAddObject,
          criaturas:onAddCriatura, trasfondos:onAddTrasfondo, dotes:onAddDote, conjuros:onAddConjuro,
        }
        return <div className="contenido-libro-overlay" onMouseDown={e => {if(e.target===e.currentTarget)setOpenCategory(null)}}>
          <div className="contenido-libro-modal contenido-libro-items-modal" role="dialog" aria-modal="true" aria-label={`Elementos de ${category.label}`}>
            <div className="contenido-libro-modal-header">
              <div><h3>{category.label}</h3><p>{items.length} elemento(s) cargado(s)</p></div>
              <button type="button" className="contenido-libro-close" aria-label="Cerrar" onClick={()=>setOpenCategory(null)}><X size={20}/></button>
            </div>
            <div className="contenido-libro-items-grid">
              {items.map(item => <div className="contenido-libro-item-card" key={item.id}>
                <button type="button" className="contenido-libro-item-edit" onClick={()=>{setOpenCategory(null);item.editar()}} title={`Editar ${item.nombre}`}>
                  <strong>{item.nombre || 'Sin nombre'}</strong>
                  {item.detalle && <small>{item.detalle}</small>}
                  <Pencil size={16}/>
                </button>
                <button type="button" className="contenido-libro-item-delete" aria-label={`Eliminar ${item.nombre}`} title="Eliminar" onClick={item.eliminar}><Trash2 size={17}/></button>
              </div>)}
              {items.length === 0 && <p className="contenido-libro-empty">Todavía no agregaste elementos en esta categoría.</p>}
            </div>
            <div className="contenido-libro-modal-footer">
              <button type="button" className="contenido-libro-add" disabled={!agregar[openCategory]} onClick={()=>{setOpenCategory(null);agregar[openCategory]?.()}}><Plus size={17}/> Crear nuevo</button>
            </div>
          </div>
        </div>
      })()}

      {showManager && (
        <div
          className="contenido-libro-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowManager(false)
            }
          }}
        >
          <div
            className="contenido-libro-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-categories-title"
          >
            <div className="contenido-libro-modal-header">
              <div>
                <h3 id="manage-categories-title">
                  Administrar categorías
                </h3>
                <p>
                  Seleccioná las categorías que contiene el libro.
                </p>
              </div>

              <button
                type="button"
                className="contenido-libro-close"
                aria-label="Cerrar"
                onClick={() => setShowManager(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="contenido-libro-options">
              {allCategories.map((category) => (
                <label
                  className="contenido-libro-option"
                  key={category.id}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleToggle(category)}
                  />
                  <span>{category.label}</span>
                </label>
              ))}
            </div>

            <div className="contenido-libro-modal-footer">
              <span>
                {selectedCategories.length} categoría(s) seleccionada(s)
              </span>

              <button
                type="button"
                className="contenido-libro-done"
                onClick={() => setShowManager(false)}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingRemoval && (
        <div className="contenido-libro-overlay contenido-libro-overlay--confirm">
          <div
            className="contenido-libro-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-category-title"
          >
            <AlertTriangle size={28} color="#d8b77b" />

            <h3 id="remove-category-title">
              ¿Quitar «{pendingRemoval.label}»?
            </h3>
            <p>
              La categoría dejará de mostrarse en el contenido del libro,
              pero todos sus elementos se conservarán.
              Si volvés a seleccionarla, podrás seguir editándolos.
            </p>
            <div className="contenido-libro-confirm-actions">
              <button
                type="button"
                className="contenido-libro-keep"
                onClick={() => setPendingRemoval(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="contenido-libro-remove"
                onClick={confirmRemoval}
              >
                Quitar categoría
              </button>
            </div>
          </div>
        </div>
      )}
      {speciesToDelete && (
  <div className="contenido-libro-overlay contenido-libro-overlay--confirm">
    <div
      className="contenido-libro-confirm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-species-title"
    >
      <AlertTriangle size={28} color="#d8b77b" />

      <h3 id="delete-species-title">
        ¿Eliminar «{speciesToDelete.nombre}»?
      </h3>

      <p>
        Esta especie se quitará del contenido del libro.
      </p>

      <div className="contenido-libro-confirm-actions">
        <button
          type="button"
          className="contenido-libro-keep"
          onClick={() => setSpeciesToDelete(null)}
        >
          No, cancelar
        </button>

        <button
          type="button"
          className="contenido-libro-remove"
          onClick={() => {
            onDeleteSpecies(speciesToDelete.id)
            setSpeciesToDelete(null)
          }}
        >
          Sí, eliminar
        </button>
      </div>
    </div>
  </div>
)}
    </section>
  )
}
