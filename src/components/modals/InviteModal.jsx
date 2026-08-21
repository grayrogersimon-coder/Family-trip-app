import { useState } from 'react';
import { Users } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { PALETTE } from '../../lib/palette';

export default function InviteModal({ trip, onClose }) {
  const [copied, setCopied] = useState(false);
  const inviteLink = `${window.location.origin}/join/${trip.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      // clipboard API can be unavailable (e.g. insecure context); the link is still selectable/visible
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Modal onClose={onClose} maxWidth={420}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: PALETTE.teal, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
        <Users size={14} /> Invite a family
      </div>
      <h3 className="heading-font" style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Bring another family in</h3>
      <p style={{ fontSize: 14, color: `${PALETTE.ink}99`, marginBottom: 20 }}>
        Share this link. Anyone who opens it can join <strong>{trip.name}</strong> and add their own family group.
      </p>
      <div
        style={{
          background: PALETTE.cream,
          border: `1px dashed ${PALETTE.sand}`,
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', wordBreak: 'break-all' }}>{inviteLink}</span>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? PALETTE.teal : PALETTE.coral,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <a
        href={inviteLink}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '12px',
          borderRadius: 10,
          border: `2px solid ${PALETTE.sand}`,
          background: 'white',
          fontWeight: 600,
          fontFamily: 'inherit',
          fontSize: 13,
          color: PALETTE.teal,
          textDecoration: 'none',
        }}
      >
        Preview: what an invited family sees →
      </a>
    </Modal>
  );
}
