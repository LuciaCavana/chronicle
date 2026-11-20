-- Aprobar un libro pendiente desde Administración. Reemplaza el UPDATE directo sobre libros,
-- para poder quitar la política que dejaba a los administradores editar cualquier columna.
create or replace function public.chronicle_aprobar_libro(p_libro_id uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select auth.uid()) is null or not public.is_chronicle_staff() then
    raise exception 'Solo administradores pueden aprobar libros' using errcode = '42501';
  end if;
  update public.libros set estado = 'publicado', motivo_rechazo = null
  where id = p_libro_id and estado = 'pendiente';
  if not found then raise exception 'El libro no está pendiente de aprobación'; end if;
  insert into public.libro_estado_auditoria(libro_id, estado_anterior, estado_nuevo, motivo, realizado_por)
  values (p_libro_id, 'pendiente', 'publicado', 'Aprobado', (select auth.uid()));
  return 'publicado';
end $function$;

revoke all on function public.chronicle_aprobar_libro(uuid) from public, anon;
grant execute on function public.chronicle_aprobar_libro(uuid) to authenticated;
