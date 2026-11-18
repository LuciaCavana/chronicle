-- Envíos a aprobación y propuestas de modificación reenviadas.
--
-- 1) Al aprobar una modificación, version_base_revision quedaba en la revisión vieja.
--    Si el autor seguía editando el mismo borrador y lo reenviaba, la siguiente
--    aprobación fallaba con "La versión base cambió" aunque nadie más hubiera tocado
--    el libro. Ahora la base pasa a la revisión que se acaba de publicar.
-- 2) Retirar y rechazar no cerraban el envío: quedaban "pendientes" colgados (13).
--    Se agrega el estado 'retirado' y todas las acciones cierran los envíos abiertos.
-- 3) Rechazar solo funcionaba con libros nuevos; ahora también con modificaciones y
--    traducciones.

alter table public.propuesta_envios drop constraint propuesta_envios_estado_revision_check;
alter table public.propuesta_envios add constraint propuesta_envios_estado_revision_check
  check (estado_revision = any (array['pendiente','aprobado','rechazado','cambios_solicitados','retirado']));

-- Cierra los envíos abiertos de una propuesta: el último con el estado indicado y los
-- anteriores (que quedaron reemplazados) como retirados.
CREATE OR REPLACE FUNCTION public.chronicle_cerrar_envios_pendientes(p_propuesta_id uuid, p_estado text, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_ultimo uuid;
begin
 select id into v_ultimo from public.propuesta_envios
 where propuesta_id=p_propuesta_id and estado_revision='pendiente' order by enviado_en desc limit 1;
 if v_ultimo is null then return; end if;
 update public.propuesta_envios set
   estado_revision = case when id=v_ultimo then p_estado else 'retirado' end,
   motivo_resolucion = case when id=v_ultimo then p_motivo else 'Reemplazado por un envío posterior' end,
   resuelto_por=(select auth.uid()), resuelto_en=now()
 where propuesta_id=p_propuesta_id and estado_revision='pendiente';
end;
$function$;
REVOKE ALL ON FUNCTION public.chronicle_cerrar_envios_pendientes(uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.chronicle_retirar_aprobacion(p_propuesta_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  perform public.chronicle_cerrar_envios_pendientes(p_propuesta_id, 'retirado', 'Retirado por el autor para seguir editando');
end;
$function$;

CREATE OR REPLACE FUNCTION public.chronicle_rechazar_propuesta(p_propuesta_id uuid, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','creator')) then
   raise exception 'Solo administradores pueden rechazar propuestas' using errcode='42501';
 end if;
 if nullif(btrim(p_motivo),'') is null or length(btrim(p_motivo))>2000 then
   raise exception 'El motivo debe tener entre 1 y 2000 caracteres';
 end if;
 update public.propuestas set pendiente_aprobacion=false,motivo_resolucion=btrim(p_motivo),resuelto_por=(select auth.uid()),resuelto_en=now()
 where id=p_propuesta_id and estado='borrador' and tipo in ('libro_nuevo','modificacion','traduccion') and pendiente_aprobacion=true;
 if not found then raise exception 'La propuesta no está pendiente de aprobación'; end if;
 perform public.chronicle_cerrar_envios_pendientes(p_propuesta_id, 'rechazado', btrim(p_motivo));
end;
$function$;

CREATE OR REPLACE FUNCTION public.chronicle_enviar_propuesta_con_cambios(p_propuesta_id uuid, p_descripcion_cambios text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.propuestas%rowtype; v_envio uuid; v_cambios jsonb;
begin
 if (select auth.uid()) is null then raise exception 'Tenés que iniciar sesión' using errcode='42501'; end if;
 select * into v from public.propuestas where id=p_propuesta_id for update;
 if not found or v.estado<>'borrador' or v.pendiente_aprobacion then raise exception 'El borrador no está disponible'; end if;
 if v.autor_id is distinct from (select auth.uid()) and not exists(select 1 from public.propuesta_colaboradores c where c.propuesta_id=v.id and c.usuario_id=(select auth.uid()) and c.rol='editor') then raise exception 'Sin permiso' using errcode='42501'; end if;
 if nullif(btrim(v.titulo),'') is null then raise exception 'La propuesta necesita un título'; end if;
 v_cambios:=public.chronicle_calcular_cambios(v.id);
 if jsonb_array_length(v_cambios)=0 then raise exception 'No se detectaron cambios para enviar'; end if;
 -- Por si quedó alguno abierto: nunca hay más de un envío pendiente por propuesta.
 perform public.chronicle_cerrar_envios_pendientes(v.id, 'retirado', 'Reemplazado por un envío posterior');
 insert into public.propuesta_envios(propuesta_id,enviado_por,descripcion_cambios,contenido_snapshot,operaciones_snapshot)
 values(v.id,(select auth.uid()),coalesce(nullif(btrim(p_descripcion_cambios),''),'Cambios detectados automáticamente'),
 jsonb_build_object('tipo',v.tipo,'libro_id',v.libro_id,'version_base_id',v.version_base_id,'titulo',v.titulo,'descripcion',v.descripcion,'idioma',v.idioma,'categorias',v.categorias,'contenido',v.contenido,'metadatos_libro',v.metadatos_libro,'row_version',v.row_version),v_cambios)
 returning id into v_envio;
 update public.propuestas set pendiente_aprobacion=true,enviado_en=now(),actualizado_en=now() where id=v.id;
 return v_envio;
end;
$function$;

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
   -- La revisión publicada pasa a ser la base del borrador: si el autor sigue editándolo
   -- y lo reenvía, la próxima aprobación no lo toma como desactualizado.
   update public.propuestas set pendiente_aprobacion=false,revision_resultante_id=v_version,version_base_revision=v_actual.revision_actual+1,resuelto_por=(select auth.uid()),resuelto_en=now() where id=p_propuesta_id;
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
 perform public.chronicle_cerrar_envios_pendientes(p_propuesta_id, 'aprobado', null);
 return v_libro;
end;
$function$;

-- ---------- Corrección de datos ----------
-- Manual del jugador: su revisión 2 salió de la aprobación de esta misma propuesta
-- (18/11 01:21 UTC) y el libro no cambió después; la base correcta es la revisión 2.
update public.propuestas set version_base_revision=2
where id='114fb7bb-360f-4ae3-a4a1-30e6a1707220' and version_base_revision=1;

-- Envíos que quedaron abiertos por el error: se cierran todos menos el último de cada
-- propuesta que sigue pendiente de aprobación.
update public.propuesta_envios e set estado_revision='retirado', resuelto_en=now(),
  motivo_resolucion='Cerrado automáticamente: quedó abierto por un error ya corregido'
where e.estado_revision='pendiente'
  and e.id is distinct from (
    select x.id from public.propuesta_envios x join public.propuestas p on p.id=x.propuesta_id
    where x.propuesta_id=e.propuesta_id and p.pendiente_aprobacion and x.estado_revision='pendiente'
    order by x.enviado_en desc limit 1);
