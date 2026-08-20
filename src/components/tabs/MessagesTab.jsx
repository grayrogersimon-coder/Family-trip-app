import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { myMembers, myActingCandidates } from '../../lib/identity';
import { PALETTE } from '../../lib/palette';
import { formatClock } from '../../lib/tripUtils';

export default function MessagesTab({ trip, messages, members, familyColorMap, userId, actingMember, canAct, refetch }) {
  const [text, setText] = useState('');
  const [sendAsId, setSendAsId] = useState(actingMember?.id || '');
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const mine = userId ? myMembers(members, userId).map((m) => m.id) : [];
  const candidates = userId ? myActingCandidates(members, userId) : [];

  useEffect(() => {
    if (actingMember && !sendAsId) setSendAsId(actingMember.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingMember]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const memberInfo = (memberId) => {
    const m = members.find((x) => x.id === memberId);
    if (!m) return { name: 'Someone', color: PALETTE.ink };
    return { name: m.display_name, color: familyColorMap[m.family_id] || PALETTE.ink };
  };

  const handleSend = async () => {
    if (!text.trim() || !sendAsId) return;
    const { error: err } = await supabase.from('messages').insert({
      trip_id: trip.id,
      sender_id: sendAsId,
      content: text.trim(),
    });
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setText('');
    refetch?.();
  };

  return (
    <div style={{ background: 'white', border: `1px solid ${PALETTE.sand}`, borderRadius: 14, display: 'flex', flexDirection: 'column', height: 420 }}>
      <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 13, color: `${PALETTE.ink}66`, textAlign: 'center', marginTop: 20 }}>
            No messages yet — say hi!
          </div>
        )}
        {messages.map((m) => {
          const isMe = mine.includes(m.sender_id);
          const info = memberInfo(m.sender_id);
          return (
            <div key={m.id} style={{ maxWidth: '75%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: info.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: info.color }}>{info.name}</span>
                <span style={{ fontSize: 10, color: `${PALETTE.ink}55` }}>{formatClock(m.created_at)}</span>
              </div>
              <div
                style={{
                  background: isMe ? info.color : PALETTE.cream,
                  color: isMe ? 'white' : PALETTE.ink,
                  padding: '10px 14px', borderRadius: 14, fontSize: 14,
                  borderLeft: isMe ? 'none' : `3px solid ${info.color}`,
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 14, borderTop: `1px solid ${PALETTE.sand}` }}>
        {error && <div style={{ color: PALETTE.coral, fontSize: 12, marginBottom: 8 }}>{error}</div>}
        {canAct ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {candidates.length > 1 && (
              <select
                value={sendAsId}
                onChange={(e) => setSendAsId(e.target.value)}
                style={{ flexShrink: 0, maxWidth: 110, padding: '10px 8px', borderRadius: 10, border: `1px solid ${PALETTE.sand}`, fontFamily: 'inherit', fontSize: 12, background: 'white' }}
              >
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>{c.display_name}</option>
                ))}
              </select>
            )}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message the group..."
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${PALETTE.sand}`, fontFamily: 'inherit', fontSize: 14 }}
            />
            <button onClick={handleSend} className="btn-primary" style={{ padding: '10px 18px' }}>Send</button>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: `${PALETTE.ink}66`, textAlign: 'center' }}>Only adults can send messages.</div>
        )}
      </div>
    </div>
  );
}
