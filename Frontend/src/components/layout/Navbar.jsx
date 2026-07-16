import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiBellFill, RiSearchLine, RiCheckDoubleLine, RiMenuLine } from 'react-icons/ri';
import useAuthStore from '../../store/authStore';
import useActivityStore from '../../store/activityStore';
import { usersAPI } from '../../api';
import Avatar from '../ui/Avatar';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export default function Navbar({ title, setMobileMenuOpen }) {
  const { user } = useAuthStore();
  const { currentActivity, elapsedSeconds } = useActivityStore();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await usersAPI.notifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (e) {}
  };

  const markAllRead = async () => {
    await usersAPI.markNotificationsRead();
    setUnreadCount(0);
    setNotifications(n => n.map(x => ({ ...x, read: true })));
  };

  const formatElapsed = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <header className="navbar">
      <button 
        className="btn btn-ghost btn-icon mobile-menu-btn" 
        style={{ marginRight: 8 }}
        onClick={() => setMobileMenuOpen(true)}
      >
        <RiMenuLine size={20} />
      </button>

      {/* Title */}
      <h1 className="navbar-title-text" style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{title}</h1>

      {/* Live Status Pill — hidden on mobile */}
      {currentActivity && (
        <div className="navbar-live-pill" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255,107,0,0.1)',
          border: '1px solid rgba(255,107,0,0.25)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--color-primary-light)',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)', display: 'inline-block' }} />
          <span>{currentActivity.emoji} {currentActivity.name}</span>
          <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--color-warning)', fontSize: '0.75rem' }}>
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>
      )}

      <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Streak */}
        {user?.streak !== undefined && (
          <div 
            onClick={() => navigate('/profile')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              fontSize: '0.9rem', 
              fontWeight: 700, 
              color: 'var(--color-danger)', 
              cursor: 'pointer',
              background: 'rgba(239, 68, 68, 0.08)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
            }}
            title={`${user.streak} day study streak!`}
          >
            🔥 <span>{user.streak}</span>
          </div>
        )}

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) fetchNotifications(); }}
          >
            <RiBellFill size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--color-secondary)',
                fontSize: '0.65rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--color-bg-surface)',
                color: 'white',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowNotifs(false)} />
              <div className="notif-dropdown" style={{
                position: 'absolute', top: '48px', right: 0,
                width: 360, maxHeight: 480,
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden', zIndex: 50,
                animation: 'slideUp 0.2s ease',
              }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button className="btn btn-ghost btn-sm" style={{ gap: 6 }} onClick={markAllRead}>
                      <RiCheckDoubleLine size={14} /> Mark all read
                    </button>
                  )}
                </div>
                <div style={{ overflowY: 'auto', maxHeight: 400 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔔</div>
                      No notifications yet
                    </div>
                  ) : notifications.map(n => (
                    <div key={n._id} style={{
                      padding: '12px 20px',
                      borderBottom: '1px solid var(--color-border)',
                      background: n.read ? 'transparent' : 'rgba(255,107,0,0.04)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}>
                      <div style={{ fontWeight: n.read ? 400 : 600, fontSize: '0.875rem', marginBottom: 2 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        {dayjs(n.createdAt).fromNow()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar */}
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <Avatar user={user} size="sm" />
        </button>
      </div>
    </header>
  );
}
