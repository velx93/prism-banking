import { ChevronDown as ChevronDownIcon } from "lucide-react";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import type { InteractiveChartProps, ChartDataPoint } from "./types";
import {
  generateYAxisLabels,
  calculateDataPointPosition,
  calculateXPosition,
  getPathFromPoints,
  getGradientPath,
} from "./chartUtils";
import { type LocaleStrings } from "@/lib/locale";

const defaultColors = {
  primary: "#beee11",
  secondary: "rgba(190, 238, 17, 0.2)",
  accent: "rgba(190, 238, 17, 0.1)",
  grid: "rgba(255, 255, 255, 0.08)",
  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.65)",
  dataPoint: "#beee11",
  dataPointBorder: "#ffffff",
};

const defaultAnimation = {
  duration: 300,
  easing: "ease-in-out",
  enabled: true,
};

export const InteractiveChart: React.FC<InteractiveChartProps & { locale: LocaleStrings }> = ({
  data,
  dimensions = { width: 917, height: 276 },
  colors = defaultColors,
  animation = defaultAnimation,
  title = "Insights",
  timeRange = "24 Hours",
  yAxisLabel = "$",
  onTimeRangeChange,
  eventHandlers,
  loading = false,
  error = null,
  locale,
  primaryColor
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<Set<number>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const timeRangeOptions = [
    { key: "1h", label: locale.hour_1 },
    { key: "6h", label: locale.hour_6 },
    { key: "12h", label: locale.hour_12 },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Use primaryColor to override default colors if provided
  const dynamicColors = primaryColor ? {
    primary: primaryColor,
    secondary: `${primaryColor}33`,
    accent: `${primaryColor}1A`,
    dataPoint: primaryColor
  } : {};
  const mergedColors = { ...defaultColors, ...colors, ...dynamicColors };
  const mergedAnimation = { ...defaultAnimation, ...animation };
  const { width = 917, height = 276 } = dimensions;

  const chartConfig = useMemo(() => ({
    chartLeft: 85,
    chartTop: 84,
    chartRight: 889,
    chartBottom: 218,
    chartWidth: 804,
    chartHeight: 134,
  }), []);

  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => d.value), 50000);
  }, [data]);

  const yAxisLabels = useMemo(() => {
    return generateYAxisLabels(maxValue);
  }, [maxValue]);

  const dataPoints = useMemo(() => {
    return data.map((point, index) => {
      const x = calculateXPosition(
        index,
        data.length,
        chartConfig.chartWidth,
        chartConfig.chartLeft
      );
      const y = calculateDataPointPosition(
        point.value,
        maxValue,
        chartConfig.chartHeight,
        chartConfig.chartTop,
        chartConfig.chartBottom
      );
      return { x, y, ...point };
    });
  }, [data, maxValue, chartConfig]);

  const linePath = useMemo(() => {
    return getPathFromPoints(dataPoints.map(p => ({ x: p.x, y: p.y })));
  }, [dataPoints]);

  const gradientPath = useMemo(() => {
    return getGradientPath(
      dataPoints.map(p => ({ x: p.x, y: p.y })),
      chartConfig.chartBottom
    );
  }, [dataPoints, chartConfig.chartBottom]);

  const handlePointClick = (point: ChartDataPoint, index: number) => {
    setSelectedPoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
    eventHandlers?.onDataPointClick?.(point, index);
  };

  const handlePointHover = (point: ChartDataPoint | null, index: number | null, event?: React.MouseEvent) => {
    setHoveredPoint(index);
    if (event && chartRef.current && index !== null) {
      const rect = chartRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
    eventHandlers?.onDataPointHover?.(point, index);
  };

  if (loading) {
    return (
      <Card className="rounded-[10px] border border-solid border-[#ffffff0a] backdrop-blur-[25px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_50%,rgba(153,153,153,0)_100%)]" style={{ width, height }}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-white text-lg">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-[10px] border border-solid border-[#ffffff0a] backdrop-blur-[25px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_50%,rgba(153,153,153,0)_100%)]" style={{ width, height }}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-red-400 text-lg">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="absolute top-[30.313rem] left-[2.2rem] w-[57.713rem] h-[17.25rem]">
        <Card 
          className="w-full h-full border border-solid border-[#ffffff0a] backdrop-blur-[25px] transition-all duration-300 hover:border-[#ffffff14]"
          ref={chartRef}
          style={{
            background: "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 50%, rgba(153, 153, 153, 0) 100%)",
          }}
        >
          <CardContent className="relative w-full h-full p-0 overflow-hidden">
            <div className="absolute top-7 left-7 flex items-center justify-center flex-row gap-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 6.66667V9.33333C16 9.51015 15.9298 9.67972 15.8047 9.80474C15.6797 9.92976 15.5101 10 15.3333 10H1.33333V11.3333H8.66667C8.84348 11.3333 9.01305 11.4036 9.13807 11.5286C9.2631 11.6536 9.33333 11.8232 9.33333 12V14C9.33333 14.1768 9.2631 14.3464 9.13807 14.4714C9.01305 14.5964 8.84348 14.6667 8.66667 14.6667H1.33333V15.3333C1.33333 15.5101 1.2631 15.6797 1.13807 15.8047C1.01305 15.9298 0.843478 16 0.666667 16C0.489856 16 0.320287 15.9298 0.195262 15.8047C0.070238 15.6797 0 15.5101 0 15.3333V0.666667C0 0.489856 0.070238 0.320287 0.195262 0.195262C0.320287 0.070238 0.489856 0 0.666667 0C0.843478 0 1.01305 0.070238 1.13807 0.195262C1.2631 0.320287 1.33333 0.489856 1.33333 0.666667V1.33333H11.3333C11.5101 1.33333 11.6797 1.40357 11.8047 1.5286C11.9298 1.65362 12 1.82319 12 2V4C12 4.17681 11.9298 4.34638 11.8047 4.4714C11.6797 4.59643 11.5101 4.66667 11.3333 4.66667H1.33333V6H15.3333C15.5101 6 15.6797 6.07024 15.8047 6.19526C15.9298 6.32029 16 6.48986 16 6.66667Z" fill={primaryColor}/>
              </svg>

              <span style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.125rem',
                lineHeight: '140%',
                letterSpacing: '0.85%',
                fontFamily: 'Roboto, sans-serif'
              }}>{locale.insights}</span>
            </div>

            <div className="absolute top-[17px] right-[26px] w-[110px]" ref={dropdownRef}>
              <Button
                variant="ghost"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="h-auto w-[108px] h-9 bg-[#ffffff05] rounded-lg border border-solid border-[#FFFFFF0A] backdrop-blur-[25px] hover:bg-[#ffffff09] transition-colors duration-200"
              >
                <span className="font-medium text-sm text-center tracking-[0.12px] leading-[19.6px] whitespace-nowrap" style={{ color: mergedColors.text }}>
                  {timeRangeOptions.find(o => o.key === timeRange)?.label || timeRange}
                </span>
                <ChevronDownIcon className={`ml-2 h-4 w-4 text-white transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </Button>
              {dropdownOpen && (
                <div className="absolute top-[42px] right-0 w-[108px] bg-[#1a1a1a] border border-[#ffffff1a] rounded-lg shadow-2xl overflow-hidden z-50 animate-fade-in">
                  {timeRangeOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => {
                        onTimeRangeChange?.(option.key);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm font-medium tracking-[0.12px] transition-colors duration-150 ${
                        option.key === timeRange
                          ? 'bg-[#ffffff1a]'
                          : 'hover:bg-[#ffffff0a]'
                      }`}
                      style={{ color: option.key === timeRange ? mergedColors.primary : mergedColors.text }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {yAxisLabels.map((label, index) => (
              <div
                key={`y-axis-${index}`}
                className="absolute left-7 font-normal text-sm tracking-[0.12px] leading-[19.6px] text-left"
                style={{
                  top: chartConfig.chartTop - 8 + (index * (chartConfig.chartHeight / (yAxisLabels.length - 1))),
                  color: mergedColors.textMuted,
                  minWidth: '55px'
                }}
              >
                {label}
              </div>
            ))}

            {data.map((point, index) => {
              const spacing = chartConfig.chartWidth / (data.length - 1);
              return (
                <div
                  key={`x-axis-${index}`}
                  className="absolute top-[238px] w-[37px] font-normal text-sm tracking-[0.12px] leading-[19.6px]"
                  style={{
                    left: chartConfig.chartLeft + (spacing * index) - 18,
                    color: mergedColors.textMuted
                  }}
                >
                  {point.label}
                </div>
              );
            })}
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={`grid-line-${index}`}
                className="absolute w-[804px] h-px transition-colors duration-300"
                style={{
                  top: chartConfig.chartTop + (index * (chartConfig.chartHeight / 4)),
                  left: chartConfig.chartLeft,
                  backgroundColor: mergedColors.grid
                }}
              />
            ))}

            <svg
              className="absolute pointer-events-none"
              style={{
                top: 0,
                left: 0,
                width,
                height,
              }}
            >
              <defs>
                <radialGradient id="chartGradient" cx="50%" cy="0%" r="100%" fx="50%" fy="0%">
                  <stop offset="0%" stopColor={mergedColors.primary} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={mergedColors.primary} stopOpacity="0" />
                </radialGradient>
              </defs>

              <path
                d={gradientPath}
                fill="url(#chartGradient)"
                className={mergedAnimation.enabled ? "transition-all" : ""}
                style={{
                  transitionDuration: `${mergedAnimation.duration}ms`,
                  transitionTimingFunction: mergedAnimation.easing
                }}
              />

              <path
                d={linePath}
                fill="none"
                stroke={mergedColors.primary}
                strokeWidth="2"
                className={mergedAnimation.enabled ? "transition-all" : ""}
                style={{
                  transitionDuration: `${mergedAnimation.duration}ms`,
                  transitionTimingFunction: mergedAnimation.easing
                }}
              />
            </svg>

            {dataPoints.map((point, index) => {
              const isHovered = hoveredPoint === index;
              const isSelected = selectedPoints.has(index);

              return (
                <div key={`data-point-${index}`}>
                  <div
                    className="absolute cursor-pointer transition-all duration-200"
                    style={{
                      top: point.y - 7,
                      left: point.x - 7,
                      width: isHovered || isSelected ? 18 : 14,
                      height: isHovered || isSelected ? 18 : 14,
                      backgroundColor: mergedColors.dataPoint,
                      borderRadius: '50%',
                      border: `${isHovered || isSelected ? 4 : 3}px solid ${mergedColors.dataPointBorder}`,
                      transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                      zIndex: isHovered ? 20 : 10,
                      boxShadow: isHovered ? `0 0 20px ${mergedColors.primary}` : 'none',
                    }}
                    onClick={() => handlePointClick(point, index)}
                    onMouseEnter={(e) => handlePointHover(point, index, e)}
                    onMouseMove={(e) => handlePointHover(point, index, e)}
                    onMouseLeave={() => handlePointHover(null, null)}
                  />
                </div>
              );
            })}

            {hoveredPoint !== null && (
              <div 
                className="absolute pointer-events-none z-50 transition-all duration-100"
                style={{
                  left: `${tooltipPosition.x + 15}px`,
                  top: `${tooltipPosition.y - 40}px`,
                  transform: tooltipPosition.x > width - 150 ? 'translateX(-100%) translateX(-30px)' : 'none'
                }}
              >
                <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-2 shadow-2xl min-w-[100px]">
                  <div className="text-[11px] font-medium mb-0.5" style={{ color: mergedColors.textMuted }}>
                    {locale.spent}
                  </div>
                  <div className="text-base font-bold" style={{ color: mergedColors.text }}>
                    {locale.currencySign} {dataPoints[hoveredPoint].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};