import { useState } from 'react';
import { Calendar, Check } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { PALETTE } from '../../lib/palette';
import { tripDayCount, dateForDayNumber } from '../../lib/tripUtils';

export default function ProposeActivityModal({
  trip,
  onClose,
  onSubmit,
  eyebrow = 'New activity',
  heading = 'Propose something to do',
  submitLabel = 'Propose',
  submittingLabel = 'Proposing…',
}) {
  const [title, setTitle] = useState('');
  const [dayNumber, setDayNumber] = useState('');
  const [date, setDate] = useState('');
  const [period, setPeriod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const days = tripDayCount(trip);
  const useDaySelect = Boolean(trip.start_date && days > 0);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const activityDate = useDaySelect
        ? (dayNumber ? dateForDayNumber(trip, Number(dayNumber)) : null)
        : (date || null);
      await onSubmit({ title: title.trim(), activityDate, period });
      onClose();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={420} zIndex={50}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: PALETTE.teal, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
        <Calendar size={14} /> {eyebrow}
      </div>
      <h3 className="heading-font" style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>{heading}</h3>
      <label className="field-label">What's the idea?</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Kayaking at the lagoon"
        className="field-input"
        style={{ marginBottom: 18 }}
      />
      <label className="field-label">When (optional)</label>
      {useDaySelect ? (
        <select value={dayNumber} onChange={(e) => setDayNumber(e.target.value)} className="field-input" style={{ marginBottom: 18, background: 'white' }}>
          <option value="">Unscheduled</option>
          {Array.from({ length: days }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{`Day ${n}`}</option>
          ))}
        </select>
      ) : (
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" style={{ marginBottom: 18 }} />
      )}
      <label className="field-label">Time of day (optional)</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['AM', 'PM'].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(period === p ? null : p)}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
              border: `2px solid ${period === p ? PALETTE.teal : PALETTE.sand}`,
              background: period === p ? PALETTE.teal : 'white',
              color: period === p ? 'white' : PALETTE.ink,
            }}
          >
            {p}
          </button>
        ))}
      </div>
      {error && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button onClick={handleSubmit} className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={!title.trim() || submitting}>
          {submitting ? submittingLabel : submitLabel} <Check size={16} />
        </button>
      </div>
    </Modal>
  );
}
