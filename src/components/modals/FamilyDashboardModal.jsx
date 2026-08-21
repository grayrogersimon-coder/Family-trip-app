import { useState } from 'react';
import { Check, Package, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PALETTE } from '../../lib/palette';
import { formatMoney } from '../../lib/tripUtils';
import ConfirmDangerModal from './ConfirmDangerModal.jsx';
import CopyLinkButton from '../ui/CopyLinkButton.jsx';

export default function FamilyDashboardModal({
  families,
  members,
  familyColorMap,
  initialFamilyId,
  shoppingItems,
  bringingItems,
  expenses,
  userId,
  isTripCreator,
  onRemoved,
  onFamiliesChanged,
  onMembersChanged,
  onClose,
}) {
  const [familyId, setFamilyId] = useState(initialFamilyId || families[0]?.id || '');
  const fam = families.find((f) => f.id === familyId) || families[0];
  const famColor = familyColorMap[fam?.id] || PALETTE.ink;

  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [editFamilyName, setEditFamilyName] = useState('');
  const [editMembers, setEditMembers] = useState([]); // [{id: existing-id|null, display_name, role, removing}]
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const canManage = Boolean(fam && userId && (fam.created_by === userId || isTripCreator));
  const onlyFamilyLeft = families.length <= 1;

  const handleRemove = async () => {
    setRemoving(true);
    setRemoveError(null);
    const { error: err } = await supabase.rpc('remove_family', { p_family_id: fam.id });
    if (err) {
      setRemoveError(err.message);
      setRemoving(false);
      return;
    }
    onRemoved?.();
    onClose();
  };

  const startEdit = () => {
    setEditFamilyName(fam.family_name);
    setEditMembers(
      members.filter((m) => m.family_id === fam.id).map((m) => ({ id: m.id, display_name: m.display_name, role: m.role }))
    );
    setSaveError(null);
    setEditing(true);
  };

  const updateEditMember = (i, field, value) => {
    const next = [...editMembers];
    next[i] = { ...next[i], [field]: value };
    setEditMembers(next);
  };

  const addEditMemberRow = () => setEditMembers([...editMembers, { id: null, display_name: '', role: 'adult' }]);

  const existingEditCount = editMembers.filter((m) => m.id).length;

  const removeEditMember = async (i) => {
    const row = editMembers[i];
    if (!row.id) {
      setEditMembers(editMembers.filter((_, idx) => idx !== i));
      return;
    }
    setSaveError(null);
    updateEditMember(i, 'removing', true);
    const { error: err } = await supabase.rpc('remove_member', { p_member_id: row.id });
    if (err) {
      setSaveError(err.message);
      updateEditMember(i, 'removing', false);
      return;
    }
    setEditMembers(editMembers.filter((_, idx) => idx !== i));
    onMembersChanged?.();
  };

  const handleSaveEdit = async () => {
    if (!editFamilyName.trim() || editMembers.some((m) => m.id && !m.display_name.trim())) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editFamilyName.trim() !== fam.family_name) {
        const { error: err } = await supabase.from('families').update({ family_name: editFamilyName.trim() }).eq('id', fam.id);
        if (err) throw err;
      }

      for (const m of editMembers) {
        if (m.id) {
          const { error: err } = await supabase.from('members').update({ display_name: m.display_name.trim(), role: m.role }).eq('id', m.id);
          if (err) throw err;
        }
      }

      const newRows = editMembers.filter((m) => !m.id && m.display_name.trim());
      if (newRows.length > 0) {
        const { error: err } = await supabase.from('members').insert(
          newRows.map((m) => ({ family_id: fam.id, user_id: userId, display_name: m.display_name.trim(), role: m.role }))
        );
        if (err) throw err;
      }

      onFamiliesChanged?.();
      onMembersChanged?.();
      setEditing(false);
    } catch (e) {
      setSaveError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const assignedItems = shoppingItems.filter((s) => s.assigned_to_family_id === fam?.id);
  const bringingForFam = bringingItems.filter((b) => b.family_id === fam?.id);

  let famBalance = null;
  if (expenses) {
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const fairShare = families.length > 0 ? totalSpent / families.length : 0;
    const paid = expenses.filter((e) => e.paid_by_family_id === fam?.id).reduce((sum, e) => sum + Number(e.amount), 0);
    famBalance = paid - fairShare;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 55 }} onClick={onClose}>
      <div className="app-modal" style={{ background: 'white', borderRadius: 18, maxWidth: 440, width: '100%', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: famColor, padding: '22px 28px', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.85 }}>Family dashboard</div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={14} color="white" />
            </button>
          </div>
          {editing ? (
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fredoka', system-ui, sans-serif" }}>{fam.family_name}</div>
          ) : (
            <select
              value={fam?.id || ''}
              onChange={(e) => setFamilyId(e.target.value)}
              style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fredoka', system-ui, sans-serif", background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', width: '100%' }}
            >
              {families.map((f) => (
                <option key={f.id} value={f.id} style={{ color: PALETTE.ink }}>{f.family_name}</option>
              ))}
            </select>
          )}
        </div>
        <div style={{ padding: 24 }}>
          {editing ? (
            <>
              <label className="field-label">Family name</label>
              <input
                value={editFamilyName}
                onChange={(e) => setEditFamilyName(e.target.value)}
                className="field-input"
                style={{ marginBottom: 18 }}
              />
              <label className="field-label" style={{ marginBottom: 8 }}>Members</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {editMembers.map((m, i) => (
                  <div key={m.id || `new-${i}`} style={{ opacity: m.removing ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        value={m.display_name}
                        onChange={(e) => updateEditMember(i, 'display_name', e.target.value)}
                        placeholder="Name"
                        disabled={m.removing}
                        style={{ flex: 1, minWidth: 0, padding: '9px 12px', fontSize: 14, border: `2px solid ${PALETTE.sand}`, borderRadius: 10, fontFamily: 'inherit' }}
                      />
                      <div style={{ display: 'flex', border: `2px solid ${PALETTE.sand}`, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                        <button
                          type="button"
                          disabled={m.removing}
                          onClick={() => updateEditMember(i, 'role', 'adult')}
                          style={{ padding: '0 10px', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: m.role === 'adult' ? PALETTE.teal : 'white', color: m.role === 'adult' ? 'white' : PALETTE.ink }}
                        >
                          Adult
                        </button>
                        <button
                          type="button"
                          disabled={m.removing}
                          onClick={() => updateEditMember(i, 'role', 'kid')}
                          style={{ padding: '0 10px', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: m.role === 'kid' ? PALETTE.coral : 'white', color: m.role === 'kid' ? 'white' : PALETTE.ink }}
                        >
                          Kid
                        </button>
                      </div>
                      <button
                        onClick={() => removeEditMember(i)}
                        disabled={m.removing || (m.id && existingEditCount <= 1)}
                        title={m.id && existingEditCount <= 1 ? "Can't remove the last member — remove the whole family instead" : 'Remove'}
                        style={{ background: 'none', border: 'none', cursor: m.id && existingEditCount <= 1 ? 'not-allowed' : 'pointer', padding: 4, flexShrink: 0, color: `${PALETTE.ink}55`, opacity: m.id && existingEditCount <= 1 ? 0.3 : 1 }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {m.id && m.role === 'adult' && !m.removing && (
                      <div style={{ marginTop: 4, marginLeft: 2 }}>
                        <CopyLinkButton memberId={m.id} label={`Copy ${m.display_name || "their"} link`} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addEditMemberRow}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: PALETTE.coral, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: '4px 0', marginBottom: 20 }}
              >
                <Plus size={14} /> Add member
              </button>
              {saveError && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 14 }}>{saveError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
                <button
                  onClick={handleSaveEdit}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={saving || !editFamilyName.trim() || editMembers.some((m) => m.id && !m.display_name.trim())}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Members
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {members.filter((m) => m.family_id === fam?.id).map((m) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 14 }}>
                    <span>
                      {m.display_name}
                      {m.role === 'kid' && <span style={{ fontSize: 11, color: `${PALETTE.ink}66`, marginLeft: 6 }}>(kid)</span>}
                    </span>
                    {m.role === 'adult' && <CopyLinkButton memberId={m.id} />}
                  </div>
                ))}
              </div>

              {famBalance !== null && (
                <div style={{ background: PALETTE.cream, borderRadius: 12, padding: 14, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: `${PALETTE.ink}77`, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Expenses</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {famBalance > 0.5 ? `Is owed ${formatMoney(famBalance)}` : famBalance < -0.5 ? `Owes ${formatMoney(Math.abs(famBalance))}` : 'Settled up'}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Shopping list assigned to you ({assignedItems.length})
              </div>
              {assignedItems.length === 0 ? (
                <div style={{ fontSize: 13, color: `${PALETTE.ink}66`, marginBottom: 20 }}>Nothing assigned yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  {assignedItems.map((s) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, opacity: s.is_purchased ? 0.5 : 1 }}>
                      <Check size={13} color={s.is_purchased ? PALETTE.teal : `${PALETTE.ink}33`} />
                      <span style={{ textDecoration: s.is_purchased ? 'line-through' : 'none' }}>{s.item_name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                What you're bringing ({bringingForFam.length})
              </div>
              {bringingForFam.length === 0 ? (
                <div style={{ fontSize: 13, color: `${PALETTE.ink}66` }}>Nothing added yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {bringingForFam.map((b) => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                      <Package size={13} color={famColor} />
                      {b.item_name}
                    </div>
                  ))}
                </div>
              )}

              {canManage && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${PALETTE.sand}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    onClick={startEdit}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: PALETTE.teal, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}
                  >
                    <Pencil size={14} /> Edit {fam.family_name}
                  </button>
                  {onlyFamilyLeft ? (
                    <div style={{ fontSize: 12, color: `${PALETTE.ink}66` }}>
                      This is the only family on the trip — delete the trip instead if you want to remove it entirely.
                    </div>
                  ) : (
                    <button
                      onClick={() => setRemoveOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: PALETTE.coral, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}
                    >
                      <Trash2 size={14} /> Remove {fam.family_name} from this trip
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {removeOpen && (
        <ConfirmDangerModal
          title={`Remove ${fam.family_name}?`}
          message="They'll be taken off this trip. Their messages and confirmed activities stay in the trip's history, but their shopping assignments, bringing-list items, and votes are cleared."
          confirmLabel="Remove family"
          busy={removing}
          error={removeError}
          onClose={() => {
            if (!removing) {
              setRemoveOpen(false);
              setRemoveError(null);
            }
          }}
          onConfirm={handleRemove}
        />
      )}
    </div>
  );
}
