import React, { useId, memo } from 'react';

interface SparklineProps {
  color: 'amber' | 'rose' | 'teal';
  points?: number[];
  height?: number;
}

export const Sparkline: React.FC<SparklineProps> = memo(({ color, points, height = 46 }) => {
  const reactId = useId();
  // Preset wave curves if none provided
  const data = points && points.length >= 5 ? points : (
    color === 'amber' ? [20, 28, 22, 35, 18, 24, 38, 25, 29] :
    color === 'rose'  ? [30, 22, 28, 16, 26, 34, 20, 28, 32] :
                        [16, 24, 18, 32, 26, 36, 22, 30, 34]
  );

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 160;

  // Build SVG path
  const coords = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 12) - 6;
    return { x, y };
  });

  // Smooth bezier curve path
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const cpX = (curr.x + next.x) / 2;
    pathD += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
  }

  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  const colorConfig = {
    amber: {
      stroke: '#F59E0B',
      stop1: '#F59E0B',
      stop2: '#FEF3C7',
    },
    rose: {
      stroke: '#F43F5E',
      stop1: '#F43F5E',
      stop2: '#FFE4E6',
    },
    teal: {
      stroke: '#14B8A6',
      stop1: '#14B8A6',
      stop2: '#CCFBF1',
    },
  }[color];

  const gradientId = `spark-grad-${color}-${reactId.replace(/:/g, '')}`;

  return (
    <div className="w-full overflow-hidden mt-1 pointer-events-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-11" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorConfig.stop1} stopOpacity="0.32" />
            <stop offset="100%" stopColor={colorConfig.stop2} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill={`url(#${gradientId})`} />
        <path d={pathD} fill="none" stroke={colorConfig.stroke} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
});
