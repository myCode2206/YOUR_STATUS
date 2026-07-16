import { useEffect, useState } from 'react';
import { usersAPI, activitiesAPI } from '../api';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import WeeklyBarChart from '../components/charts/WeeklyBarChart';
import TimelineView from '../components/charts/TimelineView';
import HeatmapChart from '../components/charts/HeatmapChart';
import Loader from '../components/ui/Loader';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timelineDate, setTimelineDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [timelineDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, timelineRes, heatmapRes] = await Promise.all([
        usersAPI.myStats(),
        activitiesAPI.timeline(timelineDate),
        activitiesAPI.heatmap(),
      ]);
      setStats(statsRes.data.stats);
      setTimeline(timelineRes.data.activities);
      setHeatmap(heatmapRes.data.data);
    } catch (e) {
      console.error('Analytics error:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (secs) => {
    if (!secs) return '0h 0m';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  if (loading && !stats) return <div className="page-container"><Loader text="Crunching your stats..." /></div>;

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 24 }}>Analytics Overview</h2>

      {/* High-level stats */}
      <div className="grid-4 mb-6">
        <div className="card card-sm">
          <div className="stat-label">Total Study Time</div>
          <div className="stat-value text-primary-color" style={{ fontSize: '1.5rem' }}>{formatHours(stats?.allTime?.totalSeconds)}</div>
        </div>
        <div className="card card-sm">
          <div className="stat-label">Total Sessions</div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>{stats?.allTime?.sessions || 0}</div>
        </div>
        <div className="card card-sm">
          <div className="stat-label">Longest Session</div>
          <div className="stat-value text-success" style={{ fontSize: '1.5rem' }}>{formatHours(stats?.allTime?.longestSession)}</div>
        </div>
        <div className="card card-sm">
          <div className="stat-label">Longest Streak</div>
          <div className="stat-value text-warning" style={{ fontSize: '1.5rem' }}>{stats?.longestStreak || 0} days</div>
        </div>
      </div>

      <div className="grid-2 mb-6">
        {/* Today's Breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Today's Breakdown</h3>
          <CategoryPieChart breakdown={stats?.today?.breakdown} />
        </div>

        {/* Weekly Trend */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Last 7 Days Trend</h3>
          {stats?.weekly?.days && <WeeklyBarChart days={stats.weekly.days} />}
        </div>
      </div>

      <div className="grid-2">
        {/* Timeline */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>Daily Timeline</h3>
            <input 
              type="date" 
              className="input" 
              style={{ width: 'auto', padding: '4px 12px' }}
              value={timelineDate}
              onChange={e => setTimelineDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <TimelineView activities={timeline} date={timelineDate} />
        </div>

        {/* Heatmap */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Consistency Heatmap</h3>
          <HeatmapChart data={heatmap} />
          <p style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Your activity over the last 90 days. Darker colors indicate more study time. Consistency is the key to mastering any skill. Keep the fire burning! 🔥
          </p>
        </div>
      </div>
    </div>
  );
}
