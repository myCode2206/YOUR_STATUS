import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../api';
import useAuthStore from '../../store/authStore';
import useActivityStore from '../../store/activityStore';

export default function Avatar({ user, size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false);
  const { user: currentUser } = useAuthStore();
  const { currentActivity: activeActivity } = useActivityStore();

  useEffect(() => {
    setImgError(false);
  }, [user?.avatar]);

  const sizeClass = `avatar-${size}`;
  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.[0]?.toUpperCase() || '?';

  const isMe = currentUser && user && (currentUser._id === user._id);
  const currentActivity = isMe ? activeActivity : user?.currentActivity;

  const isStudying = !!currentActivity;
  const isPaused = !!currentActivity?.isPaused;
  const isOnline = isMe ? true : user?.isOnline;

  // Show dot only if we have online info or activity info
  const showDot = isOnline !== undefined || currentActivity !== undefined;

  let dotColor = '#9ca3af'; // default grey (offline/idle)
  let dotShadow = 'none';
  let dotAnimation = 'none';

  if (isOnline && !isStudying) {
    dotColor = '#22c55e'; // solid green for online (idle)
  } else if (isStudying) {
    if (isPaused) {
      dotColor = '#f59e0b'; // orange if paused
      dotShadow = '0 0 6px rgba(245, 158, 11, 0.7)';
    } else {
      dotColor = '#8b5cf6'; // purple if studying
      dotShadow = '0 0 8px rgba(139, 92, 246, 0.8)';
      dotAnimation = 'pulse 1.5s infinite'; // pulsing studying dot
    }
  }
  
  const dotTitle = isStudying
    ? `${currentActivity?.emoji || '📚'} ${currentActivity?.name || 'Studying'}${isPaused ? ' (Paused)' : ''}`
    : (isOnline ? 'Online (Idle)' : 'Offline');

  const wrapperClass = [
    'avatar-wrapper',
    sizeClass,
    isStudying ? (isPaused ? 'studying-paused' : 'studying') : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass}>
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
          className={`avatar ${sizeClass}`}
          onError={() => setImgError(true)}
        />
      ) : null}
      <div
        className={`avatar ${sizeClass}`}
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
            animation: dotAnimation,
          }}
        />
      )}
    </div>
  );
}
