-- Corrige la aprobación de propuestas de tipo 'modificacion'.
--
-- chronicle_aprobar_propuesta insertaba en libro_versiones_historial usando columnas
-- (version_id, revision, datos) que no existen en la tabla real
-- (version_publicada_id, numero_version, contenido, ...). Resultado: error 42703 y
-- HTTP 400 al aprobar cualquier modificación.
--
-- El insert manual sobraba: el trigger chronicle_historial_version_publicada ya guarda
-- una instantánea completa de libro_versiones (to_jsonb(new)) en cada INSERT/UPDATE,
-- así que el estado previo a la aprobación ya está en el historial.
--
-- chronicle_actualizar_base_borrador leía el historial con las mismas columnas
-- inexistentes; ahora busca la instantánea cuyo revision_actual coincide con la
-- revisión base del borrador.

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
   select lv.* into v_actual from public.libro_versiones lv join public.libros l on l.id=lv.libro_id
   where lv.id=v.version_base_id and lv.libro_id=v.libro_id and lv.idioma=v.idioma and l.estado='publicado' for update of lv;
   if not found then raise exception 'La versión base del libro no está disponible'; end if;
   if v.version_base_revision is distinct from v_actual.revision_actual then
     raise exception 'La versión base cambió. Retirá la propuesta de aprobación y actualizá el borrador antes de reenviarlo';
   end if;
   -- El historial lo registra el trigger chronicle_historial_version_publicada.
   update public.libro_versiones set titulo=v.titulo,descripcion=coalesce(v.descripcion,''),categorias=coalesce(v.categorias,array[]::text[]),
   especies=v_especies,conjuros=v_conjuros,clases=v_clases,subclases=v_subclases,objetos=v_objetos,contenido_extra=v_extra,
   revision_actual=revision_actual+1 where id=v_actual.id;
   v_libro:=v.libro_id;
   v_version:=v_actual.id;
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
   select lv.libro_id into v_libro
   from public.libro_versiones lv
   join public.libros l on l.id=lv.libro_id
   where lv.id=v.revision_resultante_id and l.creado_por=v.autor_id and l.estado='publicado'
   for update of lv,l;
   if v_libro is null then raise exception 'La versión publicada vinculada no existe o no pertenece al autor del borrador'; end if;
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
   update public.propuestas set pendiente_aprobacion=false,resuelto_por=(select auth.uid()),resuelto_en=now()
   where id=p_propuesta_id;
 end if;
 update public.propuesta_envios set estado_revision='aprobado',resuelto_por=(select auth.uid()),resuelto_en=now(),motivo_resolucion=null
 where id=(select id from public.propuesta_envios where propuesta_id=p_propuesta_id and estado_revision='pendiente' order by enviado_en desc limit 1);
 return v_libro;
end;
$function$;

