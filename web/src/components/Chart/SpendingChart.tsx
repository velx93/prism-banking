import { ChevronDownIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import React, { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { type LocaleStrings } from "@/lib/locale";

interface DataPoint {
  value: number;
  label: string;
}

interface SpendingChartProps {
  locale: LocaleStrings;
  title?: string;
  currency?: string;
  timeframes?: Array<{ label: string; value: string }>;
  datasets?: {
    [key: string]: DataPoint[];
  };
  primaryColor?: string;
}

const defaultTimeframes = [
  { label: "24 Hours", value: "24hrs" },
  { label: "1 Day", value: "1day" },
  { label: "3 Days", value: "3days" },
];



export const SpendingChart: React.FC<SpendingChartProps> = ({
  title = "Recent Spending",
  currency = "USD",
  timeframes = defaultTimeframes,
  datasets = {},
  locale,
  primaryColor,
}) => {

    const [selectedTimeframe, setSelectedTimeframe] = useState(timeframes[0].value);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    const currentData = datasets[selectedTimeframe] || datasets[timeframes[0].value] || [];

    const maxValue = currentData.length > 0 ? Math.max(...currentData.map((d) => d.value)) : 0;
    const totalSpent = currentData.length > 0 ? currentData.reduce((sum, d) => sum + d.value, 0) : 0;
    const avgValue = currentData.length > 0 ? totalSpent / currentData.length : 0;

    const chartHeight = 110;
    const chartWidth = 824;
    const chartPadding = 28;

    const roundToNearestThousand = (num: number): number => {
        return Math.ceil(num / 10000) * 10000;
    };

    const maxDisplayValue = maxValue === 0 ? 10000 : roundToNearestThousand(maxValue);

    const calculatePercentageChange = () => {
        if (!currentData || currentData.length < 2) return 0;
        
        const firstHalf = currentData.slice(0, Math.floor(currentData.length / 2));
        const secondHalf = currentData.slice(Math.floor(currentData.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

        if (firstAvg === 0) {
            return secondAvg > 0 ? 100 : 0;
        }
        
        const change = ((secondAvg - firstAvg) / firstAvg) * 100;

        return isNaN(change) || !isFinite(change) ? 0 : change;
    };

    const percentageChange = calculatePercentageChange();

    const getYPosition = (value: number): number => {
        const normalized = value / maxDisplayValue;
        return chartHeight - normalized * (chartHeight - 60);
    };

    const getXPosition = (index: number): number => {
    // Prevent division by zero when there's only one data point
    if (currentData.length <= 1) return chartWidth / 2;
    return (chartWidth / (currentData.length - 1)) * index;
};

const generatePath = (): string => {
    if (currentData.length === 0) return "";
    if (currentData.length === 1) {
        // Single point - draw a small dot
        const x = chartWidth / 2;
        const y = getYPosition(currentData[0].value);
        return `M ${x} ${y} L ${x} ${y}`;
    }
    
    let path = "";
    currentData.forEach((point, index) => {
        const x = getXPosition(index);
        const y = getYPosition(point.value);

        if (index === 0) {
            path += `M ${x} ${y}`;
        } else {
            const prevX = getXPosition(index - 1);
            const prevY = getYPosition(currentData[index - 1].value);
            const cpX1 = prevX + (x - prevX) / 3;
            const cpX2 = prevX + (2 * (x - prevX)) / 3;
            path += ` C ${cpX1} ${prevY}, ${cpX2} ${y}, ${x} ${y}`;
        }
    });
    return path;
};

const generateAreaPath = (): string => {
    if (currentData.length === 0) return "";
    if (currentData.length === 1) {
        const x = chartWidth / 2;
        const y = getYPosition(currentData[0].value);
        return `M ${x} ${y} L ${x} ${chartHeight} L ${x} ${chartHeight} Z`;
    }
    
    const linePath = generatePath();
    const lastX = getXPosition(currentData.length - 1);
    return `${linePath} L ${lastX} ${chartHeight} L 0 ${chartHeight} Z`;
};

    const handlePointHover = (index: number, event: React.MouseEvent<HTMLDivElement>) => {
        setHoveredPoint(index);
        const target = event.currentTarget;
        const parentRect = target.offsetParent?.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        if (parentRect) {
        setTooltipPosition({
            x: targetRect.left - parentRect.left + targetRect.width / 2,
            y: targetRect.top - parentRect.top,
        });
        }
    };

    return (
        <>
            <div className="relative w-[57.313rem] h-[15.625rem]">
                <Card className="w-full h-full border backdrop:blur-[50px] border-[#FFFFFF0A]"
                    style={{
                        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 49.67%, rgba(153, 153, 153, 0) 100%)",
                    }}
                >
                    <CardContent className="relative w-full h-full p-0">
                        <div className="absolute top-[13.188rem] left-7 right-7 flex justify-between">
                            {currentData.map((point, index) => (
                                <div
                                    key={`label-${index}`}
                                    className="text-[#ffffffa6] [font-family:'Roboto',Helvetica] font-normal text-sm tracking-[0.12px] leading-[19.6px]"
                                >
                                    {point.label}
                                </div>
                            ))}
                        </div>

                        <div className="absolute top-40 right-6 [font-family:'Roboto',Helvetica] font-normal text-[#ffffffa6] text-sm text-right tracking-[0.12px] leading-[19.6px] whitespace-nowrap">
                            {locale.currencySign} 0K
                        </div>

                        <div className="absolute top-[8.125rem] right-6  [font-family:'Roboto',Helvetica] font-normal text-[#ffffffa6] text-sm text-right tracking-[0.12px] leading-[19.6px]">
                            {locale.currencySign} {Math.round(maxDisplayValue / 1000)}K
                        </div>

                        <div className="absolute top-[11.875rem] left-7 w-[53.813rem] h-px bg-[#ffffff14]" />

                        <svg
                            className="absolute top-[5rem] left-7 w-[51.5rem] h-[6.875rem]"
                            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                            preserveAspectRatio="none"
                        >
                            <defs>
                            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={primaryColor} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
                            </linearGradient>
                            </defs>

                            <path
                                d={generateAreaPath()}
                                fill="url(#areaGradient)"
                                className="transition-all duration-700 ease-in-out"
                            />

                            <path
                                d={generatePath()}
                                fill="none"
                                stroke={primaryColor}
                                strokeWidth="1"
                                className="transition-all duration-700 ease-in-out"
                            />
                        </svg>

                        {currentData.map((point, index) => {
                            const x = getXPosition(index);
                            const y = getYPosition(point.value);
                            return (
                                <div
                                    key={`point-${index}`}
                                    className="absolute w-3.5 h-3.5 rounded-[7px] border-[3px] border-solid border-white cursor-pointer transition-all duration-300 hover:scale-125 hover:shadow-lg"
                                    style={{
                                    left: `${chartPadding + x}px`,
                                    top: `${80 + y}px`,
                                    transform: "translate(-50%, -50%)",
                                    backgroundColor: primaryColor,
                                    }}
                                    onMouseEnter={(e) => handlePointHover(index, e)}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                />
                            );
                        })}

                        {hoveredPoint !== null && (
                            <div
                                className="absolute z-50 bg-[#0000004A] text-white px-3 py-2 rounded-lg backdrop-blur-sm border-none pointer-events-none whitespace-nowrap shadow-xl"
                                style={{
                                    left: `${tooltipPosition.x}px`,
                                    top: `${tooltipPosition.y - 65}px`,
                                    transform: "translateX(-50%)",
                                }}
                            >
                                <div className="text-[#8a8a8a] text-xs mb-1 [font-family:'Roboto',Helvetica] font-normal">
                                    {locale.spent}
                                </div>
                                <div className="font-bold text-white text-lg [font-family:'Roboto',Helvetica]">
                                    {locale.currencySign} {currentData[hoveredPoint].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        )}

                        <div className="top-[1rem] left-[49rem] w-[6.875rem] h-9 relative">
                            <Button
                                variant="ghost"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-[6.75rem] h-9 bg-[#ffffff0a] rounded-lg border-none backdrop-blur-[25px] backdrop-brightness-[100%] focus-visible:outline-none focus-visible:ring-0 [-webkit-backdrop-filter:blur(25px)_brightness(100%)] hover:bg-[#ffffff14]"
                            >
                                <span className="[font-family:'Roboto',Helvetica] font-medium text-white text-sm text-center tracking-[0.12px] leading-[19.6px]">
                                    {timeframes.find((t) => t.value === selectedTimeframe)?.label}
                                </span>
                                <ChevronDownIcon
                                    className={`ml-1 w-3 h-3 transition-transform duration-200 text-white ${
                                    isDropdownOpen ? "rotate-180" : ""
                                    }`}
                                />
                            </Button>

                            {isDropdownOpen && (
                                <div className="absolute top-full mt-1 left-0 w-[108px] bg-[#1a1a1a] border border-[#ffffff1a] backdrop-blur-[25px] rounded-lg overflow-hidden z-10">
                                    {timeframes.map((timeframe) => (
                                    <button
                                        key={timeframe.value}
                                        onClick={() => {
                                        setSelectedTimeframe(timeframe.value);
                                        setIsDropdownOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                                        selectedTimeframe === timeframe.value
                                            ? "bg-[#ffffff1a]"
                                            : "text-white hover:bg-[#ffffff14]"
                                        }`}
                                        style={selectedTimeframe === timeframe.value ? { color: primaryColor } : {}}
                                    >
                                        {timeframe.label}
                                    </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="absolute top-[1.2rem] left-[1.8rem] gap-3 flex flex-row items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14.7692 3.84H11.6923C11.6923 2.82157 11.3033 1.84485 10.6109 1.12471C9.91842 0.40457 8.97926 0 8 0C7.02074 0 6.08159 0.40457 5.38914 1.12471C4.6967 1.84485 4.30769 2.82157 4.30769 3.84H1.23077C0.904349 3.84 0.591298 3.97486 0.360484 4.2149C0.12967 4.45495 0 4.78052 0 5.12V14.72C0 15.0595 0.12967 15.385 0.360484 15.6251C0.591298 15.8651 0.904349 16 1.23077 16H14.7692C15.0957 16 15.4087 15.8651 15.6395 15.6251C15.8703 15.385 16 15.0595 16 14.72V5.12C16 4.78052 15.8703 4.45495 15.6395 4.2149C15.4087 3.97486 15.0957 3.84 14.7692 3.84ZM5.53846 7.04C5.53846 7.20974 5.47363 7.37252 5.35822 7.49255C5.24281 7.61257 5.08629 7.68 4.92308 7.68C4.75987 7.68 4.60334 7.61257 4.48793 7.49255C4.37253 7.37252 4.30769 7.20974 4.30769 7.04V5.76C4.30769 5.59026 4.37253 5.42747 4.48793 5.30745C4.60334 5.18743 4.75987 5.12 4.92308 5.12C5.08629 5.12 5.24281 5.18743 5.35822 5.30745C5.47363 5.42747 5.53846 5.59026 5.53846 5.76V7.04ZM8 1.28C8.65284 1.28 9.27894 1.54971 9.74057 2.02981C10.2022 2.5099 10.4615 3.16105 10.4615 3.84H5.53846C5.53846 3.16105 5.7978 2.5099 6.25943 2.02981C6.72106 1.54971 7.34716 1.28 8 1.28ZM11.6923 7.04C11.6923 7.20974 11.6275 7.37252 11.5121 7.49255C11.3967 7.61257 11.2401 7.68 11.0769 7.68C10.9137 7.68 10.7572 7.61257 10.6418 7.49255C10.5264 7.37252 10.4615 7.20974 10.4615 7.04V5.76C10.4615 5.59026 10.5264 5.42747 10.6418 5.30745C10.7572 5.18743 10.9137 5.12 11.0769 5.12C11.2401 5.12 11.3967 5.18743 11.5121 5.30745C11.6275 5.42747 11.6923 5.59026 11.6923 5.76V7.04Z" fill={primaryColor}/>
                            </svg>

                            <div className="text-[1.125rem] mt-1 text-white"
                                style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    fontWeight: 500,
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.recent_spending}
                            </div>
                        </div>

                        <div className="absolute top-[3.5rem] left-[1.8rem] gap-3 flex flex-row items-start justify-start"
                            style={{
                                fontFamily: 'Roboto, sans-serif',
                                lineHeight: '140%',
                                letterSpacing: '-0.85%',
                                fontSize:'2rem'
                            }}
                        >
                            <span className="font-[700] tracking-[0.09px]" style={{ color: primaryColor }}>{locale.currencySign}</span>
                            <span className="text-white font-[700] tracking-[0.09px]">
                                {" "}
                                {totalSpent.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                                })}{" "}
                                {locale.currencyText}
                            </span>
                        </div>

                        <div className="absolute top-[6.4rem] left-[1.8rem] flex items-start justify-start gap-1">
                            <div className="text-[0.875rem] text-[#FFFFFFA6]"
                                style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    fontWeight: 400,
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.past} {timeframes.find((t) => t.value === selectedTimeframe)?.label}
                            </div>

                            <div className=" mt-1 ml-3 h-2.5 flex items-center ">
                                {percentageChange >= 0 ? (
                                    <TrendingUpIcon className="w-3 h-3" style={{ color: primaryColor }} />
                                ) : (
                                    <TrendingDownIcon className="w-3 h-3 text-red-400" />
                                )}
                                <span
                                    className="ml-2 whitespace-nowrap [font-family:'Roboto',Helvetica] font-normal text-sm tracking-[0.12px] leading-[19.6px]"
                                    style={{ color: percentageChange >= 0 ? primaryColor : '#ef4444' }}
                                >
                                    {percentageChange >= 0 ? "+" : ""}
                                    {percentageChange.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    )   
}