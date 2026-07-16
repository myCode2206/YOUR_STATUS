import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    const val = payload[0].value;
    const h = Math.floor(val / 60);
    const m = val % 60;
    return (
      <div style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: '0.85rem',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
        <div style={{ color: 'var(--color-primary-light)' }}>
          {h > 0 ? `${h}h ` : ''}{m}m studied
        </div>
      </div>
    );
  }
  return null;
};

export default function WeeklyBarChart({ days = [] }) {
  const data = days.map((d) => ({
    day: d.dayLabel,
    minutes: Math.floor(d.studySeconds / 60),
    isToday: d.dateStr === new Date().toISOString().split('T')[0],
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v > 0 ? `${Math.floor(v / 60)}h` : '0'}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.isToday
                ? 'url(#fireGrad)'
                : entry.minutes > 0
                  ? 'rgba(255,107,0,0.5)'
                  : 'rgba(255,255,255,0.06)'}
            />
          ))}
        </Bar>
        <defs>
          <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd200" />
            <stop offset="50%" stopColor="#ff6b00" />
            <stop offset="100%" stopColor="#ff0844" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}
