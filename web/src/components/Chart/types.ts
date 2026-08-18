export interface ChartDataPoint {
  value: number;
  label: string;
  timestamp?: string;
}

export interface ChartDimensions {
  width?: number;
  height?: number;
}

export interface ChartColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  grid?: string;
  text?: string;
  textMuted?: string;
  dataPoint?: string;
  dataPointBorder?: string;
}

export interface AnimationSettings {
  duration?: number;
  easing?: string;
  enabled?: boolean;
}

export interface ChartEventHandlers {
  onDataPointClick?: (point: ChartDataPoint, index: number) => void;
  onDataPointHover?: (point: ChartDataPoint | null, index: number | null) => void;
}

export interface InteractiveChartProps {
  data: ChartDataPoint[];
  dimensions?: ChartDimensions;
  colors?: ChartColors;
  animation?: AnimationSettings;
  title?: string;
  timeRange?: string;
  yAxisLabel?: string;
  onTimeRangeChange?: (range: string) => void;
  eventHandlers?: ChartEventHandlers;
  loading?: boolean;
  error?: string | null;
  primaryColor?: string;
}