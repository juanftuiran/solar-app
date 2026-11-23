import React, { useCallback, useEffect, useState } from 'react';
import {
  ListChecks,
  Mail,
  Plus,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import {
  addProjectMember,
  getProjectMembers,
  removeProjectMember,
  updateMemberRole,
} from '../modules/supabase.js';
import { useApp } from '../context/AppContext.jsx';
import { useProject } from '../context/ProjectContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ConfirmModal } from '../components/Modal.jsx';

export default function MembersView() {
  const { lang, t } = useApp();
  const { activeState, isProjectAdmin } = useProject();
  const { showToast } = useToast();

  const projectId = activeState.project?.id;
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('observer');
  const [submitting, setSubmitting] = useState(false);

  const [removeId, setRemoveId] = useState(null);
  const [removing, setRemoving] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const list = await getProjectMembers(projectId);
      setMembers(list || []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!projectId || !newEmail.trim()) return;
    setSubmitting(true);
    try {
      const res = await addProjectMember(projectId, newEmail.trim(), newRole);
      if (!res) throw new Error('No se pudo agregar el miembro.');
      setNewEmail('');
      setNewRole('observer');
      showToast(t('memberAdded'), 'success');
      await loadMembers();
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRole = async (memberId, role) => {
    try {
      const ok = await updateMemberRole(memberId, role);
      if (!ok) throw new Error('Error al actualizar rol.');
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
      showToast(t('roleUpdated'), 'success');
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeId) return;
    setRemoving(true);
    try {
      const ok = await removeProjectMember(removeId);
      if (!ok) throw new Error('Error al remover miembro.');
      showToast(t('memberRemoved'), 'success');
      setRemoveId(null);
      await loadMembers();
    } catch (err) {
      showToast(`${t('error')}: ${err.message}`, 'error');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div id="members-view" className="stack">
      <div className="page-hero" style={{ marginBottom: 0 }}>
        <div className="page-hero-title">
          <div className="icon-tile accent" aria-hidden="true"><Users size={18} /></div>
          <div>
            <h2>{t('membersTitle')}</h2>
            <p>{t('membersDesc')}</p>
          </div>
        </div>
        <span className="count-pill">{t('membersCountPill', { count: members.length })}</span>
      </div>

      {isProjectAdmin && (
        <div className="card section-card">
          <div className="section-head" style={{ marginBottom: '1.15rem' }}>
            <div className="section-head-title">
              <div className="icon-tile solar" aria-hidden="true"><UserPlus size={18} /></div>
              <div>
                <h3>{t('inviteMemberTitle')}</h3>
                <p>{t('inviteMemberDesc')}</p>
              </div>
            </div>
          </div>

          <form id="add-member-form" className="add-member-form" onSubmit={handleAddMember}>
            <div className="field" style={{ flex: 1, minWidth: '14rem' }}>
              <label htmlFor="new-member-email">
                <Mail size={14} className="text-accent" aria-hidden="true" />
                <span>{t('userEmailLabel')}</span>
              </label>
              <input
                type="email"
                id="new-member-email"
                placeholder="colega@empresa.com"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            <div className="field" style={{ minWidth: '12rem' }}>
              <label htmlFor="new-member-role">
                <ShieldCheck size={14} className="text-solar" aria-hidden="true" />
                <span>{t('accessLevel')}</span>
              </label>
              <select
                id="new-member-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="observer">{t('roleObserverRead')}</option>
                <option value="admin">{t('roleAdminFull')}</option>
              </select>
            </div>

            <button
              type="submit"
              id="btn-add-member"
              className="btn btn-solar btn-lg"
              style={{ height: '2.5rem' }}
              disabled={submitting}
            >
              <Plus size={16} aria-hidden="true" />
              <span>{submitting ? t('saving') : t('addMember')}</span>
            </button>
          </form>
        </div>
      )}

      <div className="card table-wrap">
        <div className="table-header">
          <h3>
            <ListChecks size={16} className="text-solar" aria-hidden="true" />
            <span>{t('membersWithAccess')}</span>
          </h3>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t('userEmailCol')}</th>
                <th>{t('assignedRoleCol')}</th>
                <th>{t('joinedCol')}</th>
                {isProjectAdmin && <th style={{ textAlign: 'center' }}>{t('action')}</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isProjectAdmin ? 4 : 3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    {t('loading')}
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={isProjectAdmin ? 4 : 3} style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
                    <div className="empty-state" style={{ padding: '1.5rem 0' }}>
                      <div className="empty-icon text-accent"><UserX size={30} aria-hidden="true" /></div>
                      <h3>{t('noMembersTitle')}</h3>
                      <p>{t('noMembersDesc')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const initials = (member.email || 'US').slice(0, 2).toUpperCase();
                  const joinedDate = member.created_at
                    ? new Date(member.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="member-cell">
                          <div className="avatar-pill">{initials}</div>
                          <div>
                            <span className="cell-primary">{member.email}</span>
                            <div className="cell-sub">ID: {member.id ? member.id.slice(0, 8) : '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isProjectAdmin ? (
                          <select
                            className="role-select"
                            aria-label={`${t('assignedRoleCol')} - ${member.email}`}
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.id, e.target.value)}
                          >
                            <option value="admin">{t('roleAdminFull')}</option>
                            <option value="observer">{t('roleObserverRead')}</option>
                          </select>
                        ) : (
                          <span className={`role-badge ${member.role}`}>{member.role}</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '.82rem' }}>{joinedDate}</td>
                      {isProjectAdmin && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-danger-outline btn-xs"
                            onClick={() => setRemoveId(member.id)}
                          >
                            <UserMinus size={13} aria-hidden="true" />
                            <span>{t('remove')}</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(removeId)}
        title={t('removeMemberTitle')}
        message={t('removeMemberMsg')}
        confirmLabel={t('remove')}
        loading={removing}
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveId(null)}
      />
    </div>
  );
}
