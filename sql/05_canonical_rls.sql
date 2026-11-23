-- =============================================================================
-- JF SOLAR CLOUD — CANONICAL IDEMPOTENT SCHEMA HARDENING, RLS & STATS VIEW
-- =============================================================================
-- Script canónico único sobre las tablas reales que consume la aplicación:
--   • public.projects
--   • public.project_members (roles: 'admin' | 'observer')
--   • public.project_investments (investment_cop, capacity_added_kw, start_date)
--   • public.solar_readings (project_id obligatorio, inverter_reset, meter_reset)
--
-- NO crea ni migra hacia `solar_projects`.
-- Seguro para ejecutar de forma repetida (idempotente) en el SQL Editor de Supabase.
-- =============================================================================

-- ─── 1. COLUMNAS DE TELEMETRÍA Y CONSTRAINT DE PROYECTO ──────────────────────

ALTER TABLE public.solar_readings
  ADD COLUMN IF NOT EXISTS inverter_reset BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meter_reset BOOLEAN DEFAULT FALSE;

-- Índices para consultas agregadas y RLS
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_investments_project ON public.project_investments(project_id, start_date);
CREATE INDEX IF NOT EXISTS idx_solar_readings_project_fecha ON public.solar_readings(project_id, fecha);

-- ─── 2. ACTIVAR RLS EN TODAS LAS TABLAS ──────────────────────────────────────

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_readings ENABLE ROW LEVEL SECURITY;

-- ─── 3. HELPERS SECURITY DEFINER (EVITAN RECURSIÓN EN RLS) ──────────────────

CREATE OR REPLACE FUNCTION public.get_user_projects()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id
  FROM public.project_members
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_admin_projects()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id
  FROM public.project_members
  WHERE user_id = auth.uid() AND role = 'admin';
$$;

REVOKE ALL ON FUNCTION public.get_user_projects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_projects() TO authenticated;

REVOKE ALL ON FUNCTION public.get_admin_projects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_projects() TO authenticated;

-- ─── 4. RPC ÚNICA PARA INVITAR MIEMBROS POR CORREO ───────────────────────────

