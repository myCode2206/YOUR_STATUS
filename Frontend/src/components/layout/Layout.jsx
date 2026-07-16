import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import useActivityStore from '../../store/activityStore';
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
  const location = useLocation();
  useSocket(); // Initialize socket

  const title = pageTitles[location.pathname] || 'Your Status';

  useEffect(() => {
    // Always sync current activity on mount/navigation
    fetchCurrent();
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Navbar title={title} />
        <main style={{ padding: '0' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
