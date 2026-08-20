import { useState } from 'react';
import { Check, Package, X } from 'lucide-react';
import { PALETTE } from '../../lib/palette';
import { formatMoney } from '../../lib/tripUtils';

export default function FamilyDashboardModal({ families, familyColorMap, initialFamilyId, shoppingItems, bringingItems, expenses, onClose }) {
  const [familyId, setFamilyId] = useState(initialFamilyId || families[0]?.id || '');
  const fam = families.find((f) => f.id === familyId) || families[0];
  const famColor = familyColorMap[fam?.id] || PALETTE.ink;

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
            style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif", background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', width: '100%' }}
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
        </div>
      </div>
    </div>
  );
}
