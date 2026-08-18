import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { type LocaleStrings } from '@/lib/locale';

interface DayData {
  label: string;
  withdraw: number;
  deposit: number;
}

interface FinancialStatisticsProps {
  data?: DayData[];
  primaryColor?: string;
  locale: LocaleStrings;
}

const FinancialStatistics: React.FC<FinancialStatisticsProps> = ({ data, primaryColor, locale }) => {
  // Demo data structure
  const demoData: DayData[] = [
    { label: 'Mon', withdraw: 150, deposit: 50050 },
    { label: 'Tue', withdraw: 300, deposit: 50050 },
    { label: 'Wed', withdraw: 180, deposit: 50050 },
    { label: 'Thu', withdraw: 300000, deposit: 50050 },
  ];

  const chartData = data || demoData;

  const totalDeposit = chartData.reduce((sum, day) => sum + day.deposit, 0);
  const totalWithdraw = chartData.reduce((sum, day) => sum + day.withdraw, 0);
  const totalIncome = totalDeposit - totalWithdraw;

  const avgDeposit = totalDeposit / chartData.length;
  const avgWithdraw = totalWithdraw / chartData.length;

  const getCreditStatus = (): { label: string; color: string; icon: 'up' | 'down' } => {
    if (avgDeposit > 10000) return { label: locale.good, color: 'text-lime-400', icon: 'up' };
    return { label: locale.poor, color: 'text-red-500', icon: 'down' };
  };

  const getSpendingStatus = (): { label: string; color: string; icon: 'up' | 'down' } => {
    const spendingRatio = totalWithdraw / totalDeposit;

    if (spendingRatio > 0.7) return { label: locale.poor, color: 'text-red-500', icon: 'down' }; // Spending too much
    if (spendingRatio > 0.5) return { label: locale.fair, color: 'text-yellow-400', icon: 'up' }; // Moderate spending
    return { label: locale.good, color: 'text-lime-400', icon: 'up' }; // Low spending
  };

  const getIncomeStatus = (): { label: string; color: string; icon: 'up' | 'down' } => {
    if (totalIncome > 0) return { label: locale.good, color: 'text-lime-400', icon: 'up' };
    return { label: locale.poor, color: 'text-red-500', icon: 'down' };
  };

  const creditStatus = getCreditStatus();
  const spendingStatus = getSpendingStatus();
  const incomeStatus = getIncomeStatus();

  const stats = [
    {
      title: locale.credit,
      subtitle: locale.statistics,
      status: creditStatus,
      value: totalDeposit
    },
    {
      title: locale.spending,
      subtitle: locale.statistics,
      status: spendingStatus,
      value: totalWithdraw
    },
    {
      title: locale.income,
      subtitle: locale.statistics,
      status: incomeStatus,
      value: totalIncome
    }
  ];

  return (
    <div className="border-2 w-full h-full border-none rounded-lg pl-6 pt-[1.7rem] bg-transparent relative">
      <div className="space-y-0">
        {stats.map((stat, index) => (
          <div className='flex flex-col' key={index}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-[1rem]"
                  style={{
                      fontFamily: 'Roboto, sans-serif',
                      lineHeight: '100%',
                      letterSpacing: '-0.85%',
                  }}
                >{stat.title}</div>
                <p className="text-gray-400 text-sm">{stat.subtitle}</p>
              </div>

              <div
                className={`flex justify-center items-center w-[6rem] mr-5 h-[2.25rem] gap-2 rounded-lg border ${stat.status.label === locale.good ? 'border' : stat.status.label === locale.fair ? 'bg-[#FCD34D14] border-[#FCD34D0A] text-[#FCD34D]' : 'bg-[#EE4C1114] border-[#EE4C110A] text-[#EE4C11]'}`}
                style={stat.status.label === locale.good ? {
                  backgroundColor: `${primaryColor || '#BEEE11'}14`,
                  borderColor: `${primaryColor || '#BEEE11'}0A`,
                  color: primaryColor || '#BEEE11'
                } : {}}
              >
                  <span className="text-[0.875rem]"
                  style={{
                      fontFamily: 'Roboto, sans-serif',
                      lineHeight: '100%',
                      letterSpacing: '-0.85%',
                  }}
                  >{stat.status.label}</span>

                  {stat.status.icon === 'up' ? (
                      <TrendingUp className="w-4 h-4" />
                  ) : (
                      <TrendingDown className="w-4 h-4" />
                  )}
              </div>
            </div>

            {stat.title !== locale.income && (
              <div className='flex items-center mr-5 mb-[0.85rem] mt-[0.85rem] justify-center'>
                <div className="w-[15.75rem] h-[1px] bg-[#FFFFFF14]"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinancialStatistics;