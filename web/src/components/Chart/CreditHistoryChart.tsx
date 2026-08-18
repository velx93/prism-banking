import React, { useState, useRef } from "react";
import { Card, CardContent } from "../ui/card";

export interface DataPoint {
  time: string;
  deposit: number;
  withdrawal: number;
  creditScore: number;
  timestamp: number;
}

export interface CreditHistoryProps {
  data?: DataPoint[];
  currentScore?: number;
  scoreLabel?: string;
  title?: string;
  yAxisLabels?: string[];
  minValue?: number;
  maxValue?: number;
  depositLineColor?: string;
  withdrawalLineColor?: string;
  depositGradientStart?: string;
  depositGradientEnd?: string;
  withdrawalGradientStart?: string;
  withdrawalGradientEnd?: string;
  width?: number;
  height?: number;
  showTooltip?: boolean;
  animationDuration?: number;
  primaryColor?: string;
  locale?: any
}

export const generatePath = (
  data: DataPoint[],
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
  valueKey: 'deposit' | 'withdrawal'
): string => {
  if (data.length === 0) return '';

  const padding = { top: 85, bottom: 50, left: 90, right: 28 };
  const chartWidth = 905 - padding.left - padding.right;
  const chartHeight = 186 - padding.top + 45 - padding.bottom;

  const xStep = chartWidth / (data.length - 1);
  const valueRange = maxValue - minValue;

  const points = data.map((point, index) => {
    const x = padding.left + index * xStep;
    const clampedValue = Math.min(Math.max(point[valueKey], minValue), maxValue);
    const normalizedValue = (clampedValue - minValue) / valueRange;
    const y = padding.top + chartHeight - normalizedValue * chartHeight;
    return { x, y };
  });

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currPoint = points[i];
    const cpX = (prevPoint.x + currPoint.x) / 2;
    path += ` C ${cpX} ${prevPoint.y}, ${cpX} ${currPoint.y}, ${currPoint.x} ${currPoint.y}`;
  }

  return path;
};

export const generateAreaPath = (
  data: DataPoint[],
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
  valueKey: 'deposit' | 'withdrawal'
): string => {
  const linePath = generatePath(data, width, height, minValue, maxValue, valueKey);
  const padding = { top: 20, bottom: 50, left: 93, right: 28 };
  const chartHeight = height - padding.top - padding.bottom;
  const bottomY = padding.top + chartHeight;

  const lastPoint = data[data.length - 1];
  const chartWidth = 905 - padding.left - padding.right;
  const xStep = chartWidth / (data.length - 1);
  const lastX = padding.left + (data.length - 1) * xStep;

  return `${linePath} L ${lastX} ${bottomY} L ${padding.left} ${bottomY} Z`;
};

