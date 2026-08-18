import { useState, useEffect } from 'react';

interface CircularProgressProps {
  points: number;
  maxPoints?: number;
  size?: number;
  primaryColor: string;
}

export default function CircularProgress({
  points,
  maxPoints = 900,
  size = 172,
  primaryColor
}: CircularProgressProps) {
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const percentage = Math.min((animatedPoints / maxPoints) * 100, 100);

  useEffect(() => {
    setAnimatedPoints(points);
  }, [points]);

  const center = size / 2;
  const radius = (size / 2) - 20;
  const strokeWidth = 6;

  const startAngle = 130;
  const endAngle = 50;
  const totalAngle = 360 - (startAngle - endAngle);

  const progressAngle = (percentage / 100) * totalAngle;
  const progressEndAngle = startAngle + progressAngle;

  const polarToCartesian = (angle: number, r: number = radius) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad)
    };
  };

  const createArcPath = (start: number, end: number) => {
    const startPoint = polarToCartesian(start);
    const endPoint = polarToCartesian(end);
    const largeArc = end - start <= 180 ? 0 : 1;

    return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`;
  };

  const fullArcPath = createArcPath(startAngle, startAngle + totalAngle);

  const arcLength = (totalAngle / 360) * (2 * Math.PI * radius);
  const progressLength = (progressAngle / totalAngle) * arcLength;
  const dashOffset = arcLength - progressLength;

  const triangleRadius = radius - 10;
  const trianglePosition = polarToCartesian(progressEndAngle, triangleRadius);
  const rotationAngle = progressEndAngle;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
      >
        <path
          d={fullArcPath}
          stroke={primaryColor}
          strokeOpacity="0.08"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        <path
          d={fullArcPath}
          stroke={primaryColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 0.8s ease-out'
          }}
        />
        <g
          transform={`translate(${trianglePosition.x}, ${trianglePosition.y}) rotate(${rotationAngle -65}) translate(-5.5, -1.5)`}
          style={{
            transition: 'all 0.8s ease-out'
          }}
        >
          <path 
            d="M7.58667 0.117434C8.54414 0.00425371 9.09151 1.17808 8.38935 1.83879L4.05529 5.91708C3.31107 6.61738 2.09976 6.38476 1.66789 5.45861L0.493257 2.9396C0.0613864 2.01345 0.661805 0.936009 1.67663 0.816048L7.58667 0.117434Z" 
            fill="white"
          />
        </g>
      </svg>
    </div>
  );
}