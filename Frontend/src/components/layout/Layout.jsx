import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import useActivityStore from '../../store/activityStore';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useSocket from '../../hooks/useSocket';

const pageTitles = {
  '/dashboard': '🔥 Dashboard',
  '/group': '👥 My Group',
  '/leaderboard': '🏆 Leaderboard',
  '/feed': '📰 Feed',
  '/analytics': '📊 Analytics',
  '/profile': '👤 Profile',
  '/settings': '⚙️ Settings',
};

export default function Layout({ children }) {
  const { fetchCurrent } = useActivityStore();
  const { user } = useAuthStore();
  const { currentGroup, fetchGroup, fetchMembers } = useGroupStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useSocket(); // Initialize socket

  const title = pageTitles[location.pathname] || 'Your Status';

  useEffect(() => {
    if (user?.groups?.length > 0 && !currentGroup) {
      const groupId = user.groups[0]._id || user.groups[0];
      fetchGroup(groupId);
      fetchMembers(groupId);
    }
  }, [user, currentGroup]);

  useEffect(() => {
    // Always sync current activity on mount/navigation
    fetchCurrent();
    // Close mobile menu on route change
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <div className="main-content">
        <Navbar 
          title={title} 
          setMobileMenuOpen={setMobileMenuOpen} 
        />
        <main style={{ padding: '0' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
