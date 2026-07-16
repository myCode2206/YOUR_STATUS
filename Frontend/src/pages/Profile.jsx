import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { usersAPI, activitiesAPI } from '../api';
import Avatar from '../components/ui/Avatar';
import Loader from '../components/ui/Loader';
import HeatmapChart from '../components/charts/HeatmapChart';
import TimelineView from '../components/charts/TimelineView';
import toast from 'react-hot-toast';
import { RiEdit2Line, RiCameraLine, RiCalendarLine } from 'react-icons/ri';

export default function Profile() {
  const { userId } = useParams();
  const { user: currentUser, updateUser } = useAuthStore();
  
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Analytics states
  const [heatmapData, setHeatmapData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [timelineDate, setTimelineDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    studyGoal: 8,
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef();

  const isMe = !userId || userId === currentUser?._id;

  useEffect(() => {
    if (isMe) {
      if (!currentUser) return; // wait for auth to load
      setProfileUser(currentUser);
      setFormData({
        displayName: currentUser?.displayName || '',
        bio: currentUser?.bio || '',
        studyGoal: currentUser?.studyGoal ? currentUser.studyGoal / 60 : 8,
      });
      setLoading(false); // ← was missing
      if (currentUser?._id) {
        fetchAnalytics(currentUser._id);
      }
    } else {
      fetchUserProfile(userId);
    }
  }, [userId, currentUser, isMe, timelineDate]);

  const fetchUserProfile = async (id) => {
    setLoading(true);
    try {
      const { data } = await usersAPI.getProfile(id);
      setProfileUser(data.user);
      await fetchAnalytics(id);
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (id) => {
    setLoadingAnalytics(true);
    try {
      const [heatmapRes, timelineRes] = await Promise.all([
        activitiesAPI.heatmap(id),
        activitiesAPI.timeline(timelineDate, id)
      ]);
      setHeatmapData(heatmapRes.data.data);
      setTimelineData(timelineRes.data.activities);
    } catch (err) {
      console.error('Failed to load analytics for user:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isMe) return;
    try {
      const { data } = await usersAPI.updateMe({
        displayName: formData.displayName,
        bio: formData.bio,
        studyGoal: formData.studyGoal * 60, // Convert hours back to mins
      });
      updateUser(data.user);
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };

  const handleAvatarUpload = async (e) => {
    if (!isMe) return;
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Please select an image file');
    }

    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('avatar', file);
      
      const { data } = await usersAPI.uploadAvatar(uploadData);
      updateUser(data.user);
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div className="page-container"><Loader text="Loading profile..." /></div>;
  if (!profileUser) return <div className="page-container">User not found.</div>;

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      {/* Header Profile Card */}
      <div className="card mb-6" style={{ position: 'relative', padding: 0, overflow: 'hidden' }}>
        <div style={{ height: 120, background: 'var(--gradient-fire)' }} />
        
        <div className="profile-header-content">
          <div style={{ position: 'relative' }}>
            <Avatar user={profileUser} size="2xl" className="profile-avatar" style={{ border: '4px solid var(--color-bg-card)' }} />
            {isMe && (
              <>
                <button 
                  className="btn btn-primary btn-icon" 
                  style={{ position: 'absolute', bottom: 0, right: 0, borderRadius: '50%', width: 32, height: 32, padding: 0 }}
                  onClick={() => fileInputRef.current.click()}
                  disabled={isUploading}
                >
                  {isUploading ? '⏳' : <RiCameraLine size={16} />}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" style={{ display: 'none' }} />
              </>
            )}
          </div>
          
          <div style={{ flex: 1, paddingBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{profileUser.displayName}</h1>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>@{profileUser.username}</div>
              </div>
              {isMe && (
                <button className="btn btn-ghost" onClick={() => setIsEditing(!isEditing)}>
                  <RiEdit2Line /> {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div style={{ padding: '0 32px 32px' }}>
          {isEditing && isMe ? (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--color-bg-elevated)', padding: 24, borderRadius: 'var(--radius-lg)' }}>
              <div className="input-group">
                <label className="input-label">Display Name</label>
                <input className="input" required value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Bio</label>
                <textarea className="input" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} maxLength={200} placeholder="Tell everyone what you're working towards..." />
              </div>
              <div className="input-group">
                <label className="input-label">Daily Goal (Hours)</label>
                <input type="number" className="input" required min="1" max="24" value={formData.studyGoal} onChange={e => setFormData({...formData, studyGoal: Number(e.target.value)})} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          ) : (
            <div style={{ fontSize: '1.1rem', color: profileUser.bio ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
              {profileUser.bio || (isMe ? 'No bio added yet.' : 'This user prefers to keep an air of mystery.')}
            </div>
          )}
        </div>
      </div>

      <div className="grid-2 mb-6">
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Gamer Stats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Level</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>{profileUser.level || 1}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>XP Points</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-warning)' }}>{profileUser.xp || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Current Streak</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-danger)' }}>🔥 {profileUser.streak || 0} days</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Badges & Achievements</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {(!profileUser.badges || profileUser.badges.length === 0) ? (
              <div style={{ color: 'var(--color-text-muted)' }}>No badges unlocked yet. Keep grinding! 💪</div>
            ) : (
              profileUser.badges.map(b => (
                <div key={b.id} style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, 
                  background: 'var(--color-bg-elevated)', padding: '16px', borderRadius: 'var(--radius-lg)', 
                  border: `1px solid ${b.color}40`, minWidth: 100 
                }}>
                  <div style={{ fontSize: '2rem', filter: `drop-shadow(0 0 10px ${b.color}60)` }}>{b.emoji}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: b.color }}>{b.name}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Activity Heatmap Card */}
      <div className="card mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Activity Heatmap</h3>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
            🔥 {profileUser.streak || 0} Day Streak
          </div>
        </div>
        {loadingAnalytics ? <Loader text="Loading heatmap..." /> : <HeatmapChart data={heatmapData} />}
      </div>

      {/* Daily Timeline Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Daily Activity Log</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-bg-elevated)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <RiCalendarLine style={{ color: 'var(--color-primary)' }} />
            <input 
              type="date" 
              value={timelineDate} 
              onChange={e => setTimelineDate(e.target.value)} 
              max={new Date().toISOString().split('T')[0]}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
        {loadingAnalytics ? <Loader text="Loading activity log..." /> : <TimelineView activities={timelineData} date={timelineDate} />}
      </div>
    </div>
  );
}
