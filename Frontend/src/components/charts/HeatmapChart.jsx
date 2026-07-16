import { useMemo } from 'react';
import dayjs from 'dayjs';

export default function HeatmapChart({ data = [] }) {
  const { cells, months, numCols } = useMemo(() => {
    if (!data || data.length === 0) return { cells: [], months: [], numCols: 0 };

    const startDate = dayjs(data[0].date);
    const endDate = dayjs(data[data.length - 1].date);
    
    const dayMap = new Map();
    data.forEach(d => dayMap.set(d.date, d));

    const totalDays = endDate.diff(startDate, 'day') + 1;
    const filledData = [];
    for (let i = 0; i < totalDays; i++) {
      const dateStr = startDate.add(i, 'day').format('YYYY-MM-DD');
      filledData.push(dayMap.get(dateStr) || { date: dateStr, seconds: 0, level: 0 });
    }

    const startDayOfWeek = startDate.day();
    const paddedCells = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      paddedCells.push({ empty: true });
    }
    
    const finalCells = [...paddedCells, ...filledData];
    const numCols = Math.ceil(finalCells.length / 7);

    const months = [];
    let currentMonth = null;
    for (let col = 0; col < numCols; col++) {
      const cell = finalCells[col * 7];
      if (cell && !cell.empty) {
        const month = dayjs(cell.date).format('MMM');
        if (month !== currentMonth) {
          months.push({ colIndex: col, label: month });
          currentMonth = month;
        }
      }
    }

    return { cells: finalCells, months, numCols };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        No data available
      </div>
    );
  }

  // GitHub contribution greens
  const levelColors = [
    'var(--color-bg-elevated)', // Level 0 (empty)
    '#0e4429', // Level 1
    '#006d32', // Level 2
    '#26a641', // Level 3
    '#39d353', // Level 4
  ];

  return (
    <div className="heatmap-container" style={{ width: '100%', paddingBottom: 8, paddingTop: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
        
        {/* Month Labels */}
        <div style={{ display: 'flex', height: 20, width: '100%' }}>
          <div style={{ width: 32 }} /> {/* Spacer for Y axis */}
          <div style={{ position: 'relative', flex: 1 }}>
            {months.map((m, i) => (
              <div 
                key={i} 
                style={{ 
                  position: 'absolute', 
                  left: `${(m.colIndex / numCols) * 100}%`,
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap'
                }}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Grid Area */}
        <div style={{ display: 'flex', gap: 6, width: '100%' }}>
          {/* Y Axis Labels (Mon, Wed, Fri) - perfectly aligned using identical grid configuration */}
          <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: 4, width: 32 }}>
            <span style={{ gridRow: 2, display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1 }}>Mon</span>
            <span style={{ gridRow: 4, display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1 }}>Wed</span>
            <span style={{ gridRow: 6, display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1 }}>Fri</span>
          </div>

          {/* Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateRows: 'repeat(7, 1fr)', 
            gridAutoFlow: 'column', 
            gridAutoColumns: '1fr',
            gap: 4,
            flex: 1
          }}>
            {cells.map((cell, i) => {
              if (cell.empty) return <div key={i} style={{ aspectRatio: '1/1' }} />;
              return (
                <div 
                  key={i}
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: '15%',
                    backgroundColor: levelColors[cell.level] || levelColors[0],
                    outline: '1px solid rgba(255,255,255,0.05)',
                    outlineOffset: -1,
                    cursor: 'pointer'
                  }}
                  title={`${cell.date}: ${Math.floor(cell.seconds / 60)} mins`}
                />
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 16, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
        <span>Less</span>
        {levelColors.map((color, i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: color, outline: '1px solid rgba(255,255,255,0.05)', outlineOffset: -1 }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
