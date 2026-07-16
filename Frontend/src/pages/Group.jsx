import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useGroupStore from '../store/groupStore';
import { groupsAPI } from '../api';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { RiAddLine, RiFileCopyLine, RiUserAddLine } from 'react-icons/ri';

export default function GroupPage() {
  const { user } = useAuthStore();
  const { currentGroup, members, fetchGroup, fetchMembers, setGroup } = useGroupStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', inviteCode: '' });
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.groups?.length > 0) {
      loadGroup(user.groups[0]._id || user.groups[0]);
    }
  }, [user]);

  const loadGroup = async (id) => {
    await fetchGroup(id);
    await fetchMembers(id);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await groupsAPI.create({ name: formData.name, description: formData.description });
      toast.success('Group created!');
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

  if (!currentGroup) return <div className="page-container">Loading group...</div>;

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

      {/* Members Grid */}
      <h3 style={{ marginBottom: 20 }}>Group Members ({members.length})</h3>
      <div className="grid-3">
        {members.map(member => (
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
                background: 'rgba(255,107,0,0.1)', 
                border: '1px solid rgba(255,107,0,0.2)', 
                padding: '12px 16px', 
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span style={{ fontSize: '1.5rem' }}>{member.currentActivity.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Currently</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{member.currentActivity.name}</div>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', color: 'var(--color-primary-light)', fontWeight: 700 }}>
                  {formatDuration(member.currentActivity.elapsed)}
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
