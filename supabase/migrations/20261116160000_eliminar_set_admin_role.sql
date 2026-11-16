-- Se conserva chronicle_cambiar_rol_usuario(uuid, text) como unico punto de cambio de roles.
-- El historial permanece en el trigger de public.user_roles.
DROP FUNCTION IF EXISTS public.set_admin_role(uuid, boolean);
