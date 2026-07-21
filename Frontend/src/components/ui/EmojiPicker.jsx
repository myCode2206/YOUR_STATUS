import { useEffect, useRef } from 'react';

const EMOJIS = [
  '😀', '😂', '🤣', '😊', '😍', '😘', '😎', '🤔', '😴', '😭',
  '😅', '😉', '🙃', '😇', '🥰', '😋', '🤗', '🤩', '🥳', '😤',
  '👍', '👎', '👏', '🙌', '🙏', '💪', '🤝', '✌️', '🤟', '👀',
  '🔥', '💯', '⭐', '✨', '🎉', '🚀', '💡', '📚', '☕', '⏰',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💖', '😢',
];

export default function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        marginBottom: 8,
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: 8,
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gap: 2,
        width: 300,
        zIndex: 30,
      }}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSelect(emoji); }}
          style={{
            fontSize: '1.15rem',
            padding: 4,
            borderRadius: 6,
            lineHeight: 1,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          className="emoji-btn"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
