-- Capítulos del libro: texto corrido (párrafos, títulos, recuadros, tablas…) que además ubica
-- las fichas. Se guardan como una categoría más, "capitulos", en contenido / contenido_extra,
-- así el borrador, el envío, la comparación, la aprobación parcial y las correcciones
-- funcionan igual que con dotes o trasfondos (cada capítulo es un elemento con id).
--
-- Las funciones tienen la lista de categorías escrita a mano; esta migración agrega
-- "capitulos" en cada lugar. Cada reemplazo verifica cuántas veces se aplicó, así un cambio
-- previo en una función hace fallar la migración en lugar de dejarla a medias.

create or replace function pg_temp.reemplazar(p_def text, p_buscar text, p_poner text, p_veces integer)
 returns text language plpgsql as $$
declare v_n integer := (length(p_def) - length(replace(p_def, p_buscar, ''))) / length(p_buscar);
begin
 if v_n <> p_veces then
   raise exception 'Se esperaban % apariciones de «%» y hay %', p_veces, p_buscar, v_n;
 end if;
 return replace(p_def, p_buscar, p_poner);
end $$;

do $migracion$
declare d text;
begin
 -- Listas de categorías.
 d := pg_get_functiondef('public.chronicle_actualizar_base_borrador(uuid)'::regprocedure);
 d := pg_temp.reemplazar(d, $q$'caracteristicas'];$q$, $q$'caracteristicas','capitulos'];$q$, 1);
 d := pg_temp.reemplazar(d, $q$'caracteristicas',b#>'{contenido_extra,caracteristicas}')$q$,
   $q$'caracteristicas',b#>'{contenido_extra,caracteristicas}','capitulos',b#>'{contenido_extra,capitulos}')$q$, 1);
 d := pg_temp.reemplazar(d, $q$'caracteristicas',v.contenido_extra->'caracteristicas')$q$,
   $q$'caracteristicas',v.contenido_extra->'caracteristicas','capitulos',v.contenido_extra->'capitulos')$q$, 1);
 execute d;

 d := pg_get_functiondef('private.chronicle_alinear_ids(jsonb,jsonb)'::regprocedure);
 d := pg_temp.reemplazar(d, $q$'caracteristicas'] loop$q$, $q$'caracteristicas','capitulos'] loop$q$, 1);
 -- Los capítulos no tienen nombre: se emparejan por título.
 d := pg_temp.reemplazar(d, $q$coalesce(nullif(e->>'nombre',''), e->>'codigo')$q$, $q$coalesce(nullif(e->>'nombre',''), nullif(e->>'codigo',''), e->>'titulo')$q$, 1);
 d := pg_temp.reemplazar(d, $q$coalesce(nullif(x->>'nombre',''), x->>'codigo')$q$, $q$coalesce(nullif(x->>'nombre',''), nullif(x->>'codigo',''), x->>'titulo')$q$, 1);
 execute d;

 d := pg_get_functiondef('public.chronicle_aplicar_decisiones(uuid,jsonb,jsonb)'::regprocedure);
 d := pg_temp.reemplazar(d, $q$'caracteristicas'];$q$, $q$'caracteristicas','capitulos'];$q$, 1);
 execute d;

 d := pg_get_functiondef('public.chronicle_calcular_cambios(uuid)'::regprocedure);
 d := pg_temp.reemplazar(d, $q$'caracteristicas',coalesce(lv.contenido_extra->'caracteristicas','[]'::jsonb));$q$,
   $q$'caracteristicas',coalesce(lv.contenido_extra->'caracteristicas','[]'::jsonb),'capitulos',coalesce(lv.contenido_extra->'capitulos','[]'::jsonb));$q$, 1);
 d := pg_temp.reemplazar(d, $q$'caracteristicas'] loop$q$, $q$'caracteristicas','capitulos'] loop$q$, 1);
 execute d;

 d := pg_get_functiondef('public.chronicle_tratar_como_correccion(uuid,uuid)'::regprocedure);
 d := pg_temp.reemplazar(d, $q$'caracteristicas',coalesce(lv.contenido_extra->'caracteristicas','[]'::jsonb));$q$,
   $q$'caracteristicas',coalesce(lv.contenido_extra->'caracteristicas','[]'::jsonb),'capitulos',coalesce(lv.contenido_extra->'capitulos','[]'::jsonb));$q$, 1);
 execute d;

 d := pg_get_functiondef('public.chronicle_guardar_borrador_elementos(uuid,jsonb,jsonb)'::regprocedure);
 d := pg_temp.reemplazar(d, $q$'caracteristicas'] loop$q$, $q$'caracteristicas','capitulos'] loop$q$, 1);
 execute d;

 d := pg_get_functiondef('public.chronicle_crear_propuesta_correccion(uuid,uuid)'::regprocedure);
 d := pg_temp.reemplazar(d, $q$'caracteristicas',coalesce(v_version.contenido_extra->'caracteristicas','[]'::jsonb)$q$,
   $q$'caracteristicas',coalesce(v_version.contenido_extra->'caracteristicas','[]'::jsonb),'capitulos',coalesce(v_version.contenido_extra->'capitulos','[]'::jsonb)$q$, 1);
 execute d;

 -- Aprobación: los capítulos se publican en contenido_extra, filtrados por categoría como el resto.
 d := pg_get_functiondef('public.chronicle_aprobar_propuesta(uuid,jsonb,text)'::regprocedure);
 d := pg_temp.reemplazar(d, $q$'caracteristicas',coalesce(v.contenido->'caracteristicas','[]'::jsonb)$q$,
   $q$'caracteristicas',coalesce(v.contenido->'caracteristicas','[]'::jsonb),
   'capitulos',coalesce(v.contenido->'capitulos','[]'::jsonb)$q$, 1);
 d := pg_temp.reemplazar(d, $q$or jsonb_typeof(v_extra->'caracteristicas')<>'array' then$q$,
   $q$or jsonb_typeof(v_extra->'caracteristicas')<>'array'
 or jsonb_typeof(v_extra->'capitulos')<>'array' then$q$, 1);
 d := pg_temp.reemplazar(d, $q$'caracteristicas',case when 'caracteristicas'=any(coalesce(v.categorias,array[]::text[])) then v_extra->'caracteristicas' else '[]'::jsonb end$q$,
   $q$'caracteristicas',case when 'caracteristicas'=any(coalesce(v.categorias,array[]::text[])) then v_extra->'caracteristicas' else '[]'::jsonb end,
 'capitulos',case when 'capitulos'=any(coalesce(v.categorias,array[]::text[])) then v_extra->'capitulos' else '[]'::jsonb end$q$, 1);
 d := pg_temp.reemplazar(d, $q$'caracteristicas',v_r->'caracteristicas')$q$, $q$'caracteristicas',v_r->'caracteristicas','capitulos',v_r->'capitulos')$q$, 2);
 execute d;
end
$migracion$;
