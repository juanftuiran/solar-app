/**
 * @module membersView
 * @description Modern enterprise member management view for JF Solar Cloud.
 */

import { state } from '../modules/state.js';

/**
 * Render the members management view HTML.
 *
 * @param {Array<Object>} members - Array of project members
 * @returns {string} HTML string for the members view
 */
export function render(members) {
  const isAdmin = state.activeProjectRole === 'admin';
  const membersList = members || [];

  const membersHTML = membersList.length === 0
    ? `
      <tr>
        <td colspan="4" style="text-align:center;padding:3rem 1.5rem;color:var(--muted-light);">
          <i class="fa-solid fa-users-slash" style="font-size:2.5rem;margin-bottom:1rem;display:block;opacity:.3;color:var(--accent);"></i>
          <span style="font-weight:700;color:#fff;">No hay miembros registrados</span>
          <p style="font-size:.8rem;color:var(--muted-light);margin-top:.25rem;">
            Agrega usuarios para otorgarles acceso a este proyecto solar.
          </p>
        </td>
      </tr>
    `
    : membersList.map(member => {
        const isAdminRole = member.role === 'admin';
        const roleBg = isAdminRole ? 'var(--accent-subtle)' : 'var(--solar-subtle)';
        const roleColor = isAdminRole ? 'var(--accent)' : 'var(--solar)';
        const initials = (member.email || 'US').slice(0, 2).toUpperCase();

        const joinedDate = member.created_at
          ? new Date(member.created_at).toLocaleDateString('es-CO', {
              year: 'numeric', month: 'short', day: 'numeric'
            })
          : '—';

        const roleCell = isAdmin
          ? `
            <td style="padding:.85rem 1rem;">
              <select
                class="member-role-select"
                data-member-id="${member.id}"
                style="
                  background:rgba(13,21,39,0.85);border:1px solid var(--border-medium);border-radius:var(--radius-xs);
                  padding:.35rem .65rem;color:#fff;font-size:.75rem;font-weight:700;cursor:pointer;outline:none;
                "
              >
                <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Admin (Control Total)</option>
                <option value="observer" ${member.role === 'observer' ? 'selected' : ''}>Observer (Solo Lectura)</option>
              </select>
            </td>
          `
          : `
            <td style="padding:.85rem 1rem;">
              <span class="role-badge ${member.role}">
                ${member.role}
              </span>
            </td>
          `;

        const removeCell = isAdmin
          ? `
            <td style="padding:.85rem 1rem;text-align:center;">
              <button
                class="btn btn-danger-outline btn-sm member-remove-btn"
                data-member-id="${member.id}"
              >
                <i class="fa-solid fa-user-minus" style="font-size:.7rem;"></i>
                <span class="lang-es">Remover</span>
                <span class="lang-en">Remove</span>
              </button>
            </td>
          `
          : '';

        return `
          <tr style="border-bottom:1px solid rgba(100,116,139,.12);">
            <td style="padding:.85rem 1rem;">
              <div style="display:flex;align-items:center;gap:.75rem;">
                <div class="avatar-pill" style="background:linear-gradient(135deg, ${isAdminRole ? '#0ea5e9, #6366f1' : '#10b981, #0ea5e9'});">
                  ${initials}
                </div>
                <div>
                  <span style="font-size:.875rem;font-weight:700;color:#fff;">${_escapeHTML(member.email)}</span>
                  <div style="font-size:.7rem;color:var(--muted-light);">ID: ${member.id ? member.id.slice(0, 8) : '—'}</div>
                </div>
              </div>
            </td>
            ${roleCell}
            <td style="padding:.85rem 1rem;font-size:.8rem;color:var(--muted-light);">
              ${joinedDate}
            </td>
            ${removeCell}
          </tr>
        `;
      }).join('');

  const addMemberHTML = isAdmin
    ? `
      <div class="card" style="padding:1.5rem;margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:1.25rem;">
          <i class="fa-solid fa-user-plus" style="color:var(--solar);font-size:1.1rem;"></i>
          <div>
            <h3 style="font-size:.95rem;font-weight:800;color:#fff;">
              <span class="lang-es">Invitar / Agregar Nuevo Miembro</span>
              <span class="lang-en">Invite / Add New Member</span>
            </h3>
            <p style="font-size:.75rem;color:var(--muted-light);">
              <span class="lang-es">Otorga permisos de visualización o administración a usuarios registrados</span>
              <span class="lang-en">Grant viewing or admin privileges to registered users</span>
            </p>
          </div>
        </div>

        <form id="add-member-form" style="display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end;">
          <div class="field" style="flex:1;min-width:14rem;">
            <label for="new-member-email">
              <i class="fa-solid fa-envelope" style="color:var(--accent);"></i>
              <span class="lang-es">Correo Electrónico del Usuario</span>
              <span class="lang-en">User Email Address</span>
            </label>
            <input
              type="email"
              id="new-member-email"
              placeholder="colega@empresa.com"
              required
            >
          </div>

          <div class="field" style="min-width:11rem;">
            <label for="new-member-role">
              <i class="fa-solid fa-shield-halved" style="color:var(--solar);"></i>
              <span class="lang-es">Nivel de Acceso</span>
              <span class="lang-en">Access Level</span>
            </label>
            <select id="new-member-role">
              <option value="observer">Observer (Lectura)</option>
              <option value="admin">Admin (Control Total)</option>
            </select>
          </div>

          <button type="submit" id="btn-add-member" class="btn btn-solar btn-lg">
            <i class="fa-solid fa-plus"></i>
            <span class="lang-es">Agregar</span>
            <span class="lang-en">Add</span>
          </button>
        </form>
      </div>
    `
    : '';

  return `
    <div id="members-view" style="display:flex;flex-direction:column;gap:1.5rem;">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;">
        <div style="display:flex;align-items:center;gap:.6rem;">
          <i class="fa-solid fa-users" style="color:var(--accent);font-size:1.25rem;"></i>
          <div>
            <h2 style="font-size:1.15rem;font-weight:800;color:#fff;">
              <span class="lang-es">Gestión de Miembros y Accesos</span>
              <span class="lang-en">Members & Access Management</span>
            </h2>
            <p style="font-size:.75rem;color:var(--muted-light);">
              <span class="lang-es">Control de accesos y roles asignados para este proyecto</span>
              <span class="lang-en">Access control and assigned roles for this project</span>
            </p>
          </div>
        </div>
        <span style="background:var(--accent-subtle);color:var(--accent);border:1px solid rgba(14,165,233,0.3);padding:.25rem .75rem;border-radius:var(--radius-full);font-size:.75rem;font-weight:800;" class="tabular-nums">
          ${membersList.length} Miembros
        </span>
      </div>

      <!-- Add member form -->
      ${addMemberHTML}

      <!-- Members table -->
      <div class="card table-wrap">
        <div class="table-header">
          <h3>
            <i class="fa-solid fa-list-check" style="color:var(--solar);"></i>
            <span class="lang-es">Miembros con Acceso</span>
            <span class="lang-en">Members with Access</span>
          </h3>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th style="padding:.85rem 1rem;"><span class="lang-es">Usuario / Correo</span><span class="lang-en">User / Email</span></th>
                <th style="padding:.85rem 1rem;"><span class="lang-es">Rol Asignado</span><span class="lang-en">Assigned Role</span></th>
                <th style="padding:.85rem 1rem;"><span class="lang-es">Miembro Desde</span><span class="lang-en">Joined</span></th>
                ${isAdmin ? `<th style="padding:.85rem 1rem;text-align:center;"><span class="lang-es">Acción</span><span class="lang-en">Action</span></th>` : ''}
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
 */
export function init(callbacks) {
  const { onAddMember, onRemoveMember, onChangeRole } = callbacks || {};

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

  if (onRemoveMember) {
    document.querySelectorAll('.member-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const memberId = btn.dataset.memberId;
        if (memberId) onRemoveMember(memberId);
      });
    });
  }

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

function _escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
