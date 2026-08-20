import { useEffect, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PALETTE } from '../../lib/palette';

export default function ShoppingTab({ trip, items, families, familyColorMap, canAct, actingMember, prefillGroup, onPrefillConsumed }) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemGroupChoice, setNewItemGroupChoice] = useState('none'); // 'none' | 'new' | <group name>
  const [newGroupName, setNewGroupName] = useState('');
  const [newItemFamilyId, setNewItemFamilyId] = useState('unassigned');
  const [error, setError] = useState(null);

  const existingGroups = [];
  items.forEach((item) => {
    if (item.group_name && !existingGroups.includes(item.group_name)) existingGroups.push(item.group_name);
  });

  useEffect(() => {
    if (!prefillGroup) return;
    if (existingGroups.includes(prefillGroup)) {
      setNewItemGroupChoice(prefillGroup);
    } else {
      setNewItemGroupChoice('new');
      setNewGroupName(prefillGroup);
    }
    onPrefillConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillGroup]);

  const handleAdd = async () => {
    if (!newItemName.trim()) return;
    let groupName = null;
    if (newItemGroupChoice === 'new') groupName = newGroupName.trim() || null;
    else if (newItemGroupChoice !== 'none') groupName = newItemGroupChoice;

    const { error: err } = await supabase.from('shopping_items').insert({
      trip_id: trip.id,
      item_name: newItemName.trim(),
      group_name: groupName,
      assigned_to_family_id: newItemFamilyId === 'unassigned' ? null : newItemFamilyId,
      added_by: actingMember?.id || null,
    });
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setNewItemName('');
    if (newItemGroupChoice === 'new' && groupName) setNewItemGroupChoice(groupName);
    setNewGroupName('');
  };

  const handleToggle = async (item) => {
    const { error: err } = await supabase.from('shopping_items').update({ is_purchased: !item.is_purchased }).eq('id', item.id);
    if (err) setError(err.message);
  };

  const handleAssign = async (item, familyId) => {
    const { error: err } = await supabase
      .from('shopping_items')
      .update({ assigned_to_family_id: familyId === 'unassigned' ? null : familyId })
      .eq('id', item.id);
    if (err) setError(err.message);
  };

  const handleDelete = async (item) => {
    const { error: err } = await supabase.from('shopping_items').delete().eq('id', item.id);
    if (err) setError(err.message);
  };

  const renderItem = (item) => (
    <div
      key={item.id}
      style={{
        background: 'white', border: `1px solid ${PALETTE.sand}`, borderRadius: 12, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10, opacity: item.is_purchased ? 0.5 : 1,
      }}
    >
      <div
        onClick={() => canAct && handleToggle(item)}
        style={{
          width: 20, height: 20, borderRadius: 6, border: `2px solid ${PALETTE.teal}`,
          background: item.is_purchased ? PALETTE.teal : 'transparent', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, cursor: canAct ? 'pointer' : 'default',
        }}
      >
        {item.is_purchased && <Check size={13} color="white" />}
      </div>
      <div style={{ flex: 1, cursor: canAct ? 'pointer' : 'default', minWidth: 0 }} onClick={() => canAct && handleToggle(item)}>
        <div style={{ fontWeight: 600, fontSize: 14, textDecoration: item.is_purchased ? 'line-through' : 'none' }}>
          {item.item_name}
          {item.quantity > 1 ? ` ×${item.quantity}` : ''}
        </div>
      </div>
      <select
        value={item.assigned_to_family_id || 'unassigned'}
        onChange={(e) => handleAssign(item, e.target.value)}
        disabled={!canAct}
        style={{
          fontSize: 11, fontWeight: 700, padding: '5px 8px', borderRadius: 8,
          border: `1.5px solid ${item.assigned_to_family_id ? familyColorMap[item.assigned_to_family_id] : PALETTE.sand}`,
          color: item.assigned_to_family_id ? familyColorMap[item.assigned_to_family_id] : `${PALETTE.ink}77`,
          background: 'white', flexShrink: 0, maxWidth: 100,
        }}
      >
        <option value="unassigned">Unassigned</option>
        {families.map((f) => (
          <option key={f.id} value={f.id}>{f.family_name}</option>
        ))}
      </select>
      {canAct && (
        <button
          onClick={() => handleDelete(item)}
          title="Remove item"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, color: `${PALETTE.ink}55`, display: 'flex', alignItems: 'center' }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );

  const ungrouped = items.filter((s) => !s.group_name);

  return (
    <div>
      {canAct && (
        <div style={{ background: 'white', border: `1px solid ${PALETTE.sand}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
          <label className="field-label" style={{ textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 }}>What do you need?</label>
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="e.g. Tortillas, Beach towels"
            className="field-input"
            style={{ marginBottom: 14 }}
          />
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label className="field-label" style={{ textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 }}>Group with other items?</label>
              <select
                value={newItemGroupChoice}
                onChange={(e) => setNewItemGroupChoice(e.target.value)}
                className="field-input"
                style={{ background: 'white', fontSize: 13 }}
              >
                <option value="none">Keep it separate</option>
                {existingGroups.map((g) => (
                  <option key={g} value={g}>{`Add to "${g}"`}</option>
                ))}
                <option value="new">Start a new group...</option>
              </select>
              <div style={{ fontSize: 11, color: `${PALETTE.ink}66`, marginTop: 4 }}>
                Groups bundle related items, like "Taco night" or "Fire pit," under one heading.
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label className="field-label" style={{ textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 }}>Who's buying it?</label>
              <select value={newItemFamilyId} onChange={(e) => setNewItemFamilyId(e.target.value)} className="field-input" style={{ background: 'white', fontSize: 13 }}>
                <option value="unassigned">Not decided yet</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>{f.family_name}</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: `${PALETTE.ink}66`, marginTop: 4 }}>You can always reassign this later.</div>
            </div>
          </div>
          {newItemGroupChoice === 'new' && (
            <div style={{ marginBottom: 14 }}>
              <label className="field-label" style={{ textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 }}>New group name</label>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Taco night, Fire pit"
                className="field-input"
              />
            </div>
          )}
          {error && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button onClick={handleAdd} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Add item
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {existingGroups.map((g) => {
          const groupItems = items.filter((s) => s.group_name === g);
          if (groupItems.length === 0) return null;
          return (
            <div key={g}>
              <div style={{ fontSize: 13, fontWeight: 700, color: PALETTE.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ChevronDown size={14} /> {g}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 4, borderLeft: `2px solid ${PALETTE.sand}`, paddingLeft: 14 }}>
                {groupItems.map(renderItem)}
              </div>
            </div>
          );
        })}
        {ungrouped.length > 0 && (
          <div>
            {existingGroups.length > 0 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: `${PALETTE.ink}66`, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Other items
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{ungrouped.map(renderItem)}</div>
          </div>
        )}
        {items.length === 0 && <div style={{ fontSize: 14, color: `${PALETTE.ink}77` }}>Nothing on the list yet.</div>}
      </div>
    </div>
  );
}
