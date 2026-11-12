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
  conjuros: Conjuro[]
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
  conjuros,
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
        <div className="contenido-libro-empty">
          No seleccionaste ninguna categoría.
          Usá «Administrar categorías» para agregar una.
        </div>
      ) : (
        <div className="contenido-libro-list">
          {categories.map((category) => {
            const itemCount =
              category.id === 'especies'
                ? speciesCount
                : categoryItemCounts[category.id] ?? 0

            return (
              <div className="contenido-libro-card" key={category.id}>
                <div className="contenido-libro-card-info">
                  <BookOpen size={22} />

                  <div>
                    <h4>{category.label}</h4>
                    <p>
                      {itemCount === 0
                        ? 'Todavía no agregaste elementos.'
                        : `${itemCount} elemento(s) cargado(s).`}
                    </p>
                    {category.id === 'especies' && species.length > 0 && (
                      <div className="contenido-libro-species-list">
                    {species.map((especie) => (
                      <div
                        key={especie.id}
                        className="contenido-libro-species-item"
                      >
                        <button
                          type="button"
                          className="contenido-libro-species-tag"
                          onClick={() => onEditSpecies(especie.id)}
                          title={`Editar ${especie.nombre}`}
                        >
                          {especie.nombre}
                          <Pencil size={13} />
                        </button>

                        <button
                          type="button"
                          className="contenido-libro-species-delete"
                          onClick={() =>
                            setSpeciesToDelete({
                              id: especie.id,
                              nombre: especie.nombre,
                            })
                          }
                          title={`Eliminar ${especie.nombre}`}
                          aria-label={`Eliminar ${especie.nombre}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                      </div>
                    )}
                    {category.id === 'clases' && clases.length > 0 && (
                      <div className="contenido-libro-species-list">
                        {clases.map(clase => (
                          <div className="contenido-libro-species-item" key={clase.id}>
                            <button type="button" className="contenido-libro-species-tag" onClick={() => onEditClass?.(clase.id)}>
                              {clase.nombre || 'Clase sin nombre'} <Pencil size={13} />
                            </button>
                            <button type="button" className="contenido-libro-species-delete" onClick={() => {
                              if (window.confirm(`¿Eliminar la clase "${clase.nombre}"?`)) onDeleteClass?.(clase.id)
                            }} aria-label={`Eliminar ${clase.nombre}`}><Trash2 size={15} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    {category.id === 'subclases' && subclases.length > 0 && <div className="contenido-libro-species-list">{subclases.map(subclase => <div className="contenido-libro-species-item" key={subclase.id}><button type="button" className="contenido-libro-species-tag" onClick={() => onEditSubclass?.(subclase.id)}>{subclase.nombre || 'Subclase sin nombre'} · {subclase.claseNombre} <Pencil size={13}/></button><button type="button" className="contenido-libro-species-delete" onClick={() => { if (window.confirm(`¿Eliminar la subclase «${subclase.nombre}»?`)) onDeleteSubclass?.(subclase.id) }}><Trash2 size={15}/></button></div>)}</div>}
                    {category.id === 'objetos' && objetos.length > 0 && <div className="contenido-libro-species-list">{objetos.map(objeto => <div className="contenido-libro-species-item" key={objeto.id}><button type="button" className="contenido-libro-species-tag" onClick={() => onEditObject?.(objeto.id)}>{objeto.nombre || 'Objeto sin nombre'} · {objeto.tipo} <Pencil size={13}/></button><button type="button" className="contenido-libro-species-delete" onClick={() => { if (window.confirm(`¿Eliminar el objeto «${objeto.nombre}»?`)) onDeleteObject?.(objeto.id) }}><Trash2 size={15}/></button></div>)}</div>}
                    {category.id === 'conjuros' && conjuros.length > 0 && (
                    <div className="contenido-libro-species-list">
                      {conjuros.map(conjuro => (
                        <div
                          key={conjuro.id}
                          className="contenido-libro-species-item"
                        >
                          <span className="contenido-libro-species-tag">
                            {conjuro.nombre}
                            {' · '}
                            {conjuro.tipo === 'truco'
                              ? 'Truco'
                              : `Nivel ${conjuro.nivel}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </div>
                <button
                  type="button"
                  className="contenido-libro-add"
                  disabled={!(category.id === 'especies' || (category.id === 'clases' && !!onAddClass) || (category.id === 'subclases' && !!onAddSubclass) || (category.id === 'objetos' && !!onAddObject))}
                  title={
                    category.id === 'especies'
                      ? 'Agregar especie'
                      : category.id === 'clases' ? 'Agregar clase' : category.id === 'subclases' ? 'Agregar subclase' : category.id === 'objetos' ? 'Agregar objeto' : 'Próximamente'
                  }
                  onClick={() => {
                    if (category.id === 'especies') {
                      onAddSpecies()
                    } else if (category.id === 'clases') {
                      onAddClass?.()
                    } else if (category.id === 'subclases') {
                      onAddSubclass?.()
                    }
                    else if (category.id === 'objetos') {
                      onAddObject?.()
                    }
                  }}
                >
                  <Plus size={17} />
                  Agregar
                </button>
              </div>
            )
          })}
        </div>
      )}

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
