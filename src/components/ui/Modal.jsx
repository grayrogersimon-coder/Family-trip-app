export default function Modal({ onClose, maxWidth = 420, zIndex = 50, padded = true, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,35,50,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex,
      }}
      onClick={onClose}
    >
      <div
        className="app-modal"
        style={{
          background: 'white',
          borderRadius: 18,
          maxWidth,
          width: '100%',
          overflow: padded ? 'visible' : 'hidden',
          padding: padded ? 28 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
