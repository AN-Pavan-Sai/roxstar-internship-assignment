import { useMemo } from 'react';

const WHEEL_COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981',
  '#ec4899', '#3b82f6', '#f97316', '#14b8a6', '#a855f7',
  '#6366f1', '#0ea5e9', '#eab308', '#e11d48', '#22c55e',
  '#d946ef', '#2563eb', '#fb923c', '#0d9488', '#7c3aed'
];

export default function SpinWheelVisual({ participants = [], status, winnerId }) {
  const isSpinning = status === 'ACTIVE';
  const activeParticipants = participants.filter(p => !p.isEliminated);

  const segments = useMemo(() => {
    const list = activeParticipants.length > 0 ? activeParticipants : [{ username: '?' }];
    const angleEach = 360 / list.length;

    return list.map((p, i) => {
      const startAngle = i * angleEach;
      const endAngle = (i + 1) * angleEach;
      const startRad = (Math.PI / 180) * (startAngle - 90);
      const endRad = (Math.PI / 180) * (endAngle - 90);
      const largeArc = angleEach > 180 ? 1 : 0;

      const r = 140;
      const cx = 160;
      const cy = 160;

      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);

      const path = list.length === 1
        ? `M ${cx},${cy} m -${r},0 a ${r},${r} 0 1,1 ${r*2},0 a ${r},${r} 0 1,1 -${r*2},0 Z`
        : `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;

      const midAngleRad = (Math.PI / 180) * ((startAngle + endAngle) / 2 - 90);
      const labelR = r * 0.65;
      const labelX = cx + labelR * Math.cos(midAngleRad);
      const labelY = cy + labelR * Math.sin(midAngleRad);

      const isWinner = winnerId && p.userId === winnerId;

      return {
        path,
        color: WHEEL_COLORS[i % WHEEL_COLORS.length],
        label: (p.username || '?').substring(0, 6),
        labelX,
        labelY,
        rotation: (startAngle + endAngle) / 2,
        isWinner
      };
    });
  }, [activeParticipants, winnerId]);

  return (
    <div className="wheel-container">
      <div className={`wheel-wrapper ${isSpinning ? 'wheel-spinning' : ''}`}>
        <div className="wheel-outer-ring"></div>
        <div className="wheel-pointer">▼</div>

        <svg className="wheel-svg" viewBox="0 0 320 320">
          <defs>
            <filter id="wheelShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>

          <g filter="url(#wheelShadow)">
            {segments.map((seg, i) => (
              <g key={i}>
                <path
                  d={seg.path}
                  fill={seg.isWinner ? '#fbbf24' : seg.color}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth="1.5"
                  opacity={seg.isWinner ? 1 : 0.85}
                />
                <text
                  x={seg.labelX}
                  y={seg.labelY}
                  fill="white"
                  fontSize={activeParticipants.length > 10 ? "8" : "10"}
                  fontWeight="700"
                  fontFamily="Inter, sans-serif"
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                >
                  {seg.label}
                </text>
              </g>
            ))}
          </g>
        </svg>

        <div className="wheel-center">
          {status === 'ACTIVE' ? 'SPIN!' : status === 'COMPLETED' ? 'WIN' : participants.length}
        </div>
      </div>
    </div>
  );
}
