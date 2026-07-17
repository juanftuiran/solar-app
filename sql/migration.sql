-- ============================================================================
-- JF Solar Cloud — Multi-Project Migration Script
-- Run this in Supabase SQL Editor BEFORE using the updated app
-- ============================================================================

-- 1. Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  location TEXT,
  capacity_kw DECIMAL(10,2),
  panel_count INTEGER,
  inverter_model TEXT,
  monitoring_url TEXT,
  owner_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create project_members table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'observer' CHECK (role IN ('admin','observer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- 3. Create project_investments table (investment phases)
CREATE TABLE IF NOT EXISTS project_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  description TEXT,
  investment_cop DECIMAL(15,2) NOT NULL DEFAULT 0,
  capacity_added_kw DECIMAL(10,2) DEFAULT 0,
  panels_added INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add project_id to solar_readings (if column doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solar_readings' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE solar_readings ADD COLUMN project_id UUID REFERENCES projects(id);
  END IF;
END $$;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_solar_readings_project ON solar_readings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_investments_project ON project_investments(project_id);

-- 6. Enable RLS on new tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_investments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for projects
CREATE POLICY "Users can view projects they belong to" ON projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Admins can insert projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Project owners can update" ON projects
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Project owners can delete" ON projects
  FOR DELETE USING (owner_id = auth.uid());

-- 8. RLS Policies for project_members
CREATE POLICY "Members can view project members" ON project_members
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage members" ON project_members
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 9. RLS Policies for project_investments
CREATE POLICY "Members can view investments" ON project_investments
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage investments" ON project_investments
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 10. Update solar_readings RLS to include project scope
-- (Keep existing policies, add project-aware ones)
CREATE POLICY "Members can view project readings" ON solar_readings
  FOR SELECT USING (
    project_id IS NULL
    OR project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );
