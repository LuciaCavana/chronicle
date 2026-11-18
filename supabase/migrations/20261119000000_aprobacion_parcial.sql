-- Aprobación parcial de correcciones.
--
-- El administrador decide, por cada cambio de la propuesta (en el orden de
-- operaciones_snapshot del envío pendiente), si se aplica:
--   [{"i": 0, "decision": "aceptar"}, {"i": 1, "decision": "descartar"},
--    {"i": 2, "decision": "parcial", "campos": ["alcance", "descripcion"]}]
-- Los cambios sin decisión se aceptan. "parcial" solo vale para elementos
-- modificados: toma de la propuesta los campos listados y deja el resto como estaba
-- publicado. La base arma el resultado con las dos versiones que ya tiene; desde la
-- pantalla solo llegan elecciones, nunca contenido.
--
-- Lo descartado queda en el borrador del autor (que no se toca) y la base del
-- borrador pasa a la revisión recién publicada, así puede corregirlo y reenviarlo.
-- Los libros nuevos y las traducciones se siguen aprobando completos.

alter table public.propuesta_envios add column if not exists decisiones jsonb;
alter table public.propuesta_envios drop constraint propuesta_envios_estado_revision_check;
alter table public.propuesta_envios add constraint propuesta_envios_estado_revision_check
  check (estado_revision = any (array['pendiente','aprobado','aprobado_parcial','rechazado','cambios_solicitados','retirado']));

