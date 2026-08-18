import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import WeeklyActivityChart from "@/components/main/WeeklyTransactionBar";
import FinancialStatistics from "@/components/main/FinancialStatistics";
import StatCreditScore from "@/components/main/StatCreditScore";
import SparkLineChart from "@/components/main/SparkLineChart";
import CreditHistoryChart from "@/components/Chart/CreditHistoryChart";
import { type DataPoint } from "@/components/Chart/CreditHistoryChart";
import NotificationBell from "@/components/ui/Notificationbell";
import { type LocaleStrings } from "@/lib/locale";

interface HistoryItem {
    Spendtype: string;
    timestamp: number;
    amount: number;
    transactionType: 'deposit' | 'withdraw';
}

interface DayData {
    label: string;
    withdraw: number;
    deposit: number;
}

interface Account {
    pin: number;
    balance: number;
    type: string;
    accountNumber: number;
    identifier: string;
    primary: boolean;
}

type SpendType = 'cash' | 'bank' | 'invoice';

function calculateNetDeposits(
    history: HistoryItem[], 
    spendType: SpendType,
    dataPoints: number = 11
): number[] {
    if (!history || history.length === 0) {
        return Array(dataPoints).fill(0);
    }

    const filteredHistory = history.filter(item => item.Spendtype === spendType);
    
    if (filteredHistory.length === 0) {
        return Array(dataPoints).fill(0);
    }

    const sortedHistory = [...filteredHistory].sort((a, b) => a.timestamp - b.timestamp);
    
    const oldestTimestamp = sortedHistory[0].timestamp;
    const newestTimestamp = sortedHistory[sortedHistory.length - 1].timestamp;
    const timeSpan = newestTimestamp - oldestTimestamp;

    if (sortedHistory.length === 1 || timeSpan === 0) {
        const netAmount = sortedHistory.reduce((sum, item) => {
            return item.transactionType === 'deposit' 
                ? sum + item.amount 
                : sum - item.amount;
        }, 0);
        
        const result = Array(dataPoints).fill(0);
        result[dataPoints - 1] = Math.max(0, netAmount);
        return result;
    }

    const bucketDuration = timeSpan / (dataPoints - 1);
    const buckets: number[] = Array(dataPoints).fill(0);

    sortedHistory.forEach(item => {
        const bucketIndex = Math.min(
            Math.floor((item.timestamp - oldestTimestamp) / bucketDuration),
            dataPoints - 1
        );
        
        const amount = item.transactionType === 'deposit' 
            ? item.amount 
            : -item.amount;
        
        buckets[bucketIndex] += amount;
    });
    return buckets.map(value => Math.abs(Math.round(value)));

}
function convertHistoryToWeeklyData(history: HistoryItem[]): DayData[] {
    if (!history || history.length === 0) {
        return [
            { label: 'Mon', withdraw: 0, deposit: 0 },
            { label: 'Tue', withdraw: 0, deposit: 0 },
            { label: 'Wed', withdraw: 0, deposit: 0 },
            { label: 'Thu', withdraw: 0, deposit: 0 },
        ];
    }

    // Use current time to ensure we include today
    const now = Math.floor(Date.now() / 1000);
    const oneDayInSeconds = 24 * 60 * 60;
    const threeDaysAgo = now - (3 * oneDayInSeconds);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const last4Days: DayData[] = [];

    // Create 4 day buckets (last 3 days + today)
    for (let i = 3; i >= 0; i--) {
        const dayTimestamp = now - (i * oneDayInSeconds);
        const date = new Date(dayTimestamp * 1000);
        const dayLabel = dayNames[date.getDay()];

        last4Days.push({
            label: dayLabel,
            withdraw: 0,
            deposit: 0
        });
    }

    // Filter transactions from last 4 days (3 days ago + today)
    const recentHistory = history.filter(item => item.timestamp >= threeDaysAgo);

    // Aggregate transactions by day
    recentHistory.forEach(item => {
        const daysDiff = Math.floor((now - item.timestamp) / oneDayInSeconds);
        const dayIndex = 3 - daysDiff;

        if (dayIndex >= 0 && dayIndex < 4) {
            if (item.transactionType === 'deposit') {
                last4Days[dayIndex].deposit += item.amount;
            } else if (item.transactionType === 'withdraw') {
                last4Days[dayIndex].withdraw += item.amount;
            }
        }
    });

    return last4Days;
}

