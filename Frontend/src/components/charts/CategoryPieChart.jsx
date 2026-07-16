import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = {
  study: '#6366f1',
  coding: '#8b5cf6',
  reading: '#06b6d4',
  exercise: '#10b981',
  break: '#ffd200',
  meal: '#f97316',
  sleep: '#3b82f6',
  entertainment: '#ec4899',
  social: '#a855f7',
  other: '#6b7280',
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const h = Math.floor(d.seconds / 3600);
    const m = Math.floor((d.seconds % 3600) / 60);
    return (
      <div style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: '0.85rem',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.name}</div>
        <div style={{ color: 'var(--color-text-secondary)' }}>
          {h > 0 ? `${h}h ` : ''}{m}m
        </div>
      </div>
    );
  }
  return null;
};

export default function CategoryPieChart({ breakdown }) {
  const data = Object.entries(breakdown || {})
    .filter(([, v]) => v.seconds > 0)
    .map(([key, val]) => ({
      name: val.label,
      seconds: val.seconds,
      color: COLORS[key] || '#6b7280',
    }))
    .sort((a, b) => b.seconds - a.seconds);

  if (data.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📊</div>
        <div>No activity tracked yet today</div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={3}
          dataKey="seconds"
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.color}
              stroke="none"
              style={{ filter: `drop-shadow(0 0 6px ${entry.color}60)` }}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
