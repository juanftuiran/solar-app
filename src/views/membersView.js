/**
 * @module membersView
 * @description Member management view for JF Solar Cloud.
 * Displays the project member list with add/remove/role-change capabilities.
 * Rendered inside the dashboard layout's main-content area.
 */

import { state } from '../modules/state.js';

/**
 * @typedef {Object} Member
 * @property {string} id - Member record ID
 * @property {string} email - Member email address
 * @property {string} role - Member role: 'admin' | 'observer'
 * @property {string} [created_at] - ISO timestamp of when they were added
 */

/**
 * Render the members management view HTML.
 *
 * @param {Member[]} members - Array of project members
 * @returns {string} HTML string for the members view
 */
export function render(members) {
  const isAdmin = state.activeProjectRole === 'admin';
  const membersList = members || [];

  // Members rows
  const membersHTML = membersList.length === 0
    ? `
      <tr>
        <td colspan="4" style="text-align:center;padding:2rem;color:#64748b;">
          <i class="fa-solid fa-users-slash" style="font-size:1.5rem;margin-bottom:.5rem;display:block;opacity:.3;"></i>
          <span class="lang-es">No hay miembros registrados.</span>
          <span class="lang-en">No members registered.</span>
        </td>
      </tr>
    `
    : membersList.map(member => {
        const isAdminRole = member.role === 'admin';
        const roleBg = isAdminRole ? 'rgba(14,165,233,.15)' : 'rgba(16,185,129,.15)';
        const roleColor = isAdminRole ? '#0ea5e9' : '#10b981';

        const joinedDate = member.created_at
          ? new Date(member.created_at).toLocaleDateString('es-CO', {
              year: 'numeric', month: 'short', day: 'numeric'
            })
          : '—';

        // Role change dropdown (admin only)
        const roleCell = isAdmin
          ? `
            <td style="padding:.75rem 1rem;">
              <select
                class="member-role-select"
                data-member-id="${member.id}"
                style="
                  background:#1e293b;border:1px solid #475569;border-radius:.375rem;
                  padding:.25rem .5rem;color:#fff;font-size:.75rem;cursor:pointer;outline:none;
                "
              >
                <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Admin</option>
                <option value="observer" ${member.role === 'observer' ? 'selected' : ''}>Observer</option>
              </select>
            </td>
          `
          : `
            <td style="padding:.75rem 1rem;">
              <span style="
                font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
                padding:.15rem .4rem;border-radius:.25rem;
                background:${roleBg};color:${roleColor};
              ">
                ${member.role}
              </span>
            </td>
          `;

        // Remove button (admin only)
        const removeCell = isAdmin
          ? `
            <td style="padding:.75rem 1rem;text-align:center;">
              <button
                class="btn btn-danger-outline member-remove-btn"
                data-member-id="${member.id}"
                style="font-size:.7rem;padding:.25rem .5rem;"
              >
                <i class="fa-solid fa-user-minus" style="font-size:.65rem;"></i>
                <span class="lang-es">Remover</span>
                <span class="lang-en">Remove</span>
              </button>
            </td>
          `
          : '';

        return `
          <tr style="border-bottom:1px solid rgba(100,116,139,.15);">
            <td style="padding:.75rem 1rem;">
              <div style="display:flex;align-items:center;gap:.5rem;">
                <i class="fa-solid fa-circle-user" style="color:#64748b;font-size:1.125rem;"></i>
                <span style="font-size:.85rem;color:#e2e8f0;">${_escapeHTML(member.email)}</span>
              </div>
            </td>
            ${roleCell}
            <td style="padding:.75rem 1rem;font-size:.75rem;color:#64748b;">
              ${joinedDate}
            </td>
            ${removeCell}
          </tr>
        `;
      }).join('');

  // Add member form (admin only)
  const addMemberHTML = isAdmin
    ? `
      <div class="card" style="padding:1.25rem;margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;">
          <i class="fa-solid fa-user-plus" style="color:#10b981;"></i>
          <h3 style="font-size:.875rem;font-weight:700;color:#e2e8f0;">
            <span class="lang-es">Agregar Miembro</span>
            <span class="lang-en">Add Member</span>
          </h3>
        </div>

        <form id="add-member-form" style="display:flex;flex-wrap:wrap;gap:.75rem;align-items:flex-end;">
          <div class="field" style="flex:1;min-width:12rem;">
            <label for="new-member-email">
              <span class="lang-es">Correo electrónico</span>
              <span class="lang-en">Email address</span>
            </label>
            <input
              type="email"
              id="new-member-email"
              placeholder="user@example.com"
              required
            >
          </div>

          <div class="field" style="min-width:8rem;">
            <label for="new-member-role">
              <span class="lang-es">Rol</span>
              <span class="lang-en">Role</span>
            </label>
            <select id="new-member-role">
              <option value="observer">
                Observer
              </option>
              <option value="admin">
                Admin
              </option>
            </select>
          </div>

          <button type="submit" id="btn-add-member" class="btn btn-solar" style="padding:.5rem 1rem;">
            <i class="fa-solid fa-plus"></i>
            <span class="lang-es">Agregar</span>
            <span class="lang-en">Add</span>
          </button>
        </form>
      </div>
    `
    : '';

  return `
    <div id="members-view" style="display:flex;flex-direction:column;gap:1rem;">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:.5rem;">
        <i class="fa-solid fa-users" style="color:#0ea5e9;font-size:1.125rem;"></i>
        <h2 style="font-size:1.125rem;font-weight:800;color:#e2e8f0;">
          <span class="lang-es">Miembros del Proyecto</span>
          <span class="lang-en">Project Members</span>
        </h2>
        <span style="font-size:.8rem;color:#64748b;">(${membersList.length})</span>
      </div>

      <!-- Add member form -->
      ${addMemberHTML}

      <!-- Members table -->
      <div class="card table-wrap">
        <div class="table-header">
          <h3 style="font-size:.8rem;font-weight:700;color:#e2e8f0;">
            <span class="lang-es">Lista de Miembros</span>
            <span class="lang-en">Member List</span>
          </h3>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">
                  <span class="lang-es">Correo</span>
                  <span class="lang-en">Email</span>
                </th>
                <th>
                  <span class="lang-es">Rol</span>
                  <span class="lang-en">Role</span>
                </th>
                <th>
                  <span class="lang-es">Miembro desde</span>
                  <span class="lang-en">Joined</span>
                </th>
                ${isAdmin ? `
                  <th style="text-align:center;">
                    <span class="lang-es">Acción</span>
                    <span class="lang-en">Action</span>
                  </th>
                ` : ''}
              </tr>
            </thead>
            <tbody id="members-table-body">
              ${membersHTML}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialise members view event listeners.
 *
 * @param {Object} callbacks
 * @param {Function} callbacks.onAddMember - Called with `({ email, role })` when a member is added
 * @param {Function} callbacks.onRemoveMember - Called with `(memberId: string)` when remove is clicked
 * @param {Function} callbacks.onChangeRole - Called with `(memberId: string, newRole: string)` when role changes
 */
export function init(callbacks) {
  const { onAddMember, onRemoveMember, onChangeRole } = callbacks || {};

  // Add member form
  const addForm = document.getElementById('add-member-form');
  if (addForm && onAddMember) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('new-member-email')?.value?.trim();
      const role = document.getElementById('new-member-role')?.value || 'observer';
      if (email) {
        onAddMember({ email, role });
        addForm.reset();
      }
    });
  }

  // Remove member buttons
  if (onRemoveMember) {
    document.querySelectorAll('.member-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const memberId = btn.dataset.memberId;
        if (memberId) onRemoveMember(memberId);
      });
    });
  }

  // Role change selects
  if (onChangeRole) {
    document.querySelectorAll('.member-role-select').forEach(select => {
      select.addEventListener('change', () => {
        const memberId = select.dataset.memberId;
        const newRole = select.value;
        if (memberId) onChangeRole(memberId, newRole);
      });
    });
  }
}

/* ── Private helpers ──────────────────────────────────────────────────────── */

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 * @private
 */
function _escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