function calculateDailyIncome(history: HistoryItem[]): number {
    if (!history || history.length === 0) return 0;

    const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const mostRecentTimestamp = sortedHistory[0]?.timestamp || Math.floor(Date.now() / 1000);
    
    const oneDayAgo = mostRecentTimestamp - (24 * 60 * 60);
    
    const dailyDeposits = history.filter(item => 
        item.timestamp >= oneDayAgo && 
        item.timestamp <= mostRecentTimestamp &&
        item.transactionType === 'deposit'
    );
    
    const totalIncome = dailyDeposits.reduce((sum, item) => sum + item.amount, 0);

    return totalIncome;
}

function calculateTotalBankBalance(accounts: Account[]) {
    return accounts.reduce((sum, account) => sum + account.balance, 0);
}

function generateCreditHistoryDataRealistic(
    history: HistoryItem[],
    currentCreditScore: number,
    dataPoints: number = 10
): DataPoint[] {
    if (!history || history.length === 0) {
        return Array(dataPoints).fill(null).map((_, i) => ({
            time: `${String(i).padStart(2, '0')}:00`,
            deposit: 0,
            withdrawal: 0,
            creditScore: currentCreditScore,
            timestamp: i * 100
        }));
    }

    const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
    const oldestTimestamp = sortedHistory[0].timestamp;
    const newestTimestamp = sortedHistory[sortedHistory.length - 1].timestamp;
    const timeSpan = Math.max(newestTimestamp - oldestTimestamp, 1);
    const bucketDuration = timeSpan / dataPoints;

    const buckets: DataPoint[] = [];
    let runningBalance = 0;

    for (let i = 0; i < dataPoints; i++) {
        const bucketStartTime = oldestTimestamp + (i * bucketDuration);
        const bucketEndTime = bucketStartTime + bucketDuration;
        
        const bucketTransactions = sortedHistory.filter(
            item => item.timestamp >= bucketStartTime && item.timestamp < bucketEndTime
        );

        const deposit = bucketTransactions
            .filter(item => item.transactionType === 'deposit')
            .reduce((sum, item) => sum + item.amount, 0);

        const withdrawal = bucketTransactions
            .filter(item => item.transactionType === 'withdraw')
            .reduce((sum, item) => sum + item.amount, 0);

        runningBalance += (deposit - withdrawal);

        const date = new Date(bucketStartTime * 1000);
        const timeLabel = `${String(date.getHours()).padStart(2, '0')}:00`;

        buckets.push({
            time: timeLabel,
            deposit: Math.round(deposit),
            withdrawal: Math.round(withdrawal),
            creditScore: 0,
            timestamp: Math.round(bucketStartTime)
        });
    }

    buckets.forEach((bucket, index) => {
        const progress = index / (dataPoints - 1);
        
        const targetScore = currentCreditScore;
        const startScore = Math.max(300, currentCreditScore - 150);
        const trendScore = startScore + ((targetScore - startScore) * progress);

        const totalActivity = bucket.deposit + bucket.withdrawal;
        const depositRatio = totalActivity > 0 ? bucket.deposit / totalActivity : 0.5;
        const ratioImpact = (depositRatio - 0.5) * 80;

        const activityImpact = Math.min(20, totalActivity / 2000);

        let score = trendScore + ratioImpact + activityImpact;

        score += (Math.random() - 0.5) * 20;

        if (index === dataPoints - 1) {
            score = currentCreditScore;
        }

        bucket.creditScore = Math.round(Math.max(300, Math.min(900, score)));
    });

    for (let i = 1; i < buckets.length - 1; i++) {
        const prev = buckets[i - 1].creditScore;
        const curr = buckets[i].creditScore;
        const next = buckets[i + 1].creditScore;
        buckets[i].creditScore = Math.round((prev + curr + next) / 3);
    }

    return buckets;
}

