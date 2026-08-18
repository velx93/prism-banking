export const generateYAxisLabels = (maxValue: number, steps: number = 5): string[] => {
  const stepValue = maxValue / steps;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const value = maxValue - (stepValue * i);
    if (value >= 1000000) {
      const millions = value / 1000000;
      // Round to 1 decimal if needed, otherwise show as integer
      if (millions % 1 === 0) {
        return `$ ${millions.toFixed(0)}M`;
      } else if (millions >= 10) {
        return `$ ${millions.toFixed(0)}M`;
      } else {
        return `$ ${millions.toFixed(1)}M`;
      }
    } else if (value >= 1000) {
      const thousands = value / 1000;
      if (thousands % 1 === 0) {
        return `$ ${thousands.toFixed(0)}K`;
      } else {
        return `$ ${thousands.toFixed(0)}K`;
      }
    } else if (value === 0) {
      return '$ 0';
    }
    return `${value.toFixed(0)}`;
  });
};

export const calculateDataPointPosition = (
  value: number,
  maxValue: number,
  chartHeight: number,
  chartTop: number,
  chartBottom: number
): number => {
  const percentage = value / maxValue;
  const availableHeight = chartBottom - chartTop;
  return chartBottom - (percentage * availableHeight);
};

export const calculateXPosition = (
  index: number,
  totalPoints: number,
  chartWidth: number,
  chartLeft: number
): number => {
  const spacing = chartWidth / (totalPoints - 1);
  return chartLeft + (spacing * index);
};

export const getPathFromPoints = (points: { x: number; y: number }[]): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const prev = i > 0 ? points[i - 1] : null;
    const afterNext = i < points.length - 2 ? points[i + 2] : null;
    
    const xDiff = next.x - curr.x;
    const yDiff = next.y - curr.y;
    
    // Calculate control point distance based on surrounding points
    const tension = 0.35; // Smoothness factor
    const cpDistance = xDiff * tension;
    
    // First control point angle
    let cp1Angle = 0;
    if (prev) {
      const prevAngle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      const nextAngle = Math.atan2(next.y - curr.y, next.x - curr.x);
      cp1Angle = (prevAngle + nextAngle) / 2;
    } else {
      cp1Angle = Math.atan2(yDiff, xDiff);
    }
    
    // Second control point angle
    let cp2Angle = 0;
    if (afterNext) {
      const currAngle = Math.atan2(next.y - curr.y, next.x - curr.x);
      const afterAngle = Math.atan2(afterNext.y - next.y, afterNext.x - next.x);
      cp2Angle = (currAngle + afterAngle) / 2;
    } else {
      cp2Angle = Math.atan2(yDiff, xDiff);
    }
    
    // Calculate control points with angles
    const cp1x = curr.x + Math.cos(cp1Angle) * cpDistance;
    const cp1y = curr.y + Math.sin(cp1Angle) * cpDistance;
    
    const cp2x = next.x - Math.cos(cp2Angle) * cpDistance;
    const cp2y = next.y - Math.sin(cp2Angle) * cpDistance;
    
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  return path;
};

export const getGradientPath = (
  points: { x: number; y: number }[],
  chartBottom: number
): string => {
  if (points.length === 0) return '';

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  
  // Start from bottom-left corner
  let path = `M ${firstPoint.x} ${chartBottom}`;
  
  // Curve up to first point
  path += ` L ${firstPoint.x} ${chartBottom}`;
  path += ` C ${firstPoint.x} ${chartBottom}, ${firstPoint.x} ${firstPoint.y}, ${firstPoint.x} ${firstPoint.y}`;
  
  // Draw the main curve through all points
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const prev = i > 0 ? points[i - 1] : null;
    const afterNext = i < points.length - 2 ? points[i + 2] : null;
    
    const xDiff = next.x - curr.x;
    const yDiff = next.y - curr.y;
    
    const tension = 0.35;
    const cpDistance = xDiff * tension;
    
    let cp1Angle = 0;
    if (prev) {
      const prevAngle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      const nextAngle = Math.atan2(next.y - curr.y, next.x - curr.x);
      cp1Angle = (prevAngle + nextAngle) / 2;
    } else {
      cp1Angle = Math.atan2(yDiff, xDiff);
    }
    
    let cp2Angle = 0;
    if (afterNext) {
      const currAngle = Math.atan2(next.y - curr.y, next.x - curr.x);
      const afterAngle = Math.atan2(afterNext.y - next.y, afterNext.x - next.x);
      cp2Angle = (currAngle + afterAngle) / 2;
    } else {
      cp2Angle = Math.atan2(yDiff, xDiff);
    }
    
    const cp1x = curr.x + Math.cos(cp1Angle) * cpDistance;
    const cp1y = curr.y + Math.sin(cp1Angle) * cpDistance;
    
    const cp2x = next.x - Math.cos(cp2Angle) * cpDistance;
    const cp2y = next.y - Math.sin(cp2Angle) * cpDistance;
    
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  
  // Curve down to bottom-right corner
  path += ` C ${lastPoint.x} ${lastPoint.y}, ${lastPoint.x} ${chartBottom}, ${lastPoint.x} ${chartBottom}`;
  path += ` L ${firstPoint.x} ${chartBottom}`;
  path += ` Z`;

  return path;
};