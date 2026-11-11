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
        <td colspan="${isAdmin ? 4 : 3}" style="text-align:center;padding:3rem 1.5rem;color:var(--muted-light);">
          <div class="empty-state" style="padding:1.5rem 0;">
            <div class="empty-icon text-accent"><i class="fa-solid fa-users-slash"></i></div>
            <h3><span class="lang-es">No hay miembros registrados</span><span class="lang-en">No members found</span></h3>
            <p>
              <span class="lang-es">Agrega usuarios con correo para otorgarles acceso de visualización o administración a esta planta solar.</span>
              <span class="lang-en">Add user emails to grant view or administration privileges to this solar plant.</span>
            </p>
          </div>
        </td>
      </tr>
    `
    : membersList.map(member => {
        const isAdminRole = member.role === 'admin';
        const initials = (member.email || 'US').slice(0, 2).toUpperCase();

        const joinedDate = member.created_at
          ? new Date(member.created_at).toLocaleDateString('es-CO', {
              year: 'numeric', month: 'short', day: 'numeric'
            })
          : '—';

        const roleCell = isAdmin
          ? `
            <td>
              <select
                class="role-select member-role-select"
                data-member-id="${member.id}"
                aria-label="Rol de miembro"
              >
                <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Admin (Control Total)</option>
                <option value="observer" ${member.role === 'observer' ? 'selected' : ''}>Observer (Solo Lectura)</option>
              </select>
            </td>
          `
          : `
            <td>
              <span class="role-badge ${member.role}">
                ${member.role}
              </span>
            </td>
          `;

        const removeCell = isAdmin
          ? `
            <td style="text-align:center;">
              <button
                class="btn btn-danger-outline btn-xs member-remove-btn"
                data-member-id="${member.id}"
              >
                <i class="fa-solid fa-user-minus"></i>
                <span class="lang-es">Remover</span>
                <span class="lang-en">Remove</span>
              </button>
            </td>
          `
          : '';

        return `
          <tr>
            <td>
              <div class="member-cell">
                <div class="avatar-pill">
                  ${initials}
                </div>
                <div>
                  <span class="cell-primary">${_escapeHTML(member.email)}</span>
                  <div class="cell-sub">ID: ${member.id ? member.id.slice(0, 8) : '—'}</div>
                </div>
              </div>
            </td>
            ${roleCell}
            <td style="color:var(--muted-light);font-size:.82rem;">
              ${joinedDate}
            </td>
            ${removeCell}
          </tr>
        `;
      }).join('');

  const addMemberHTML = isAdmin
    ? `
      <div class="card section-card">
        <div class="section-head" style="margin-bottom:1.15rem;">
          <div class="section-head-title">
            <div class="icon-tile solar"><i class="fa-solid fa-user-plus"></i></div>
            <div>
              <h3>
                <span class="lang-es">Invitar / Agregar Nuevo Miembro</span>
                <span class="lang-en">Invite / Add New Member</span>
              </h3>
              <p>
                <span class="lang-es">Otorga permisos de visualización o administración a usuarios registrados</span>
                <span class="lang-en">Grant viewing or admin privileges to registered users</span>
              </p>
            </div>
          </div>
        </div>

        <form id="add-member-form" class="add-member-form">
          <div class="field" style="flex:1;min-width:14rem;">
            <label for="new-member-email">
              <i class="fa-solid fa-envelope text-accent"></i>
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

          <div class="field" style="min-width:12rem;">
            <label for="new-member-role">
              <i class="fa-solid fa-shield-halved text-solar"></i>
              <span class="lang-es">Nivel de Acceso</span>
              <span class="lang-en">Access Level</span>
            </label>
            <select id="new-member-role">
              <option value="observer">Observer (Lectura)</option>
              <option value="admin">Admin (Control Total)</option>
            </select>
          </div>

          <button type="submit" id="btn-add-member" class="btn btn-solar btn-lg" style="height:2.5rem;">
            <i class="fa-solid fa-plus"></i>
            <span class="lang-es">Agregar Miembro</span>
            <span class="lang-en">Add Member</span>
          </button>
        </form>
      </div>
    `
    : '';

  return `
    <div id="members-view" class="stack">
      <!-- Header -->
      <div class="page-hero" style="margin-bottom:0;">
        <div class="page-hero-title">
          <div class="icon-tile accent"><i class="fa-solid fa-users"></i></div>
          <div>
            <h2>
              <span class="lang-es">Gestión de Miembros y Accesos</span>
              <span class="lang-en">Members & Access Management</span>
            </h2>
            <p>
              <span class="lang-es">Control de accesos y roles asignados para esta planta solar</span>
              <span class="lang-en">Access control and assigned roles for this solar plant</span>
            </p>
          </div>
        </div>
        <span class="count-pill">
          ${membersList.length} Miembros
        </span>
      </div>

      <!-- Add member form -->
      ${addMemberHTML}

      <!-- Members table -->
      <div class="card table-wrap">
        <div class="table-header">
          <h3>
            <i class="fa-solid fa-list-check text-solar"></i>
            <span class="lang-es">Miembros con Acceso Asignado</span>
            <span class="lang-en">Members with Assigned Access</span>
          </h3>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th><span class="lang-es">Usuario / Correo</span><span class="lang-en">User / Email</span></th>
                <th><span class="lang-es">Rol Asignado</span><span class="lang-en">Assigned Role</span></th>
                <th><span class="lang-es">Miembro Desde</span><span class="lang-en">Joined</span></th>
                ${isAdmin ? `<th style="text-align:center;"><span class="lang-es">Acción</span><span class="lang-en">Action</span></th>` : ''}
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