const StatisticsPage = ({basicData, onClose, onCreateAccountClick, locale, primaryColor}: {basicData: any, onClose: () => void, onCreateAccountClick: () => void, locale: LocaleStrings, primaryColor: string}) => {
    const [creditScore, setCreditScore] = useState(800);
    const [dailyIncome, setDailyIncome] = useState(0);
    const weeklyData = convertHistoryToWeeklyData(basicData.History || []);
    
    useEffect(() => {
        setCreditScore(basicData.creditScore);
        setDailyIncome(calculateDailyIncome(basicData.History || []));
    }, [basicData]);

    const getCreditStatus = () => {
        if (creditScore >= 800) return locale.excellent;
        if (creditScore >= 600) return locale.good;
        if (creditScore >= 400) return locale.fair;
        return locale.poor;
    };
    const fadeIn = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.6 } }
    };

    const creditHistoryData: DataPoint[] = generateCreditHistoryDataRealistic(basicData.History || [], creditScore);

    return (
        <>
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    visible: {
                        transition: {
                            staggerChildren: 0.1
                        }
                    }
                }}
            >
                <motion.div variants={fadeIn} className="flex flex-row items-center gap-[0.8rem]">
                    <div className="w-[3.125rem] h-[3.125rem] mt-[1.9rem] ml-[2.2rem] rounded-full border border-[#FFFFFF29] p-[0.18rem]">
                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 mt-[0rem]">
                            <img 
                                src={basicData?.playerProfile || "./essential/placeholder.png"} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute top-[4.27rem] left-[4.4rem] w-[0.75rem] h-[0.75rem] rounded-full border-[3px] border-black" style={{ backgroundColor: primaryColor }}></div>
                    </div>

                    <div className="flex flex-col mt-9">
                        <div className="text-[#FFFFFFA6] text-[0.875rem]"
                            style={{
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 400,
                                lineHeight: '140%',
                                letterSpacing: '0.85%',
                            }}
                        >
                            {basicData?.playerJobLabel}
                        </div>
                        <div className="text-white text-[0.9rem]"
                            style={{
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 600,
                                lineHeight: '140%',
                            }}
                        >
                            {basicData?.playerName}
                        </div>
                    </div>

                    <div className="w-12 h-12 flex items-center cursor-pointer border border-[#FFFFFF0A] justify-center bg-[#FFFFFF14] rounded-[0.625rem] mt-[2rem] ml-1 group" onClick={onCreateAccountClick} style={{backdropFilter: 'blur(20px)'}}>
                        <svg className="group-hover:rotate-90 transition-all duration-300" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 0C6.41775 0 4.87103 0.469192 3.55544 1.34824C2.23985 2.22729 1.21447 3.47672 0.608967 4.93853C0.00346628 6.40034 -0.15496 8.00887 0.153721 9.56072C0.462403 11.1126 1.22433 12.538 2.34315 13.6569C3.46197 14.7757 4.88743 15.5376 6.43928 15.8463C7.99113 16.155 9.59966 15.9965 11.0615 15.391C12.5233 14.7855 13.7727 13.7602 14.6518 12.4446C15.5308 11.129 16 9.58225 16 8C15.9974 5.87908 15.1536 3.84579 13.6539 2.34607C12.1542 0.84635 10.1209 0.00264619 8 0ZM11.0769 8.61538H8.61539V11.0769C8.61539 11.2401 8.55055 11.3967 8.43514 11.5121C8.31974 11.6275 8.16321 11.6923 8 11.6923C7.83679 11.6923 7.68027 11.6275 7.56486 11.5121C7.44945 11.3967 7.38462 11.2401 7.38462 11.0769V8.61538H4.92308C4.75987 8.61538 4.60334 8.55055 4.48794 8.43514C4.37253 8.31973 4.30769 8.16321 4.30769 8C4.30769 7.83679 4.37253 7.68026 4.48794 7.56486C4.60334 7.44945 4.75987 7.38461 4.92308 7.38461H7.38462V4.92308C7.38462 4.75987 7.44945 4.60334 7.56486 4.48793C7.68027 4.37253 7.83679 4.30769 8 4.30769C8.16321 4.30769 8.31974 4.37253 8.43514 4.48793C8.55055 4.60334 8.61539 4.75987 8.61539 4.92308V7.38461H11.0769C11.2401 7.38461 11.3967 7.44945 11.5121 7.56486C11.6275 7.68026 11.6923 7.83679 11.6923 8C11.6923 8.16321 11.6275 8.31973 11.5121 8.43514C11.3967 8.55055 11.2401 8.61538 11.0769 8.61538Z" fill="white" fillOpacity={0.65}/>
                        </svg>
                    </div>

                    <div className="ml-2 mt-[1.7rem]">
                        <NotificationBell primaryColor={primaryColor} />
                    </div>

                    <div className='absolute top-9 right-9 flex flex-row-reverse gap-5'>
                        <button className="w-9 h-9 flex justify-center items-center rounded-lg bg-white hover:bg-gray-100 transition-colors duration-200 shadow-lg z-10 group" onClick={onClose}>
                            <svg className="group-hover:rotate-90 transition-transform duration-200" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.8242 10.9752C11.8799 11.031 11.9241 11.0971 11.9543 11.17C11.9845 11.2428 12 11.3209 12 11.3997C12 11.4785 11.9845 11.5566 11.9543 11.6294C11.9241 11.7023 11.8799 11.7684 11.8242 11.8242C11.7684 11.8799 11.7023 11.9241 11.6294 11.9543C11.5566 11.9845 11.4785 12 11.3997 12C11.3209 12 11.2428 11.9845 11.17 11.9543C11.0971 11.9241 11.031 11.8799 10.9752 11.8242L6 6.8482L1.02478 11.8242C0.912198 11.9368 0.75951 12 0.6003 12C0.441091 12 0.288402 11.9368 0.175824 11.8242C0.0632457 11.7116 3.1384e-09 11.5589 0 11.3997C-3.1384e-09 11.2405 0.0632457 11.0878 0.175824 10.9752L5.1518 6L0.175824 1.02478C0.0632457 0.912198 0 0.75951 0 0.6003C0 0.441091 0.0632457 0.288402 0.175824 0.175824C0.288402 0.0632457 0.441091 0 0.6003 0C0.75951 0 0.912198 0.0632457 1.02478 0.175824L6 5.1518L10.9752 0.175824C11.0878 0.0632457 11.2405 -3.1384e-09 11.3997 0C11.5589 3.1384e-09 11.7116 0.0632457 11.8242 0.175824C11.9368 0.288402 12 0.441091 12 0.6003C12 0.75951 11.9368 0.912198 11.8242 1.02478L6.8482 6L11.8242 10.9752Z" fill="#121212"/>
                            </svg>
                        </button>

                        <div className='flex flex-col gap-[0.05rem] text-right'>
                            <div className='text-[0.875rem]'
                                style= {{
                                    color: 'white',
                                    fontStyle: 'bold',
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.close}
                            </div>
                            <div className='text-[0.875rem]'
                                style= {{
                                    color: '#FFFFFFA6',
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                    fontWeight: 400
                                }}
                            >
                                {locale.banking}
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={fadeIn} className="flex justify-center">
                    <div className="w-[57.313rem] h-[0.063rem] bg-[#FFFFFF29] mt-5"></div>
                </motion.div>

                <motion.div variants={fadeIn} className="flex flex-col gap-1 mt-[1.9rem] ml-[2.2rem]">
                    <div className="text-white text-[1.375rem] text-left"
                        style={{
                            fontFamily: 'Roboto, sans-serif',
                            fontWeight: 700,
                            lineHeight: '140%',
                            letterSpacing: '-0.85%',
                        }}
                    >
                        {locale.account_data}
                    </div>
                </motion.div>

                <motion.div variants={fadeIn} className="flex justify-center gap-[1.3rem] mt-3">
                    <div className="w-[18.271rem] h-[13.75rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] backdrop:blur-[50px] rounded-[0.625rem]">
                        <div className=" mt-5 ml-7 flex flex-start justify-start gap-[0.625rem]">
                            <svg className="mt-1" width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.8139 4.48769L9.35932 0.18C9.30018 0.122871 9.22997 0.0775705 9.15272 0.0466855C9.07547 0.0158005 8.99268 -6.33759e-05 8.90909 1.90276e-07H1.27273C0.935179 1.90276e-07 0.611456 0.12967 0.372773 0.360484C0.13409 0.591298 0 0.904349 0 1.23077V14.7692C0 15.0957 0.13409 15.4087 0.372773 15.6395C0.611456 15.8703 0.935179 16 1.27273 16H12.7273C13.0648 16 13.3885 15.8703 13.6272 15.6395C13.8659 15.4087 14 15.0957 14 14.7692V4.92308C14.0001 4.84224 13.9837 4.76218 13.9517 4.68748C13.9198 4.61277 13.8729 4.54488 13.8139 4.48769ZM9.54545 11.6923H4.45455C4.28577 11.6923 4.12391 11.6275 4.00457 11.5121C3.88523 11.3967 3.81818 11.2401 3.81818 11.0769C3.81818 10.9137 3.88523 10.7572 4.00457 10.6418C4.12391 10.5264 4.28577 10.4615 4.45455 10.4615H9.54545C9.71423 10.4615 9.87609 10.5264 9.99543 10.6418C10.1148 10.7572 10.1818 10.9137 10.1818 11.0769C10.1818 11.2401 10.1148 11.3967 9.99543 11.5121C9.87609 11.6275 9.71423 11.6923 9.54545 11.6923ZM9.54545 9.23077H4.45455C4.28577 9.23077 4.12391 9.16594 4.00457 9.05053C3.88523 8.93512 3.81818 8.77859 3.81818 8.61539C3.81818 8.45218 3.88523 8.29565 4.00457 8.18024C4.12391 8.06483 4.28577 8 4.45455 8H9.54545C9.71423 8 9.87609 8.06483 9.99543 8.18024C10.1148 8.29565 10.1818 8.45218 10.1818 8.61539C10.1818 8.77859 10.1148 8.93512 9.99543 9.05053C9.87609 9.16594 9.71423 9.23077 9.54545 9.23077ZM8.90909 4.92308V1.53846L12.4091 4.92308H8.90909Z" fill={primaryColor}/>
                            </svg>

                            <div className="text-white text-[1.125rem]"
                                style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    fontWeight: 500,
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.income_activity}
                            </div>
                        </div>

                        <div className="mt-4 ml-7 flex-col flex-start justify-start gap-[0.625rem]">
                            <div className="flex flex-row items-start justify-start gap-3">
                                <div className="w-[0.25rem] mt-[0.15rem] h-[1rem] rounded-[0.063rem]" style={{ backgroundColor: primaryColor }}></div>
                                <div className="text-[1rem] text-white"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        fontWeight: 500,
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                    }}
                                >
                                    {locale.currencySign} {dailyIncome.toLocaleString()} {locale.currencyText}
                                </div>
                            </div>

                            <div className="font-[400] mt-1 text-[0.875rem] text-[#FFFFFFA6]"
                                style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.daily_income}
                            </div>
                        </div>

                        <WeeklyActivityChart data={weeklyData} primaryColor={primaryColor} />
                    </div>

                    <div className="w-[18.271rem] h-[13.75rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] backdrop:blur-[50px] rounded-[0.625rem]">
                        <FinancialStatistics data={weeklyData} primaryColor={primaryColor} locale={locale} />
                    </div>

                    <div className="relative w-[18.271rem] h-[13.75rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] backdrop:blur-[50px] rounded-[0.625rem] flex items-center justify-center">
                        <div className="mt-4">
                            <div className="absolute w-full top-[3.35rem] right-[-0.01rem] rotate-[90deg]">
                                <StatCreditScore size={209} points={creditScore} primaryColor={primaryColor} />
                            </div>
                            <div className="w-[9rem] h-[9rem] flex items-center justify-center bg-[#FFFFFF0A] rounded-full">
                                <div className="w-[7.25rem] h-[7.25rem] flex flex-col gap-2 items-center justify-center bg-[#FFFFFF0A] rounded-full">
                                    <div className="text-[0.875rem] mt-2 text-[#FFFFFFA6] font-[400]"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            lineHeight: '140%',
                                            letterSpacing: '-0.85%',
                                        }}
                                    >
                                        {locale.credit}
                                    </div>

                                    <div className="text-[1rem] text-white font-[600]"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            lineHeight: '140%',
                                            letterSpacing: '-0.85%',
                                        }}
                                    >
                                        {getCreditStatus()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={fadeIn} className="flex flex-row items-center justify-center mt-[1.1rem] gap-[1.5rem]">
                    <div className="w-[28rem] flex flex-row items-start h-[5rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] backdrop:blur-[50px] rounded-[0.625rem]">
                        <div className="w-[3rem] h-[3rem] mt-4 ml-4 flex items-center justify-center bg-[#FFFFFF0A] rounded-[0.625rem] border border-[#FFFFFF0A]">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 0C8.02219 0 6.08879 0.58649 4.4443 1.6853C2.79981 2.78412 1.51809 4.3459 0.761209 6.17316C0.00433284 8.00042 -0.1937 10.0111 0.192152 11.9509C0.578004 13.8907 1.53041 15.6725 2.92894 17.0711C4.32746 18.4696 6.10929 19.422 8.0491 19.8078C9.98891 20.1937 11.9996 19.9957 13.8268 19.2388C15.6541 18.4819 17.2159 17.2002 18.3147 15.5557C19.4135 13.9112 20 11.9778 20 10C19.9972 7.34869 18.9427 4.80678 17.068 2.93202C15.1932 1.05727 12.6513 0.00279983 10 0ZM11.5385 15.3846H10.7692V16.1538C10.7692 16.3579 10.6882 16.5535 10.5439 16.6978C10.3997 16.842 10.204 16.9231 10 16.9231C9.79599 16.9231 9.60033 16.842 9.45607 16.6978C9.31182 16.5535 9.23077 16.3579 9.23077 16.1538V15.3846H8.46154C7.64549 15.3846 6.86286 15.0604 6.28583 14.4834C5.70879 13.9064 5.38462 13.1237 5.38462 12.3077C5.38462 12.1037 5.46566 11.908 5.60992 11.7638C5.75418 11.6195 5.94984 11.5385 6.15385 11.5385C6.35786 11.5385 6.55352 11.6195 6.69778 11.7638C6.84204 11.908 6.92308 12.1037 6.92308 12.3077C6.92308 12.7157 7.08517 13.107 7.37368 13.3955C7.6622 13.6841 8.05352 13.8462 8.46154 13.8462H11.5385C11.9465 13.8462 12.3378 13.6841 12.6263 13.3955C12.9148 13.107 13.0769 12.7157 13.0769 12.3077C13.0769 11.8997 12.9148 11.5084 12.6263 11.2198C12.3378 10.9313 11.9465 10.7692 11.5385 10.7692H8.84616C8.03011 10.7692 7.24748 10.4451 6.67044 9.86802C6.09341 9.29098 5.76923 8.50836 5.76923 7.69231C5.76923 6.87626 6.09341 6.09363 6.67044 5.51659C7.24748 4.93956 8.03011 4.61538 8.84616 4.61538H9.23077V3.84615C9.23077 3.64214 9.31182 3.44648 9.45607 3.30222C9.60033 3.15797 9.79599 3.07692 10 3.07692C10.204 3.07692 10.3997 3.15797 10.5439 3.30222C10.6882 3.44648 10.7692 3.64214 10.7692 3.84615V4.61538H11.1538C11.9699 4.61538 12.7525 4.93956 13.3296 5.51659C13.9066 6.09363 14.2308 6.87626 14.2308 7.69231C14.2308 7.89632 14.1497 8.09198 14.0055 8.23623C13.8612 8.38049 13.6656 8.46154 13.4615 8.46154C13.2575 8.46154 13.0619 8.38049 12.9176 8.23623C12.7734 8.09198 12.6923 7.89632 12.6923 7.69231C12.6923 7.28428 12.5302 6.89297 12.2417 6.60445C11.9532 6.31593 11.5619 6.15384 11.1538 6.15384H8.84616C8.43813 6.15384 8.04682 6.31593 7.7583 6.60445C7.46978 6.89297 7.30769 7.28428 7.30769 7.69231C7.30769 8.10033 7.46978 8.49164 7.7583 8.78016C8.04682 9.06868 8.43813 9.23077 8.84616 9.23077H11.5385C12.3545 9.23077 13.1371 9.55494 13.7142 10.132C14.2912 10.709 14.6154 11.4916 14.6154 12.3077C14.6154 13.1237 14.2912 13.9064 13.7142 14.4834C13.1371 15.0604 12.3545 15.3846 11.5385 15.3846Z" fill={primaryColor}/>
                            </svg>
                        </div>

                        <div className="flex flex-col mt-4 ml-3 gap-1">
                            <div className="text-[1rem] text-[#FFFFFF] font-[500]"
                                style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.cash_balance}
                            </div>
                            <div className="text-[0.875rem] text-[#FFFFFFA6] font-[400]"
                                style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.total_amount}
                            </div>
                        </div>

                        <SparkLineChart
                            data={calculateNetDeposits(basicData.History, 'cash')}
                            width={110}
                            height={40}
                            strokeWidth={1}
                            className="ml-6 mt-4"
                            primaryColor={primaryColor}
                        />

                        <div className="flex flex-col mt-4 mr-4 gap-1 items-end ml-auto">
                            <div className="flex flex-row gap-1 items-end justify-end text-right">
                                <span className=" text-[1rem] text-right"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                        fontWeight: 500,
                                        color: primaryColor,
                                    }}
                                >
                                    {locale.currencySign}
                                </span>

                                <span className="text-white text-[1rem] line-clamp-2 text-right"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                        fontWeight: 500,
                                    }}
                                >
                                    {basicData?.cashBalance?.toLocaleString() || '0.00'}
                                </span>
                            </div>

                            <div className="text-[0.875rem] text-right text-[#FFFFFFA6] font-[400]"
                                style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.currencyText}
                            </div>
                        </div>
                    </div>

                    <div className="w-[28rem] h-[5rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] backdrop:blur-[50px] rounded-[0.625rem] flex flex-row">
                        <div className="w-[3rem] h-[3rem] mt-4 ml-4 flex items-center justify-center bg-[#FFFFFF0A] rounded-[0.625rem] border border-[#FFFFFF0A]">
                            <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 15.3334C20 15.5102 19.9298 15.6797 19.8047 15.8047C19.6797 15.9298 19.5101 16 19.3333 16H0.666667C0.489856 16 0.320286 15.9298 0.195262 15.8047C0.0702379 15.6797 0 15.5102 0 15.3334C0 15.1565 0.0702379 14.987 0.195262 14.862C0.320286 14.7369 0.489856 14.6667 0.666667 14.6667H19.3333C19.5101 14.6667 19.6797 14.7369 19.8047 14.862C19.9298 14.987 20 15.1565 20 15.3334ZM0.691667 6.18192C0.652015 6.04212 0.659132 5.89319 0.711934 5.7578C0.764736 5.62242 0.860331 5.50799 0.984167 5.43194L9.65083 0.0987494C9.75585 0.0341828 9.87672 0 10 0C10.1233 0 10.2441 0.0341828 10.3492 0.0987494L19.0158 5.43194C19.1397 5.5079 19.2354 5.62224 19.2883 5.75757C19.3412 5.8929 19.3484 6.04181 19.3089 6.18163C19.2693 6.32145 19.1852 6.44453 19.0693 6.53213C18.9533 6.61973 18.812 6.66706 18.6667 6.66691H16.6667V12.0001H18C18.1768 12.0001 18.3464 12.0703 18.4714 12.1954C18.5964 12.3204 18.6667 12.4899 18.6667 12.6668C18.6667 12.8436 18.5964 13.0131 18.4714 13.1381C18.3464 13.2632 18.1768 13.3334 18 13.3334H2C1.82319 13.3334 1.65362 13.2632 1.5286 13.1381C1.40357 13.0131 1.33333 12.8436 1.33333 12.6668C1.33333 12.4899 1.40357 12.3204 1.5286 12.1954C1.65362 12.0703 1.82319 12.0001 2 12.0001H3.33333V6.66691H1.33333C1.18816 6.66696 1.04693 6.61962 0.931117 6.53208C0.815302 6.44455 0.731227 6.3216 0.691667 6.18192ZM11.3333 11.3335C11.3333 11.5103 11.4036 11.6798 11.5286 11.8048C11.6536 11.9299 11.8232 12.0001 12 12.0001C12.1768 12.0001 12.3464 11.9299 12.4714 11.8048C12.5964 11.6798 12.6667 11.5103 12.6667 11.3335V7.33356C12.6667 7.15675 12.5964 6.98719 12.4714 6.86217C12.3464 6.73715 12.1768 6.66691 12 6.66691C11.8232 6.66691 11.6536 6.73715 11.5286 6.86217C11.4036 6.98719 11.3333 7.15675 11.3333 7.33356V11.3335ZM7.33333 11.3335C7.33333 11.5103 7.40357 11.6798 7.5286 11.8048C7.65362 11.9299 7.82319 12.0001 8 12.0001C8.17681 12.0001 8.34638 11.9299 8.47141 11.8048C8.59643 11.6798 8.66667 11.5103 8.66667 11.3335V7.33356C8.66667 7.15675 8.59643 6.98719 8.47141 6.86217C8.34638 6.73715 8.17681 6.66691 8 6.66691C7.82319 6.66691 7.65362 6.73715 7.5286 6.86217C7.40357 6.98719 7.33333 7.15675 7.33333 7.33356V11.3335Z" fill={primaryColor}/>
                            </svg>
                        </div>

                        <div className="flex flex-col mt-4 ml-3 gap-1">
                            <div className="text-[1rem] text-[#FFFFFF] font-[500]"
                                style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.bank_balance}
                            </div>
                            <div className="text-[0.875rem] text-[#FFFFFFA6] font-[400]"
                                style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.total_amount}
                            </div>
                        </div>

                        <SparkLineChart
                            data={calculateNetDeposits(basicData.History, 'bank')}
                            width={110}
                            height={40}
                            strokeWidth={1}
                            className="ml-6 mt-4"
                            primaryColor={primaryColor}
                        />

                        <div className="flex flex-col mt-4 mr-4 gap-1 items-end ml-auto">
                            <div className="flex flex-row gap-1 items-end justify-end text-right">
                                <span className=" text-[1rem] text-right"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                        fontWeight: 500,
                                        color: primaryColor,
                                    }}
                                >
                                    {locale.currencySign}
                                </span>

                                <span className="text-white text-[1rem] line-clamp-2 text-right"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                        fontWeight: 500,
                                    }}
                                >
                                    {calculateTotalBankBalance(basicData.accounts).toLocaleString()}
                                </span>
                            </div>

                            <div className="text-[0.875rem] text-right text-[#FFFFFFA6] font-[400]"
                                style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.currencyText}
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={fadeIn} className="flex mt-5 items-center justify-center">
                    <CreditHistoryChart data={creditHistoryData} primaryColor={primaryColor} locale={locale} />
                </motion.div>
            </motion.div>
        </>
    )
}

export default StatisticsPage;