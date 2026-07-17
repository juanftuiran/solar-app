-- Función segura para agregar miembros buscando su user_id por email.
-- Debes ejecutar esto en el SQL Editor de Supabase.

CREATE OR REPLACE FUNCTION add_project_member_by_email(p_project_id UUID, p_email TEXT, p_role TEXT)
RETURNS json
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_member_id UUID;
  v_owner_id UUID;
BEGIN
  -- Verificar que el usuario que ejecuta esto es el dueño del proyecto
  SELECT owner_id INTO v_owner_id FROM public.projects WHERE id = p_project_id;
  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'No tienes permisos para agregar miembros a este proyecto.';
  END IF;

  -- Buscar el user_id del miembro en auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado en la base de datos.';
  END IF;

  -- Insertar el miembro
  INSERT INTO public.project_members (project_id, user_id, email, role)
  VALUES (p_project_id, v_user_id, p_email, p_role)
  RETURNING id INTO v_member_id;

  RETURN json_build_object('id', v_member_id, 'user_id', v_user_id, 'email', p_email, 'role', p_role);
END;
$$ LANGUAGE plpgsql;