export const findNearestDataPoint = (
  data: DataPoint[],
  mouseX: number,
  width: number
): { point: DataPoint; index: number; x: number } | null => {
  if (data.length === 0) return null;

  const padding = { left: 93, right: 28 };
  const chartWidth = width - padding.left - padding.right;
  const xStep = chartWidth / (data.length - 1);

  let closestIndex = 0;
  let closestDistance = Infinity;

  data.forEach((_, index) => {
    const x = padding.left + index * xStep;
    const distance = Math.abs(mouseX - x);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  const x = padding.left + closestIndex * xStep;
  return { point: data[closestIndex], index: closestIndex, x };
};

const CreditHistory: React.FC<CreditHistoryProps> = ({
    data = [],
    currentScore = 580,
    scoreLabel,
    title,
    yAxisLabels,
    minValue = 0,
    maxValue: propMaxValue,
    depositLineColor: propDepositLineColor,
    withdrawalLineColor = "#ef4444",
    depositGradientStart: propDepositGradientStart,
    depositGradientEnd: propDepositGradientEnd,
    withdrawalGradientStart = "rgba(239, 68, 68, 0.3)",
    withdrawalGradientEnd = "rgba(239, 68, 68, 0)",
    width = 917,
    height = 245,
    showTooltip = true,
    animationDuration = 1000,
    primaryColor,
    locale
}) => {
    // Use primaryColor if provided, otherwise use default
    const depositLineColor = propDepositLineColor || primaryColor || "#beee11";
    const depositGradientStart = propDepositGradientStart || (primaryColor ? `rgba(${parseInt(primaryColor.slice(1, 3), 16)}, ${parseInt(primaryColor.slice(3, 5), 16)}, ${parseInt(primaryColor.slice(5, 7), 16)}, 0.3)` : "rgba(190, 238, 17, 0.3)");
    const depositGradientEnd = propDepositGradientEnd || (primaryColor ? `rgba(${parseInt(primaryColor.slice(1, 3), 16)}, ${parseInt(primaryColor.slice(3, 5), 16)}, ${parseInt(primaryColor.slice(5, 7), 16)}, 0)` : "rgba(190, 238, 17, 0)");
    const [hoveredPoint, setHoveredPoint] = useState<{
        point: DataPoint;
        x: number;
        depositY: number;
        withdrawalY: number;
    } | null>(null);
    const [isAnimated, setIsAnimated] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    const maxValue = React.useMemo(() => {
        if (propMaxValue !== undefined) return propMaxValue;
        if (data.length === 0) return 100000;

        const allValues = data.flatMap(point => [point.deposit, point.withdrawal]);
        const dataMax = Math.max(...allValues);
        const calculatedMax = Math.ceil(dataMax * 1.1);
        return Math.max(calculatedMax, dataMax);
    }, [data, propMaxValue]);

    const formatCurrency = (value: number): string => {
        if (value >= 1000000) {
        return `${locale.currencySign + " "} ${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
        } else if (value >= 1000) {
        return `${locale.currencySign + " "} ${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 0)}K`;
        }
        return `${locale.currencySign + " "} ${value}`;
    };

    const autoYAxisLabels = React.useMemo(() => {
        const step = maxValue / 4;
        return [
        formatCurrency(maxValue),
        formatCurrency(maxValue * 0.5),
        formatCurrency(maxValue * 0.25),
        formatCurrency(minValue),
        ];
    }, [maxValue, minValue]);

    const displayYAxisLabels = autoYAxisLabels

    React.useEffect(() => {
        setTimeout(() => setIsAnimated(true), 100);
    }, []);

    const padding = { top: 20, bottom: 50, left: 93, right: 40 };
    const chartHeight = height - padding.top - padding.bottom;

    const horizontalLines = [
        { top: 79, percentage: 0.75 },
        { top: 113, percentage: 0.5 },
        { top: 147, percentage: 0.25 },
        { top: 181, percentage: 0 },
    ];

    const depositLinePath = data.length > 0 ? generatePath(data, width, height, minValue, maxValue, 'deposit') : "";
    const depositAreaPath = data.length > 0 ? generateAreaPath(data, width, height, minValue, maxValue, 'deposit') : "";

    const withdrawalLinePath = data.length > 0 ? generatePath(data, width, height, minValue, maxValue, 'withdrawal') : "";
    const withdrawalAreaPath = data.length > 0 ? generateAreaPath(data, width, height, minValue, maxValue, 'withdrawal') : "";

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!showTooltip || data.length === 0) return;

        const svg = svgRef.current;
        if (!svg) return;

        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;

        const nearest = findNearestDataPoint(data, mouseX, width);
        if (nearest) {
        // Use the same padding and chartHeight as generatePath
        const graphPadding = { top: 85, bottom: 50 };
        const graphChartHeight = 186 - graphPadding.top + 45 - graphPadding.bottom;
        const valueRange = maxValue - minValue;
        
        const clampedDeposit = Math.min(Math.max(nearest.point.deposit, minValue), maxValue);
        const normalizedDeposit = (clampedDeposit - minValue) / valueRange;
        const depositY = graphPadding.top + graphChartHeight - normalizedDeposit * graphChartHeight;

        const clampedWithdrawal = Math.min(Math.max(nearest.point.withdrawal, minValue), maxValue);
        const normalizedWithdrawal = (clampedWithdrawal - minValue) / valueRange;
        const withdrawalY = graphPadding.top + graphChartHeight - normalizedWithdrawal * graphChartHeight;

        setHoveredPoint({
            point: nearest.point,
            x: nearest.x,
            depositY,
            withdrawalY,
        });
        }
    };

    const handleMouseLeave = () => {
        setHoveredPoint(null);
    };

    return (
        <>
            <div className="relative w-[57.313rem] h-[15.313rem]">
                <Card className="w-full h-full rounded-[0.625rem] border border-solid border-[#FFFFFF0A] backdrop-blur-[50px]"
                    style={{
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 49.67%, rgba(153, 153, 153, 0) 100%)'
                    }}
                >
                    <CardContent className="relative w-full h-full p-0">
                        <div className="absolute top-5 left-7 flex items-center gap-3">
                            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14.7692 0H1.23077C0.904349 0 0.591298 0.13409 0.360484 0.372773C0.12967 0.611456 0 0.935179 0 1.27273V12.7273C0 13.0648 0.12967 13.3885 0.360484 13.6272C0.591298 13.8659 0.904349 14 1.23077 14H14.7692C15.0957 14 15.4087 13.8659 15.6395 13.6272C15.8703 13.3885 16 13.0648 16 12.7273V1.27273C16 0.935179 15.8703 0.611456 15.6395 0.372773C15.4087 0.13409 15.0957 0 14.7692 0ZM13.5385 10.8182C13.7017 10.8182 13.8582 10.8852 13.9736 11.0046C14.089 11.1239 14.1538 11.2858 14.1538 11.4545C14.1538 11.6233 14.089 11.7852 13.9736 11.9045C13.8582 12.0239 13.7017 12.0909 13.5385 12.0909H2.46154C2.29833 12.0909 2.1418 12.0239 2.0264 11.9045C1.91099 11.7852 1.84615 11.6233 1.84615 11.4545V2.54545C1.84615 2.37668 1.91099 2.21482 2.0264 2.09548C2.1418 1.97614 2.29833 1.90909 2.46154 1.90909C2.62475 1.90909 2.78127 1.97614 2.89668 2.09548C3.01209 2.21482 3.07692 2.37668 3.07692 2.54545V7.55045L5.76 5.23807C5.86196 5.15021 5.98865 5.09879 6.12118 5.09148C6.25371 5.08417 6.38497 5.12136 6.49539 5.1975L9.80308 7.47966L13.1423 4.6017C13.2678 4.49369 13.4296 4.44164 13.5922 4.457C13.7548 4.47237 13.9048 4.55389 14.0092 4.68364C14.1137 4.81338 14.164 4.98072 14.1492 5.14884C14.1343 5.31697 14.0555 5.4721 13.93 5.58011L10.2377 8.76193C10.1357 8.84979 10.009 8.90121 9.87652 8.90852C9.74399 8.91583 9.61273 8.87864 9.50231 8.8025L6.19462 6.52034L3.07692 9.20739V10.8182H13.5385Z" fill={primaryColor}/>
                            </svg>

                            <div className="text-[1.125rem] mt-1 font-[500] text-white"
                                style={{
                                    fontFamily: 'Roboto, sans-serif'
                                }}
                            >
                                {title || locale?.credit_history}
                            </div>
                        </div>

                        {displayYAxisLabels.map((label, index) => (
                            <div
                                key={`ylabel-${index}`}
                                className="absolute left-7 [font-family:'Roboto',Helvetica] font-normal text-[#ffffffa6] text-sm tracking-[0.12px] leading-[19.6px] whitespace-nowrap"
                                style={{ top: horizontalLines[index]?.top - 7 || 74 + index * 34 }}
                            >
                                {label}
                            </div>
                        ))}

                        {data.map((point, index) => (
                            <div
                                key={`time-${index}`}
                                className="absolute w-[37px] [font-family:'Roboto',Helvetica] font-normal text-[#ffffffa6] text-sm tracking-[0.12px] leading-[19.6px] text-center"
                                style={{
                                    left: padding.left + (index * (width - padding.left - padding.right)) / (data.length - 1) - 18.5,
                                    top: 202,
                                }}
                            >
                                {point.time}
                            </div>
                        ))}

                        <svg
                            ref={svgRef}
                            className="absolute top-0 left-0"
                            width={width}
                            height={height}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                        >
                            <defs>
                            <linearGradient id="depositGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={depositGradientStart} />
                                <stop offset="100%" stopColor={depositGradientEnd} />
                            </linearGradient>
                            <linearGradient id="withdrawalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={withdrawalGradientStart} />
                                <stop offset="100%" stopColor={withdrawalGradientEnd} />
                            </linearGradient>
                            </defs>

                            {horizontalLines.map((line, index) => (
                                <line
                                    key={`line-${index}`}
                                    x1={padding.left}
                                    y1={line.top}
                                    x2={width - padding.right}
                                    y2={line.top}
                                    stroke="#ffffff14"
                                    strokeWidth="1"
                                />
                            ))}

                            {withdrawalAreaPath && (
                                <path
                                    d={withdrawalAreaPath}
                                    fill="url(#withdrawalGradient)"
                                    style={{
                                        opacity: isAnimated ? 0.6 : 0,
                                        transition: `opacity ${animationDuration}ms ease-in-out`,
                                    }}
                                />
                            )}

                            {depositAreaPath && (
                                <path
                                    d={depositAreaPath}
                                    fill="url(#depositGradient)"
                                    style={{
                                    opacity: isAnimated ? 0.6 : 0,
                                    transition: `opacity ${animationDuration}ms ease-in-out`,
                                    }}
                                />
                            )}

                            {withdrawalLinePath && (
                            <path
                                d={withdrawalLinePath}
                                fill="none"
                                stroke={withdrawalLineColor}
                                strokeWidth="1"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                strokeDasharray: isAnimated ? "none" : "1000",
                                strokeDashoffset: isAnimated ? "0" : "1000",
                                transition: `stroke-dashoffset ${animationDuration}ms ease-in-out`,
                                }}
                            />
                            )}

                            {depositLinePath && (
                            <path
                                d={depositLinePath}
                                fill="none"
                                stroke={depositLineColor}
                                strokeWidth="1"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                strokeDasharray: isAnimated ? "none" : "1000",
                                strokeDashoffset: isAnimated ? "0" : "1000",
                                transition: `stroke-dashoffset ${animationDuration}ms ease-in-out`,
                                }}
                            />
                            )}

                            {hoveredPoint && (
                            <>
                                <line
                                    x1={hoveredPoint.x}
                                    y1={padding.top}
                                    x2={hoveredPoint.x}
                                    y2={height - padding.bottom}
                                    stroke="#ffffff33"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                />
                                <circle
                                    cx={hoveredPoint.x}
                                    cy={hoveredPoint.depositY}
                                    r="7"
                                    fill={depositLineColor}
                                    stroke="white"
                                    strokeWidth="3"
                                />
                                    <circle
                                    cx={hoveredPoint.x}
                                    cy={hoveredPoint.withdrawalY}
                                    r="7"
                                    fill={withdrawalLineColor}
                                    stroke="white"
                                    strokeWidth="3"
                                />
                            </>
                            )}
                        </svg>
                    </CardContent>

                    {hoveredPoint && (
                        <div
                            className="absolute bg-[#1a1a1a] text-white px-4 py-2 rounded-md text-sm [font-family:'Roboto',Helvetica] pointer-events-none z-10"
                            style={{
                                left: hoveredPoint.x + 15,
                                top: Math.min(hoveredPoint.depositY, hoveredPoint.withdrawalY) - 45,
                                transform: hoveredPoint.x > width - 120 ? "translateX(-100%) translateX(-30px)" : "none",
                            }}
                        >
                        <div className="font-normal text-[#ffffffa6] text-xs mb-1">{scoreLabel || locale?.credit}</div>
                            <div className="font-bold text-white text-base">{hoveredPoint.point.creditScore} Score</div>
                        </div>
                    )}
                </Card>
            </div>
        </>
    )
}

export default CreditHistory;