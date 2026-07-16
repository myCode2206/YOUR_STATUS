import { useState } from 'react';
import { RiCloseLine, RiFireLine } from 'react-icons/ri';
import useActivityStore from '../../store/activityStore';
import toast from 'react-hot-toast';

export default function StatusPicker({ onClose }) {
  const { startActivity, isLoading, currentActivity } = useActivityStore();
  const [heading, setHeading] = useState('');
  const [description, setDescription] = useState('');

  const handleStart = async () => {
    if (!heading.trim()) {
      toast.error('Please enter a heading for your study session!');
      return;
    }

    const activity = {
      name: heading,
      notes: description,
      category: 'study', // Hardcoded as requested
      emoji: '📚', // Default emoji for study
    };

    const result = await startActivity(activity);
    if (result.success) {
      toast.success(`🔥 Started: ${activity.name}`, {
        style: {
          background: 'var(--color-bg-elevated)',
          color: 'var(--color-text-primary)',
          border: '1px solid rgba(255,107,0,0.3)',
        },
      });
      onClose();
    } else {
      toast.error(result.message || 'Failed to start activity');
    }
  };

  return (
    <div className="status-picker-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="status-picker-modal" style={{ maxWidth: 500, padding: 32 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RiFireLine style={{ color: 'var(--color-primary)' }} />
              Start Studying
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Being an ordinary is not an option 💥
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ alignSelf: 'flex-start' }}>
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Current Activity Banner */}
        {currentActivity && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255,107,0,0.08)',
            border: '1px solid rgba(255,107,0,0.2)',
            marginBottom: 24,
            fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 10px var(--color-primary)' }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>Currently:</span>
            <span style={{ fontWeight: 600 }}>{currentActivity.name}</span>
            
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ marginLeft: 'auto', color: 'var(--color-danger)' }}
              onClick={async () => {
                await useActivityStore.getState().stopActivity();
                toast.success('Activity stopped. You are now idle.');
                onClose();
              }}
            >
              Stop & Go Idle
            </button>
          </div>
        )}

        {/* Simple Input Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="input-label" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Topic / Heading <span style={{color: 'var(--color-danger)'}}>*</span></label>
            <input
              className="input"
              style={{ fontSize: '1.1rem', padding: '12px 16px' }}
              placeholder="e.g. Data Structures, Physics Chapter 3..."
              value={heading}
              onChange={e => setHeading(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Description <span style={{color: 'var(--color-text-muted)', fontWeight: 400}}>(Optional)</span></label>
            <textarea
              className="input"
              style={{ minHeight: 80, padding: '12px 16px' }}
              placeholder="Add more details about what you're working on..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{
              flex: 2,
              background: 'var(--gradient-fire)',
              boxShadow: 'var(--shadow-glow-primary)',
              fontSize: '1.1rem',
              fontWeight: 700,
              padding: '12px 0'
            }}
            onClick={handleStart}
            disabled={isLoading || !heading.trim()}
          >
            {isLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                <RiFireLine size={20} />
                START STUDYING 🔥
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
