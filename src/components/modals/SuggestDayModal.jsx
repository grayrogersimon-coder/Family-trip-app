import { useState } from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { PALETTE } from '../../lib/palette';
import { tripDayCount, dateForDayNumber } from '../../lib/tripUtils';

export default function SuggestDayModal({ trip, onClose, onSubmit }) {
  const [dayNumber, setDayNumber] = useState('');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const days = tripDayCount(trip);
  const useDaySelect = Boolean(trip.start_date && days > 0);
  const value = useDaySelect ? dayNumber : date;

  const handleSubmit = async () => {
    if (!value) return;
    setSubmitting(true);
    setError(null);
    try {
      const suggestedDate = useDaySelect ? dateForDayNumber(trip, Number(dayNumber)) : date;
      await onSubmit(suggestedDate);
      onClose();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={380} zIndex={55}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: PALETTE.teal, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
        <Calendar size={14} /> Suggest a day
      </div>
      <h3 className="heading-font" style={{ fontSize: 20, fontWeight: 600, marginBottom: 18 }}>Propose a different day for this</h3>
      {useDaySelect ? (
        <select value={dayNumber} onChange={(e) => setDayNumber(e.target.value)} className="field-input" style={{ marginBottom: 22, background: 'white' }}>
          <option value="">Pick a day</option>
          {Array.from({ length: days }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{`Day ${n}`}</option>
          ))}
        </select>
      ) : (
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" style={{ marginBottom: 22 }} />
      )}
      {error && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button onClick={handleSubmit} className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={!value || submitting}>
          {submitting ? 'Suggesting…' : 'Suggest'} <ArrowRight size={16} />
        </button>
      </div>
    </Modal>
  );
}
