import React from 'react';

interface DayData {
  label: string;
  withdraw: number;
  deposit: number;
}

interface WeeklyActivityChartProps {
  data?: DayData[];
  primaryColor?: string;
}

const WeeklyActivityChart: React.FC<WeeklyActivityChartProps> = ({ data, primaryColor }) => {
  // Demo data structure: array of { label, withdraw, deposit }
  const demoData: DayData[] = [
    { label: 'Mon', withdraw: 50, deposit: 200 },
    { label: 'Tue', withdraw: 350, deposit: 250 },
    { label: 'Wed', withdraw: 580, deposit: 400 },
    { label: 'Thu', withdraw: 550, deposit: 280 },
    
  ];

  const chartData = data || demoData;
  const maxValue = Math.max(
    ...chartData.flatMap(day => [day.withdraw, day.deposit])
  );

  const calculateHeight = (amount: number): number => {
    if (maxValue === 0) return 0;
    return (amount / maxValue) * 50;
  };
  const getColor = (amount: number): string => {
    if (amount === 0) return 'bg-gray-700'; // Gray for no activity
    if (amount < maxValue * 0.3) return 'bg-[#EE4C11]'; // Red for low
    // For medium and high, use inline styles with primaryColor instead of classes
    return ''; // Will be handled by inline styles
  };

  return (
    <div className="flex gap-4 mt-4 items-end p-5 bg-transparent rounded-lg h-[100px]">
      {chartData.map((day, index) => (
        <div key={index} className="flex flex-col items-center gap-2 flex-1">
          <div className="flex gap-1 items-end h-18">
            <div
              className={`w-[0.625rem] rounded-t-[0.125rem] transition-all duration-300 ${day.withdraw > 0 ? 'min-h-[4px]' : ''} ${getColor(day.withdraw)}`}
              style={{
                height: `${calculateHeight(day.withdraw)}px`,
                backgroundColor: day.withdraw === 0
                  ? undefined
                  : day.withdraw < maxValue * 0.3
                    ? '#EE4C11'
                    : day.withdraw < maxValue * 0.6
                      ? `${primaryColor || '#BEEE11'}52`
                      : primaryColor || '#BEEE11'
              }}
              title={`Withdraw: $${day.withdraw}`}
            />


            <div
              className={`w-[0.625rem] rounded-t-[0.125rem] transition-all duration-300 ${day.deposit > 0 ? 'min-h-[4px]' : ''} ${getColor(day.deposit)}`}
              style={{
                height: `${calculateHeight(day.deposit)}px`,
                backgroundColor: day.deposit === 0
                  ? undefined
                  : day.deposit < maxValue * 0.3
                    ? '#EE4C11'
                    : day.deposit < maxValue * 0.6
                      ? `${primaryColor || '#BEEE11'}52`
                      : primaryColor || '#BEEE11'
              }}
              title={`Deposit: $${day.deposit}`}
            />
          </div>
          
          <span className="text-xs text-gray-500 font-medium">
            {day.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default WeeklyActivityChart;