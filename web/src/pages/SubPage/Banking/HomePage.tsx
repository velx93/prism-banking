import { InteractiveChart } from "@/components/Chart/InteractiveChart";
import type { ChartDataPoint } from "@/components/Chart/types";
import { useState, useMemo, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import NotificationBell from "@/components/ui/Notificationbell";
import { type LocaleStrings } from "@/lib/locale";

interface Transaction {
    Spendtype: "cash" | "bank";
    timestamp: number;
    amount: number;
    transactionType: "deposit" | "withdraw";
}

function getDateRangeString(): string {
    const now = new Date();
    const currentMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    const nextMonthDate = new Date(now);
    nextMonthDate.setMonth(now.getMonth() + 1);
    const nextMonth = nextMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    return `${currentMonth} - ${nextMonth}`;
}

function calculateTotalSpending(transactions: Transaction[]): {
    cashSpending: number;
    bankSpending: number;
} {
    let cashSpending = 0;
    let bankSpending = 0;

    transactions.forEach(transaction => {
        if (transaction.transactionType === "withdraw") {
            if (transaction.Spendtype === "cash") {
                cashSpending += transaction.amount;
            } else if (transaction.Spendtype === "bank") {
                bankSpending += transaction.amount;
            } else if (transaction.Spendtype === "invoice") {
                bankSpending += transaction.amount;
            }
        }
    });

    return {
        cashSpending,
        bankSpending
    };
}

function processTransactionData(transactions: Transaction[]): Record<string, ChartDataPoint[]> {
    if (!transactions || transactions.length === 0) {
        return {
            "1h": [],
            "6h": [],
            "12h": [],
        };
    }
    const groupByInterval = (
        allTransactions: Transaction[],
        totalIntervals: number
    ): ChartDataPoint[] => {
        const intervals: Map<number, number> = new Map();
        
        const timestamps = allTransactions.map(t => t.timestamp * 1000);
        const oldestTime = Math.min(...timestamps);
        const newestTime = Math.max(...timestamps);
        const timeSpan = newestTime - oldestTime;
        
        const intervalMs = Math.max(timeSpan / (totalIntervals - 1), 60 * 1000);
        
        for (let i = 0; i < totalIntervals; i++) {
            intervals.set(i, 0);
        }
        
        allTransactions.forEach(transaction => {
            const transactionTime = transaction.timestamp * 1000;
            let intervalIndex;
            
            if (timeSpan > 0) {
                intervalIndex = Math.floor((transactionTime - oldestTime) / intervalMs);
            } else {
                intervalIndex = 0;
            }
            
            intervalIndex = Math.max(0, Math.min(totalIntervals - 1, intervalIndex));
            
            const currentValue = intervals.get(intervalIndex) || 0;
            
            if (transaction.transactionType === "deposit") {
                intervals.set(intervalIndex, currentValue + transaction.amount);
            } else if (transaction.transactionType === "withdraw") {
                intervals.set(intervalIndex, currentValue - transaction.amount);
            }
        });
        
        return Array.from(intervals.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([index, value]) => {
                const time = new Date(oldestTime + (index * intervalMs));
                const hours = time.getHours().toString().padStart(2, '0');
                const minutes = time.getMinutes().toString().padStart(2, '0');
                
                return {
                    value: Math.abs(value),
                    label: `${hours}:${minutes}`
                };
            });
    };
    return {
        "1h": groupByInterval(transactions, 6),
        "6h": groupByInterval(transactions, 7),
        "12h": groupByInterval(transactions, 7),
    };
}

const CountUpAnimation = ({ value, prefix = "", decimals = 2 }: { value: number, prefix?: string, decimals?: number }) => {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => {
        return decimals > 0 
            ? latest.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            : Math.round(latest).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    });
    const [displayValue, setDisplayValue] = useState("0");

    useEffect(() => {
        const controls = animate(count, value, { 
            duration: 2,
            ease: "easeOut"
        });
        
        const unsubscribe = rounded.on("change", (v) => setDisplayValue(v));
        
        return () => {
            controls.stop();
            unsubscribe();
        };
    }, [value]);

    return <>{prefix}{displayValue}</>;
};

const HomePage = ({ basicData, onClose, onCreateAccountClick, locale, primaryColor }: { basicData: any, onClose: () => void, onCreateAccountClick: () => void, locale: LocaleStrings, primaryColor: string }) => {
    const [selectedTimeRange, setSelectedTimeRange] = useState("1h");
    
    const { cashSpending, bankSpending } = useMemo(() => {
        if (basicData?.History && Array.isArray(basicData.History)) {
            return calculateTotalSpending(basicData.History);
        }
        return { cashSpending: 0, bankSpending: 0 };
    }, [basicData?.History]);
    
    const dataByTimeRange = useMemo(() => {
        if (basicData?.History && Array.isArray(basicData.History)) {
            return processTransactionData(basicData.History);
        }
        return {
            "1h": [],
            "6h": [],
            "12h": [],
        };
    }, [basicData?.History]);

    const dateRangeString = useMemo(() => getDateRangeString(), []);

    const currentData = useMemo(() => {
        return dataByTimeRange[selectedTimeRange] || dataByTimeRange["1h"];
    }, [selectedTimeRange, dataByTimeRange]);

    const fadeIn = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.6 } }
    };

    const dynamicColors =  {
        primary: primaryColor,
        secondary: `${primaryColor}33`,
        accent: `${primaryColor}1A`,
        dataPoint: primaryColor,
        grid: "rgba(255, 255, 255, 0.08)",
        text: "#ffffff",
        textMuted: "rgba(255, 255, 255, 0.65)",
        dataPointBorder: "#ffffff",
    } 

    return (
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
                        {basicData?.playerJobLabel || "Citizen"}
                    </div>
                    <div className="text-white text-[0.9rem]"
                        style={{
                            fontFamily: 'Roboto, sans-serif',
                            fontWeight: 600,
                            lineHeight: '140%',
                        }}
                    >
                        {basicData?.playerName || "Prism Scripts"}
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
                    <button className="w-9 h-9 flex justify-center items-center rounded-lg bg-white hover:bg-gray-100 transition-colors duration-200 shadow-lg z-10 group"
                        onClick={onClose}
                    >
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
                    {locale.welcome_back} {basicData?.playerName || "Prism Scripts"}
                </div>

                <div className="text-[#FFFFFFA6] text-[0.875rem] text-left"
                    style={{
                        fontFamily: 'Roboto, sans-serif',
                        fontWeight: 400,
                        lineHeight: '140%',
                        letterSpacing: '-0.85%',
                    }}
                >
                    {locale.homepage_desc}
                </div>
            </motion.div>

            <motion.div variants={fadeIn} className="w-[15rem] h-[2.25rem] pl-3 absolute right-[2.2rem] top-[8.8rem] text-[#FFFFFFA6] border border-[#FFFFFF29] backdrop-blur-[50px] rounded-[0.625rem]">
                <div className="flex flex-row justify-left items-start gap-2 mt-2">
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.8333 1.23077H11.0833V0.615385C11.0833 0.452174 11.0219 0.295649 10.9125 0.180242C10.8031 0.064835 10.6547 0 10.5 0C10.3453 0 10.1969 0.064835 10.0875 0.180242C9.97812 0.295649 9.91667 0.452174 9.91667 0.615385V1.23077H4.08333V0.615385C4.08333 0.452174 4.02187 0.295649 3.91248 0.180242C3.80308 0.064835 3.65471 0 3.5 0C3.34529 0 3.19692 0.064835 3.08752 0.180242C2.97812 0.295649 2.91667 0.452174 2.91667 0.615385V1.23077H1.16667C0.857247 1.23077 0.560501 1.36044 0.341709 1.59125C0.122916 1.82207 0 2.13512 0 2.46154V14.7692C0 15.0957 0.122916 15.4087 0.341709 15.6395C0.560501 15.8703 0.857247 16 1.16667 16H12.8333C13.1428 16 13.4395 15.8703 13.6583 15.6395C13.8771 15.4087 14 15.0957 14 14.7692V2.46154C14 2.13512 13.8771 1.82207 13.6583 1.59125C13.4395 1.36044 13.1428 1.23077 12.8333 1.23077ZM3.79167 12.9231C3.61861 12.9231 3.44944 12.8689 3.30554 12.7675C3.16165 12.6661 3.0495 12.5219 2.98327 12.3532C2.91705 12.1846 2.89972 11.999 2.93348 11.8199C2.96724 11.6409 3.05058 11.4764 3.17295 11.3473C3.29532 11.2182 3.45123 11.1303 3.62096 11.0947C3.7907 11.059 3.96663 11.0773 4.12651 11.1472C4.2864 11.2171 4.42306 11.3354 4.5192 11.4872C4.61535 11.639 4.66667 11.8174 4.66667 12C4.66667 12.2448 4.57448 12.4796 4.41039 12.6527C4.24629 12.8258 4.02373 12.9231 3.79167 12.9231ZM7 12.9231C6.82694 12.9231 6.65777 12.8689 6.51388 12.7675C6.36998 12.6661 6.25783 12.5219 6.19161 12.3532C6.12538 12.1846 6.10805 11.999 6.14181 11.8199C6.17557 11.6409 6.25891 11.4764 6.38128 11.3473C6.50365 11.2182 6.65956 11.1303 6.8293 11.0947C6.99903 11.059 7.17496 11.0773 7.33485 11.1472C7.49473 11.2171 7.63139 11.3354 7.72754 11.4872C7.82368 11.639 7.875 11.8174 7.875 12C7.875 12.2448 7.78281 12.4796 7.61872 12.6527C7.45462 12.8258 7.23206 12.9231 7 12.9231ZM7 9.84615C6.82694 9.84615 6.65777 9.79202 6.51388 9.69059C6.36998 9.58916 6.25783 9.44499 6.19161 9.27632C6.12538 9.10765 6.10805 8.92205 6.14181 8.74299C6.17557 8.56393 6.25891 8.39946 6.38128 8.27036C6.50365 8.14127 6.65956 8.05335 6.8293 8.01774C6.99903 7.98212 7.17496 8.0004 7.33485 8.07026C7.49473 8.14013 7.63139 8.25844 7.72754 8.41024C7.82368 8.56204 7.875 8.74051 7.875 8.92308C7.875 9.16789 7.78281 9.40268 7.61872 9.57579C7.45462 9.7489 7.23206 9.84615 7 9.84615ZM10.2083 12.9231C10.0353 12.9231 9.8661 12.8689 9.72221 12.7675C9.57832 12.6661 9.46617 12.5219 9.39994 12.3532C9.33371 12.1846 9.31638 11.999 9.35015 11.8199C9.38391 11.6409 9.46724 11.4764 9.58961 11.3473C9.71199 11.2182 9.8679 11.1303 10.0376 11.0947C10.2074 11.059 10.3833 11.0773 10.5432 11.1472C10.7031 11.2171 10.8397 11.3354 10.9359 11.4872C11.032 11.639 11.0833 11.8174 11.0833 12C11.0833 12.2448 10.9911 12.4796 10.8271 12.6527C10.663 12.8258 10.4404 12.9231 10.2083 12.9231ZM10.2083 9.84615C10.0353 9.84615 9.8661 9.79202 9.72221 9.69059C9.57832 9.58916 9.46617 9.44499 9.39994 9.27632C9.33371 9.10765 9.31638 8.92205 9.35015 8.74299C9.38391 8.56393 9.46724 8.39946 9.58961 8.27036C9.71199 8.14127 9.8679 8.05335 10.0376 8.01774C10.2074 7.98212 10.3833 8.0004 10.5432 8.07026C10.7031 8.14013 10.8397 8.25844 10.9359 8.41024C11.032 8.56204 11.0833 8.74051 11.0833 8.92308C11.0833 9.16789 10.9911 9.40268 10.8271 9.57579C10.663 9.7489 10.4404 9.84615 10.2083 9.84615ZM12.8333 4.92308H1.16667V2.46154H2.91667V3.07692C2.91667 3.24013 2.97812 3.39666 3.08752 3.51207C3.19692 3.62747 3.34529 3.69231 3.5 3.69231C3.65471 3.69231 3.80308 3.62747 3.91248 3.51207C4.02187 3.39666 4.08333 3.24013 4.08333 3.07692V2.46154H9.91667V3.07692C9.91667 3.24013 9.97812 3.39666 10.0875 3.51207C10.1969 3.62747 10.3453 3.69231 10.5 3.69231C10.6547 3.69231 10.8031 3.62747 10.9125 3.51207C11.0219 3.39666 11.0833 3.24013 11.0833 3.07692V2.46154H12.8333V4.92308Z" fill="white" fillOpacity="0.65"/>
                    </svg>
                    <div className="text-[0.875rem]"
                        style={{
                            fontFamily: 'Roboto, sans-serif',
                            fontWeight: 400,
                            lineHeight: '140%',
                            letterSpacing: '-0.85%',
                        }}
                    >
                        {dateRangeString}
                    </div>
                </div>
            </motion.div>

            <motion.div variants={fadeIn} className="flex flex-row ml-[2.2rem] mt-[1rem] gap-6">
                <div className="w-[28.031rem] h-[16.469rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] rounded-[0.625rem] backdrop:blur-[50px]">
                    <div className="flex flex-row gap-3 mt-6 ml-7">
                        <svg className="mt-[0.3rem]" width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.9231 0H2.07692C1.52609 0 0.997815 0.221249 0.608317 0.615076C0.218818 1.0089 0 1.54305 0 2.1V11.9C0 12.457 0.218818 12.9911 0.608317 13.3849C0.997815 13.7788 1.52609 14 2.07692 14H15.9231C16.4739 14 17.0022 13.7788 17.3917 13.3849C17.7812 12.9911 18 12.457 18 11.9V2.1C18 1.54305 17.7812 1.0089 17.3917 0.615076C17.0022 0.221249 16.4739 0 15.9231 0ZM11.0769 6.3C11.0769 6.85695 10.8581 7.3911 10.4686 7.78492C10.0791 8.17875 9.55083 8.4 9 8.4C8.44917 8.4 7.92089 8.17875 7.53139 7.78492C7.14189 7.3911 6.92308 6.85695 6.92308 6.3C6.92308 6.11435 6.85014 5.9363 6.7203 5.80503C6.59047 5.67375 6.41438 5.6 6.23077 5.6H1.38462V4.2H16.6154V5.6H11.7692C11.5856 5.6 11.4095 5.67375 11.2797 5.80503C11.1499 5.9363 11.0769 6.11435 11.0769 6.3ZM2.07692 1.4H15.9231C16.1067 1.4 16.2828 1.47375 16.4126 1.60503C16.5424 1.7363 16.6154 1.91435 16.6154 2.1V2.8H1.38462V2.1C1.38462 1.91435 1.45755 1.7363 1.58739 1.60503C1.71722 1.47375 1.89331 1.4 2.07692 1.4Z" fill={primaryColor}/>
                        </svg>

                        <div className="text-white text-[1.125rem]"
                            style={{
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 500,
                                lineHeight: '140%',
                                letterSpacing: '-0.85%',
                            }}
                        >
                            {locale.active_spending}
                        </div>
                    </div>

                    <div className="flex flex-row gap-6 mt-[1.35rem] ml-[1.6rem]">
                        <div className="w-[11.656rem] h-[10.313rem] backdrop:blur-[50px] rounded-[0.625rem]"
                            style={{
                                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.0008) 100%)',
                                outline: '1px solid #FFFFFF0A',
                            }}
                        >
                            <div className="flex flex-row gap-4 p-5">
                                <svg className="mt-[0.15rem]" width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="36" height="36" rx="8" fill="white" fillOpacity="0.08"/>
                                    <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="white" strokeOpacity="0.04"/>
                                    <path d="M16.5185 14.7407C16.5185 14.5063 16.588 14.2772 16.7183 14.0823C16.8485 13.8874 17.0336 13.7355 17.2502 13.6458C17.4667 13.5561 17.705 13.5326 17.9349 13.5783C18.1648 13.6241 18.376 13.7369 18.5418 13.9027C18.7075 14.0684 18.8204 14.2796 18.8661 14.5095C18.9118 14.7394 18.8884 14.9777 18.7987 15.1943C18.709 15.4109 18.5571 15.596 18.3622 15.7262C18.1673 15.8564 17.9381 15.9259 17.7037 15.9259C17.3894 15.9259 17.0879 15.8011 16.8657 15.5788C16.6434 15.3565 16.5185 15.0551 16.5185 14.7407ZM26 18C26 19.5822 25.5308 21.129 24.6518 22.4446C23.7727 23.7602 22.5233 24.7855 21.0615 25.391C19.5997 25.9965 17.9911 26.155 16.4393 25.8463C14.8874 25.5376 13.462 24.7757 12.3431 23.6569C11.2243 22.538 10.4624 21.1126 10.1537 19.5607C9.84504 18.0089 10.0035 16.4003 10.609 14.9385C11.2145 13.4767 12.2398 12.2273 13.5554 11.3482C14.871 10.4692 16.4178 10 18 10C20.121 10.0024 22.1545 10.846 23.6543 12.3457C25.154 13.8455 25.9976 15.879 26 18ZM24.2222 18C24.2222 16.7694 23.8573 15.5664 23.1736 14.5431C22.4899 13.5199 21.5181 12.7224 20.3811 12.2514C19.2442 11.7805 17.9931 11.6572 16.7861 11.8973C15.5791 12.1374 14.4704 12.73 13.6002 13.6002C12.73 14.4704 12.1374 15.5791 11.8973 16.7861C11.6573 17.9931 11.7805 19.2442 12.2514 20.3811C12.7224 21.5181 13.5199 22.4899 14.5431 23.1736C15.5664 23.8573 16.7694 24.2222 18 24.2222C19.6497 24.2205 21.2313 23.5643 22.3978 22.3978C23.5643 21.2313 24.2205 19.6497 24.2222 18ZM18.8889 20.717V18.2963C18.8889 17.9034 18.7328 17.5266 18.455 17.2487C18.1771 16.9709 17.8003 16.8148 17.4074 16.8148C17.1975 16.8145 16.9942 16.8885 16.8336 17.0237C16.673 17.1589 16.5655 17.3465 16.53 17.5534C16.4945 17.7603 16.5334 17.9731 16.6397 18.1541C16.7461 18.3351 16.9131 18.4726 17.1111 18.5422V20.963C17.1111 21.3559 17.2672 21.7327 17.545 22.0105C17.8229 22.2884 18.1997 22.4444 18.5926 22.4444C18.8025 22.4448 19.0058 22.3708 19.1664 22.2356C19.327 22.1004 19.4345 21.9127 19.47 21.7058C19.5055 21.4989 19.4666 21.2861 19.3603 21.1052C19.2539 20.9242 19.0869 20.7867 18.8889 20.717Z" fill={primaryColor}/>
                                </svg>

                                <div className="flex flex-col text-start">
                                    <div className="text-white text-[0.875rem]"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 500,
                                            lineHeight: '140%',
                                            letterSpacing: '-0.85%',
                                        }}
                                    >
                                        {locale.cash} <br/> {locale.spending}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col mt-5 text-start gap-1 pl-5">
                                <div className="text-[#FFFFFF66] text-[0.875rem]"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        fontWeight: 400,
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                    }}
                                >
                                    {locale.amount_spent}
                                </div>

                                <div className="flex flex-row gap-2">
                                    <div className="text-[1.375rem] font-bold"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            lineHeight: '140%',
                                            letterSpacing: '-0.85%',
                                            color: primaryColor
                                        }}
                                    >
                                        {locale.currencySign}
                                    </div>

                                    <span className="text-white font-bold text-[1.375rem]" style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                    }}>
                                        <CountUpAnimation value={cashSpending} decimals={2} />
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="w-[11.656rem] h-[10.313rem] backdrop:blur-[50px] rounded-[0.625rem]"
                            style={{
                                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.0008) 100%)',
                                outline: '1px solid #FFFFFF0A',
                            }}
                        >
                            <div className="flex flex-row gap-4 p-5">
                                <svg className="mt-[0.15rem]" width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="36" height="36" rx="8" fill="white" fillOpacity="0.08"/>
                                    <rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="white" strokeOpacity="0.04"/>
                                    <path d="M16.5185 14.7407C16.5185 14.5063 16.588 14.2772 16.7183 14.0823C16.8485 13.8874 17.0336 13.7355 17.2502 13.6458C17.4667 13.5561 17.705 13.5326 17.9349 13.5783C18.1648 13.6241 18.376 13.7369 18.5418 13.9027C18.7075 14.0684 18.8204 14.2796 18.8661 14.5095C18.9118 14.7394 18.8884 14.9777 18.7987 15.1943C18.709 15.4109 18.5571 15.596 18.3622 15.7262C18.1673 15.8564 17.9381 15.9259 17.7037 15.9259C17.3894 15.9259 17.0879 15.8011 16.8657 15.5788C16.6434 15.3565 16.5185 15.0551 16.5185 14.7407ZM26 18C26 19.5822 25.5308 21.129 24.6518 22.4446C23.7727 23.7602 22.5233 24.7855 21.0615 25.391C19.5997 25.9965 17.9911 26.155 16.4393 25.8463C14.8874 25.5376 13.462 24.7757 12.3431 23.6569C11.2243 22.538 10.4624 21.1126 10.1537 19.5607C9.84504 18.0089 10.0035 16.4003 10.609 14.9385C11.2145 13.4767 12.2398 12.2273 13.5554 11.3482C14.871 10.4692 16.4178 10 18 10C20.121 10.0024 22.1545 10.846 23.6543 12.3457C25.154 13.8455 25.9976 15.879 26 18ZM24.2222 18C24.2222 16.7694 23.8573 15.5664 23.1736 14.5431C22.4899 13.5199 21.5181 12.7224 20.3811 12.2514C19.2442 11.7805 17.9931 11.6572 16.7861 11.8973C15.5791 12.1374 14.4704 12.73 13.6002 13.6002C12.73 14.4704 12.1374 15.5791 11.8973 16.7861C11.6573 17.9931 11.7805 19.2442 12.2514 20.3811C12.7224 21.5181 13.5199 22.4899 14.5431 23.1736C15.5664 23.8573 16.7694 24.2222 18 24.2222C19.6497 24.2205 21.2313 23.5643 22.3978 22.3978C23.5643 21.2313 24.2205 19.6497 24.2222 18ZM18.8889 20.717V18.2963C18.8889 17.9034 18.7328 17.5266 18.455 17.2487C18.1771 16.9709 17.8003 16.8148 17.4074 16.8148C17.1975 16.8145 16.9942 16.8885 16.8336 17.0237C16.673 17.1589 16.5655 17.3465 16.53 17.5534C16.4945 17.7603 16.5334 17.9731 16.6397 18.1541C16.7461 18.3351 16.9131 18.4726 17.1111 18.5422V20.963C17.1111 21.3559 17.2672 21.7327 17.545 22.0105C17.8229 22.2884 18.1997 22.4444 18.5926 22.4444C18.8025 22.4448 19.0058 22.3708 19.1664 22.2356C19.327 22.1004 19.4345 21.9127 19.47 21.7058C19.5055 21.4989 19.4666 21.2861 19.3603 21.1052C19.2539 20.9242 19.0869 20.7867 18.8889 20.717Z" fill={primaryColor}/>
                                </svg>

                                <div className="flex flex-col text-start">
                                    <div className="text-white text-[0.875rem]"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 500,
                                            lineHeight: '140%',
                                            letterSpacing: '-0.85%',
                                        }}
                                    >
                                        {locale.bank} <br/> {locale.spending}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col mt-5 text-start gap-1 pl-5">
                                <div className="text-[#FFFFFF66] text-[0.875rem]"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        fontWeight: 400,
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                    }}
                                >
                                    {locale.amount_spent}
                                </div>

                                <div className="flex flex-row gap-2">
                                    <div className="text-[1.375rem] font-bold"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            lineHeight: '140%',
                                            letterSpacing: '-0.85%',
                                            color: primaryColor
                                        }}
                                    >
                                        {locale.currencySign}
                                    </div>

                                    <span className="text-white font-bold text-[1.375rem]" style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                    }}>
                                        <CountUpAnimation value={bankSpending} decimals={2} />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-[28.031rem] h-[16.469rem] rounded-[0.625rem] backdrop:blur-[50px]"
                    style={{
                        background: `linear-gradient(0deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.04)), linear-gradient(78.19deg, ${primaryColor}00 11.58%, ${primaryColor}0F 91.68%)`,
                        outline: '1px solid #FFFFFF0A',
                    }}
                >
                    <div className="flex flex-row gap-3 mt-6 ml-7">
                        <svg className="mt-[0.3rem]" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.37758 10.6463V15.6892C7.37787 15.7329 7.36891 15.7762 7.35131 15.8162C7.33371 15.8562 7.30785 15.8919 7.27546 15.9211C7.24307 15.9503 7.20488 15.9722 7.16342 15.9855C7.12195 15.9987 7.07816 16.003 7.03494 15.998C5.6148 15.8227 4.26728 15.2686 3.13243 14.3932C1.99758 13.5177 1.11681 12.3529 0.581662 11.0198C0.565666 10.9793 0.558395 10.9358 0.560329 10.8923C0.562262 10.8487 0.573355 10.8061 0.592878 10.7671C0.612402 10.7282 0.639912 10.6939 0.673598 10.6664C0.707285 10.6389 0.746384 10.6189 0.788321 10.6077L5.63519 9.30024C5.69724 9.28389 5.76282 9.28745 5.82276 9.31042C5.88269 9.3334 5.93396 9.37464 5.96938 9.42836C6.26285 9.85487 6.68157 10.1787 7.16708 10.3545C7.22815 10.3749 7.28132 10.414 7.31909 10.4663C7.35686 10.5187 7.37732 10.5816 7.37758 10.6463ZM7.99679 1.73673e-05C7.91569 -0.000593694 7.83527 0.0149258 7.76017 0.0456815C7.68508 0.0764372 7.61678 0.121821 7.55922 0.179217C7.50166 0.236612 7.45597 0.304885 7.4248 0.3801C7.39363 0.455315 7.37758 0.535985 7.37758 0.61746V4.93956C7.37635 5.10195 7.43934 5.2582 7.5527 5.37397C7.66607 5.48974 7.82054 5.55557 7.98219 5.557C8.56263 5.55448 9.12524 5.75838 9.57041 6.13259C10.0156 6.5068 10.3146 7.02719 10.4145 7.60162C10.5144 8.17605 10.4088 8.76747 10.1163 9.27118C9.82385 9.77488 9.3634 10.1584 8.81651 10.3538C8.75545 10.3743 8.70236 10.4136 8.66473 10.4661C8.6271 10.5185 8.60682 10.5816 8.60678 10.6463V15.6892C8.6065 15.7329 8.61544 15.7761 8.63299 15.816C8.65055 15.8559 8.67633 15.8916 8.70864 15.9208C8.74094 15.95 8.77904 15.9719 8.82041 15.9852C8.86178 15.9985 8.90548 16.0029 8.94865 15.998C10.9733 15.7574 12.8299 14.7483 14.1382 13.1773C15.4464 11.6064 16.1074 9.59242 15.9858 7.54782C15.8641 5.50322 14.969 3.58269 13.4838 2.17949C11.9986 0.776284 10.0356 -0.00342515 7.99679 1.73673e-05ZM5.53839 7.83305C5.567 7.46833 5.6759 7.11456 5.85722 6.79729V6.79188C5.91812 6.68621 5.94646 6.56477 5.93867 6.44292C5.93087 6.32106 5.88729 6.20427 5.81343 6.10729C5.76176 6.04059 5.69755 5.98473 5.62444 5.9429L1.9115 3.78648C1.84154 3.74596 1.76432 3.71968 1.68425 3.70915C1.60418 3.69862 1.52283 3.70405 1.44485 3.72512C1.36686 3.7462 1.29378 3.7825 1.22977 3.83196C1.16576 3.88143 1.11208 3.94308 1.0718 4.01339C0.177648 5.56917 -0.171813 7.38108 0.0792286 9.15977C0.0851519 9.20319 0.100206 9.24484 0.123391 9.28195C0.146575 9.31907 0.177359 9.3508 0.213695 9.37504C0.25003 9.39928 0.291086 9.41547 0.334132 9.42253C0.377177 9.4296 0.421227 9.42737 0.463352 9.41601L5.32021 8.10395C5.3804 8.08724 5.43398 8.05223 5.47359 8.00373C5.5132 7.95524 5.53691 7.89561 5.54147 7.83305H5.53839Z" fill={primaryColor}/>
                        </svg>

                        <div className="text-white text-[1.125rem]"
                            style={{
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 500,
                                lineHeight: '140%',
                                letterSpacing: '-0.85%',
                            }}
                        >
                            {locale.credit_score}
                        </div>

                        <svg className="mt-[0.3rem]" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 0C6.41775 0 4.87103 0.469192 3.55544 1.34824C2.23985 2.22729 1.21447 3.47672 0.608967 4.93853C0.00346628 6.40034 -0.15496 8.00887 0.153721 9.56072C0.462403 11.1126 1.22433 12.538 2.34315 13.6569C3.46197 14.7757 4.88743 15.5376 6.43928 15.8463C7.99113 16.155 9.59966 15.9965 11.0615 15.391C12.5233 14.7855 13.7727 13.7602 14.6518 12.4446C15.5308 11.129 16 9.58225 16 8C15.9978 5.87895 15.1542 3.84542 13.6544 2.34562C12.1546 0.845814 10.121 0.00223986 8 0ZM7.69231 3.69231C7.87488 3.69231 8.05334 3.74644 8.20514 3.84787C8.35694 3.9493 8.47526 4.09347 8.54512 4.26214C8.61499 4.43081 8.63327 4.61641 8.59765 4.79547C8.56203 4.97453 8.47412 5.139 8.34502 5.2681C8.21593 5.39719 8.05145 5.48511 7.87239 5.52072C7.69333 5.55634 7.50773 5.53806 7.33906 5.46819C7.17039 5.39833 7.02623 5.28002 6.9248 5.12822C6.82337 4.97642 6.76923 4.79795 6.76923 4.61538C6.76923 4.37057 6.86649 4.13578 7.0396 3.96267C7.21271 3.78956 7.44749 3.69231 7.69231 3.69231ZM8.61539 12.3077C8.28897 12.3077 7.97591 12.178 7.7451 11.9472C7.51429 11.7164 7.38462 11.4033 7.38462 11.0769V8C7.22141 8 7.06488 7.93516 6.94947 7.81976C6.83407 7.70435 6.76923 7.54782 6.76923 7.38461C6.76923 7.2214 6.83407 7.06488 6.94947 6.94947C7.06488 6.83406 7.22141 6.76923 7.38462 6.76923C7.71104 6.76923 8.02409 6.8989 8.2549 7.12971C8.48572 7.36053 8.61539 7.67358 8.61539 8V11.0769C8.7786 11.0769 8.93512 11.1418 9.05053 11.2572C9.16594 11.3726 9.23077 11.5291 9.23077 11.6923C9.23077 11.8555 9.16594 12.012 9.05053 12.1274C8.93512 12.2429 8.7786 12.3077 8.61539 12.3077Z" fill="white" fillOpacity="0.4"/>
                        </svg>
                    </div>

                    <div className="flex flex-col ml-7 mt-14 items-start justify-start">
                        <div className="text-[#FFFFFF66] gap-5 text-[0.875rem]"
                            style={{
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 400,
                                lineHeight: '140%',
                                letterSpacing: '-0.85%',
                            }}
                        >
                            {locale.your_score}
                        </div>

                        <div className="text-white gap-5 text-[3.5rem]"
                            style={{
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 700,
                                lineHeight: '140%',
                                letterSpacing: '-0.85%',
                            }}
                        >
                            <CountUpAnimation value={basicData.creditScore} decimals={0} />
                        </div>

                        <div className="text-[#FFFFFFA6] gap-4 max-w-[9.063rem] text-[0.875rem]"
                            style={{
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 400,
                                lineHeight: '140%',
                                letterSpacing: '-0.85%',
                            }}
                        >
                            {locale.credit_desc}
                        </div>
                    </div>

                    <div className="absolute top-[14.4rem] right-[11.5rem]">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="absolute"
                        >
                            <svg width="124" height="208" viewBox="0 0 124 208" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <mask id="mask0_0_11305" maskUnits="userSpaceOnUse" x="0" y="0" width="124" height="208">
                                        <rect width="124" height="208" fill="#D9D9D9"/>
                                    </mask>
                                </defs>
                                <g mask="url(#mask0_0_11305)">
                                    <circle
                                        cx="20.1379"
                                        cy="104.138"
                                        r="94.1379"
                                        stroke={primaryColor}
                                        strokeWidth="16"
                                        strokeLinecap="round"
                                        strokeDasharray="25 24.5"
                                        strokeDashoffset="15"
                                        fill="none"
                                    />
                                    <circle 
                                        cx="20.2069" 
                                        cy="104.207" 
                                        r="76.2069" 
                                        stroke="white" 
                                        strokeOpacity="0.16" 
                                        strokeLinecap="round" 
                                        fill="none"
                                    />
                                </g>
                            </svg>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.7 }}
                            className="absolute mt-[4.65rem] -left-7"
                        >
                            <div className="flex flex-col items-end justify-end">
                                <div className="text-[#ffffff] text-[1.625rem]"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        fontWeight: 600,
                                        lineHeight: '140%',
                                    }}
                                >
                                    {Math.round(basicData.creditScore/900 * 100)}%
                                </div>
                                
                                <div className="flex flex-row items-center gap-1.5 whitespace-nowrap">
                                    <div className="text-[0.875rem]"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 400,
                                            lineHeight: '140%',
                                            color: primaryColor,
                                        }}
                                    >
                                        +0 {locale.points}
                                    </div>
                                    
                                    <svg 
                                        width="14" 
                                        height="14" 
                                        viewBox="0 0 16 10" 
                                        fill="none" 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        className="flex-shrink-0"
                                    >
                                        <path d="M16 0.555539V4.99985C16.0001 5.10978 15.9666 5.21728 15.9038 5.30871C15.8411 5.40015 15.7518 5.47143 15.6473 5.51351C15.5428 5.55559 15.4279 5.56659 15.317 5.54512C15.2061 5.52365 15.1042 5.47067 15.0243 5.39289L13.1429 3.56308L8.97585 7.61504C8.92278 7.66669 8.85976 7.70767 8.79039 7.73563C8.72103 7.76358 8.64667 7.77797 8.57158 7.77797C8.49648 7.77797 8.42213 7.76358 8.35276 7.73563C8.28339 7.70767 8.22037 7.66669 8.1673 7.61504L5.71449 5.2297L0.976013 9.8372C0.868792 9.94144 0.723369 10 0.571735 10C0.420101 10 0.274678 9.94144 0.167457 9.8372C0.0602362 9.73295 0 9.59157 0 9.44415C0 9.29673 0.0602362 9.15535 0.167457 9.05111L5.31021 4.05126C5.36328 3.99961 5.4263 3.95864 5.49567 3.93068C5.56504 3.90272 5.6394 3.88833 5.71449 3.88833C5.78958 3.88833 5.86394 3.90272 5.93331 3.93068C6.00268 3.95864 6.0657 3.99961 6.11877 4.05126L8.57158 6.43661L12.3351 2.77769L10.453 0.948582C10.373 0.870887 10.3185 0.77186 10.2964 0.664039C10.2743 0.556217 10.2856 0.444449 10.3289 0.342884C10.3722 0.241319 10.4455 0.154523 10.5395 0.093486C10.6336 0.0324485 10.7442 -8.63459e-05 10.8572 1.72106e-07H15.4286C15.5801 1.72106e-07 15.7255 0.05853 15.8326 0.162714C15.9398 0.266897 16 0.408201 16 0.555539Z" fill="#BEEE11" />
                                    </svg>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            <motion.div variants={fadeIn}>
                <InteractiveChart
                    data={currentData}
                    title={locale.insights}
                    timeRange={selectedTimeRange}
                    locale={locale}
                    onTimeRangeChange={(range) => {
                        setSelectedTimeRange(range);
                    }}
                    animation={{
                        duration: 500,
                        easing: "ease-in-out",
                        enabled: true,
                    }}
                    eventHandlers={{
                        onDataPointClick: (point, index) => {
                            
                        },
                        onDataPointHover: (point, index) => {
                            if (point) {
                                
                            }
                        },
                    }}
                    colors={dynamicColors}
                    primaryColor={primaryColor}
                />
            </motion.div>
        </motion.div>
    );
}

export default HomePage;