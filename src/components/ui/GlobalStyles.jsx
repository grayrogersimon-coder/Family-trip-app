import { PALETTE } from '../../lib/palette';

export default function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; }
      .fraunces { font-family: 'Fraunces', serif; }
      .btn-primary {
        background: ${PALETTE.coral}; color: white; border: none; border-radius: 10px;
        padding: 14px 28px; font-weight: 600; font-size: 15px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 8px; transition: transform 0.15s, box-shadow 0.15s;
      }
      .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(232,115,74,0.35); }
      .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
      .btn-secondary {
        flex: 1; padding: 13px; border-radius: 10px; border: 2px solid ${PALETTE.sand};
        background: white; font-weight: 600; cursor: pointer; font-family: inherit;
      }
      .tab-btn {
        background: none; border: none; padding: 10px 16px; font-weight: 600; font-size: 14px;
        cursor: pointer; border-radius: 8px; display: flex; align-items: center; gap: 6px;
        color: ${PALETTE.ink}99; transition: all 0.15s;
      }
      .tab-btn.active { background: ${PALETTE.teal}; color: white; }
      input:focus, select:focus, textarea:focus { outline: none; border-color: ${PALETTE.coral} !important; }
      .app-modal { max-height: 88vh; overflow-y: auto; }
      .field-input {
        width: 100%; padding: 12px 14px; font-size: 15px; border: 2px solid ${PALETTE.sand};
        border-radius: 10px; font-family: inherit; color: ${PALETTE.ink}; background: white;
      }
      .field-label {
        font-size: 13px; font-weight: 600; color: ${PALETTE.teal}; display: block; margin-bottom: 8px;
      }
      @media (max-width: 480px) {
        .app-modal { padding: 20px !important; }
        .tab-btn { padding: 9px 12px; font-size: 13px; }
      }
    `}</style>
  );
}
