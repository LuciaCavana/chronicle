-- Migracion aplicada en Chronicle Dev: unificacion de roles y registro historico.
-- La tabla chronicle_admins se conserva temporalmente solo como respaldo de migracion.
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('creator','admin','user'));
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS historial_cambios jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_historial_array CHECK (jsonb_typeof(historial_cambios)='array');

CREATE OR REPLACE FUNCTION public.chronicle_registrar_historial_rol()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.historial_cambios := jsonb_build_array(jsonb_build_object(
   'fecha',clock_timestamp(),'accion','creacion','rol_anterior',null,'rol_nuevo',NEW.role,
   'modificado_por',auth.uid()));
 ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
  NEW.historial_cambios := OLD.historial_cambios || jsonb_build_array(jsonb_build_object(
   'fecha',clock_timestamp(),'accion','cambio_rol','rol_anterior',OLD.role,'rol_nuevo',NEW.role,
   'modificado_por',auth.uid()));
 ELSE
  NEW.historial_cambios := OLD.historial_cambios;
 END IF;
 RETURN NEW;
END
$function$
;
REVOKE ALL ON FUNCTION public.chronicle_registrar_historial_rol() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS chronicle_historial_roles ON public.user_roles;
CREATE TRIGGER chronicle_historial_roles BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.chronicle_registrar_historial_rol();

INSERT INTO public.user_roles(user_id,role,granted_at)
SELECT a.user_id,'admin',a.asignado_en FROM public.chronicle_admins a
WHERE NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=a.user_id AND r.role='creator')
ON CONFLICT(user_id) DO UPDATE SET role='admin',granted_at=EXCLUDED.granted_at
WHERE public.user_roles.role IS DISTINCT FROM 'admin';

INSERT INTO public.user_roles(user_id,role)
SELECT id,'user' FROM auth.users WHERE deleted_at IS NULL
ON CONFLICT(user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.chronicle_aprobar_propuesta(p_propuesta_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.propuestas%rowtype; v_libro uuid; v_version uuid;
v_especies jsonb; v_conjuros jsonb; v_clases jsonb; v_subclases jsonb; v_objetos jsonb;
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','creator') 
 ) then
  raise exception 'Solo administradores pueden aprobar propuestas' using errcode='42501';
 end if;
 select * into v from public.propuestas where id=p_propuesta_id for update;
 if not found or v.estado<>'borrador' or v.tipo<>'libro_nuevo' or not v.pendiente_aprobacion then
  raise exception 'La propuesta no es un borrador de libro disponible';
 end if;
 if nullif(btrim(v.titulo),'') is null then raise exception 'La propuesta necesita un título'; end if;
 v_especies:=case when jsonb_typeof(v.contenido->'especies')='array' then v.contenido->'especies' else '[]'::jsonb end;
 v_conjuros:=case when jsonb_typeof(v.contenido->'conjuros')='array' then v.contenido->'conjuros' else '[]'::jsonb end;
 v_clases:=case when jsonb_typeof(v.contenido->'clases')='array' then v.contenido->'clases' else '[]'::jsonb end;
 v_subclases:=case when jsonb_typeof(v.contenido->'subclases')='array' then v.contenido->'subclases' else '[]'::jsonb end;
 v_objetos:=case when jsonb_typeof(v.contenido->'objetos')='array' then v.contenido->'objetos' else '[]'::jsonb end;
 if v.revision_resultante_id is null then
  insert into public.libros(codigo,edicion,editorial,clasificacion,creado_por,estado)
  values(coalesce(v.metadatos_libro->>'codigo',''),coalesce(v.metadatos_libro->>'edicion',''),coalesce(v.metadatos_libro->>'editorial',''),coalesce(nullif(v.metadatos_libro->>'clasificacion',''),'homebrew'),v.autor_id,'publicado')
  returning id into v_libro;
  insert into public.libro_versiones(libro_id,idioma,titulo,descripcion,categorias,especies,conjuros,clases,subclases,objetos)
  values(v_libro,v.idioma,v.titulo,coalesce(v.descripcion,''),coalesce(v.categorias,array[]::text[]),v_especies,v_conjuros,v_clases,v_subclases,v_objetos)
  returning id into v_version;
  update public.propuestas
  set pendiente_aprobacion=false,revision_resultante_id=v_version,resuelto_por=(select auth.uid()),resuelto_en=now()
  where id=p_propuesta_id;
 else
  select lv.libro_id into v_libro
  from public.libro_versiones lv
  join public.libros l on l.id=lv.libro_id
  where lv.id=v.revision_resultante_id and l.creado_por=v.autor_id
  for update of lv, l;
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
    especies=v_especies,conjuros=v_conjuros,clases=v_clases,subclases=v_subclases,objetos=v_objetos
  where id=v.revision_resultante_id;
  update public.propuestas set pendiente_aprobacion=false,resuelto_por=(select auth.uid()),resuelto_en=now() where id=p_propuesta_id;
 end if;
 return v_libro;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.chronicle_cambiar_rol_usuario(p_user_id uuid, p_nuevo_rol text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.role='creator'
 ) THEN
  RAISE EXCEPTION 'Solo el creador puede modificar roles' USING errcode='42501';
 END IF;
 IF p_nuevo_rol IS NULL OR p_nuevo_rol NOT IN ('admin','user') THEN
  RAISE EXCEPTION 'Rol no permitido' USING errcode='22023';
 END IF;
 IF p_user_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM auth.users u WHERE u.id=p_user_id AND u.deleted_at IS NULL
 ) THEN
  RAISE EXCEPTION 'Usuario no encontrado' USING errcode='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_user_id AND r.role='creator') THEN
  RAISE EXCEPTION 'No se puede modificar el rol del creador' USING errcode='42501';
 END IF;
 INSERT INTO public.user_roles(user_id,role,granted_by,granted_at)
 VALUES(p_user_id,p_nuevo_rol,auth.uid(),now())
 ON CONFLICT(user_id) DO UPDATE
 SET role=excluded.role,granted_by=excluded.granted_by,granted_at=now()
 WHERE public.user_roles.role IS DISTINCT FROM excluded.role;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.chronicle_es_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(select 1 from public.user_roles where role='admin' and user_id=(select auth.uid()));
