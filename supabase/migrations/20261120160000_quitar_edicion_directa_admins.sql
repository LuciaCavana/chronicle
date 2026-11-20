-- Los administradores ya no editan libros ni versiones directamente por la API: todo cambio pasa
-- por funciones que validan qué se puede cambiar (chronicle_aprobar_libro, chronicle_rechazar_libro,
-- chronicle_gestionar_estado_libro, chronicle_aprobar_propuesta…). Antes podían cambiar cualquier
-- columna, incluido creado_por.
-- APLICAR RECIÉN CUANDO main tenga el botón «Aprobar» usando chronicle_aprobar_libro.
drop policy if exists "Administradores editan libros" on public.libros;
drop policy if exists "Administradores editan versiones" on public.libro_versiones;
drop policy if exists "Administradores eliminan versiones" on public.libro_versiones;
