import { useEffect, useRef } from 'react';
import { RiCloseLine } from 'react-icons/ri';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 480 }) {
  const overlayRef = useRef();

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <RiCloseLine size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
