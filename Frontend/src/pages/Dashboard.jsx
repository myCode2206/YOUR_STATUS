import { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore';
import useActivityStore from '../store/activityStore';
import { usersAPI } from '../api';
import { RiFireFill, RiTimeLine, RiBarChart2Fill, RiFlashlightFill, RiPlayLine, RiPauseLine, RiCloseLine } from 'react-icons/ri';
import ProgressRing from '../components/charts/ProgressRing';
import WeeklyBarChart from '../components/charts/WeeklyBarChart';
import StatusPicker from '../components/activity/StatusPicker';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, updateUser } = useAuthStore();
  const { currentActivity, getElapsedFormatted, pauseActivity, resumeActivity } = useActivityStore();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await usersAPI.myStats();
      setStats(data.stats);
      // Sync fresh streak + XP into auth store so Navbar badge updates
      if (data.stats) {
        updateUser({
          streak: data.stats.streak,
          xp: data.stats.xp,
          level: data.stats.level,
        });
      }
    } catch (e) {
      toast.error('Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const formatHours = (secs) => {
    if (!secs) return '0h 0m';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  const handleToggle = async () => {
    if (toggleLoading) return;
    if (currentActivity) {
      setToggleLoading(true);
      try {
        const result = await useActivityStore.getState().stopActivity();
        if (result.success) {
          toast.success('Activity stopped. You are now idle. 💤');
          await fetchStats();
        } else {
          toast.error('Failed to stop activity');
        }
      } catch (err) {
        toast.error('Failed to stop activity');
      } finally {
        setToggleLoading(false);
      }
    } else {
      setShowPicker(true);
    }
  };

  return (
    <div className="page-container">
      <div className="dashboard-top-grid mb-6">
        
        {/* Main Status Card */}
        <div className="current-activity-card dashboard-status-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                Current Status
              </div>
              {currentActivity ? (
                <>
                  <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>{currentActivity.emoji}</span>
                    {currentActivity.name}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <div className="activity-timer" style={{
                      opacity: currentActivity.isPaused ? 0.5 : 1,
                      transition: 'opacity 0.3s ease',
                    }}>
                      {getElapsedFormatted()}
                    </div>
                    {currentActivity.isPaused ? (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(245, 158, 11, 0.12)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                      }}>
                        PAUSED
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(34, 197, 94, 0.12)',
                        color: '#22c55e',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#22c55e',
                          display: 'inline-block',
                          animation: 'pulse 1.5s infinite'
                        }} />
                        LIVE
                      </span>
                    )}
                  </div>

                  {/* Pause / Resume & Stop Controls */}
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    {currentActivity.isPaused ? (
                      <button
                        className="btn btn-sm"
                        onClick={async () => {
                          const result = await resumeActivity();
                          if (result.success) {
                            toast.success('Study session resumed! 🔥');
                          } else {
                            toast.error(result.message || 'Failed to resume session');
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 700,
                          background: 'rgba(34, 197, 94, 0.1)',
                          color: '#22c55e',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          padding: '6px 12px',
                          cursor: 'pointer',
                        }}
                      >
                        <RiPlayLine size={16} />
                        Resume
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm"
                        onClick={async () => {
                          const result = await pauseActivity();
                          if (result.success) {
                            toast.success('Study session paused.');
                          } else {
                            toast.error(result.message || 'Failed to pause session');
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 700,
                          background: 'rgba(245, 158, 11, 0.1)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          padding: '6px 12px',
                          cursor: 'pointer',
                        }}
                      >
                        <RiPauseLine size={16} />
                        Pause
                      </button>
                    )}

                    <button
                      className="btn btn-sm"
                      onClick={handleToggle}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: 'var(--color-danger)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        background: 'rgba(239, 68, 68, 0.05)',
                        fontWeight: 700,
                        padding: '6px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      <RiCloseLine size={16} />
                      Stop
                    </button>
                  </div>

                  {currentActivity.notes && (
                    <div style={{ marginTop: 16, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                      "{currentActivity.notes}"
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '20px 0', color: 'var(--color-text-muted)' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: 8 }}>You're currently idle.</div>
                  <div>Start tracking to build your streak!</div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: currentActivity ? 'var(--color-text-muted)' : 'var(--color-primary-light)' }}>Idle</span>
              
              <button 
                onClick={handleToggle}
                disabled={toggleLoading}
                style={{
                  width: 64,
                  height: 32,
                  borderRadius: 16,
                  background: currentActivity ? 'var(--gradient-fire)' : 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-strong)',
                  position: 'relative',
                  cursor: toggleLoading ? 'not-allowed' : 'pointer',
                  padding: 0,
                  transition: 'all 0.3s ease',
                  boxShadow: currentActivity ? 'var(--shadow-glow-primary)' : 'none',
                  opacity: toggleLoading ? 0.7 : 1,
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: 3,
                  left: currentActivity ? 35 : 3,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {toggleLoading ? (
                    <span className="animate-spin" style={{ display: 'inline-block', fontSize: '0.75rem', color: 'var(--color-primary)' }}>⏳</span>
                  ) : (
                    currentActivity ? '📚' : '💤'
                  )}
                </div>
              </button>

              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: currentActivity ? 'var(--color-primary-light)' : 'var(--color-text-muted)' }}>Studying</span>
            </div>
          </div>
        </div>

        {/* Daily Goal Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h3 style={{ marginBottom: 20 }}>Daily Goal</h3>
          {statsLoading ? (
            <Loader size="sm" />
          ) : (
            <>
              <ProgressRing progress={stats?.goalProgress || 0} size={140} />
              <div style={{ marginTop: 20, color: 'var(--color-text-secondary)' }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>{formatHours(stats?.today?.studySeconds)}</strong> / {Math.floor((stats?.studyGoal || 480) / 60)}h
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 mb-6">
        <div className="stat-card">
          <RiFireFill className="stat-icon" style={{ color: 'var(--color-primary)' }} />
          <div className="stat-value text-primary-color">
            {statsLoading ? '—' : (stats?.streak || 0)}
          </div>
          <div className="stat-label">Day Streak</div>
        </div>
        <div className="stat-card">
          <RiTimeLine className="stat-icon" style={{ color: 'var(--color-success)' }} />
          <div className="stat-value text-success">
            {statsLoading ? '—' : formatHours(stats?.today?.productiveSeconds)}
          </div>
          <div className="stat-label">Productive Today</div>
        </div>
        <div className="stat-card">
          <RiBarChart2Fill className="stat-icon" style={{ color: 'var(--color-info)' }} />
          <div className="stat-value text-info">
            {statsLoading ? '—' : (stats?.today?.sessions || 0)}
          </div>
          <div className="stat-label">Study Sessions</div>
        </div>
        <div className="stat-card">
          <RiFlashlightFill className="stat-icon" style={{ color: 'var(--color-warning)' }} />
          <div className="stat-value text-warning">
            {statsLoading ? '—' : (stats?.xp || 0)}
          </div>
          <div className="stat-label">Total XP</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Last 7 Days</h3>
          {statsLoading ? (
            <Loader size="sm" text="Loading chart..." />
          ) : (
            stats?.weekly?.days ? <WeeklyBarChart days={stats.weekly.days} /> : (
              <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>No data yet</div>
            )
          )}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Motivation</h3>
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 20px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 20 }}>🔥</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontStyle: 'italic', background: 'var(--gradient-fire)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              "Being an ordinary is not an option"
            </div>
            <div style={{ marginTop: 20, color: 'var(--color-text-secondary)' }}>
              Keep pushing. Every minute counts towards your goal.
            </div>
          </div>
        </div>
      </div>

      {showPicker && <StatusPicker onClose={() => { setShowPicker(false); fetchStats(); }} />}
    </div>
  );
}
