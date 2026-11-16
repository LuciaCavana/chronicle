CREATE OR REPLACE FUNCTION public.chronicle_guardar_borrador_elementos(p_propuesta_id uuid, p_base jsonb, p_nuevo jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.propuestas%rowtype; k text; old_items jsonb; new_items jsonb; current_items jsonb; item jsonb; prior jsonb; v_elemento_id text; result_items jsonb; item_current jsonb; changed boolean; v_contenido jsonb; v_version integer;
begin
 if auth.uid() is null then raise exception 'Sesión requerida' using errcode='42501'; end if;
 select * into v from public.propuestas where id=p_propuesta_id for update;
 if not found or v.estado<>'borrador' or v.pendiente_aprobacion or (v.autor_id<>auth.uid() and not exists(select 1 from public.propuesta_colaboradores c where c.propuesta_id=p_propuesta_id and c.usuario_id=auth.uid() and c.rol='editor')) then raise exception 'Sin permiso para editar' using errcode='42501'; end if;
 if jsonb_typeof(p_base)<>'object' or jsonb_typeof(p_nuevo)<>'object' then raise exception 'Datos inválidos'; end if;
 v_contenido:=coalesce(v.contenido,'{}'::jsonb);
 foreach k in array array['especies','conjuros','dotes','trasfondos','criaturas','clases','subclases','objetos','caracteristicas'] loop
  old_items:=coalesce(p_base->'contenido'->k,'[]'::jsonb);
  new_items:=coalesce(p_nuevo->'contenido'->k,'[]'::jsonb);
  current_items:=coalesce(v_contenido->k,'[]'::jsonb);
  if jsonb_typeof(old_items)<>'array' or jsonb_typeof(new_items)<>'array' or jsonb_typeof(current_items)<>'array' then raise exception 'Lista inválida'; end if;
  result_items:=current_items;
  for item in select value from jsonb_array_elements(new_items) loop
   v_elemento_id:=item->>'id';
   if v_elemento_id is null or length(v_elemento_id)=0 then raise exception 'Elemento sin ID'; end if;
   select value into prior from jsonb_array_elements(old_items) where value->>'id'=v_elemento_id limit 1;
   if prior is distinct from item then
    select value into item_current from jsonb_array_elements(result_items) where value->>'id'=v_elemento_id limit 1;
    if item_current is distinct from prior then raise exception 'Conflicto: otro colaborador modificó un elemento de %',k using errcode='40001'; end if;
    select coalesce(jsonb_agg(value),'[]'::jsonb) into result_items from jsonb_array_elements(result_items) where value->>'id'<>v_elemento_id;
    result_items:=result_items||jsonb_build_array(item);
   end if;
  end loop;
  for item in select value from jsonb_array_elements(old_items) loop
   v_elemento_id:=item->>'id';
   if not exists(select 1 from jsonb_array_elements(new_items) where value->>'id'=v_elemento_id) then
    select value into item_current from jsonb_array_elements(result_items) where value->>'id'=v_elemento_id limit 1;
    if item_current is distinct from item then raise exception 'Conflicto al eliminar elemento de %',k using errcode='40001'; end if;
    select coalesce(jsonb_agg(value),'[]'::jsonb) into result_items from jsonb_array_elements(result_items) where value->>'id'<>v_elemento_id;
   end if;
  end loop;
  v_contenido:=jsonb_set(v_contenido,array[k],result_items,true);
 end loop;
 if nullif(p_base->>'row_version','') is null or (p_base->>'row_version') !~ '^[0-9]+$' then raise exception 'Versión base inválida'; end if;
 if v.row_version <> (p_base->>'row_version')::integer then
  if (p_base->>'titulo') is distinct from (p_nuevo->>'titulo') and v.titulo is distinct from (p_base->>'titulo') then raise exception 'Conflicto en título' using errcode='40001'; end if;
  if (p_base->>'descripcion') is distinct from (p_nuevo->>'descripcion') and v.descripcion is distinct from (p_base->>'descripcion') then raise exception 'Conflicto en descripción' using errcode='40001'; end if;
  if (p_base->>'idioma') is distinct from (p_nuevo->>'idioma') and v.idioma is distinct from (p_base->>'idioma') then raise exception 'Conflicto en idioma' using errcode='40001'; end if;
  if p_base->'categorias' is distinct from p_nuevo->'categorias' and to_jsonb(v.categorias) is distinct from p_base->'categorias' then raise exception 'Conflicto en categorías' using errcode='40001'; end if;
  if p_base->'metadatos_libro' is distinct from p_nuevo->'metadatos_libro' and v.metadatos_libro is distinct from p_base->'metadatos_libro' then raise exception 'Conflicto en metadatos' using errcode='40001'; end if;
 end if;
 update public.propuestas set contenido=v_contenido,
 titulo=case when p_base->>'titulo' is distinct from p_nuevo->>'titulo' then p_nuevo->>'titulo' else v.titulo end,
 descripcion=case when p_base->>'descripcion' is distinct from p_nuevo->>'descripcion' then p_nuevo->>'descripcion' else v.descripcion end,
 idioma=case when p_base->>'idioma' is distinct from p_nuevo->>'idioma' then p_nuevo->>'idioma' else v.idioma end,
 categorias=case when p_base->'categorias' is distinct from p_nuevo->'categorias' then array(select jsonb_array_elements_text(p_nuevo->'categorias')) else v.categorias end,
 metadatos_libro=case when p_base->'metadatos_libro' is distinct from p_nuevo->'metadatos_libro' then p_nuevo->'metadatos_libro' else v.metadatos_libro end,
 row_version=v.row_version+1, actualizado_en=now()
 where propuestas.id=p_propuesta_id returning row_version into v_version;
 return v_version;
end $function$

