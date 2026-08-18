import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
  primaryColor?: string;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 200,
  height = 60,
  strokeWidth = 1.5,
  className = '',
  primaryColor
}) => {
  if (!data || data.length < 2) {
    return null;
  }

  // Determine trend (green if going up, red if going down)
  const firstValue = data[0];
  const lastValue = data[data.length - 1];
  const isPositiveTrend = lastValue >= firstValue;

  // Create gradient colors
  const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const startColor = isPositiveTrend ? (primaryColor || '#BEEE11') : '#EE4C11';
  const endColor = isPositiveTrend ? (primaryColor || '#BEEE11') : '#EE4C11';

  // Find min and max for scaling
  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const valueRange = maxValue - minValue || 1;

  // Calculate points
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - minValue) / valueRange) * (height - 10) - 5; // Add padding
    return { x, y };
  });

  // Create smooth curve using Catmull-Rom to Bezier conversion
  const createSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      
      // Control points for smooth curve
      const cp1x = current.x + (next.x - current.x) / 3;
      const cp1y = current.y;
      const cp2x = next.x - (next.x - current.x) / 3;
      const cp2y = next.y;
      
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }
    
    return path;
  };

  const pathData = createSmoothPath(points);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor={startColor} stopOpacity="0.38" />
          <stop offset="1" stopColor={endColor} />
        </linearGradient>
      </defs>
      <path
        d={pathData}
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

export default Sparkline;