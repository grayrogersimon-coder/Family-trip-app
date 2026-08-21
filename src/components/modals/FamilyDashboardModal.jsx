import { useState } from 'react';
import { Check, Package, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PALETTE } from '../../lib/palette';
import { formatMoney } from '../../lib/tripUtils';
import ConfirmDangerModal from './ConfirmDangerModal.jsx';

export default function FamilyDashboardModal({ families, familyColorMap, initialFamilyId, shoppingItems, bringingItems, expenses, userId, isTripCreator, onRemoved, onClose }) {
  const [familyId, setFamilyId] = useState(initialFamilyId || families[0]?.id || '');
  const fam = families.find((f) => f.id === familyId) || families[0];
  const famColor = familyColorMap[fam?.id] || PALETTE.ink;

  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  const canRemove = Boolean(fam && userId && (fam.created_by === userId || isTripCreator));
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
          <select
            value={fam?.id || ''}
            onChange={(e) => setFamilyId(e.target.value)}
            style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fredoka', system-ui, sans-serif", background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', width: '100%' }}
          >
            {families.map((f) => (
              <option key={f.id} value={f.id} style={{ color: PALETTE.ink }}>{f.family_name}</option>
            ))}
          </select>
        </div>
        <div style={{ padding: 24 }}>
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

          {canRemove && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${PALETTE.sand}` }}>
              {onlyFamilyLeft ? (
                <div style={{ fontSize: 12, color: `${PALETTE.ink}66` }}>
                  This is the only family on the trip — delete the trip instead if you want to remove it entirely.
                </div>
              ) : (
                <button
                  onClick={() => setRemoveOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                    color: PALETTE.coral, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0,
                  }}
                >
                  <Trash2 size={14} /> Remove {fam.family_name} from this trip
                </button>
              )}
            </div>
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
