-- Chronicle · Retirar un borrador de aprobación · 2026-11-16
-- Mientras un borrador está pendiente de aprobación su contenido no se puede
-- editar. La autora o un colaborador con rol editor pueden retirarlo de la
-- cola de aprobación para volver a editarlo; después hay que reenviarlo.

create or replace function public.chronicle_retirar_aprobacion(p_propuesta_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Tenés que iniciar sesión' using errcode = '42501';
  end if;

  update public.propuestas p
     set pendiente_aprobacion = false,
         actualizado_en = now()
   where p.id = p_propuesta_id
     and p.estado = 'borrador'
     and p.pendiente_aprobacion
     and (
       p.autor_id = (select auth.uid())
       or exists (
         select 1 from public.propuesta_colaboradores c
         where c.propuesta_id = p.id
           and c.usuario_id = (select auth.uid())
           and c.rol = 'editor'
       )
     );

  if not found then
    raise exception 'El borrador no está pendiente de aprobación o no tenés permiso para retirarlo'
      using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.chronicle_retirar_aprobacion(uuid) from public, anon;
grant execute on function public.chronicle_retirar_aprobacion(uuid) to authenticated;
