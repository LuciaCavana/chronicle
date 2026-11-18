-- Administración: la lista de usuarios devuelve también la foto de perfil.
-- Agrega avatar_url y avatar_source al resultado. Mismos permisos que antes:
-- solo usuarios autenticados pueden llamarla y adentro se exige rol
-- creator o admin.

begin;

drop function if exists public.chronicle_listar_usuarios_roles();

create function public.chronicle_listar_usuarios_roles()
returns table(
  user_id uuid,
  email text,
  display_name text,
  username text,
  rol text,
  avatar_url text,
  avatar_source text
)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null or not (
    exists(select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('creator','admin'))
  ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query
  select u.id, u.email::text, p.display_name, p.username,
         coalesce(r.role, 'user')::text,
         p.avatar_url::text, p.avatar_source::text
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_roles r on r.user_id = u.id
  where u.deleted_at is null
  order by lower(coalesce(u.email, p.username, u.id::text));
end;
$function$;

revoke all on function public.chronicle_listar_usuarios_roles() from public, anon;
grant execute on function public.chronicle_listar_usuarios_roles() to authenticated, service_role;

commit;