-- Aplica las decisiones sobre una versión publicada y devuelve el contenido resultante:
-- {especies, conjuros, ..., caracteristicas, categorias, datos{titulo,...}, aceptados, descartados}
CREATE OR REPLACE FUNCTION public.chronicle_aplicar_decisiones(p_version_id uuid, p_ops jsonb, p_decisiones jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 lv public.libro_versiones%rowtype;
 l public.libros%rowtype;
 cats text[];
 datos jsonb;
 listas jsonb := '{}'::jsonb;   -- por categoría: clave -> elemento
 claves jsonb := '{}'::jsonb;   -- por categoría: claves en orden
 resultado jsonb := '{}'::jsonb;
 todas text[] := array['especies','conjuros','clases','subclases','objetos','dotes','trasfondos','criaturas','caracteristicas'];
 cat text; clave text; k text; decision text;
 op jsonb; dec jsonb; nuevo jsonb; arr jsonb; claves_cat jsonb; mapa jsonb;
 i integer;
 n_aceptados integer := 0;
 n_descartados integer := 0;
begin
 select * into lv from public.libro_versiones where id = p_version_id;
 if not found then raise exception 'La versión publicada no existe'; end if;
 select * into l from public.libros where id = lv.libro_id;
 cats := coalesce(lv.categorias, array[]::text[]);
 datos := jsonb_build_object('titulo', lv.titulo, 'descripcion', lv.descripcion, 'idioma', lv.idioma,
   'codigo', l.codigo, 'edicion', l.edicion, 'editorial', l.editorial, 'clasificacion', l.clasificacion);

 -- Mismas claves que chronicle_calcular_cambios: el id del elemento o "pos:N".
 foreach cat in array todas loop
   arr := case cat when 'especies' then lv.especies when 'conjuros' then lv.conjuros when 'clases' then lv.clases
     when 'subclases' then lv.subclases when 'objetos' then lv.objetos else lv.contenido_extra -> cat end;
   if arr is null or jsonb_typeof(arr) <> 'array' or not (cat = any(cats)) then arr := '[]'::jsonb; end if;
   select coalesce(jsonb_agg(c order by o), '[]'::jsonb), coalesce(jsonb_object_agg(c, e), '{}'::jsonb)
     into claves_cat, mapa
   from (select coalesce(nullif(e ->> 'id', ''), 'pos:' || o::text) c, e, o
         from jsonb_array_elements(arr) with ordinality t(e, o)) s;
   claves := claves || jsonb_build_object(cat, claves_cat);
   listas := listas || jsonb_build_object(cat, mapa);
 end loop;

 for op, i in select value, (ordinality - 1)::integer from jsonb_array_elements(coalesce(p_ops, '[]'::jsonb)) with ordinality loop
   dec := null;
   select d into dec from jsonb_array_elements(coalesce(p_decisiones, '[]'::jsonb)) d where (d ->> 'i')::integer = i limit 1;
   decision := coalesce(dec ->> 'decision', 'aceptar');
   if decision not in ('aceptar', 'descartar', 'parcial') then raise exception 'Decisión inválida: %', decision; end if;
   if decision = 'parcial' and op ->> 'accion' <> 'corregir' then
     raise exception 'Solo un elemento modificado se puede aceptar en parte';
   end if;
   if decision = 'descartar' then n_descartados := n_descartados + 1; continue; end if;

   cat := op ->> 'categoria';
   clave := op ->> 'elemento_id';
   if op ->> 'accion' in ('agregar', 'retirar', 'corregir') and not (cat = any(todas)) then
     raise exception 'Categoría desconocida: %', cat;
   end if;
   case op ->> 'accion'
     when 'activar_categoria' then
       if not (cat = any(cats)) then cats := cats || cat; end if;
     when 'desactivar_categoria' then
       cats := array_remove(cats, cat);
     when 'modificar_campo' then
       if not datos ? clave then raise exception 'Dato desconocido: %', clave; end if;
       datos := jsonb_set(datos, array[clave], coalesce(op -> 'despues', 'null'::jsonb));
     when 'agregar' then
       listas := jsonb_set(listas, array[cat, clave], op -> 'despues');
       if not (claves -> cat) ? clave then claves := jsonb_set(claves, array[cat], (claves -> cat) || to_jsonb(clave)); end if;
     when 'retirar' then
       listas := listas #- array[cat, clave];
       claves := jsonb_set(claves, array[cat], (claves -> cat) - clave);
     when 'corregir' then
       if decision = 'parcial' then
         nuevo := op -> 'antes';
         for k in select jsonb_array_elements_text(coalesce(dec -> 'campos', '[]'::jsonb)) loop
           if not ((op -> 'antes') ? k or (op -> 'despues') ? k) then raise exception 'Campo desconocido: %', k; end if;
           if (op -> 'despues') ? k then nuevo := nuevo || jsonb_build_object(k, op -> 'despues' -> k);
           else nuevo := nuevo - k; end if;
         end loop;
       else
         nuevo := op -> 'despues';
       end if;
       listas := jsonb_set(listas, array[cat, clave], nuevo);
       if not (claves -> cat) ? clave then claves := jsonb_set(claves, array[cat], (claves -> cat) || to_jsonb(clave)); end if;
     else
       raise exception 'Tipo de cambio desconocido: %', op ->> 'accion';
   end case;
   n_aceptados := n_aceptados + 1;
 end loop;

 foreach cat in array todas loop
   select coalesce(jsonb_agg(listas -> cat -> c order by o), '[]'::jsonb) into arr
   from jsonb_array_elements_text(claves -> cat) with ordinality t(c, o)
   where (listas -> cat) ? c;
   -- Como al publicar: una categoría desactivada no lleva contenido.
   if not (cat = any(cats)) then arr := '[]'::jsonb; end if;
   resultado := resultado || jsonb_build_object(cat, arr);
 end loop;
 return resultado || jsonb_build_object('categorias', to_jsonb(cats), 'datos', datos,
   'aceptados', n_aceptados, 'descartados', n_descartados);
end;
$function$;
REVOKE ALL ON FUNCTION public.chronicle_aplicar_decisiones(uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

-- La aprobación pasa a aceptar decisiones (opcionales: sin ellas se aprueba todo, como antes).
DROP FUNCTION IF EXISTS public.chronicle_aprobar_propuesta(uuid);

CREATE OR REPLACE FUNCTION public.chronicle_aprobar_propuesta(p_propuesta_id uuid, p_decisiones jsonb DEFAULT NULL, p_comentario text DEFAULT NULL)
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
 v_envio uuid;
 v_ops jsonb;
 v_parcial boolean;
 v_r jsonb;
 v_comentario text := nullif(btrim(coalesce(p_comentario, '')), '');
begin
 if (select auth.uid()) is null or not exists (
   select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','creator')
 ) then
   raise exception 'Solo administradores pueden aprobar propuestas' using errcode='42501';
 end if;
 if p_decisiones is not null and jsonb_typeof(p_decisiones) <> 'array' then raise exception 'Decisiones inválidas'; end if;
 if v_comentario is not null and length(v_comentario) > 4000 then raise exception 'El comentario es demasiado largo'; end if;
 select * into v from public.propuestas where id=p_propuesta_id for update;
 if not found or v.estado <> 'borrador' or v.tipo not in ('libro_nuevo','modificacion','traduccion') or not v.pendiente_aprobacion then
   raise exception 'La propuesta no está disponible para aprobación';
 end if;
 if nullif(btrim(v.titulo),'') is null then raise exception 'La propuesta necesita un título'; end if;
 if jsonb_typeof(v.contenido) <> 'object' then raise exception 'Contenido inválido'; end if;

 select id, operaciones_snapshot into v_envio, v_ops from public.propuesta_envios
 where propuesta_id=p_propuesta_id and estado_revision='pendiente' order by enviado_en desc limit 1;
 v_parcial := exists (select 1 from jsonb_array_elements(coalesce(p_decisiones, '[]'::jsonb)) d
                      where coalesce(d ->> 'decision', 'aceptar') <> 'aceptar');
 if v_parcial and v_ops is null then raise exception 'No se encontró el envío pendiente de esta propuesta'; end if;
 if v_parcial and (v.tipo = 'traduccion' or (v.tipo = 'libro_nuevo' and v.revision_resultante_id is null)) then
   raise exception 'Los libros nuevos y las traducciones se aprueban completos o se rechazan';
 end if;

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
   if v_parcial then
     v_r := public.chronicle_aplicar_decisiones(v_actual.id, v_ops, p_decisiones);
     if (v_r ->> 'aceptados')::integer = 0 then
       raise exception 'No aceptaste ningún cambio. Si no querés aplicar nada, rechazá la propuesta';
     end if;
     -- El historial lo registra el trigger chronicle_historial_version_publicada.
     update public.libro_versiones set
       titulo=coalesce(v_r->'datos'->>'titulo', titulo), descripcion=coalesce(v_r->'datos'->>'descripcion',''),
       categorias=array(select jsonb_array_elements_text(v_r->'categorias')),
       especies=v_r->'especies', conjuros=v_r->'conjuros', clases=v_r->'clases', subclases=v_r->'subclases', objetos=v_r->'objetos',
       contenido_extra=jsonb_build_object('dotes',v_r->'dotes','trasfondos',v_r->'trasfondos','criaturas',v_r->'criaturas','caracteristicas',v_r->'caracteristicas'),
       revision_actual=revision_actual+1
     where id=v_actual.id;
     update public.libros set
       codigo=coalesce(v_r->'datos'->>'codigo', codigo), edicion=coalesce(v_r->'datos'->>'edicion', edicion),
       editorial=coalesce(v_r->'datos'->>'editorial', editorial),
       clasificacion=coalesce(nullif(v_r->'datos'->>'clasificacion',''), clasificacion)
     where id=v.libro_id;
   else
     update public.libro_versiones set titulo=v.titulo,descripcion=coalesce(v.descripcion,''),categorias=coalesce(v.categorias,array[]::text[]),
     especies=v_especies,conjuros=v_conjuros,clases=v_clases,subclases=v_subclases,objetos=v_objetos,contenido_extra=v_extra,
     revision_actual=revision_actual+1 where id=v_actual.id;
     -- Los datos del libro (código, edición, editorial, clasificación) también son parte de la corrección.
     update public.libros set
       codigo=coalesce(v.metadatos_libro->>'codigo', codigo), edicion=coalesce(v.metadatos_libro->>'edicion', edicion),
       editorial=coalesce(v.metadatos_libro->>'editorial', editorial),
       clasificacion=coalesce(nullif(v.metadatos_libro->>'clasificacion',''), clasificacion)
     where id=v.libro_id;
   end if;
   v_libro:=v.libro_id;
   v_version:=v_actual.id;
   perform public.chronicle_republicar_por_aprobacion(v_libro, v_estado_libro);
   -- La revisión publicada pasa a ser la base del borrador. Lo descartado sigue en el
   -- borrador, así el autor puede corregirlo y reenviarlo.
   update public.propuestas set pendiente_aprobacion=false,revision_resultante_id=v_version,version_base_revision=v_actual.revision_actual+1,
     motivo_resolucion=v_comentario,resuelto_por=(select auth.uid()),resuelto_en=now() where id=p_propuesta_id;
 elsif v.tipo = 'traduccion' then
   if not exists(select 1 from public.libros where id=v.libro_id and estado='publicado') then raise exception 'El libro de origen no está publicado'; end if;
   if exists(select 1 from public.libro_versiones where libro_id=v.libro_id and idioma=v.idioma) then raise exception 'Ya existe una versión publicada en ese idioma'; end if;
   insert into public.libro_versiones(libro_id,idioma,titulo,descripcion,categorias,especies,conjuros,clases,subclases,objetos,contenido_extra,version_origen_id)
   values(v.libro_id,v.idioma,v.titulo,coalesce(v.descripcion,''),coalesce(v.categorias,array[]::text[]),v_especies,v_conjuros,v_clases,v_subclases,v_objetos,v_extra,v.version_traduccion_origen_id)
   returning id into v_version;
   v_libro:=v.libro_id;
   update public.propuestas set pendiente_aprobacion=false,revision_resultante_id=v_version,motivo_resolucion=v_comentario,resuelto_por=(select auth.uid()),resuelto_en=now() where id=p_propuesta_id;
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
   set pendiente_aprobacion=false,revision_resultante_id=v_version,motivo_resolucion=v_comentario,resuelto_por=(select auth.uid()),resuelto_en=now()
   where id=p_propuesta_id;
 else
   -- Corrección de un libro propio ya publicado (libro nuevo aprobado antes).
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
   if v_parcial then
     v_r := public.chronicle_aplicar_decisiones(v.revision_resultante_id, v_ops, p_decisiones);
     if (v_r ->> 'aceptados')::integer = 0 then
       raise exception 'No aceptaste ningún cambio. Si no querés aplicar nada, rechazá la propuesta';
     end if;
     update public.libros set
       codigo=coalesce(v_r->'datos'->>'codigo', codigo), edicion=coalesce(v_r->'datos'->>'edicion', edicion),
       editorial=coalesce(v_r->'datos'->>'editorial', editorial),
       clasificacion=coalesce(nullif(v_r->'datos'->>'clasificacion',''), clasificacion)
     where id=v_libro;
     update public.libro_versiones set
       idioma=coalesce(v_r->'datos'->>'idioma', idioma), titulo=coalesce(v_r->'datos'->>'titulo', titulo),
       descripcion=coalesce(v_r->'datos'->>'descripcion',''),
       categorias=array(select jsonb_array_elements_text(v_r->'categorias')),
       especies=v_r->'especies', conjuros=v_r->'conjuros', clases=v_r->'clases', subclases=v_r->'subclases', objetos=v_r->'objetos',
       contenido_extra=jsonb_build_object('dotes',v_r->'dotes','trasfondos',v_r->'trasfondos','criaturas',v_r->'criaturas','caracteristicas',v_r->'caracteristicas')
     where id=v.revision_resultante_id;
   else
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
   end if;
   perform public.chronicle_republicar_por_aprobacion(v_libro, v_estado_libro);
   update public.propuestas set pendiente_aprobacion=false,motivo_resolucion=v_comentario,resuelto_por=(select auth.uid()),resuelto_en=now()
   where id=p_propuesta_id;
 end if;

 if v_envio is not null then
   update public.propuesta_envios set decisiones=p_decisiones where id=v_envio;
 end if;
 perform public.chronicle_cerrar_envios_pendientes(p_propuesta_id, case when v_parcial then 'aprobado_parcial' else 'aprobado' end, v_comentario);
 return v_libro;
end;
$function$;
REVOKE ALL ON FUNCTION public.chronicle_aprobar_propuesta(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chronicle_aprobar_propuesta(uuid, jsonb, text) TO authenticated;
