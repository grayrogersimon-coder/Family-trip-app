import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PALETTE } from '../../lib/palette';
import { formatMoney } from '../../lib/tripUtils';

export default function ExpensesTab({ trip, expenses, families, familyColorMap, canAct, actingFamilyId, refetch }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(actingFamilyId || families[0]?.id || '');
  const [error, setError] = useState(null);

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const fairShare = families.length > 0 ? totalSpent / families.length : 0;
  const balances = families.map((f) => {
    const paid = expenses.filter((e) => e.paid_by_family_id === f.id).reduce((sum, e) => sum + Number(e.amount), 0);
    return { family: f, paid, balance: paid - fairShare };
  });

  const handleAdd = async () => {
    const amt = parseFloat(amount);
    if (!description.trim() || !amt || amt <= 0 || !paidBy) return;
    const { error: err } = await supabase.from('expenses').insert({
      trip_id: trip.id,
      description: description.trim(),
      amount: amt,
      paid_by_family_id: paidBy,
      split_type: 'equal',
    });
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setDescription('');
    setAmount('');
    refetch?.();
  };

  return (
    <div>
      <div style={{ background: PALETTE.teal, borderRadius: 14, padding: 20, marginBottom: 18, color: 'white' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>Total trip spend</div>
        <div className="fraunces" style={{ fontSize: 30, fontWeight: 600, marginBottom: 16 }}>{formatMoney(totalSpent)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {balances.map((b) => (
            <div key={b.family.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: familyColorMap[b.family.id] }} />
                {b.family.family_name}
              </span>
              <span style={{ fontWeight: 700 }}>
                {b.balance > 0.5 ? `is owed ${formatMoney(b.balance)}` : b.balance < -0.5 ? `owes ${formatMoney(Math.abs(b.balance))}` : 'settled up'}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 12 }}>
          Split evenly across {families.length} {families.length === 1 ? 'family' : 'families'} — {formatMoney(fairShare)} fair share each
        </div>
      </div>

      {canAct && (
        <div style={{ background: 'white', border: `1px solid ${PALETTE.sand}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was it for?"
              style={{ flex: 2, padding: '10px 14px', borderRadius: 10, border: `2px solid ${PALETTE.sand}`, fontFamily: 'inherit', fontSize: 14 }}
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              placeholder="$"
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `2px solid ${PALETTE.sand}`, fontFamily: 'inherit', fontSize: 14 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `2px solid ${PALETTE.sand}`, fontFamily: 'inherit', fontSize: 14, background: 'white' }}
            >
              {families.map((f) => (
                <option key={f.id} value={f.id}>{f.family_name} paid</option>
              ))}
            </select>
            <button onClick={handleAdd} className="btn-primary" style={{ padding: '10px 18px' }}>Add</button>
          </div>
          {error && <div style={{ color: PALETTE.coral, fontSize: 13, marginTop: 8 }}>{error}</div>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {expenses.length === 0 && <div style={{ fontSize: 14, color: `${PALETTE.ink}77` }}>No expenses logged yet.</div>}
        {expenses.map((e) => (
          <div key={e.id} style={{ background: 'white', border: `1px solid ${PALETTE.sand}`, borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{e.description}</div>
              <div style={{ fontSize: 12, color: `${PALETTE.ink}77` }}>
                Paid by {families.find((f) => f.id === e.paid_by_family_id)?.family_name || 'Unknown'}
              </div>
            </div>
            <div className="fraunces" style={{ fontSize: 17, fontWeight: 600, color: PALETTE.coral }}>{formatMoney(e.amount)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
