
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
                  </div>
                </div>
                <button
                  type="button"
                  className="contenido-libro-add"
                  disabled={category.id !== 'especies'}
                  title={
                    category.id === 'especies'
                      ? 'Agregar especie'
                      : 'Próximamente'
                  }
                  onClick={() => {
                    if (category.id === 'especies') {
                      onAddSpecies()
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
