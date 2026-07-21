import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useActivityStore from '../../store/activityStore';
import toast from 'react-hot-toast';
import {
  RiDashboardFill, RiGroupFill, RiBarChart2Fill, RiTrophyFill,
  RiNewspaperFill, RiUserFill, RiSettings3Fill, RiLogoutBoxRFill,
  RiFireFill, RiAddCircleFill, RiMenuFold2Line, RiMenuUnfold2Line,
  RiBellFill, RiTimeLine,
} from 'react-icons/ri';
import Avatar from '../ui/Avatar';
import StatusPicker from '../activity/StatusPicker';

const navItems = [
  { to: '/dashboard', icon: RiDashboardFill, label: 'Dashboard' },
  { to: '/group', icon: RiGroupFill, label: 'My Group' },
  { to: '/feed', icon: RiNewspaperFill, label: 'Feed' },
  { to: '/analytics', icon: RiBarChart2Fill, label: 'Analytics' },
  { to: '/profile', icon: RiUserFill, label: 'Profile' },
];

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen, collapsed, setCollapsed }) {
  const { user, logout } = useAuthStore();
  const { currentActivity } = useActivityStore();
  const [showPicker, setShowPicker] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`} style={{ width: collapsed ? '68px' : 'var(--sidebar-width)' }}>
        {/* Header */}
        <div className="sidebar-header" style={collapsed ? { padding: '16px 8px', flexDirection: 'column', gap: 10 } : undefined}>
          <div className="sidebar-logo"><img src="/favicon.png" alt="YOUR STATUS" /></div>
          {!collapsed && (
            <div>
              <div className="sidebar-logo-text">YOUR STATUS</div>
            </div>
          )}
          <button
            className="btn btn-ghost btn-icon desktop-collapse-btn"
            style={{ marginLeft: collapsed ? 0 : 'auto', flexShrink: 0 }}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <RiMenuUnfold2Line size={16} /> : <RiMenuFold2Line size={16} />}
          </button>
        </div>

        {/* Quick Status Change */}
        <div style={{ 
          padding: collapsed ? '12px 2px' : '12px 12px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 8 
        }}>
          {!collapsed && (
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: currentActivity ? 'var(--color-text-muted)' : 'var(--color-primary-light)' }}>Idle</span>
          )}
          
          <button 
            onClick={async () => {
              if (toggleLoading) return;
              if (currentActivity) {
                setToggleLoading(true);
                try {
                  await useActivityStore.getState().stopActivity();
                  toast.success('Activity stopped. You are now idle.');
                } catch (e) {
                  toast.error('Failed to stop activity');
                } finally {
                  setToggleLoading(false);
                }
              } else {
                setShowPicker(true);
              }
            }}
            disabled={toggleLoading}
            style={{
              width: collapsed ? 44 : 56,
              height: collapsed ? 24 : 28,
              borderRadius: 14,
              background: currentActivity ? (currentActivity.isPaused ? '#f59e0b' : 'var(--gradient-fire)') : 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-strong)',
              position: 'relative',
              cursor: toggleLoading ? 'not-allowed' : 'pointer',
              padding: 0,
              transition: 'all 0.3s ease',
              boxShadow: currentActivity ? (currentActivity.isPaused ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'var(--shadow-glow-primary)') : 'none',
              opacity: toggleLoading ? 0.7 : 1
            }}
            title={collapsed ? (currentActivity ? 'Go Idle' : 'Start Studying') : undefined}
          >
            <div style={{
              width: collapsed ? 18 : 22,
              height: collapsed ? 18 : 22,
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: 2,
              left: currentActivity ? (collapsed ? 22 : 30) : 2,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: collapsed ? '0.65rem' : '0.75rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              {toggleLoading ? (
                <span className="animate-spin" style={{ display: 'inline-block', fontSize: collapsed ? '0.6rem' : '0.7rem', color: 'var(--color-primary)' }}>⏳</span>
              ) : (
                currentActivity ? (currentActivity.isPaused ? '⏸️' : '📚') : '💤'
              )}
            </div>
          </button>

          {!collapsed && (
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: currentActivity ? (currentActivity.isPaused ? '#f59e0b' : 'var(--color-primary-light)') : 'var(--color-text-muted)' }}>
              {currentActivity ? (currentActivity.isPaused ? 'Paused' : 'Studying') : 'Studying'}
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {!collapsed && <div className="nav-section-label">Navigation</div>}
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : undefined }}
              title={collapsed ? label : undefined}
            >
              <span className="nav-icon"><Icon size={18} /></span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom user section */}
        <div className="sidebar-bottom">
          {!collapsed && currentActivity && (
            <div style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,107,0,0.08)',
              border: '1px solid rgba(255,107,0,0.2)',
              marginBottom: '12px',
              fontSize: '0.8rem',
            }}>
              <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Now</div>
              <div style={{ fontWeight: 600, color: currentActivity.isPaused ? '#f59e0b' : 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{currentActivity.isPaused ? '⏸️' : currentActivity.emoji}</span>
                <span className="truncate">
                  {currentActivity.name}
                  {currentActivity.isPaused && <span style={{ fontSize: '0.7rem', color: '#f59e0b', marginLeft: 4 }}>(Paused)</span>}
                </span>
              </div>
            </div>
          )}

          <div className="sidebar-user" onClick={() => navigate('/profile')}>
            <Avatar user={user} size="sm" />
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }} className="truncate">
                  {user?.displayName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }} className="truncate">
                  @{user?.username}
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              className="nav-item w-full"
              style={{ color: 'var(--color-danger)', marginTop: '4px' }}
              onClick={handleLogout}
            >
              <span className="nav-icon"><RiLogoutBoxRFill size={18} /></span>
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {showPicker && <StatusPicker onClose={() => setShowPicker(false)} />}
    </>
  );
}