$function$
;

CREATE OR REPLACE FUNCTION public.chronicle_listar_administradores()
 RETURNS TABLE(user_id uuid, email text, asignado_en timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null or not exists (select 1 from public.user_roles a where a.user_id = auth.uid() and a.role in ('creator','admin')) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query select a.user_id, u.email::text, a.granted_at from public.user_roles a join auth.users u on u.id=a.user_id where a.role='admin' order by a.granted_at;
end; $function$
;

CREATE OR REPLACE FUNCTION public.chronicle_listar_propuestas_pendientes()
 RETURNS SETOF propuestas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not (
 exists(select 1 from public.user_roles r where r.user_id=auth.uid() and r.role in ('admin','creator'))
 ) then raise exception 'No autorizado' using errcode='42501'; end if;
 return query select p.* from public.propuestas p
 where p.estado='borrador' and p.tipo='libro_nuevo' and p.pendiente_aprobacion=true
 order by p.creado_en desc;
end; $function$
;

CREATE OR REPLACE FUNCTION public.chronicle_listar_usuarios_admin()
 RETURNS TABLE(user_id uuid, email text, es_admin boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null or not exists (select 1 from public.user_roles a where a.user_id = auth.uid() and a.role in ('creator','admin')) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, (a.role = 'admin')
    from auth.users u left join public.user_roles a on a.user_id = u.id
    where u.deleted_at is null and u.email is not null
    order by lower(u.email);
end; $function$
;

CREATE OR REPLACE FUNCTION public.chronicle_listar_usuarios_roles()
 RETURNS TABLE(user_id uuid, email text, display_name text, username text, rol text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT (
   EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.role IN ('creator','admin'))
 ) THEN
   RAISE EXCEPTION 'No autorizado' USING errcode='42501';
 END IF;
 RETURN QUERY
 SELECT u.id,u.email::text,p.display_name,p.username,
 COALESCE(r.role,'user')::text
 FROM auth.users u
 LEFT JOIN public.profiles p ON p.id=u.id
 LEFT JOIN public.user_roles r ON r.user_id=u.id
 WHERE u.deleted_at IS NULL
 ORDER BY lower(coalesce(u.email,p.username,u.id::text));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.chronicle_mi_rol()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT CASE WHEN auth.uid() IS NULL THEN NULL
 ELSE coalesce((SELECT role FROM public.user_roles WHERE user_id=auth.uid()),'user') END;
$function$
;

CREATE OR REPLACE FUNCTION public.chronicle_otorgar_administrador(p_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.user_roles r where r.user_id=auth.uid() and r.role='creator') then
    raise exception 'Solo la persona propietaria puede asignar administradores' using errcode='42501';
  end if;
  if p_email is null or length(trim(p_email))=0 then raise exception 'Ingresá un correo electrónico'; end if;
  select id into v_id from auth.users where lower(email)=lower(trim(p_email)) and deleted_at is null;
  if v_id is null then raise exception 'No existe un usuario registrado con ese correo'; end if;
  if exists(select 1 from public.user_roles where user_id=v_id and role='creator') then raise exception 'No se puede modificar el rol del creador' using errcode='42501'; end if;
  insert into public.user_roles(user_id,role,granted_by) values(v_id,'admin',auth.uid()) on conflict(user_id) do update set role='admin',granted_by=auth.uid(),granted_at=now() where public.user_roles.role is distinct from 'admin';
  return v_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.chronicle_rechazar_libro(p_libro_id uuid, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','creator')
  
 ) then raise exception 'Solo administradores pueden rechazar libros' using errcode='42501'; end if;
 if nullif(btrim(p_motivo),'') is null or length(btrim(p_motivo))>2000 then
  raise exception 'El motivo debe tener entre 1 y 2000 caracteres';
 end if;
 update public.libros set estado='rechazado',motivo_rechazo=btrim(p_motivo)
 where id=p_libro_id and estado='pendiente';
 if not found then raise exception 'El libro no está pendiente de aprobación'; end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.chronicle_rechazar_propuesta(p_propuesta_id uuid, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin if (select auth.uid()) is null or not exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','creator') ) then raise exception 'Solo administradores pueden rechazar propuestas' using errcode='42501'; end if; if nullif(btrim(p_motivo),'') is null or length(btrim(p_motivo))>2000 then raise exception 'El motivo debe tener entre 1 y 2000 caracteres'; end if; update public.propuestas set pendiente_aprobacion=false,motivo_resolucion=btrim(p_motivo),resuelto_por=(select auth.uid()),resuelto_en=now() where id=p_propuesta_id and estado='borrador' and tipo='libro_nuevo' and pendiente_aprobacion=true; if not found then raise exception 'La propuesta no está pendiente de aprobación'; end if; end $function$
;

CREATE OR REPLACE FUNCTION public.set_admin_role(p_user_id uuid, p_make_admin boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='creator')
 THEN RAISE EXCEPTION 'Solo el creador puede administrar roles' USING errcode='42501'; END IF;
 IF p_user_id IS NULL OR p_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user_id AND role='creator')
 THEN RAISE EXCEPTION 'No se puede modificar el rol del creador' USING errcode='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id AND deleted_at IS NULL)
 THEN RAISE EXCEPTION 'Usuario inexistente'; END IF;
 INSERT INTO public.user_roles(user_id,role,granted_by,granted_at)
 VALUES(p_user_id,CASE WHEN coalesce(p_make_admin,false) THEN 'admin' ELSE 'user' END,auth.uid(),now())
 ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,granted_by=excluded.granted_by,granted_at=now()
 WHERE public.user_roles.role IS DISTINCT FROM excluded.role;
END $function$
;
REVOKE ALL ON FUNCTION public.chronicle_mi_rol() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chronicle_mi_rol() TO authenticated;