CREATE OR REPLACE FUNCTION public.add_project_member_by_email(
  p_project_id UUID,
  p_email TEXT,
  p_role TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_member_id UUID;
  v_owner_id UUID;
  v_caller_is_admin BOOLEAN := FALSE;
  v_clean_email TEXT;
BEGIN
  v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));

  IF v_clean_email = '' THEN
    RAISE EXCEPTION 'Correo electrónico inválido.';
  END IF;

  IF p_role NOT IN ('admin', 'observer') THEN
    RAISE EXCEPTION 'Rol inválido. Debe ser admin u observer.';
  END IF;

  -- Verificar que quien invoca sea owner del proyecto o miembro con rol admin
  SELECT owner_id INTO v_owner_id
  FROM public.projects
  WHERE id = p_project_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'No tienes permisos para administrar este proyecto.';
  END IF;

  IF v_owner_id = auth.uid() THEN
    v_caller_is_admin := TRUE;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.project_members
      WHERE project_id = p_project_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ) INTO v_caller_is_admin;
  END IF;

  IF NOT v_caller_is_admin THEN
    RAISE EXCEPTION 'No tienes permisos para administrar miembros de este proyecto.';
  END IF;

  -- Buscar usuario en auth.users sin exponer enumeración de correos en el mensaje
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = v_clean_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo completar la invitación. Verifica los datos ingresados.';
  END IF;

  INSERT INTO public.project_members (project_id, user_id, email, role)
  VALUES (p_project_id, v_user_id, v_clean_email, p_role)
  ON CONFLICT (project_id, user_id)
  DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email
  RETURNING id INTO v_member_id;

  RETURN json_build_object(
    'id', v_member_id,
    'user_id', v_user_id,
    'email', v_clean_email,
    'role', p_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_project_member_by_email(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_project_member_by_email(UUID, TEXT, TEXT) TO authenticated;

-- ─── 5. LÍMITE DE 20 PROYECTOS POR PROPIETARIO (TRIGGER EN SERVIDOR) ──────────

CREATE OR REPLACE FUNCTION public.enforce_max_projects_per_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NEW.owner_id IS NULL THEN
    RAISE EXCEPTION 'El proyecto debe tener un propietario válido.';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.projects
  WHERE owner_id = NEW.owner_id;

  IF v_count >= 20 THEN
    RAISE EXCEPTION 'Has alcanzado el límite máximo de 20 proyectos.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_projects ON public.projects;
CREATE TRIGGER trg_enforce_max_projects
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_projects_per_owner();

-- ─── 6. POLÍTICAS RLS CANÓNICAS ──────────────────────────────────────────────

-- 6.1 projects
DROP POLICY IF EXISTS "Users can view projects they belong to" ON public.projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can update" ON public.projects;
DROP POLICY IF EXISTS "Project owners can delete" ON public.projects;

CREATE POLICY "Users can view projects they belong to" ON public.projects
  FOR SELECT USING (
    owner_id = auth.uid()
    OR id IN (SELECT public.get_user_projects())
  );

CREATE POLICY "Owners can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
  );

CREATE POLICY "Project owners can update" ON public.projects
  FOR UPDATE USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Project owners can delete" ON public.projects
  FOR DELETE USING (owner_id = auth.uid());

-- 6.2 project_members
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can insert members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.project_members;

CREATE POLICY "Members can view project members" ON public.project_members
  FOR SELECT USING (
    project_id IN (SELECT public.get_user_projects())
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Admins can insert members" ON public.project_members
  FOR INSERT WITH CHECK (
    project_id IN (SELECT public.get_admin_projects())
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Admins can update members" ON public.project_members
  FOR UPDATE USING (
    project_id IN (SELECT public.get_admin_projects())
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT public.get_admin_projects())
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Admins can delete members" ON public.project_members
  FOR DELETE USING (
    project_id IN (SELECT public.get_admin_projects())
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

-- 6.3 project_investments
DROP POLICY IF EXISTS "Members can view investments" ON public.project_investments;
DROP POLICY IF EXISTS "Admins can insert investments" ON public.project_investments;
DROP POLICY IF EXISTS "Admins can update investments" ON public.project_investments;
DROP POLICY IF EXISTS "Admins can delete investments" ON public.project_investments;

CREATE POLICY "Members can view investments" ON public.project_investments
  FOR SELECT USING (
    project_id IN (SELECT public.get_user_projects())
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Admins can insert investments" ON public.project_investments
  FOR INSERT WITH CHECK (
    project_id IN (SELECT public.get_admin_projects())
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Admins can update investments" ON public.project_investments
  FOR UPDATE USING (
    project_id IN (SELECT public.get_admin_projects())
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT public.get_admin_projects())
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Admins can delete investments" ON public.project_investments
  FOR DELETE USING (
    project_id IN (SELECT public.get_admin_projects())
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

-- 6.4 solar_readings (project_id obligatorio, sin rama project_id IS NULL)
DROP POLICY IF EXISTS "Members can view project readings" ON public.solar_readings;
DROP POLICY IF EXISTS "Admins can insert project readings" ON public.solar_readings;
DROP POLICY IF EXISTS "Admins can update project readings" ON public.solar_readings;
DROP POLICY IF EXISTS "Admins can delete project readings" ON public.solar_readings;

CREATE POLICY "Members can view project readings" ON public.solar_readings
  FOR SELECT USING (
    project_id IS NOT NULL AND (
      project_id IN (SELECT public.get_user_projects())
      OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Admins can insert project readings" ON public.solar_readings
  FOR INSERT WITH CHECK (
    project_id IS NOT NULL AND (
      project_id IN (SELECT public.get_admin_projects())
      OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Admins can update project readings" ON public.solar_readings
  FOR UPDATE USING (
    project_id IS NOT NULL AND (
      project_id IN (SELECT public.get_admin_projects())
      OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
    )
  )
  WITH CHECK (
    project_id IS NOT NULL AND (
      project_id IN (SELECT public.get_admin_projects())
      OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Admins can delete project readings" ON public.solar_readings
  FOR DELETE USING (
    project_id IS NOT NULL AND (
      project_id IN (SELECT public.get_admin_projects())
      OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
    )
  );

-- ─── 7. VISTA AGREGADA DE PORTAFOLIO (EVITA BAJAR TELEMETRÍA EN SELECTOR) ─────

CREATE OR REPLACE VIEW public.project_portfolio_stats
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,
  COALESCE(inv.investment_count, 0)::INT AS investment_count,
  COALESCE(inv.total_invested, 0)::NUMERIC AS total_invested,
  COALESCE(rd.reading_count, 0)::INT AS reading_count,
  rd.last_reading_date
FROM public.projects p
LEFT JOIN (
  SELECT
    project_id,
    COUNT(*) AS investment_count,
    SUM(COALESCE(investment_cop, 0)) AS total_invested
  FROM public.project_investments
  GROUP BY project_id
) inv ON inv.project_id = p.id
LEFT JOIN (
  SELECT
    project_id,
    COUNT(*) AS reading_count,
    MAX(fecha) AS last_reading_date
  FROM public.solar_readings
  WHERE project_id IS NOT NULL
  GROUP BY project_id
) rd ON rd.project_id = p.id;

GRANT SELECT ON public.project_portfolio_stats TO authenticated;
