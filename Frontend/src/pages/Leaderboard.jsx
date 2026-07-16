import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useGroupStore from '../store/groupStore';
import { leaderboardAPI } from '../api';
import Avatar from '../components/ui/Avatar';
import Loader from '../components/ui/Loader';
import { RiFireFill } from 'react-icons/ri';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentGroup } = useGroupStore();
  const [period, setPeriod] = useState('daily');
  const [leaderboard, setLeaderboard] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentGroup) fetchLeaderboard();
  }, [currentGroup?._id, period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data } = await leaderboardAPI.get(currentGroup._id, period);
      setLeaderboard(data.leaderboard);
      setMeta(data.meta);
    } catch (e) {
      console.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (secs) => {
    if (!secs) return '0m 0s';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  if (!currentGroup) {
    return <div className="page-container">Join a group to view the leaderboard.</div>;
  }

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '2rem' }}>🏆</span>
            Group Leaderboard
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Total study time: <strong style={{ color: 'var(--color-primary-light)' }}>{formatHours(meta?.totalGroupStudySeconds)}</strong>
          </p>
        </div>
        
        <div style={{ display: 'flex', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)', padding: 4, border: '1px solid var(--color-border)' }}>
          {['daily', 'weekly', 'allTime'].map(p => (
            <button
              key={p}
              className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-md)', padding: '6px 16px', border: 'none' }}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1).replace('Time', ' Time')}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <Loader text="Fetching leaderboard..." />
        ) : leaderboard.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No activity found for this period.
          </div>
        ) : (
          leaderboard.map((member, index) => {
            const isMe = member._id === user._id;
            return (
              <div 
                key={member._id} 
                className={`leaderboard-item ${index < 3 ? `rank-${index + 1}` : ''}`}
                style={{ 
                  borderRadius: 0, 
                  borderBottom: index === leaderboard.length - 1 ? 'none' : '1px solid var(--color-border)',
                  background: isMe ? 'rgba(255, 107, 0, 0.05)' : undefined,
                  cursor: 'pointer'
                }}
                onClick={() => navigate(`/profile/${member._id}`)}
              >
                <div className="rank-badge" style={{ 
                  background: index === 0 ? 'var(--gradient-gold)' : index === 1 ? 'linear-gradient(135deg, #9ca3af, #6b7280)' : index === 2 ? 'linear-gradient(135deg, #d97706, #92400e)' : 'var(--color-bg-elevated)',
                  color: index < 3 ? 'white' : 'var(--color-text-secondary)'
                }}>
                  {index + 1}
                </div>
                
                <Avatar user={member} />
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{member.displayName}</span>
                    {isMe && <span className="badge badge-primary" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>YOU</span>}
                  </div>
                  
                  {member.currentActivity ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span className="animate-pulse">●</span> 
                      {member.currentActivity.emoji} {member.currentActivity.name}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Idle
                    </div>
                  )}
                </div>
                
                {/* Badges */}
                <div style={{ display: 'flex', gap: 6, marginRight: 16 }}>
                  {member.badges?.map(b => (
                    <div key={b.id} title={b.name} style={{ fontSize: '1.2rem', filter: `drop-shadow(0 0 4px ${b.color}40)` }}>
                      {b.emoji}
                    </div>
                  ))}
                </div>
                
                {/* Score / Stats */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '1.25rem', fontWeight: 800, color: index === 0 ? 'var(--color-warning)' : 'var(--color-text-primary)' }}>
                    {formatHours(member.score)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                    <RiFireFill style={{ color: 'var(--color-primary)' }} />
                    {member.streak} streak
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
