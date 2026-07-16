import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../api';

export default function Avatar({ user, size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [user?.avatar]);

  const sizeClass = `avatar-${size}`;
  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.[0]?.toUpperCase() || '?';

  const isStudying = !!user?.currentActivity;
  const isOnline = user?.isOnline;

  // Show dot only if we have online info or activity info
  const showDot = isOnline !== undefined || user?.currentActivity !== undefined;

  const dotColor = isStudying ? '#22c55e' : '#6b7280'; // green if studying, grey if idle
  const dotShadow = isStudying ? '0 0 6px rgba(34, 197, 94, 0.7)' : 'none';
  const dotTitle = isStudying
    ? `${user.currentActivity?.emoji || '📚'} ${user.currentActivity?.name || 'Studying'}`
    : 'Idle';

  return (
    <div className="avatar-wrapper">
      {user?.avatar && !imgError ? (
        <img
          src={user.avatar.startsWith('/') ? `${BACKEND_URL}${user.avatar}` : user.avatar}
          alt={user.displayName}
          className={`avatar ${sizeClass} ${className}`}
          onError={() => setImgError(true)}
        />
      ) : null}
      <div
        className={`avatar ${sizeClass} ${className}`}
        style={{
          display: (!user?.avatar || imgError) ? 'flex' : 'none',
          background: `var(--gradient-fire)`,
        }}
      >
        {initials}
      </div>
      {showDot && (
        <span
          className="status-dot"
          title={dotTitle}
          style={{
            background: dotColor,
            boxShadow: dotShadow,
            animation: isStudying ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        />
      )}
    </div>
  );
}
