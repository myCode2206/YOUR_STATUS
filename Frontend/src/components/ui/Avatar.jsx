export default function Avatar({ user, size = 'md', className = '' }) {
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
      {user?.avatar ? (
        <img
          src={user.avatar.startsWith('/') ? `http://localhost:8900${user.avatar}` : user.avatar}
          alt={user.displayName}
          className={`avatar ${sizeClass} ${className}`}
          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      ) : null}
      <div
        className={`avatar ${sizeClass} ${className}`}
        style={{
          display: user?.avatar ? 'none' : 'flex',
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
