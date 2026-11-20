-- Libro original de una propuesta nueva y conversión de un libro nuevo en corrección.
--
-- 1. propuestas.libro_original_id: el autor puede indicar en qué libro publicado se basa
--    su libro nuevo. Solo se cambia con chronicle_vincular_libro_original.
-- 2. chronicle_libros_parecidos: libros visibles con el mismo título o código, para avisar
--    al autor y al administrador.
-- 3. chronicle_tratar_como_correccion / chronicle_tratar_como_libro_nuevo: el administrador
--    convierte un libro nuevo pendiente en corrección de un libro publicado (y puede volver
--    atrás). Se recalculan los cambios del envío pendiente contra el libro publicado.

alter table public.propuestas
  add column if not exists libro_original_id uuid references public.libros(id) on delete set null,
  add column if not exists convertida_a_correccion boolean not null default false;

create index if not exists propuestas_libro_original_id_idx on public.propuestas(libro_original_id);

comment on column public.propuestas.libro_original_id is 'Libro publicado en el que se basa la propuesta (opcional, lo elige el autor o lo fija el administrador)';
comment on column public.propuestas.convertida_a_correccion is 'El administrador convirtió un libro nuevo en corrección de libro_original_id';

-- Los dos campos nuevos son administrativos: no se cambian con un update directo.
create or replace function private.proteger_propuestas()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if (new.id, new.tipo, new.autor_id, new.libro_id, new.version_base_id,
      new.version_traduccion_origen_id, new.revision_resultante_id,
      new.creado_en, new.enviado_en, new.resuelto_en, new.resuelto_por,
      new.motivo_resolucion, new.libro_original_id, new.convertida_a_correccion)
     is distinct from
     (old.id, old.tipo, old.autor_id, old.libro_id, old.version_base_id,
      old.version_traduccion_origen_id, old.revision_resultante_id,
      old.creado_en, old.enviado_en, old.resuelto_en, old.resuelto_por,
      old.motivo_resolucion, old.libro_original_id, old.convertida_a_correccion) then
    raise exception 'No se pueden modificar campos administrativos de la propuesta'
      using errcode = '42501';
  end if;

  if new.row_version not in (old.row_version, old.row_version + 1) then
    raise exception 'Versión de borrador inválida' using errcode = '40001';
  end if;

  if new.pendiente_aprobacion
     and (new.titulo, new.idioma, new.descripcion, new.categorias,
          new.contenido, new.metadatos_libro)
         is distinct from
         (old.titulo, old.idioma, old.descripcion, old.categorias,
          old.contenido, old.metadatos_libro) then
    raise exception 'El borrador está enviado a aprobación; retiralo antes de editarlo'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

-- Mientras está pendiente no se toca nada, salvo la conversión que hace el administrador
-- (marcada solo dentro de su transacción con chronicle.conversion_propuesta).
create or replace function public.chronicle_proteger_propuesta_en_revision()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
 if old.pendiente_aprobacion
 and current_setting('chronicle.conversion_propuesta', true) is distinct from old.id::text
 and (
 new.titulo is distinct from old.titulo or new.descripcion is distinct from old.descripcion
 or new.idioma is distinct from old.idioma or new.categorias is distinct from old.categorias
 or new.contenido is distinct from old.contenido or new.metadatos_libro is distinct from old.metadatos_libro
 or new.tipo is distinct from old.tipo or new.libro_id is distinct from old.libro_id
 or new.version_base_id is distinct from old.version_base_id
 or new.libro_original_id is distinct from old.libro_original_id
 ) then
 raise exception 'No se puede modificar el contenido mientras está pendiente de aprobación';
 end if;
 return new;
end $function$;

