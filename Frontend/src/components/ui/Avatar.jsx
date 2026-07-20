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
  const isPaused = !!user?.currentActivity?.isPaused;
  const isOnline = user?.isOnline;

  // Show dot only if we have online info or activity info
  const showDot = isOnline !== undefined || user?.currentActivity !== undefined;

  let dotColor = '#6b7280'; // grey if idle
  let dotShadow = 'none';
  if (isStudying) {
    if (isPaused) {
      dotColor = '#f59e0b'; // orange if paused
      dotShadow = '0 0 6px rgba(245, 158, 11, 0.7)';
    } else {
      dotColor = '#22c55e'; // green if studying
      dotShadow = '0 0 6px rgba(34, 197, 94, 0.7)';
    }
  }
  
  const dotTitle = isStudying
    ? `${user.currentActivity?.emoji || '📚'} ${user.currentActivity?.name || 'Studying'}${isPaused ? ' (Paused)' : ''}`
    : 'Idle';

  return (
    <div className="avatar-wrapper">
      {user?.avatar && !imgError ? (
        <img
          src={
            // data URI (new base64 format) or full https URL (Google OAuth avatar) → use as-is
            user.avatar.startsWith('data:') || user.avatar.startsWith('http')
              ? user.avatar
              // Legacy local /uploads/ path → prepend backend URL
              : `${BACKEND_URL}${user.avatar}`
          }
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
            animation: isStudying && !isPaused ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        />
      )}
    </div>
  );
}
