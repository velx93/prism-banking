import React from "react";

interface ProtectionLevelProps {
  level: number;
  percentage: number;
  size?: number;
  primaryColor: string;
}

export const ProtectionLevel: React.FC<ProtectionLevelProps> = ({
  level,
  percentage,
  size = 200,
  primaryColor
}) => {
  const radius = 80;
  const strokeWidth = 6;
  const center = 100;

  const startAngle = -90;
  const endAngle = 200;
  const totalAngle = endAngle - startAngle;

  const startAngleRad = (startAngle * Math.PI) / 180;
  const endAngleRad = (endAngle * Math.PI) / 180;

  const startX = center + radius * Math.cos(startAngleRad);
  const startY = center + radius * Math.sin(startAngleRad);
  const endX = center + radius * Math.cos(endAngleRad);
  const endY = center + radius * Math.sin(endAngleRad);

  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`;

  const circumference = 2 * Math.PI * radius;
  const arcLength = (totalAngle / 360) * circumference;
  const progressOffset = arcLength - (percentage / 100) * arcLength;

  // Convert hex color to RGB values (0-1 range for feColorMatrix)
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      };
    }
    return { r: 0.745098, g: 0.933333, b: 0.0666667 }; // fallback to default yellow
  };

  const rgb = hexToRgb(primaryColor);
  const colorMatrixValues = `0 0 0 0 ${rgb.r} 0 0 0 0 ${rgb.g} 0 0 0 0 ${rgb.b} 0 0 0 0.6 0`;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        className="absolute inset-0"
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>

          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset/>
            <feGaussianBlur stdDeviation="8"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values={colorMatrixValues}/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
          </filter>
        </defs>
        
        <path
          d={arcPath}
          stroke={`${primaryColor}14`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
        
        <path
          d={arcPath}
          stroke={primaryColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          filter="url(#glowFilter)"
          strokeDasharray={arcLength}
          strokeDashoffset={progressOffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
    </div>
  );
};