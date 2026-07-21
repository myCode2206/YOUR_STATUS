import React from 'react';

export default function Skeleton({ type, count = 1 }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'group':
        return (
          <div className="page-container" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
            <div className="glass-card mb-6" style={{ padding: 'var(--space-6)', height: 140, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)' }} />
            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              <div style={{ width: 100, height: 40, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }} />
              <div style={{ width: 100, height: 40, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }} />
            </div>
            <div className="grid-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card" style={{ height: 160, background: 'var(--color-bg-elevated)' }} />
              ))}
            </div>
          </div>
        );
      
      case 'feed':
        return (
          <div className="page-container" style={{ maxWidth: 640, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
            <div className="card mb-6" style={{ height: 180, background: 'var(--color-bg-elevated)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="feed-post" style={{ height: 200, background: 'var(--color-bg-elevated)' }} />
              ))}
            </div>
          </div>
        );

      case 'feed-posts':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="feed-post" style={{ height: 200, background: 'var(--color-bg-elevated)' }} />
            ))}
          </div>
        );
        
      case 'dashboard':
        return (
          <div className="page-container" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
            <div className="dashboard-top-grid mb-6">
              <div className="card" style={{ height: 300, background: 'var(--color-bg-elevated)' }} />
              <div className="card" style={{ height: 300, background: 'var(--color-bg-elevated)' }} />
            </div>
            <div className="grid-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="stat-card" style={{ height: 120, background: 'var(--color-bg-elevated)' }} />
              ))}
            </div>
            <div className="grid-2">
              <div className="card" style={{ height: 350, background: 'var(--color-bg-elevated)' }} />
              <div className="card" style={{ height: 350, background: 'var(--color-bg-elevated)' }} />
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="page-container" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
            <div style={{ width: 250, height: 40, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: 24 }} />
            <div className="grid-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card card-sm" style={{ height: 100, background: 'var(--color-bg-elevated)' }} />
              ))}
            </div>
            <div className="grid-2 mb-6">
              <div className="card" style={{ height: 350, background: 'var(--color-bg-elevated)' }} />
              <div className="card" style={{ height: 350, background: 'var(--color-bg-elevated)' }} />
            </div>
            <div className="grid-2 mb-6">
              <div className="card" style={{ height: 350, background: 'var(--color-bg-elevated)' }} />
              <div className="card" style={{ height: 350, background: 'var(--color-bg-elevated)' }} />
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="page-container" style={{ maxWidth: 800, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
            <div className="card mb-6" style={{ height: 300, background: 'var(--color-bg-elevated)', padding: 0 }} />
            <div className="grid-2 mb-6">
              <div className="card" style={{ height: 250, background: 'var(--color-bg-elevated)' }} />
              <div className="card" style={{ height: 250, background: 'var(--color-bg-elevated)' }} />
            </div>
            <div className="card mb-6" style={{ height: 250, background: 'var(--color-bg-elevated)' }} />
            <div className="card" style={{ height: 400, background: 'var(--color-bg-elevated)' }} />
          </div>
        );

      default:
        return (
          <div style={{ 
            width: '100%', 
            height: 100, 
            background: 'var(--color-bg-elevated)', 
            borderRadius: 'var(--radius-md)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
        );
    }
  };

  return (
    <>
      {[...Array(count)].map((_, i) => (
        <React.Fragment key={i}>{renderSkeleton()}</React.Fragment>
      ))}
    </>
  );
}
