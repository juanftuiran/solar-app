-- ============================================================================
-- JF Solar Cloud — Security Hardening & Solar Telemetry Enhancements (v3.5)
-- Run this in the Supabase SQL Editor
-- ============================================================================

-- 1. Agregar soporte para reinicio de medidor de red (cambio de equipo por operador)
ALTER TABLE public.solar_readings 
  ADD COLUMN IF NOT EXISTS meter_reset BOOLEAN DEFAULT FALSE;

-- 2. Actualizar función RPC para agregar miembros:
-- Permite que tanto el Propietario (owner_id) como administradores delegados (role = 'admin') puedan invitar usuarios
CREATE OR REPLACE FUNCTION add_project_member_by_email(p_project_id UUID, p_email TEXT, p_role TEXT)
RETURNS json
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_member_id UUID;
  v_owner_id UUID;
  v_caller_is_admin BOOLEAN := FALSE;
BEGIN
  -- 1. Validar rol solicitado
  IF p_role NOT IN ('admin', 'observer') THEN
    RAISE EXCEPTION 'Rol inválido. Debe ser admin u observer.';
  END IF;

  -- 2. Verificar permisos del usuario que invoca (owner o miembro admin)
  SELECT owner_id INTO v_owner_id FROM public.projects WHERE id = p_project_id;
  
  IF v_owner_id = auth.uid() THEN
    v_caller_is_admin := TRUE;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'admin'
    ) INTO v_caller_is_admin;
  END IF;

  IF NOT v_caller_is_admin THEN
    RAISE EXCEPTION 'No tienes permisos de administrador para agregar miembros a este proyecto.';
  END IF;

  -- 3. Buscar el user_id del miembro en auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(TRIM(p_email));
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario con correo % no encontrado. Debe registrarse primero en la plataforma.', p_email;
  END IF;

  -- 4. Evitar duplicados (actualizar rol si ya existe)
  INSERT INTO public.project_members (project_id, user_id, email, role)
  VALUES (p_project_id, v_user_id, LOWER(TRIM(p_email)), p_role)
  ON CONFLICT (project_id, user_id) 
  DO UPDATE SET role = EXCLUDED.role
  RETURNING id INTO v_member_id;

  RETURN json_build_object('id', v_member_id, 'user_id', v_user_id, 'email', p_email, 'role', p_role);
END;
$$ LANGUAGE plpgsql;

-- 3. Endurecer RLS en solar_readings (prohibir lecturas sin project_id)
DROP POLICY IF EXISTS "Members can view project readings" ON solar_readings;
DROP POLICY IF EXISTS "Admins can insert project readings" ON solar_readings;
DROP POLICY IF EXISTS "Admins can update project readings" ON solar_readings;
DROP POLICY IF EXISTS "Admins can delete project readings" ON solar_readings;

CREATE POLICY "Members can view project readings" ON solar_readings
  FOR SELECT USING (
    project_id IN (SELECT get_user_projects())
    OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Admins can insert project readings" ON solar_readings
  FOR INSERT WITH CHECK (
    project_id IS NOT NULL AND (
      project_id IN (SELECT get_admin_projects())
      OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Admins can update project readings" ON solar_readings
  FOR UPDATE USING (
    project_id IS NOT NULL AND (
      project_id IN (SELECT get_admin_projects())
      OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Admins can delete project readings" ON solar_readings
  FOR DELETE USING (
    project_id IS NOT NULL AND (
      project_id IN (SELECT get_admin_projects())
      OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    )
  );
