import { useMemo, useState } from 'react';

export default function TimelineView({ activities = [], date }) {
  const [activeActivity, setActiveActivity] = useState(null);

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDuration = (secs) => {
    if (!secs) return '0s';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    
    return parts.join(' ');
  };

  const processed = useMemo(() => {
    if (!activities || activities.length === 0) return [];
    
    // Sort activities chronologically
    const sorted = [...activities].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    const list = [];
    
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      list.push(current);
      
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        if (current.endTime) {
          const currentEnd = new Date(current.endTime);
          const nextStart = new Date(next.startTime);
          const gapMs = nextStart - currentEnd;
          
          if (gapMs >= 1000) { // Gap greater than 1 second
            const gapSecs = Math.floor(gapMs / 1000);
            list.push({
              name: 'Idle',
              emoji: '💤',
              category: 'idle',
              startTime: current.endTime,
              endTime: next.startTime,
              duration: gapSecs,
              durationFormatted: formatDuration(gapSecs),
              isIdle: true,
            });
          }
        }
      }
    }
    return list;
  }, [activities]);

  if (!processed.length) {
    return (
      <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
        <div>No activities recorded for this day</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ overflowX: 'auto', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', marginTop: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 500 }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.85rem', width: '80px' }}>Sr no</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Name</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Start Time</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>End Time</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.85rem', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {processed.map((a, index) => {
              const rowStyle = a.isIdle 
                ? { borderBottom: '1px solid var(--color-border)', background: 'rgba(255, 255, 255, 0.01)', opacity: 0.7 } 
                : { borderBottom: '1px solid var(--color-border)' };

              const hasDescription = !a.isIdle && !!a.notes;

              return (
                <tr key={index} style={rowStyle}>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>
                    {index + 1}
                  </td>
                  <td 
                    style={{ 
                      padding: '12px 16px', 
                      fontWeight: a.isIdle ? 400 : 600, 
                      color: a.isIdle ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                      cursor: hasDescription ? 'pointer' : 'default',
                      textDecoration: hasDescription ? 'underline' : 'none',
                      textDecorationColor: 'rgba(255,255,255,0.1)'
                    }}
                    onClick={() => hasDescription && setActiveActivity(a)}
                  >
                    <span style={{ marginRight: 8 }}>{a.emoji}</span>
                    {a.name}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    {formatTime(a.startTime)}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    {a.endTime ? formatTime(a.endTime) : <span style={{ color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><span className="animate-pulse">●</span> Ongoing</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 700, color: a.isIdle ? 'var(--color-text-muted)' : 'var(--color-primary-light)' }}>
                    {a.duration ? formatDuration(a.duration) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Activity Details Modal */}
      {activeActivity && (
        <div 
          className="status-picker-overlay" 
          onClick={(e) => e.target === e.currentTarget && setActiveActivity(null)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div className="status-picker-modal" style={{ maxWidth: 450, padding: 28, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Activity Details</h3>
              <button 
                className="btn btn-ghost" 
                style={{ minWidth: 'auto', padding: '4px 8px', fontSize: '1.2rem' }}
                onClick={() => setActiveActivity(null)}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: '2.5rem' }}>{activeActivity.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>{activeActivity.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    Category: <span style={{ textTransform: 'capitalize' }}>{activeActivity.category}</span>
                  </div>
                </div>
              </div>
              
              <div style={{ background: 'var(--color-bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div><strong>Start:</strong> {formatTime(activeActivity.startTime)}</div>
                <div><strong>End:</strong> {activeActivity.endTime ? formatTime(activeActivity.endTime) : 'Ongoing'}</div>
                <div><strong>Duration:</strong> {activeActivity.duration ? formatDuration(activeActivity.duration) : '-'}</div>
              </div>

              {activeActivity.notes && (
                <div>
                  <strong style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Description:</strong>
                  <div style={{ 
                    background: 'rgba(255, 107, 0, 0.05)', 
                    border: '1px solid rgba(255, 107, 0, 0.1)', 
                    padding: 14, 
                    borderRadius: 'var(--radius-md)', 
                    fontStyle: 'italic', 
                    color: 'var(--color-text-primary)', 
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5
                  }}>
                    "{activeActivity.notes}"
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
