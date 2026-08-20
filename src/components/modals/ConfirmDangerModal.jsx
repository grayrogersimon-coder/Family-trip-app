import { AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { PALETTE } from '../../lib/palette';

export default function ConfirmDangerModal({ title, message, confirmLabel, onConfirm, onClose, busy, error, zIndex = 70 }) {
  return (
    <Modal onClose={onClose} maxWidth={380} zIndex={zIndex}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: '50%', background: `${PALETTE.coral}1a`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}
        >
          <AlertTriangle size={22} color={PALETTE.coral} />
        </div>
        <h3 className="fraunces" style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 14, color: `${PALETTE.ink}99`, marginBottom: 22 }}>{message}</p>
        {error && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1, padding: '13px', borderRadius: 10, border: 'none', background: PALETTE.coral, color: 'white',
              fontWeight: 700, fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
            }}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
