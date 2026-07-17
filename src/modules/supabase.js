/**
 * @module supabase
 * Supabase client and all database query functions for the solar monitoring app.
 * Every table interaction is centralised here so the rest of the app
 * never touches Supabase directly.
 */

import { createClient } from '@supabase/supabase-js';

/** @type {import('@supabase/supabase-js').SupabaseClient} */
export const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://qoauvsouetyuqqplbfak.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gPLFAn4uk3YzcbPiMbBPYA_bGRvncMz',
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: Object|null, error: Object|null }>}
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error };
    return { user: data.user, error: null };
  } catch (err) {
    console.error('[supabase] signIn error:', err);
    return { user: null, error: err };
  }
}

/**
 * Sign out the current user.
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    await sb.auth.signOut();
  } catch (err) {
    console.error('[supabase] signOut error:', err);
  }
}

/**
 * Retrieve the current auth session.
 * @returns {Promise<Object|null>} Session object or null
 */
export async function getSession() {
  try {
    const { data } = await sb.auth.getSession();
    return data?.session ?? null;
  } catch (err) {
    console.error('[supabase] getSession error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// User roles
// ---------------------------------------------------------------------------

/**
 * Look up the global role for a user by email (from `user_roles` table).
 * @param {string} email
 * @returns {Promise<'admin'|'observer'|null>}
 */
export async function getUserRole(email) {
  try {
    const { data, error } = await sb
      .from('user_roles')
      .select('role')
      .eq('email', email)
      .single();
    if (error) return null;
    return data?.role ?? null;
  } catch (err) {
    console.error('[supabase] getUserRole error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Projects CRUD
// ---------------------------------------------------------------------------

/**
 * Get all projects accessible to the given user.
 * Admins receive ALL projects; non-admins only those linked via `project_members`.
 * @param {string} userId - Auth user id
 * @returns {Promise<Array<Object>>}
 */
export async function getUserProjects(userId) {
  try {
    // First try fetching all projects (admin path)
    const { data: allProjects, error: projError } = await sb
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projError) {
      // Table may not exist yet – graceful fallback
      console.warn('[supabase] getUserProjects – projects table error:', projError.message);
      return [];
    }

    // Check if the user is the owner of any project (admin shortcut)
    const isOwner = allProjects.some((p) => p.owner_id === userId);
    if (isOwner) return allProjects;

    // Non-owner path: filter through project_members
    const { data: memberships, error: memError } = await sb
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);

    if (memError) {
      console.warn('[supabase] getUserProjects – project_members error:', memError.message);
      return [];
    }

    const memberProjectIds = new Set((memberships || []).map((m) => m.project_id));
    return allProjects.filter((p) => memberProjectIds.has(p.id));
  } catch (err) {
    console.error('[supabase] getUserProjects error:', err);
    return [];
  }
}

/**
 * Fetch a single project by its id.
 * @param {string} projectId
 * @returns {Promise<Object|null>}
 */
export async function getProject(projectId) {
  try {
    const { data, error } = await sb
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    if (error) return null;
    return data;
  } catch (err) {
    console.error('[supabase] getProject error:', err);
    return null;
  }
}

/**
 * Create a new project and add the owner as an admin member.
 * @param {Object} projectData
 * @param {string} projectData.name
 * @param {string} projectData.slug
 * @param {string} [projectData.description]
 * @param {string} [projectData.location]
 * @param {number} [projectData.capacity_kw]
 * @param {number} [projectData.panel_count]
 * @param {string} [projectData.inverter_model]
 * @param {string} [projectData.monitoring_url]
 * @param {string} projectData.owner_id
 * @returns {Promise<Object|null>} The created project or null
 */
export async function createProject(projectData) {
  try {
    const { data, error } = await sb
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (error) {
      console.error('[supabase] createProject error:', error);
      return null;
    }

    // Also create a project_members entry for the owner as admin
    await sb.from('project_members').insert({
      project_id: data.id,
      user_id: projectData.owner_id,
      role: 'admin',
    });

    return data;
  } catch (err) {
    console.error('[supabase] createProject error:', err);
    return null;
  }
}

/**
 * Update an existing project.
 * @param {string} projectId
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated project or null
 */
export async function updateProject(projectId, updates) {
  try {
    const { data, error } = await sb
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();
    if (error) {
      console.error('[supabase] updateProject error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[supabase] updateProject error:', err);
    return null;
  }
}

/**
 * Delete a project by id.
 * @param {string} projectId
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteProject(projectId) {
  try {
    const { error } = await sb.from('projects').delete().eq('id', projectId);
    if (error) {
      console.error('[supabase] deleteProject error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[supabase] deleteProject error:', err);
    return false;
  }
}

/**
 * Get the total number of projects (for enforcing the 20-project limit).
 * @returns {Promise<number>}
 */
export async function getProjectCount() {
  try {
    const { count, error } = await sb
      .from('projects')
      .select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count ?? 0;
  } catch (err) {
    console.error('[supabase] getProjectCount error:', err);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Project Members
// ---------------------------------------------------------------------------

/**
 * Get all members of a project.
 * @param {string} projectId
 * @returns {Promise<Array<Object>>}
 */
export async function getProjectMembers(projectId) {
  try {
    const { data, error } = await sb
      .from('project_members')
      .select('*')
      .eq('project_id', projectId);
    if (error) {
      console.warn('[supabase] getProjectMembers error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[supabase] getProjectMembers error:', err);
    return [];
  }
}

/**
 * Add a member to a project by email.
 * @param {string} projectId
 * @param {string} email - Member email
 * @param {string} role - 'admin' or 'observer'
 * @returns {Promise<Object|null>} Created membership or null
 */
export async function addProjectMember(projectId, email, role) {
  try {
    const insertData = { project_id: projectId, email, role };

    // Attempt to resolve user_id from auth users via email lookup.
    // If the lookup fails (e.g. permissions), we still store the email.
    const { data: users } = await sb
      .from('user_roles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (users?.user_id) {
      insertData.user_id = users.user_id;
    }

    const { data, error } = await sb
      .from('project_members')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[supabase] addProjectMember error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[supabase] addProjectMember error:', err);
    return null;
  }
}

/**
 * Remove a project member by membership id.
 * @param {string} memberId
 * @returns {Promise<boolean>}
 */
export async function removeProjectMember(memberId) {
  try {
    const { error } = await sb.from('project_members').delete().eq('id', memberId);
    if (error) {
      console.error('[supabase] removeProjectMember error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[supabase] removeProjectMember error:', err);
    return false;
  }
}

/**
 * Update a member's role.
 * @param {string} memberId
 * @param {string} newRole - 'admin' or 'observer'
 * @returns {Promise<boolean>}
 */
export async function updateMemberRole(memberId, newRole) {
  try {
    const { error } = await sb
      .from('project_members')
      .update({ role: newRole })
      .eq('id', memberId);
    if (error) {
      console.error('[supabase] updateMemberRole error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[supabase] updateMemberRole error:', err);
    return false;
  }
}

/**
 * Get a specific user's role within a project.
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<string|null>} 'admin', 'observer', or null
 */
export async function getUserProjectRole(projectId, userId) {
  try {
    const { data, error } = await sb
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data?.role ?? null;
  } catch (err) {
    console.error('[supabase] getUserProjectRole error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Project Investments (phases)
// ---------------------------------------------------------------------------

/**
 * Get all investment phases for a project, ordered by start date.
 * @param {string} projectId
 * @returns {Promise<Array<Object>>}
 */
export async function getProjectInvestments(projectId) {
  try {
    const { data, error } = await sb
      .from('project_investments')
      .select('*')
      .eq('project_id', projectId)
      .order('start_date', { ascending: true });
    if (error) {
      console.warn('[supabase] getProjectInvestments error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[supabase] getProjectInvestments error:', err);
    return [];
  }
}

/**
 * Create a new investment phase.
 * @param {Object} investmentData
 * @param {string} investmentData.project_id
 * @param {string} investmentData.phase_name
 * @param {string} [investmentData.description]
 * @param {number} investmentData.investment_cop
 * @param {number} [investmentData.capacity_added_kw]
 * @param {number} [investmentData.panels_added]
 * @param {string} [investmentData.start_date]
 * @returns {Promise<Object|null>}
 */
export async function createInvestment(investmentData) {
  try {
    const { data, error } = await sb
      .from('project_investments')
      .insert(investmentData)
      .select()
      .single();
    if (error) {
      console.error('[supabase] createInvestment error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[supabase] createInvestment error:', err);
    return null;
  }
}

/**
 * Update an investment phase.
 * @param {string} investmentId
 * @param {Object} updates
 * @returns {Promise<Object|null>}
 */
export async function updateInvestment(investmentId, updates) {
  try {
    const { data, error } = await sb
      .from('project_investments')
      .update(updates)
      .eq('id', investmentId)
      .select()
      .single();
    if (error) {
      console.error('[supabase] updateInvestment error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[supabase] updateInvestment error:', err);
    return null;
  }
}

/**
 * Delete an investment phase.
 * @param {string} investmentId
 * @returns {Promise<boolean>}
 */
export async function deleteInvestment(investmentId) {
  try {
    const { error } = await sb.from('project_investments').delete().eq('id', investmentId);
    if (error) {
      console.error('[supabase] deleteInvestment error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[supabase] deleteInvestment error:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Solar Readings
// ---------------------------------------------------------------------------

/**
 * Fetch all solar readings for a specific project, ordered chronologically.
 * @param {string} projectId
 * @returns {Promise<Array<Object>>}
 */
export async function fetchProjectReadings(projectId) {
  try {
    const { data, error } = await sb
      .from('solar_readings')
      .select('*')
      .eq('project_id', projectId)
      .order('year', { ascending: true })
      .order('monthIdx', { ascending: true });
    if (error) {
      console.error('[supabase] fetchProjectReadings error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[supabase] fetchProjectReadings error:', err);
    return [];
  }
}

/**
 * Upsert (insert or update) a solar reading record.
 * The record must include a `project_id` field.
 * @param {Object} rec - Reading record with all required fields
 * @returns {Promise<Object|null>} Upserted record or null
 */
export async function upsertRecord(rec) {
  try {
    const { data, error } = await sb
      .from('solar_readings')
      .upsert(rec)
      .select()
      .single();
    if (error) {
      console.error('[supabase] upsertRecord error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[supabase] upsertRecord error:', err);
    return null;
  }
}

/**
 * Delete a solar reading by id or fecha.
 * @param {string|null} id - Record id (preferred)
 * @param {string|null} fecha - Fallback fecha value
 * @returns {Promise<boolean>}
 */
export async function deleteRecord(id, fecha) {
  try {
    let query = sb.from('solar_readings').delete();
    if (id) {
      query = query.eq('id', id);
    } else if (fecha) {
      query = query.eq('fecha', fecha);
    } else {
      return false;
    }
    const { error } = await query;
    if (error) {
      console.error('[supabase] deleteRecord error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[supabase] deleteRecord error:', err);
    return false;
  }
}

/**
 * Fetch ALL solar readings without project filter (legacy / migration use).
 * @returns {Promise<Array<Object>>}
 */
export async function fetchAllReadings() {
  try {
    const { data, error } = await sb
      .from('solar_readings')
      .select('*')
      .order('year', { ascending: true })
      .order('monthIdx', { ascending: true });
    if (error) {
      console.error('[supabase] fetchAllReadings error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[supabase] fetchAllReadings error:', err);
    return [];
  }
}
