-- El libro original también se puede indicar en un libro nuevo ya publicado (su borrador),
-- y queda anotado en libros.libro_original_id. Así un libro derivado (por ejemplo "Clase
-- Paladín", basado en el Manual del jugador) deja de sugerirse como si fuera el original.

alter table public.libros
  add column if not exists libro_original_id uuid references public.libros(id) on delete set null;
create index if not exists libros_libro_original_id_idx on public.libros(libro_original_id);
comment on column public.libros.libro_original_id is 'Libro publicado en el que se basa este libro (lo indica su autor)';

-- Copia el vínculo del borrador al libro publicado que salió de él.
create or replace function private.chronicle_copiar_libro_original()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
 if new.tipo = 'libro_nuevo' and new.revision_resultante_id is not null then
   update public.libros l set libro_original_id = new.libro_original_id
   from public.libro_versiones lv
   where lv.id = new.revision_resultante_id and l.id = lv.libro_id
     and l.id is distinct from new.libro_original_id
     and l.libro_original_id is distinct from new.libro_original_id;
 end if;
 return null;
end $function$;
revoke all on function private.chronicle_copiar_libro_original() from public, anon, authenticated;

drop trigger if exists chronicle_copiar_libro_original on public.propuestas;
create trigger chronicle_copiar_libro_original
 after update of libro_original_id, revision_resultante_id on public.propuestas
 for each row execute function private.chronicle_copiar_libro_original();

-- Ahora también para el borrador de un libro nuevo ya publicado (no puede apuntarse a sí mismo).
create or replace function public.chronicle_vincular_libro_original(p_propuesta_id uuid, p_libro_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v public.propuestas%rowtype; v_propio uuid;
begin
 if (select auth.uid()) is null then raise exception 'Tenés que iniciar sesión' using errcode='42501'; end if;
 select * into v from public.propuestas where id=p_propuesta_id for update;
 if not found then raise exception 'El borrador no existe'; end if;
 if v.autor_id is distinct from (select auth.uid()) and not exists(
   select 1 from public.propuesta_colaboradores c where c.propuesta_id=v.id and c.usuario_id=(select auth.uid()) and c.rol='editor') then
   raise exception 'Sin permiso' using errcode='42501';
 end if;
 if v.estado <> 'borrador' or v.tipo <> 'libro_nuevo' then
   raise exception 'Solo un libro nuevo puede indicar un libro original';
 end if;
 if v.pendiente_aprobacion then raise exception 'El borrador está enviado a aprobación; retiralo antes de editarlo'; end if;
 if p_libro_id is not null then
   if not exists(select 1 from public.libros where id=p_libro_id and estado='publicado') then
     raise exception 'El libro original tiene que estar publicado';
   end if;
   select libro_id into v_propio from public.libro_versiones where id=v.revision_resultante_id;
   if v_propio = p_libro_id then raise exception 'Un libro no puede basarse en sí mismo'; end if;
 end if;
 update public.propuestas set libro_original_id=p_libro_id where id=v.id and libro_original_id is distinct from p_libro_id;
end $function$;

-- Parecidos: primero los que coinciden por título y los que no derivan de otro libro.
create or replace function public.chronicle_libros_parecidos(p_titulo text, p_codigo text default null, p_excluir_libro uuid default null)
 returns table(libro_id uuid, version_id uuid, titulo text, codigo text, edicion text, editorial text, idioma text, estado text, revision integer, mismo_titulo boolean, mismo_codigo boolean)
 language sql
 stable
 security invoker
 set search_path to ''
as $$
 select l.id, lv.id, lv.titulo, l.codigo, l.edicion, l.editorial, lv.idioma, l.estado, lv.revision_actual,
        public.chronicle_normalizar_nombre(lv.titulo) = public.chronicle_normalizar_nombre(p_titulo),
        coalesce(public.chronicle_normalizar_nombre(l.codigo) = public.chronicle_normalizar_nombre(p_codigo), false)
 from public.libros l
 join public.libro_versiones lv on lv.libro_id = l.id
 where l.estado in ('publicado', 'oculto')
   and (p_excluir_libro is null or l.id <> p_excluir_libro)
   and (public.chronicle_normalizar_nombre(lv.titulo) = public.chronicle_normalizar_nombre(p_titulo)
        or public.chronicle_normalizar_nombre(l.codigo) = public.chronicle_normalizar_nombre(p_codigo))
 order by 10 desc, (l.libro_original_id is null) desc, 11 desc, lv.titulo
 limit 10
$$;
