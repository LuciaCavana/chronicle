-- Aprobar una corrección de un libro oculto: se actualiza el contenido y el libro
-- vuelve a publicarse. Antes la función exigía estado 'publicado' y fallaba con un
-- mensaje engañoso ("no existe o no pertenece al autor").
-- Los libros en la papelera siguen bloqueados, con un mensaje claro.

-- Vuelve a publicar un libro oculto cuando se aprueba una corrección, dejando constancia
-- en la misma auditoría que usa chronicle_gestionar_estado_libro.
CREATE OR REPLACE FUNCTION public.chronicle_republicar_por_aprobacion(p_libro_id uuid, p_estado_anterior text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if p_estado_anterior is distinct from 'oculto' then return; end if;
 update public.libros set estado='publicado' where id=p_libro_id;
 insert into public.libro_estado_auditoria(libro_id,estado_anterior,estado_nuevo,motivo,realizado_por)
 values(p_libro_id,'oculto','publicado','Se volvió a publicar al aprobar una corrección',(select auth.uid()));
end;
$function$;

REVOKE ALL ON FUNCTION public.chronicle_republicar_por_aprobacion(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.chronicle_aprobar_propuesta(p_propuesta_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v public.propuestas%rowtype;
 v_libro uuid;
 v_version uuid;
 v_especies jsonb;
 v_conjuros jsonb;
 v_clases jsonb;
 v_subclases jsonb;
 v_objetos jsonb;
 v_extra jsonb;
 v_actual public.libro_versiones%rowtype;
 v_estado_libro text;
 v_creador uuid;
begin
 if (select auth.uid()) is null or not exists (
   select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','creator')
 ) then
   raise exception 'Solo administradores pueden aprobar propuestas' using errcode='42501';
 end if;
 select * into v from public.propuestas where id=p_propuesta_id for update;
 if not found or v.estado <> 'borrador' or v.tipo not in ('libro_nuevo','modificacion','traduccion') or not v.pendiente_aprobacion then
   raise exception 'La propuesta no está disponible para aprobación';
 end if;
 if nullif(btrim(v.titulo),'') is null then raise exception 'La propuesta necesita un título'; end if;
 if jsonb_typeof(v.contenido) <> 'object' then raise exception 'Contenido inválido'; end if;
 v_especies := coalesce(v.contenido->'especies','[]'::jsonb);
 v_conjuros := coalesce(v.contenido->'conjuros','[]'::jsonb);
 v_clases := coalesce(v.contenido->'clases','[]'::jsonb);
 v_subclases := coalesce(v.contenido->'subclases','[]'::jsonb);
 v_objetos := coalesce(v.contenido->'objetos','[]'::jsonb);
 v_extra := jsonb_build_object(
   'dotes',coalesce(v.contenido->'dotes','[]'::jsonb),
   'trasfondos',coalesce(v.contenido->'trasfondos','[]'::jsonb),
   'criaturas',coalesce(v.contenido->'criaturas','[]'::jsonb),
   'caracteristicas',coalesce(v.contenido->'caracteristicas','[]'::jsonb)
 );
 if jsonb_typeof(v_especies)<>'array' or jsonb_typeof(v_conjuros)<>'array'
 or jsonb_typeof(v_clases)<>'array' or jsonb_typeof(v_subclases)<>'array'
 or jsonb_typeof(v_objetos)<>'array'
 or jsonb_typeof(v_extra->'dotes')<>'array'
 or jsonb_typeof(v_extra->'trasfondos')<>'array'
 or jsonb_typeof(v_extra->'criaturas')<>'array'
 or jsonb_typeof(v_extra->'caracteristicas')<>'array' then
   raise exception 'Las categorías del libro deben ser listas';
 end if;
 -- El borrador conserva contenido oculto, pero la publicacion solo incluye categorias activas.
 v_especies := case when 'especies'=any(coalesce(v.categorias,array[]::text[])) then v_especies else '[]'::jsonb end;
 v_conjuros := case when 'conjuros'=any(coalesce(v.categorias,array[]::text[])) then v_conjuros else '[]'::jsonb end;
 v_clases := case when 'clases'=any(coalesce(v.categorias,array[]::text[])) then v_clases else '[]'::jsonb end;
 v_subclases := case when 'subclases'=any(coalesce(v.categorias,array[]::text[])) then v_subclases else '[]'::jsonb end;
 v_objetos := case when 'objetos'=any(coalesce(v.categorias,array[]::text[])) then v_objetos else '[]'::jsonb end;
 v_extra := jsonb_build_object(
 'dotes',case when 'dotes'=any(coalesce(v.categorias,array[]::text[])) then v_extra->'dotes' else '[]'::jsonb end,
 'trasfondos',case when 'trasfondos'=any(coalesce(v.categorias,array[]::text[])) then v_extra->'trasfondos' else '[]'::jsonb end,
 'criaturas',case when 'criaturas'=any(coalesce(v.categorias,array[]::text[])) then v_extra->'criaturas' else '[]'::jsonb end,
 'caracteristicas',case when 'caracteristicas'=any(coalesce(v.categorias,array[]::text[])) then v_extra->'caracteristicas' else '[]'::jsonb end
 );
 if v.tipo = 'modificacion' then
   select lv.* into v_actual from public.libro_versiones lv
   where lv.id=v.version_base_id and lv.libro_id=v.libro_id and lv.idioma=v.idioma for update;
   if not found then raise exception 'La versión base del libro ya no existe'; end if;
   select estado into v_estado_libro from public.libros where id=v.libro_id for update;
   if v_estado_libro not in ('publicado','oculto') then
     raise exception 'No se puede actualizar un libro en estado "%". Si está en la papelera, restauralo antes de aprobar cambios', v_estado_libro;
   end if;
   if v.version_base_revision is distinct from v_actual.revision_actual then
     raise exception 'La versión base cambió. Retirá la propuesta de aprobación y actualizá el borrador antes de reenviarlo';
   end if;
   -- El historial lo registra el trigger chronicle_historial_version_publicada.
   update public.libro_versiones set titulo=v.titulo,descripcion=coalesce(v.descripcion,''),categorias=coalesce(v.categorias,array[]::text[]),
   especies=v_especies,conjuros=v_conjuros,clases=v_clases,subclases=v_subclases,objetos=v_objetos,contenido_extra=v_extra,
   revision_actual=revision_actual+1 where id=v_actual.id;
   v_libro:=v.libro_id;
   v_version:=v_actual.id;
   perform public.chronicle_republicar_por_aprobacion(v_libro, v_estado_libro);
   update public.propuestas set pendiente_aprobacion=false,revision_resultante_id=v_version,resuelto_por=(select auth.uid()),resuelto_en=now() where id=p_propuesta_id;
 elsif v.tipo = 'traduccion' then
   if not exists(select 1 from public.libros where id=v.libro_id and estado='publicado') then raise exception 'El libro de origen no está publicado'; end if;
   if exists(select 1 from public.libro_versiones where libro_id=v.libro_id and idioma=v.idioma) then raise exception 'Ya existe una versión publicada en ese idioma'; end if;
   insert into public.libro_versiones(libro_id,idioma,titulo,descripcion,categorias,especies,conjuros,clases,subclases,objetos,contenido_extra,version_origen_id)
   values(v.libro_id,v.idioma,v.titulo,coalesce(v.descripcion,''),coalesce(v.categorias,array[]::text[]),v_especies,v_conjuros,v_clases,v_subclases,v_objetos,v_extra,v.version_traduccion_origen_id)
   returning id into v_version;
   v_libro:=v.libro_id;
   update public.propuestas set pendiente_aprobacion=false,revision_resultante_id=v_version,resuelto_por=(select auth.uid()),resuelto_en=now() where id=p_propuesta_id;
 elsif v.revision_resultante_id is null then
   insert into public.libros(codigo,edicion,editorial,clasificacion,creado_por,estado)
   values(coalesce(v.metadatos_libro->>'codigo',''),coalesce(v.metadatos_libro->>'edicion',''),
          coalesce(v.metadatos_libro->>'editorial',''),
          coalesce(nullif(v.metadatos_libro->>'clasificacion',''),'homebrew'),v.autor_id,'publicado')
   returning id into v_libro;
   insert into public.libro_versiones(libro_id,idioma,titulo,descripcion,categorias,especies,conjuros,clases,subclases,objetos,contenido_extra)
   values(v_libro,v.idioma,v.titulo,coalesce(v.descripcion,''),coalesce(v.categorias,array[]::text[]),
          v_especies,v_conjuros,v_clases,v_subclases,v_objetos,v_extra)
   returning id into v_version;
   update public.propuestas
   set pendiente_aprobacion=false,revision_resultante_id=v_version,resuelto_por=(select auth.uid()),resuelto_en=now()
   where id=p_propuesta_id;
 else
   select lv.libro_id, l.estado, l.creado_por into v_libro, v_estado_libro, v_creador
   from public.libro_versiones lv
   join public.libros l on l.id=lv.libro_id
   where lv.id=v.revision_resultante_id
   for update of lv,l;
   if v_libro is null then raise exception 'La versión publicada vinculada a este borrador ya no existe'; end if;
   if v_creador is distinct from v.autor_id then raise exception 'El libro publicado pertenece a otro autor'; end if;
   if v_estado_libro not in ('publicado','oculto') then
     raise exception 'No se puede actualizar un libro en estado "%". Si está en la papelera, restauralo antes de aprobar cambios', v_estado_libro;
   end if;
   update public.libros set
     codigo=coalesce(v.metadatos_libro->>'codigo',''),
     edicion=coalesce(v.metadatos_libro->>'edicion',''),
     editorial=coalesce(v.metadatos_libro->>'editorial',''),
     clasificacion=coalesce(nullif(v.metadatos_libro->>'clasificacion',''),'homebrew')
   where id=v_libro;
   update public.libro_versiones set
     idioma=v.idioma,titulo=v.titulo,descripcion=coalesce(v.descripcion,''),
     categorias=coalesce(v.categorias,array[]::text[]),
     especies=v_especies,conjuros=v_conjuros,clases=v_clases,subclases=v_subclases,objetos=v_objetos,
     contenido_extra=v_extra
   where id=v.revision_resultante_id;
   perform public.chronicle_republicar_por_aprobacion(v_libro, v_estado_libro);
   update public.propuestas set pendiente_aprobacion=false,resuelto_por=(select auth.uid()),resuelto_en=now()
   where id=p_propuesta_id;
 end if;
 update public.propuesta_envios set estado_revision='aprobado',resuelto_por=(select auth.uid()),resuelto_en=now(),motivo_resolucion=null
 where id=(select id from public.propuesta_envios where propuesta_id=p_propuesta_id and estado_revision='pendiente' order by enviado_en desc limit 1);
 return v_libro;
end;
$function$;