CREATE OR REPLACE FUNCTION public.chronicle_actualizar_base_borrador(p_propuesta_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 p public.propuestas%rowtype;
 v public.libro_versiones%rowtype;
 b jsonb;
 base_contenido jsonb;
 nuevo_contenido jsonb;
 actual_contenido jsonb;
 k text;
 keys text[] := array['especies','conjuros','clases','subclases','objetos','dotes','trasfondos','criaturas','caracteristicas'];
 base_val jsonb;
 draft_val jsonb;
 current_val jsonb;
 titulo_nuevo text;
 descripcion_nueva text;
 categorias_nuevas text[];
begin
 if (select auth.uid()) is null then raise exception 'Debés iniciar sesión' using errcode='42501'; end if;
 select * into p from public.propuestas where id=p_propuesta_id for update;
 if not found or p.estado<>'borrador' or p.tipo<>'modificacion' or p.pendiente_aprobacion then
   raise exception 'Solo se puede actualizar una modificación en borrador que no esté enviada a aprobación';
 end if;
 if p.autor_id<>(select auth.uid()) and not exists(select 1 from public.propuesta_colaboradores c where c.propuesta_id=p.id and c.usuario_id=(select auth.uid()) and c.rol='editor') then
   raise exception 'Sin permiso para actualizar este borrador' using errcode='42501';
 end if;
 select * into v from public.libro_versiones where id=p.version_base_id and libro_id=p.libro_id for update;
 if not found then raise exception 'La versión publicada ya no existe'; end if;
 if p.version_base_revision=v.revision_actual then return v.revision_actual; end if;
 -- Última instantánea guardada por el trigger mientras la versión estaba en la revisión base.
 select h.contenido into b from public.libro_versiones_historial h
 where h.version_publicada_id=v.id and (h.contenido->>'revision_actual')::integer=p.version_base_revision
 order by h.numero_version desc limit 1;
 if b is null then raise exception 'No se encontró la revisión base del borrador'; end if;
 base_contenido:=jsonb_build_object(
 'especies',b->'especies','conjuros',b->'conjuros','clases',b->'clases','subclases',b->'subclases','objetos',b->'objetos',
 'dotes',b#>'{contenido_extra,dotes}','trasfondos',b#>'{contenido_extra,trasfondos}',
 'criaturas',b#>'{contenido_extra,criaturas}','caracteristicas',b#>'{contenido_extra,caracteristicas}');
 actual_contenido:=jsonb_build_object(
 'especies',to_jsonb(v.especies),'conjuros',to_jsonb(v.conjuros),'clases',to_jsonb(v.clases),
 'subclases',to_jsonb(v.subclases),'objetos',to_jsonb(v.objetos),
 'dotes',v.contenido_extra->'dotes','trasfondos',v.contenido_extra->'trasfondos',
 'criaturas',v.contenido_extra->'criaturas','caracteristicas',v.contenido_extra->'caracteristicas');
 nuevo_contenido:=p.contenido;
 foreach k in array keys loop
   base_val:=coalesce(base_contenido->k,'[]'::jsonb);
   draft_val:=coalesce(p.contenido->k,'[]'::jsonb);
   current_val:=coalesce(actual_contenido->k,'[]'::jsonb);
   if draft_val is distinct from base_val and current_val is distinct from base_val and draft_val is distinct from current_val then
     raise exception 'Conflicto en categoría %. Se requiere resolver los cambios antes de actualizar',k;
   end if;
   if draft_val is not distinct from base_val then nuevo_contenido:=jsonb_set(nuevo_contenido,array[k],current_val,true); end if;
 end loop;
 titulo_nuevo:=p.titulo;
 if p.titulo is distinct from (b->>'titulo') and v.titulo is distinct from (b->>'titulo') and p.titulo is distinct from v.titulo then
   raise exception 'Conflicto en título: ambos borradores modificaron el mismo campo';
 end if;
 if p.titulo is not distinct from (b->>'titulo') then titulo_nuevo:=v.titulo; end if;
 descripcion_nueva:=p.descripcion;
 if p.descripcion is distinct from (b->>'descripcion') and v.descripcion is distinct from (b->>'descripcion') and p.descripcion is distinct from v.descripcion then
   raise exception 'Conflicto en descripción: ambos borradores modificaron el mismo campo';
 end if;
 if p.descripcion is not distinct from (b->>'descripcion') then descripcion_nueva:=v.descripcion; end if;
 categorias_nuevas:=p.categorias;
 if to_jsonb(p.categorias) is distinct from b->'categorias' and to_jsonb(v.categorias) is distinct from b->'categorias' and p.categorias is distinct from v.categorias then
   raise exception 'Conflicto en categorías activas';
 end if;
 if to_jsonb(p.categorias) is not distinct from b->'categorias' then categorias_nuevas:=v.categorias; end if;
 update public.propuestas set titulo=titulo_nuevo,descripcion=descripcion_nueva,categorias=categorias_nuevas,
 contenido=nuevo_contenido,version_base_revision=v.revision_actual,row_version=row_version+1,actualizado_en=now()
 where id=p.id;
 return v.revision_actual;
end $function$;
