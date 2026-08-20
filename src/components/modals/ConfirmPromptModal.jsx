import { Check, ShoppingBag } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { PALETTE } from '../../lib/palette';

export default function ConfirmPromptModal({ activity, onClose, onAddItems }) {
  return (
    <Modal onClose={onClose} maxWidth={380} zIndex={60}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: '50%', background: PALETTE.teal, display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}
        >
          <Check size={22} color="white" />
        </div>
        <h3 className="fraunces" style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>"{activity.title}" confirmed</h3>
        <p style={{ fontSize: 14, color: `${PALETTE.ink}99`, marginBottom: 22 }}>
          Want to add any items to the Shopping List?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={onClose}>No thanks</button>
          <button onClick={() => onAddItems(activity)} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            <ShoppingBag size={16} /> Add items
          </button>
        </div>
      </div>
    </Modal>
  );
}
