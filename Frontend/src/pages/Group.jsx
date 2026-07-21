import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useGroupStore from '../store/groupStore';
import useSocket from '../hooks/useSocket';
import { groupsAPI } from '../api';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { RiAddLine, RiFileCopyLine, RiUserAddLine, RiTrophyLine, RiGroupLine, RiFireFill } from 'react-icons/ri';
import Loader from '../components/ui/Loader';
import Skeleton from '../components/ui/Skeleton';

export default function GroupPage() {
  const { user, refreshUser } = useAuthStore();
  const {
    currentGroup,
    members,
    fetchGroup,
    fetchMembers,
    setGroup,
    leaderboard,
    leaderboardMeta,
    isLeaderboardLoading,
    fetchLeaderboard,
    isLoading,
  } = useGroupStore();
  const { joinGroup } = useSocket();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', inviteCode: '' });
  const [activeTab, setActiveTab] = useState('members'); // 'members' or 'leaderboard'
  const [period, setPeriod] = useState('daily');
  const navigate = useNavigate();

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getLiveDuration = (activity) => {
    if (!activity || !activity.startTime) return 0;
    const startMs = new Date(activity.startTime).getTime();
    const pausedSec = activity.totalPausedDuration || 0;
    if (activity.isPaused) {
      const pausedMs = new Date(activity.pausedAt).getTime();
      return Math.max(0, Math.floor((pausedMs - startMs) / 1000) - pausedSec);
    }
    return Math.max(0, Math.floor((Date.now() - startMs) / 1000) - pausedSec);
  };

  useEffect(() => {
    if (currentGroup?._id) {
      if (members.length === 0) fetchMembers(currentGroup._id);
      return;
    }
    if (user?.groups?.length > 0) {
      loadGroup(user.groups[0]._id || user.groups[0]);
    }
  }, [user, currentGroup?._id, members.length]);

  useEffect(() => {
    if (currentGroup?._id && activeTab === 'leaderboard') {
      fetchLeaderboard(currentGroup._id, period);
    }
  }, [currentGroup?._id, activeTab, period]);

  const loadGroup = async (id) => {
    await fetchGroup(id);
    await fetchMembers(id);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await groupsAPI.create({ name: formData.name, description: formData.description });
      toast.success('Group created!');
      await refreshUser();
      joinGroup(data.group._id);
      loadGroup(data.group._id);
      setShowCreate(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await groupsAPI.join(formData.inviteCode);
      toast.success('Joined group!');
      await refreshUser();
      joinGroup(data.group._id);
      loadGroup(data.group._id);
      setShowJoin(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join group');
    }
  };

  const formatDuration = (secs) => {
    if (!secs) return '0m';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

  if (!currentGroup && user?.groups?.length > 0) {
    return <Skeleton type="group" />;
  }

  if (!currentGroup && !user?.groups?.length) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>👥</div>
          <h2 style={{ marginBottom: 16 }}>You're not in a group</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32 }}>
            Accountability is key to success. Join a study group or create your own to dominate together.
          </p>
          <div style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create a Group</button>
            <button className="btn btn-ghost" onClick={() => setShowJoin(true)}>Join with Invite Code</button>
          </div>
        </div>
        
        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Group">
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Group Name</label>
              <input className="input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. The Elite Coders" />
            </div>
            <div className="input-group">
              <label className="input-label">Description (Optional)</label>
              <input className="input" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <button type="submit" className="btn btn-primary mt-4">Create</button>
          </form>
        </Modal>

        <Modal isOpen={showJoin} onClose={() => setShowJoin(false)} title="Join Group">
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Invite Code</label>
              <input className="input" required value={formData.inviteCode} onChange={e => setFormData({...formData, inviteCode: e.target.value})} style={{ textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', fontSize: '1.2rem' }} maxLength={8} />
            </div>
            <button type="submit" className="btn btn-primary mt-4">Join</button>
          </form>
        </Modal>
      </div>
    );
  }

  if (!currentGroup) return <Skeleton type="group" />;

  const onlineMembers = members.filter(m => m.isOnline).length;

  return (
    <div className="page-container">
      {/* Group Header */}
      <div className="glass-card mb-6" style={{ padding: 'var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderTop: '4px solid var(--color-primary)' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{currentGroup.name}</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>{currentGroup.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
            <div className="badge badge-primary">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
              {onlineMembers} Online
            </div>
            <div className="badge badge-warning">
              {members.length} Members
            </div>
          </div>
        </div>
        <div>
          <button className="btn btn-ghost" onClick={() => setShowInvite(true)}>
            <RiUserAddLine /> Invite Friends
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 24, gap: 24 }}>
        <button 
          onClick={() => setActiveTab('members')}
          style={{
            padding: '12px 4px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'members' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'members' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'members' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
          }}
        >
          <RiGroupLine /> Members ({members.length})
        </button>
        <button 
          onClick={() => setActiveTab('leaderboard')}
          style={{
            padding: '12px 4px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'leaderboard' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'leaderboard' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'leaderboard' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
          }}
        >
          <RiTrophyLine /> Leaderboard
        </button>
      </div>

      {activeTab === 'members' ? (
        <>
          <h3 style={{ marginBottom: 20 }}>Group Members</h3>
          <div className="grid-3">
            {[...members].sort((a, b) => {
              const aStudying = !!a.currentActivity && !a.currentActivity.isPaused;
              const bStudying = !!b.currentActivity && !b.currentActivity.isPaused;
              if (aStudying !== bStudying) return aStudying ? -1 : 1;

              const aPaused = !!a.currentActivity && a.currentActivity.isPaused;
              const bPaused = !!b.currentActivity && b.currentActivity.isPaused;
              if (aPaused !== bPaused) return aPaused ? -1 : 1;

              const aOnline = !!a.isOnline;
              const bOnline = !!b.isOnline;
              if (aOnline !== bOnline) return aOnline ? -1 : 1;

              return (a.displayName || '').localeCompare(b.displayName || '');
            }).map(member => (
              <div 
                key={member._id} 
                className="card" 
                style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => navigate(`/profile/${member._id}`)}
              >
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                  <Avatar user={member} size="lg" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }} className="truncate">{member.displayName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>@{member.username}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-warning)' }}>Lvl {member.level}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      🔥 {member.streak}
                    </div>
                  </div>
                </div>

                {/* Current Activity Display */}
                {member.currentActivity ? (
                  <div style={{ 
                    background: member.currentActivity.isPaused ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,107,0,0.1)', 
                    border: member.currentActivity.isPaused ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(255,107,0,0.2)', 
                    padding: '12px 16px', 
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>{member.currentActivity.isPaused ? '⏸️' : member.currentActivity.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {member.currentActivity.isPaused ? 'Paused' : 'Currently'}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {member.currentActivity.name}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono', color: member.currentActivity.isPaused ? '#f59e0b' : 'var(--color-primary-light)', fontWeight: 700 }}>
                      {formatDuration(getLiveDuration(member.currentActivity))}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    background: 'var(--color-bg-elevated)', 
                    border: '1px solid var(--color-border)', 
                    padding: '12px 16px', 
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.9rem'
                  }}>
                    Idle
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          {/* Leaderboard controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                Total study time: <strong style={{ color: 'var(--color-primary-light)' }}>{formatHours(leaderboardMeta?.totalGroupStudySeconds)}</strong>
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

          {/* Leaderboard list */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {isLeaderboardLoading ? (
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
      )}

      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite to Group">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20 }}>Share this code with your friends to let them join.</p>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 800, 
            letterSpacing: 4, 
            background: 'var(--color-bg-elevated)',
            border: '1px dashed var(--color-primary)',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 24,
            userSelect: 'all'
          }}>
            {currentGroup.inviteCode}
          </div>
          <button 
            className="btn btn-primary w-full"
            onClick={() => {
              navigator.clipboard.writeText(currentGroup.inviteCode);
              toast.success('Invite code copied to clipboard!');
            }}
          >
            <RiFileCopyLine /> Copy Code
          </button>
        </div>
      </Modal>
    </div>
  );
}
