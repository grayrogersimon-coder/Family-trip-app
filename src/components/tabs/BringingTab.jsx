import { useState } from 'react';
import { Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PALETTE } from '../../lib/palette';

export default function BringingTab({ trip, items, families, familyColorMap, canAct, actingMember, refetch }) {
  const [name, setName] = useState('');
  const [familyId, setFamilyId] = useState(actingMember?.family_id || families[0]?.id || '');
  const [error, setError] = useState(null);

  const handleAdd = async () => {
    if (!name.trim()) return;
    const { error: err } = await supabase.from('bringing_items').insert({
      trip_id: trip.id,
      item_name: name.trim(),
      family_id: familyId || null,
      added_by: actingMember?.id || null,
    });
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setName('');
    refetch?.();
  };

  const handleReassign = async (item, newFamilyId) => {
    const { error: err } = await supabase.from('bringing_items').update({ family_id: newFamilyId }).eq('id', item.id);
    if (err) {
      setError(err.message);
      return;
    }
    refetch?.();
  };

  return (
    <div>
      {canAct && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. Board games, Soccer ball"
            style={{ flex: 2, minWidth: 160, padding: '10px 14px', borderRadius: 10, border: `2px solid ${PALETTE.sand}`, fontFamily: 'inherit', fontSize: 14 }}
          />
          <select
            value={familyId}
            onChange={(e) => setFamilyId(e.target.value)}
            style={{ flex: 1, minWidth: 120, padding: '10px 14px', borderRadius: 10, border: `2px solid ${PALETTE.sand}`, fontFamily: 'inherit', fontSize: 13, background: 'white' }}
          >
            {families.map((f) => (
              <option key={f.id} value={f.id}>{f.family_name}</option>
            ))}
          </select>
          <button onClick={handleAdd} className="btn-primary" style={{ padding: '10px 18px' }}>Add</button>
        </div>
      )}
      {error && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.length === 0 && <div style={{ fontSize: 14, color: `${PALETTE.ink}77` }}>Nothing added yet.</div>}
        {items.map((item) => {
          const color = familyColorMap[item.family_id] || PALETTE.ink;
          return (
            <div key={item.id} style={{ background: 'white', border: `1px solid ${PALETTE.sand}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Package size={16} color={color} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{item.item_name}</div>
              <select
                value={item.family_id || ''}
                onChange={(e) => handleReassign(item, e.target.value)}
                disabled={!canAct}
                style={{ fontSize: 11, fontWeight: 700, color: 'white', background: color, border: 'none', padding: '5px 10px', borderRadius: 20, flexShrink: 0, cursor: canAct ? 'pointer' : 'default', maxWidth: 130 }}
              >
                {families.map((f) => (
                  <option key={f.id} value={f.id} style={{ color: PALETTE.ink, background: 'white' }}>{f.family_name}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
