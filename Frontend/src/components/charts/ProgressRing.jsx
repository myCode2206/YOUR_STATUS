export default function ProgressRing({ progress, size = 120, strokeWidth = 10, color = 'var(--color-primary)' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="progress-ring-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          stroke="var(--color-bg-elevated)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke="url(#fireGradient)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s ease' }}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="fireGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff0844" />
            <stop offset="100%" stopColor="#ff6b00" />
          </linearGradient>
        </defs>
      </svg>
      <div className="progress-ring-text">
        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{Math.round(progress)}%</div>
      </div>
    </div>
  );
}
