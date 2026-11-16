-- Chronicle · Prioridad 1 (seguridad y estabilidad) · 2026-11-16
-- 1) Bloquea crear libros ya publicados o versiones nuevas en libros no pendientes.
-- 2) Protege columnas administrativas de propuestas frente a updates directos.
-- 3) Impide modificar contenido mientras un borrador está pendiente de aprobación.
-- 4) Verifica en la aprobación que la copia publicada pertenezca al autor del borrador.
-- 5) Guardado atómico de libros pendientes (libros + libro_versiones en una transacción).
-- 6) user_roles: cada usuario sólo ve su propia fila.
-- 7) Permisos de ejecución mínimos para funciones (sin anon, trigger no invocable).

-- 1) libros / libro_versiones -------------------------------------------------
drop policy if exists "Crear libros propios" on public.libros;
create policy "Crear libros propios" on public.libros
  for insert to authenticated
  with check (
    creado_por = (select auth.uid())
    and estado = 'pendiente'
    and motivo_rechazo is null
  );

drop policy if exists "Crear versiones propias" on public.libro_versiones;
create policy "Crear versiones propias" on public.libro_versiones
  for insert to authenticated
  with check (
    exists (
      select 1 from public.libros l
      where l.id = libro_versiones.libro_id
        and l.creado_por = (select auth.uid())
        and l.estado = 'pendiente'
    )
  );

-- 2) y 3) propuestas: columnas protegidas ------------------------------------
create or replace function private.proteger_propuestas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Las RPC SECURITY DEFINER corren como su propietario: sólo se controla
  -- el acceso directo desde la API (roles anon / authenticated).
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if (new.id, new.tipo, new.autor_id, new.libro_id, new.version_base_id,
      new.version_traduccion_origen_id, new.revision_resultante_id,
      new.creado_en, new.enviado_en, new.resuelto_en, new.resuelto_por,
      new.motivo_resolucion)
     is distinct from
     (old.id, old.tipo, old.autor_id, old.libro_id, old.version_base_id,
      old.version_traduccion_origen_id, old.revision_resultante_id,
      old.creado_en, old.enviado_en, old.resuelto_en, old.resuelto_por,
      old.motivo_resolucion) then
    raise exception 'No se pueden modificar campos administrativos de la propuesta'
      using errcode = '42501';
  end if;

  if new.row_version not in (old.row_version, old.row_version + 1) then
    raise exception 'Versión de borrador inválida' using errcode = '40001';
  end if;

  -- Mientras está (o queda) pendiente de aprobación, el contenido es inmutable.
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
$$;

revoke all on function private.proteger_propuestas() from public, anon, authenticated;

drop trigger if exists chronicle_proteger_propuestas on public.propuestas;
create trigger chronicle_proteger_propuestas
  before update on public.propuestas
  for each row execute function private.proteger_propuestas();

-- 4) aprobación: la copia publicada debe ser del mismo autor ----------------
create or replace function public.chronicle_aprobar_propuesta(p_propuesta_id uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v public.propuestas%rowtype; v_libro uuid; v_version uuid;
v_especies jsonb; v_conjuros jsonb; v_clases jsonb; v_subclases jsonb; v_objetos jsonb;
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','creator') union all select 1 from public.chronicle_admins where user_id=(select auth.uid())
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
$function$;

-- 5) guardado atómico de un libro pendiente propio ---------------------------
create or replace function public.chronicle_actualizar_libro_pendiente(
  p_libro_id uuid,
  p_version_id uuid,
  p_codigo text,
  p_edicion text,
  p_editorial text,
  p_clasificacion text,
  p_idioma text,
  p_titulo text,
  p_descripcion text,
  p_categorias text[],
  p_especies jsonb,
  p_conjuros jsonb,
  p_clases jsonb,
  p_subclases jsonb,
  p_objetos jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Tenés que iniciar sesión' using errcode = '42501';
  end if;
  if nullif(btrim(p_titulo), '') is null or nullif(btrim(p_clasificacion), '') is null then
    raise exception 'Título y clasificación son obligatorios';
  end if;
  if jsonb_typeof(coalesce(p_especies, 'null')) <> 'array'
     or jsonb_typeof(coalesce(p_conjuros, 'null')) <> 'array'
     or jsonb_typeof(coalesce(p_clases, 'null')) <> 'array'
     or jsonb_typeof(coalesce(p_subclases, 'null')) <> 'array'
     or jsonb_typeof(coalesce(p_objetos, 'null')) <> 'array' then
    raise exception 'El contenido del libro debe estar formado por listas';
  end if;

  perform 1 from public.libros l
   where l.id = p_libro_id
     and l.creado_por = (select auth.uid())
     and l.estado = 'pendiente'
   for update;
  if not found then
    raise exception 'No se encontró una propuesta editable' using errcode = '42501';
  end if;

  update public.libros
     set codigo = p_codigo, edicion = p_edicion, editorial = p_editorial,
         clasificacion = p_clasificacion
   where id = p_libro_id;

  update public.libro_versiones
     set idioma = p_idioma, titulo = p_titulo, descripcion = coalesce(p_descripcion, ''),
         categorias = coalesce(p_categorias, array[]::text[]),
         especies = p_especies, conjuros = p_conjuros, clases = p_clases,
         subclases = p_subclases, objetos = p_objetos
   where id = p_version_id and libro_id = p_libro_id;
  if not found then
    raise exception 'No se encontró la versión del libro';
  end if;

  return p_libro_id;
end;
$$;

-- 6) user_roles: sólo la propia fila ------------------------------------------
drop policy if exists "Roles visible to signed-in users" on public.user_roles;
create policy "Cada usuario ve su propio rol" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 7) permisos de ejecución ----------------------------------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.proname = 'chronicle_versionar_propuesta' then
      execute format('revoke execute on function %s from authenticated', f.sig);
    elsif f.proname not in ('realizar_descanso_recursos', 'recuperar_dados_golpe_descanso_largo') then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end $$;

-- Funciones futuras: sin ejecución para PUBLIC (global) ni anon (public);
-- authenticated conserva su permiso por defecto en public.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon;

-- TRUNCATE no respeta RLS: nadie desde la API debe tenerlo.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