-- Normaliza títulos y códigos para compararlos: sin mayúsculas, tildes, espacios ni signos.
create or replace function public.chronicle_normalizar_nombre(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $$
 select nullif(regexp_replace(translate(lower(btrim(coalesce(p, ''))), 'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc'), '[^a-z0-9]+', '', 'g'), '')
$$;

-- Libros visibles para quien consulta (RLS) con el mismo título o código.
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
 order by 10 desc, 11 desc, lv.titulo
 limit 10
$$;

-- El autor (o un colaborador editor) indica en qué libro publicado se basa su libro nuevo.
create or replace function public.chronicle_vincular_libro_original(p_propuesta_id uuid, p_libro_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v public.propuestas%rowtype;
begin
 if (select auth.uid()) is null then raise exception 'Tenés que iniciar sesión' using errcode='42501'; end if;
 select * into v from public.propuestas where id=p_propuesta_id for update;
 if not found then raise exception 'El borrador no existe'; end if;
 if v.autor_id is distinct from (select auth.uid()) and not exists(
   select 1 from public.propuesta_colaboradores c where c.propuesta_id=v.id and c.usuario_id=(select auth.uid()) and c.rol='editor') then
   raise exception 'Sin permiso' using errcode='42501';
 end if;
 if v.estado <> 'borrador' or v.tipo <> 'libro_nuevo' or v.revision_resultante_id is not null then
   raise exception 'Solo un libro nuevo sin publicar puede indicar un libro original';
 end if;
 if v.pendiente_aprobacion then raise exception 'El borrador está enviado a aprobación; retiralo antes de editarlo'; end if;
 if p_libro_id is not null and not exists(select 1 from public.libros where id=p_libro_id and estado='publicado') then
   raise exception 'El libro original tiene que estar publicado';
 end if;
 update public.propuestas set libro_original_id=p_libro_id where id=v.id and libro_original_id is distinct from p_libro_id;
end $function$;

-- Reasigna los id de los elementos del borrador a los del libro publicado cuando coinciden
-- por nombre (o código), así la comparación muestra "modificado" en vez de quitar y agregar.
create or replace function private.chronicle_alinear_ids(p_contenido jsonb, p_base jsonb)
 returns jsonb
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
 cat text; nuevos jsonb; base_arr jsonb; resultado jsonb := p_contenido; e jsonb; i integer;
 usados text[]; ids_nuevos text[]; ids_base text[]; candidato text; clave text;
begin
 foreach cat in array array['especies','conjuros','clases','subclases','objetos','dotes','trasfondos','criaturas','caracteristicas'] loop
   nuevos := coalesce(p_contenido->cat, '[]'::jsonb);
   base_arr := coalesce(p_base->cat, '[]'::jsonb);
   if jsonb_typeof(nuevos) <> 'array' or jsonb_typeof(base_arr) <> 'array' or jsonb_array_length(nuevos) = 0 then continue; end if;
   ids_base := array(select x->>'id' from jsonb_array_elements(base_arr) x where nullif(x->>'id','') is not null);
   ids_nuevos := array(select x->>'id' from jsonb_array_elements(nuevos) x where nullif(x->>'id','') is not null);
   -- Los id del libro que el borrador ya usa no se reasignan a otro elemento.
   usados := array(select unnest(ids_nuevos) intersect select unnest(ids_base));
   for i in 0 .. jsonb_array_length(nuevos) - 1 loop
     e := nuevos->i;
     if jsonb_typeof(e) <> 'object' or (e->>'id') = any(ids_base) then continue; end if;
     clave := public.chronicle_normalizar_nombre(coalesce(nullif(e->>'nombre',''), e->>'codigo'));
     if clave is null then continue; end if;
     select x->>'id' into candidato from jsonb_array_elements(base_arr) x
     where nullif(x->>'id','') is not null and not ((x->>'id') = any(usados))
       and public.chronicle_normalizar_nombre(coalesce(nullif(x->>'nombre',''), x->>'codigo')) = clave
     limit 1;
     if candidato is not null then
       nuevos := jsonb_set(nuevos, array[i::text, 'id'], to_jsonb(candidato));
       usados := usados || candidato;
     end if;
   end loop;
   resultado := jsonb_set(resultado, array[cat], nuevos);
 end loop;
 return resultado;
end $function$;

-- Actualiza el envío pendiente con los cambios recalculados.
create or replace function private.chronicle_recalcular_envio_pendiente(p_propuesta_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v public.propuestas%rowtype; v_ops jsonb;
begin
 select * into v from public.propuestas where id=p_propuesta_id;
 v_ops := public.chronicle_calcular_cambios(p_propuesta_id);
 update public.propuesta_envios set
   operaciones_snapshot = v_ops,
   contenido_snapshot = coalesce(contenido_snapshot, '{}'::jsonb) || jsonb_build_object(
     'tipo', v.tipo, 'libro_id', v.libro_id, 'version_base_id', v.version_base_id,
     'contenido', v.contenido, 'row_version', v.row_version)
 where propuesta_id=p_propuesta_id and estado_revision='pendiente';
 return v_ops;
end $function$;

revoke all on function private.chronicle_alinear_ids(jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.chronicle_recalcular_envio_pendiente(uuid) from public, anon, authenticated;

-- El administrador trata un libro nuevo pendiente como corrección de un libro publicado.
create or replace function public.chronicle_tratar_como_correccion(p_propuesta_id uuid, p_version_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
 v public.propuestas%rowtype; lv public.libro_versiones%rowtype; v_estado text;
 v_base jsonb; v_contenido jsonb; v_ops jsonb;
begin
 if (select auth.uid()) is null or not exists (
   select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','creator')) then
   raise exception 'Solo administradores pueden convertir propuestas' using errcode='42501';
 end if;
 select * into v from public.propuestas where id=p_propuesta_id for update;
 if not found or v.estado <> 'borrador' or not v.pendiente_aprobacion then
   raise exception 'La propuesta no está pendiente de aprobación';
 end if;
 if v.tipo <> 'libro_nuevo' or v.revision_resultante_id is not null then
   raise exception 'Solo un libro nuevo sin publicar se puede tratar como corrección';
 end if;
 select * into lv from public.libro_versiones where id=p_version_id;
 if not found then raise exception 'La versión publicada no existe'; end if;
 select estado into v_estado from public.libros where id=lv.libro_id;
 if v_estado not in ('publicado','oculto') then
   raise exception 'El libro elegido no está publicado';
 end if;
 if lv.idioma <> v.idioma then
   raise exception 'El libro publicado está en otro idioma (%). Elegí la versión en %', upper(lv.idioma), upper(v.idioma);
 end if;

 v_base := jsonb_build_object('especies',lv.especies,'conjuros',lv.conjuros,'clases',lv.clases,'subclases',lv.subclases,'objetos',lv.objetos,
   'dotes',coalesce(lv.contenido_extra->'dotes','[]'::jsonb),'trasfondos',coalesce(lv.contenido_extra->'trasfondos','[]'::jsonb),
   'criaturas',coalesce(lv.contenido_extra->'criaturas','[]'::jsonb),'caracteristicas',coalesce(lv.contenido_extra->'caracteristicas','[]'::jsonb));
 v_contenido := private.chronicle_alinear_ids(v.contenido, v_base);

 perform set_config('chronicle.conversion_propuesta', v.id::text, true);
 update public.propuestas set
   tipo='modificacion', libro_id=lv.libro_id, version_base_id=lv.id, version_base_revision=lv.revision_actual,
   libro_original_id=lv.libro_id, convertida_a_correccion=true, contenido=v_contenido,
   row_version=case when v_contenido is distinct from v.contenido then row_version+1 else row_version end,
   actualizado_en=now()
 where id=v.id;
 perform set_config('chronicle.conversion_propuesta', '', true);

 v_ops := private.chronicle_recalcular_envio_pendiente(v.id);
 return jsonb_array_length(v_ops);
end $function$;

-- Deshace la conversión: vuelve a ser un libro nuevo (el libro original queda anotado).
create or replace function public.chronicle_tratar_como_libro_nuevo(p_propuesta_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v public.propuestas%rowtype; v_ops jsonb;
begin
 if (select auth.uid()) is null or not exists (
   select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','creator')) then
   raise exception 'Solo administradores pueden convertir propuestas' using errcode='42501';
 end if;
 select * into v from public.propuestas where id=p_propuesta_id for update;
 if not found or v.estado <> 'borrador' or not v.pendiente_aprobacion then
   raise exception 'La propuesta no está pendiente de aprobación';
 end if;
 if v.tipo <> 'modificacion' or not v.convertida_a_correccion then
   raise exception 'Esta propuesta no fue convertida desde un libro nuevo';
 end if;

 perform set_config('chronicle.conversion_propuesta', v.id::text, true);
 update public.propuestas set
   tipo='libro_nuevo', libro_id=null, version_base_id=null, version_base_revision=null,
   convertida_a_correccion=false, actualizado_en=now()
 where id=v.id;
 perform set_config('chronicle.conversion_propuesta', '', true);

 v_ops := private.chronicle_recalcular_envio_pendiente(v.id);
 return jsonb_array_length(v_ops);
end $function$;

revoke all on function public.chronicle_vincular_libro_original(uuid, uuid) from public, anon;
revoke all on function public.chronicle_tratar_como_correccion(uuid, uuid) from public, anon;
revoke all on function public.chronicle_tratar_como_libro_nuevo(uuid) from public, anon;
revoke all on function public.chronicle_libros_parecidos(text, text, uuid) from public, anon;
grant execute on function public.chronicle_vincular_libro_original(uuid, uuid) to authenticated;
grant execute on function public.chronicle_tratar_como_correccion(uuid, uuid) to authenticated;
grant execute on function public.chronicle_tratar_como_libro_nuevo(uuid) to authenticated;
grant execute on function public.chronicle_libros_parecidos(text, text, uuid) to authenticated;
grant execute on function public.chronicle_normalizar_nombre(text) to authenticated;
