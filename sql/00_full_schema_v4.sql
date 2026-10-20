-- =============================================================================
-- JF SOLAR ENTERPRISE v4.0 — CONSOLIDATED IDEMPOTENT SCHEMA & RLS
-- =============================================================================
-- Safe to run on both fresh Supabase databases and existing v2/v3 installations.
-- Consolidates:
--   1. Core Multi-Project Tables (solar_projects, project_members, project_investments)
--   2. Telemetry Log Table (solar_readings) with Hardware Reset Flags
--   3. SECURITY DEFINER RBAC Helper Functions (preventing RLS recursion)
--   4. RPC `add_project_member_by_email` for team collaboration
--   5. Hardened Row-Level Security (RLS) Policies & Indexes
-- =============================================================================

-- ─── 1. CORE TABLES ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.solar_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  currency TEXT DEFAULT 'COP',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.solar_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.project_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.solar_projects(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  cost NUMERIC NOT NULL DEFAULT 0,
  installed_capacity_kwp NUMERIC DEFAULT 0,
  execution_date DATE NOT NULL,
  sort_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.solar_readings (
  id TEXT PRIMARY KEY,
  project_id UUID REFERENCES public.solar_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha DATE NOT NULL,
  lectura_red NUMERIC NOT NULL DEFAULT 0,
  lectura_solar NUMERIC NOT NULL DEFAULT 0,
  precio_kwh NUMERIC NOT NULL DEFAULT 0,
  inverter_reset BOOLEAN DEFAULT FALSE,
  meter_reset BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist on legacy solar_readings tables
ALTER TABLE public.solar_readings
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.solar_projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inverter_reset BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meter_reset BOOLEAN DEFAULT FALSE;

-- ─── 2. PERFORMANCE INDEXES ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_solar_projects_owner ON public.solar_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_investments_project ON public.project_investments(project_id, execution_date);
CREATE INDEX IF NOT EXISTS idx_solar_readings_project_fecha ON public.solar_readings(project_id, fecha);

-- ─── 3. ENABLE ROW LEVEL SECURITY ────────────────────────────────────────────

ALTER TABLE public.solar_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_readings ENABLE ROW LEVEL SECURITY;

-- ─── 4. SECURITY DEFINER RBAC HELPERS (NO RLS RECURSION) ─────────────────────

CREATE OR REPLACE FUNCTION public.is_project_member(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.solar_projects
    WHERE id = p_id AND owner_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_project_role(p_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id
      AND user_id = auth.uid()
      AND role = ANY(allowed_roles)
  ) OR (
    'owner' = ANY(allowed_roles) AND EXISTS (
      SELECT 1 FROM public.solar_projects
      WHERE id = p_id AND owner_id = auth.uid()
    )
  );
END;
$$;

-- ─── 5. TEAM INVITATION RPC BY EMAIL ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_project_member_by_email(
  p_project_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'viewer'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id UUID;
  v_existing_id UUID;
BEGIN
  IF NOT public.has_project_role(p_project_id, ARRAY['owner']) THEN
    RETURN json_build_object('error', 'Solo el propietario del proyecto puede invitar miembros.');
  END IF;

  SELECT id INTO v_target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(p_email))
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RETURN json_build_object('error', 'No existe un usuario registrado con ese correo electrónico.');
  END IF;

  SELECT id INTO v_existing_id
  FROM public.project_members
  WHERE project_id = p_project_id AND user_id = v_target_user_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN json_build_object('error', 'El usuario ya es miembro de este proyecto.');
  END IF;

  INSERT INTO public.project_members (project_id, user_id, role, invited_email)
  VALUES (p_project_id, v_target_user_id, p_role, LOWER(TRIM(p_email)));

  RETURN json_build_object('success', true, 'user_id', v_target_user_id);
END;
$$;

-- ─── 6. HARDENED RLS POLICIES ────────────────────────────────────────────────

-- Clean legacy & previous policies first for idempotency
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('solar_projects', 'project_members', 'project_investments', 'solar_readings')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 6.1 solar_projects
CREATE POLICY "projects_select" ON public.solar_projects
  FOR SELECT USING (auth.uid() = owner_id OR public.is_project_member(id));

CREATE POLICY "projects_insert" ON public.solar_projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "projects_update" ON public.solar_projects
  FOR UPDATE USING (public.has_project_role(id, ARRAY['owner', 'editor']));

CREATE POLICY "projects_delete" ON public.solar_projects
  FOR DELETE USING (auth.uid() = owner_id);

-- 6.2 project_members
CREATE POLICY "members_select" ON public.project_members
  FOR SELECT USING (public.is_project_member(project_id));

CREATE POLICY "members_insert" ON public.project_members
  FOR INSERT WITH CHECK (
    public.has_project_role(project_id, ARRAY['owner'])
    OR (auth.uid() = user_id AND role = 'owner')
  );

CREATE POLICY "members_update" ON public.project_members
  FOR UPDATE USING (public.has_project_role(project_id, ARRAY['owner']));

CREATE POLICY "members_delete" ON public.project_members
  FOR DELETE USING (public.has_project_role(project_id, ARRAY['owner']) OR auth.uid() = user_id);

-- 6.3 project_investments
CREATE POLICY "investments_select" ON public.project_investments
  FOR SELECT USING (public.is_project_member(project_id));

CREATE POLICY "investments_insert" ON public.project_investments
  FOR INSERT WITH CHECK (public.has_project_role(project_id, ARRAY['owner', 'editor']));

CREATE POLICY "investments_update" ON public.project_investments
  FOR UPDATE USING (public.has_project_role(project_id, ARRAY['owner', 'editor']));

CREATE POLICY "investments_delete" ON public.project_investments
  FOR DELETE USING (public.has_project_role(project_id, ARRAY['owner', 'editor']));

-- 6.4 solar_readings
CREATE POLICY "readings_select" ON public.solar_readings
  FOR SELECT USING (public.is_project_member(project_id));

CREATE POLICY "readings_insert" ON public.solar_readings
  FOR INSERT WITH CHECK (public.has_project_role(project_id, ARRAY['owner', 'editor']));

CREATE POLICY "readings_update" ON public.solar_readings
  FOR UPDATE USING (public.has_project_role(project_id, ARRAY['owner', 'editor']));

CREATE POLICY "readings_delete" ON public.solar_readings
  FOR DELETE USING (public.has_project_role(project_id, ARRAY['owner', 'editor']));
