import { Navigation } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { PALETTE } from '../../lib/palette';

export default function DirectionsModal({ address, onClose }) {
  const handleConfirm = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving&dir_action=navigate`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <Modal onClose={onClose} maxWidth={380} zIndex={70}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: '50%', background: `${PALETTE.teal}1a`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}
        >
          <Navigation size={22} color={PALETTE.teal} />
        </div>
        <h3 className="heading-font" style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Open directions in Google Maps?</h3>
        <p style={{ fontSize: 14, color: `${PALETTE.ink}99`, marginBottom: 22 }}>{address}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1, padding: '13px', borderRadius: 10, border: 'none', background: PALETTE.teal, color: 'white',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Open Google Maps
          </button>
        </div>
      </div>
    </Modal>
  );
}
