-- "Basado en" también en una corrección de un libro publicado.
-- Si quien corrige es el creador del libro (o un administrador), el vínculo se aplica al
-- libro enseguida: es solo una referencia, no cambia el contenido. Si no, queda en la
-- propuesta y se aplica cuando se aprueba la corrección.

create or replace function public.chronicle_vincular_libro_original(p_propuesta_id uuid, p_libro_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v public.propuestas%rowtype; v_propio uuid; v_creador uuid;
begin
 if (select auth.uid()) is null then raise exception 'Tenés que iniciar sesión' using errcode='42501'; end if;
 select * into v from public.propuestas where id=p_propuesta_id for update;
 if not found then raise exception 'El borrador no existe'; end if;
 if v.autor_id is distinct from (select auth.uid()) and not exists(
   select 1 from public.propuesta_colaboradores c where c.propuesta_id=v.id and c.usuario_id=(select auth.uid()) and c.rol='editor') then
   raise exception 'Sin permiso' using errcode='42501';
 end if;
 if v.estado <> 'borrador' or v.tipo not in ('libro_nuevo','modificacion') then
   raise exception 'Solo un libro nuevo o una corrección pueden indicar un libro original';
 end if;
 if v.pendiente_aprobacion then raise exception 'El borrador está enviado a aprobación; retiralo antes de editarlo'; end if;
 v_propio := case when v.tipo='modificacion' then v.libro_id
                  else (select libro_id from public.libro_versiones where id=v.revision_resultante_id) end;
 if p_libro_id is not null then
   if not exists(select 1 from public.libros where id=p_libro_id and estado='publicado') then
     raise exception 'El libro original tiene que estar publicado';
   end if;
   if v_propio = p_libro_id then raise exception 'Un libro no puede basarse en sí mismo'; end if;
 end if;
 update public.propuestas set libro_original_id=p_libro_id where id=v.id and libro_original_id is distinct from p_libro_id;
 if v.tipo = 'modificacion' then
   select creado_por into v_creador from public.libros where id=v.libro_id;
   if v_creador = (select auth.uid()) or exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','creator')) then
     update public.libros set libro_original_id=p_libro_id where id=v.libro_id and libro_original_id is distinct from p_libro_id;
   end if;
 end if;
end $function$;

-- Al aprobar una corrección (la aprobación asigna revision_resultante_id), se aplica el
-- libro original que indicó quien la propuso.
create or replace function private.chronicle_copiar_libro_original_correccion()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
 if new.tipo = 'modificacion' and new.libro_original_id is not null and new.libro_original_id is distinct from new.libro_id then
   update public.libros set libro_original_id = new.libro_original_id
   where id = new.libro_id and libro_original_id is distinct from new.libro_original_id;
 end if;
 return null;
end $function$;
revoke all on function private.chronicle_copiar_libro_original_correccion() from public, anon, authenticated;

drop trigger if exists chronicle_copiar_libro_original_correccion on public.propuestas;
create trigger chronicle_copiar_libro_original_correccion
 after update of revision_resultante_id on public.propuestas
 for each row execute function private.chronicle_copiar_libro_original_correccion();
