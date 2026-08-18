import { motion } from "framer-motion";
import { Input } from "@/components/ui/input"
import {useState, useEffect, useMemo, useCallback} from 'react'
import { Slider } from "@/components/ui/slider"
import { SpendingChart } from "@/components/Chart/SpendingChart";
import { fetchNui } from "@/lib/fetchNui";
import NotificationBell from "@/components/ui/Notificationbell";
import { type LocaleStrings } from "@/lib/locale";

interface HistoryItem {
    Spendtype: string;
    timestamp: number;
    amount: number;
    transactionType: 'deposit' | 'withdraw';
}

interface DataPoint {
    value: number;
    label: string;
}

function convertHistoryToDatasets(history: HistoryItem[]): {
    [key: string]: DataPoint[];
} {
    if (!history || history.length === 0) {
        return {
            "24hrs": Array(10).fill(null).map((_, i) => ({ value: 0, label: `${i}:00` })),
            "1day": Array(10).fill(null).map((_, i) => ({ value: 0, label: `${i}:00` })),
            "3days": Array(10).fill(null).map((_, i) => ({ value: 0, label: `Point ${i + 1}` }))
        };
    }

    const sortedHistory = [...history]
        .filter(item => item && item.transactionType === 'withdraw' && typeof item.timestamp === 'number')
        .sort((a, b) => a.timestamp - b.timestamp);

    // If no withdrawals exist, return empty datasets
    if (sortedHistory.length === 0) {
        return {
            "24hrs": Array(10).fill(null).map((_, i) => ({ value: 0, label: `${i}:00` })),
            "1day": Array(10).fill(null).map((_, i) => ({ value: 0, label: `${i}:00` })),
            "3days": Array(10).fill(null).map((_, i) => ({ value: 0, label: `Point ${i + 1}` }))
        };
    }

    const oldestTimestamp = sortedHistory[0].timestamp;
    const newestTimestamp = sortedHistory[sortedHistory.length - 1].timestamp;
    
    // Handle single transaction case
    if (sortedHistory.length === 1) {
        const singleTransaction = sortedHistory[0];
        const date = new Date(singleTransaction.timestamp * 1000);
        const timeLabel = `${String(date.getHours()).padStart(2, '0')}:00`;
        
        const singleDataPoint: DataPoint[] = Array(10).fill(null).map((_, index) => {
            if (index === 9) { // Put the value at the last point
                return {
                    value: singleTransaction.amount,
                    label: timeLabel
                };
            }
            return {
                value: 0,
                label: `${String(index).padStart(2, '0')}:00`
            };
        });
        
        return {
            "24hrs": singleDataPoint,
            "1day": singleDataPoint,
            "3days": singleDataPoint
        };
    }
    
    const aggregateByTimeBuckets = (
        filteredHistory: HistoryItem[],
        bucketCount: number,
        startTime: number,
        endTime: number,
        labelFormatter: (bucketIndex: number, bucketStartTime: number) => string
    ): DataPoint[] => {
        if (filteredHistory.length === 0) {
            return Array(bucketCount).fill(null).map((_, index) => ({
                value: 0,
                label: labelFormatter(index, startTime + ((endTime - startTime) / bucketCount) * index)
            }));
        }

        // Ensure we have a valid time span
        const timeSpan = Math.max(endTime - startTime, 1);
        const bucketDuration = timeSpan / bucketCount;
        const buckets: number[] = new Array(bucketCount).fill(0);

        filteredHistory.forEach(item => {
            const bucketIndex = Math.floor((item.timestamp - startTime) / bucketDuration);
            // Clamp bucket index to valid range
            const clampedIndex = Math.max(0, Math.min(bucketCount - 1, bucketIndex));
            buckets[clampedIndex] += item.amount;
        });

        return buckets.map((value, index) => ({
            value: Math.round(value),
            label: labelFormatter(index, startTime + (index * bucketDuration))
        }));
    };

    // Calculate time ranges based on actual data
    const dataSpan = Math.max(newestTimestamp - oldestTimestamp, 1); // Ensure at least 1 second span
    
    // 24hrs: Show last 24 hours of data OR all data if span < 24 hours
    const twentyFourHoursAgo = newestTimestamp - (24 * 60 * 60);
    const start24h = Math.max(oldestTimestamp, twentyFourHoursAgo);
    const last24Hours = sortedHistory.filter(item => item && typeof item.timestamp === 'number' && item.timestamp >= start24h);
    const twentyFourHrsData = aggregateByTimeBuckets(
        last24Hours,
        10,
        start24h,
        newestTimestamp,
        (index, timestamp) => {
            const date = new Date(timestamp * 1000);
            return `${String(date.getHours()).padStart(2, '0')}:00`;
        }
    );

    // 1day: Same as 24hrs
    const oneDayData = twentyFourHrsData;

    // 3days: Show last 3 days of data OR all data if span < 3 days
    const threeDaysAgo = newestTimestamp - (3 * 24 * 60 * 60);
    const start3d = Math.max(oldestTimestamp, threeDaysAgo);
    const last3Days = sortedHistory.filter(item => item && typeof item.timestamp === 'number' && item.timestamp >= start3d);
    const threeDaysData = aggregateByTimeBuckets(
        last3Days,
        10,
        start3d,
        newestTimestamp,
        (index, timestamp) => {
            const totalBuckets = 10;
            const timeSpan = Math.max(newestTimestamp - start3d, 1);
            const bucketDuration = timeSpan / totalBuckets;
            const dayNumber = Math.floor((timestamp - start3d) / (24 * 60 * 60)) + 1;
            const periodIndex = index % 4;
            const periods = ['AM', 'PM', 'Eve', 'Night'];
            return `Day ${Math.min(dayNumber, 3)} ${periods[periodIndex]}`;
        }
    );

    return {
        "24hrs": twentyFourHrsData,
        "1day": oneDayData,
        "3days": threeDaysData
    };
}

const AccountPage = ( {basicData, onClose, onCreateAccountClick, locale, isAtmMode, primaryColor}: {basicData: any, onClose: () => void, onCreateAccountClick: () => void, locale: LocaleStrings, isAtmMode: boolean, primaryColor: string} ) => {
    const [value, setValue] = useState([0]);
    const [selectedAction, setSelectedAction] = useState('deposit');
    const [selectedAccount, setSelectedAccount] = useState(basicData?.accounts && basicData.accounts.length > 0 ? basicData.accounts[0] : null);
    const [accountIndex, setAccountIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [userId, setUserId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [cardKey, setCardKey] = useState(0);
    const [isLoading, setIsLoading] = useState(!basicData?.accounts || basicData.accounts.length === 0);

    // Helper function to get card display name from locale or fallback
    const getCardDisplayName = (cardType: string) => {
        return (locale as any)[cardType] || cardType.charAt(0).toUpperCase() + cardType.slice(1);
    };

    // Helper function to get card image from config
    const getCardImage = (cardType: string) => {
        return basicData?.cardSettings?.[cardType]?.image || 'businesscard.svg';
    };

    // Helper function to get account label from config
    const getAccountLabel = (cardType: string) => {
        return basicData?.cardSettings?.[cardType]?.accountLabel || `${getCardDisplayName(cardType)} Account`;
    };

    const chartDatasets = useMemo(() => {
        return convertHistoryToDatasets(basicData.History || []);
    }, [basicData.History]);

    const fadeIn = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.6 } }
    };

    const cardAnimation = {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.9, opacity: 0 },
        transition: { duration: 0.3, ease: "easeInOut" }
    };

    // Sync slider to input for withdraw/transfer (only when slider is directly changed by user)
    const [isSliderChanging, setIsSliderChanging] = useState(false);

    useEffect(() => {
        if (selectedAction !== 'deposit' && value[0] > 0 && !isInputFocused && isSliderChanging) {
            const calculatedAmount = Math.floor((value[0] / 100) * selectedAccount.balance);
            setInputValue(calculatedAmount.toString());
            setIsSliderChanging(false);
        }
    }, [value, selectedAccount.balance, selectedAction, isInputFocused, isSliderChanging]);

    // Reset on action change
    useEffect(() => {
        setInputValue('');
        setValue([0]);
        setUserId('');
    }, [selectedAction]);

    useEffect(() => {
        if (basicData?.accounts && basicData.accounts.length > 0) {
            setIsLoading(false);
            if (basicData.accounts.length > accountIndex) {
                setSelectedAccount(basicData.accounts[accountIndex]);
            }
        } else {
            setIsLoading(true);
        }
    }, [basicData, accountIndex]);

    const handlePreviousAccount = () => {
        if (accountIndex === 0) return;
        const newIndex = accountIndex - 1;
        setAccountIndex(newIndex);
        setSelectedAccount(basicData.accounts[newIndex]);
        setCardKey(prev => prev + 1);
        setValue([0]);
        setInputValue('');
        setUserId('');
    }

    const handleNextAccount = () => {
        if (accountIndex === basicData.accounts.length - 1) return;
        const newIndex = accountIndex + 1;
        setAccountIndex(newIndex);
        setSelectedAccount(basicData.accounts[newIndex]);
        setCardKey(prev => prev + 1);
        setValue([0]);
        setInputValue('');
        setUserId('');
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);

        if (selectedAction !== 'deposit') {
            if (value === '') {
                setValue([0]);
            } else {
                const numAmount = parseFloat(value);
                if (!isNaN(numAmount) && numAmount > 0) {
                    const percentage = Math.min(100, Math.floor((numAmount / selectedAccount.balance) * 100));
                    setValue([percentage]);
                }
            }
        }
    }

    const handleTransaction = useCallback(() => {
        const numericAmount = parseFloat(inputValue);

        if (!inputValue || isNaN(numericAmount) || numericAmount <= 0 || isProcessing) {
            return;
        }

        const finalAmount = Math.round(numericAmount);
        setIsProcessing(true);

        fetchNui('InitializeTransaction', {
            selectedAccount: selectedAccount,
            transactionType: selectedAction,
            amount: finalAmount,
            userId: userId,
        }).then((res: any) => {

            if (res.success) {
                setInputValue('');
                setValue([0]);
                setUserId('');
            }
        }).catch((error: any) => {
            console.error('Transaction error:', error);
        }).finally(() => {
            // Add a minimum delay to prevent rapid clicking
            setTimeout(() => {
                setIsProcessing(false);
            }, 500);
        })
    }, [selectedAccount, selectedAction, inputValue, userId, isProcessing])

    // Guard against accessing undefined account properties
    if (isLoading || !selectedAccount) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="text-white text-lg mb-4">Loading accounts...</div>
                    <div className="w-8 h-8 border-4 border-gray-600 border-t-[var(--primary-color)] rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

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
                    <div className={`w-[3.125rem] h-[3.125rem] mt-[1.9rem] rounded-full border border-[#FFFFFF29] p-[0.18rem] ${isAtmMode ? 'ml-[2.2rem]' : 'ml-[2.2rem]'}`}>
                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 mt-[0rem]">
                            <img 
                                src={basicData?.playerProfile || "./essential/placeholder.png"}
                                alt="Profile" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className={`absolute top-[4.27rem] ${isAtmMode ? 'left-[4.4rem]' : 'left-[4.4rem]'} w-[0.75rem] h-[0.75rem] rounded-full border-[3px] border-black`}
                            style={{
                                background: primaryColor
                            }}
                        ></div>
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
                            {basicData?.playerName || "Prism Banking"}
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

                    <div className={`absolute top-9  flex flex-row-reverse gap-5 ${isAtmMode ? 'right-9' : 'right-9'}`}>
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
                    <div className={`${isAtmMode ? 'w-[57.313rem]' : 'w-[57.313rem]'} h-[0.063rem] bg-[#FFFFFF29] mt-5`}></div>
                </motion.div>

                <motion.div variants={fadeIn} className={isAtmMode ? '' : ''}>
                    <motion.div variants={fadeIn} className="flex flex-col gap-1 mt-[1.9rem] ml-[2.2rem]">
                        <div className="text-white text-[1.375rem] text-left"
                            style={{
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 700,
                                lineHeight: '140%',
                                letterSpacing: '-0.85%',
                            }}
                        >
                            {getAccountLabel(selectedAccount.type)}
                        </div>
                    </motion.div>
                    
                    <div className={`flex flex-row items-center ${isAtmMode ? 'gap-[0.8rem]' : 'gap-[1.3rem]'}`}>
                        <motion.div variants={fadeIn} className="mt-[0.6rem] ml-[2.1rem] flex flex-col gap-3">
                            <motion.div
                                key={cardKey}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                variants={cardAnimation}
                                className=" relative w-[28.063rem] h-[15.938rem]"
                            >
                                <div
                                    className="w-full h-full"
                                    style={{
                                        backgroundImage: `url('./essential/${getCardImage(selectedAccount.type)}')`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        borderRadius: '10px'
                                    }}
                                />


                                <div className="absolute top-[6rem] left-[1.8rem] flex flex-col gap-[0.15rem]">
                                    <div className="text-[#FFFFFFA6] text-[0.875rem] text-left"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 300,
                                            lineHeight: '140%',
                                            letterSpacing: '-0.85%',
                                        }}
                                    >
                                        {locale.cash_balance}
                                    </div>

                                    <div className="flex flex-row items-center gap-[0.4rem]">
                                        <span className="text-[2rem] font-bold "
                                            style={{
                                                fontFamily: 'Roboto, sans-serif',
                                                fontWeight: 700,
                                                lineHeight: '140%',
                                                letterSpacing: '-0.85%',
                                                color: primaryColor,
                                            }}
                                        >
                                            {locale.currencySign}
                                        </span>

                                        <span className="text-[2rem] font-bold text-white"
                                            style={{
                                                fontFamily: 'Roboto, sans-serif',
                                                fontWeight: 700,
                                                lineHeight: '140%',
                                                letterSpacing: '-0.85%',
                                            }}
                                        >
                                            {selectedAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>

                                        <span className="text-[2rem] font-bold text-white"
                                            style={{
                                                fontFamily: 'Roboto, sans-serif',
                                                fontWeight: 700,
                                                lineHeight: '140%',
                                                letterSpacing: '-0.85%',
                                            }}
                                        >
                                            {locale.currencyText}
                                        </span>
                                    </div>
                                </div>

                                <div className="absolute bottom-[1.4rem] left-[1.8rem] flex flex-col gap-[0.15rem]">
                                    <div className="text-[#FFFFFFA6] text-[0.875rem] text-left"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 300,
                                            lineHeight: '140%',
                                            letterSpacing: '0.5px',
                                        }}
                                    >
                                        {locale.card_owner}
                                    </div>

                                    <div className="text-[1.125rem] font-bold text-white"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 500,
                                            lineHeight: '140%',
                                            letterSpacing: '1px'
                                        }}
                                    >
                                        {selectedAccount?.isNomineeAccount
                                            ? selectedAccount.ownerName
                                            : selectedAccount?.isSociety
                                                ? selectedAccount.societyJobLabel
                                                : basicData.playerName}
                                    </div>
                                </div>

                                <div className="absolute bottom-[1.4rem] right-[1.8rem] flex flex-col gap-[0.15rem]">
                                    <div className="text-[#FFFFFFA6] text-[0.875rem] text-right"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 300,
                                            lineHeight: '140%',
                                            letterSpacing: '0.5px',
                                        }}
                                    >
                                        {locale.expires}
                                    </div>

                                    <div className="text-[1.125rem] font-bold text-white text-right"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 500,
                                            lineHeight: '140%',
                                            letterSpacing: '1px'
                                        }}
                                    >
                                        08 / 28
                                    </div>
                                </div>
                            </motion.div>
                            <div className=" relative w-[28.063rem] h-[3rem] bg-[#FFFFFF0A] rounded-[0.625rem] border border-[#FFFFFF0A] backdrop:blur-[3.125rem] flex items-center justify-center gap-[0.5rem]">
                                <div className="flex absolute left-3 items-center justify-center w-[1.75rem] h-[1.75rem] rounded-[0.5rem] border backdrop:blur-[3.125rem] hover:bg-[#ffffff07] border-[#FFFFFF1F] cursor-pointer"
                                    onClick={handlePreviousAccount}
                                >
                                    <svg width="6" height="12" viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0.204082 6.55422L4.81679 11.7704C4.94678 11.9174 5.12307 12 5.30689 12C5.49072 12 5.66701 11.9174 5.79699 11.7704C5.92698 11.6234 6 11.4241 6 11.2162C6 11.0083 5.92698 10.809 5.79699 10.662L1.67381 6.00065L5.79584 1.33801C5.8602 1.26523 5.91126 1.17883 5.94609 1.08373C5.98092 0.988638 5.99885 0.886718 5.99885 0.783789C5.99885 0.68086 5.98092 0.578939 5.94609 0.483846C5.91126 0.388752 5.8602 0.302348 5.79584 0.229567C5.73148 0.156785 5.65507 0.0990515 5.57098 0.0596625C5.48689 0.0202734 5.39676 -7.66878e-10 5.30574 0C5.21472 7.66879e-10 5.12459 0.0202734 5.0405 0.0596625C4.95641 0.0990515 4.88 0.156785 4.81564 0.229567L0.202929 5.44578C0.138501 5.51855 0.0874095 5.605 0.0525861 5.70015C0.0177631 5.7953 -0.000106812 5.89729 4.76837e-07 6.00027C0.000107288 6.10325 0.0181899 6.20519 0.0532107 6.30025C0.088232 6.39531 0.139502 6.48162 0.204082 6.55422Z" fill="white" fillOpacity="0.65"/>
                                    </svg>
                                </div>

                                <div className="flex flex-row">
                                    <div className="w-[1.125rem] h-[1.125rem] ">
                                        <img 
                                            src="./essential/logo.svg" 
                                            alt="Logo"
                                            className=""
                                        />
                                    </div>

                                    <div className="text-[1rem] text-white ml-[0.85rem]"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 400,
                                            lineHeight: '140%',
                                        }}
                                    >
                                        {locale.card_ends_in}
                                    </div>

                                    <span className="text-[1rem]  ml-1"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 400,
                                            lineHeight: '140%',
                                            color: primaryColor,
                                        }}
                                    >
                                        ****
                                    </span>

                                    <div className="text-[1rem] text-white ml-1"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 500,
                                            lineHeight: '140%',
                                        }}
                                    >
                                        {selectedAccount.accountNumber?.toString().slice(-4)}
                                    </div>
                                </div>

                                <div className="flex absolute right-3 items-center justify-center w-[1.75rem] h-[1.75rem] rounded-[0.5rem] border backdrop:blur-[3.125rem] hover:bg-[#ffffff07] border-[#FFFFFF1F] cursor-pointer"
                                    onClick={handleNextAccount}
                                >
                                    <svg width="6" height="12" viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M5.79592 6.55422L1.18321 11.7704C1.05322 11.9174 0.87693 12 0.693107 12C0.509283 12 0.332989 11.9174 0.203006 11.7704C0.0730234 11.6234 1.36959e-09 11.4241 0 11.2162C-1.36959e-09 11.0083 0.0730234 10.809 0.203006 10.662L4.32619 6.00065L0.20416 1.33801C0.139799 1.26523 0.0887446 1.17883 0.0539127 1.08373C0.0190808 0.988638 0.00115298 0.886718 0.00115298 0.783789C0.00115298 0.68086 0.0190808 0.578939 0.0539127 0.483846C0.0887446 0.388752 0.139799 0.302348 0.20416 0.229567C0.268521 0.156785 0.344928 0.0990515 0.42902 0.0596625C0.513111 0.0202734 0.60324 -7.66878e-10 0.69426 0C0.78528 7.66879e-10 0.875409 0.0202734 0.959501 0.0596625C1.04359 0.0990515 1.12 0.156785 1.18436 0.229567L5.79707 5.44578C5.8615 5.51855 5.91259 5.605 5.94741 5.70015C5.98224 5.7953 6.00011 5.89729 6 6.00027C5.99989 6.10325 5.98181 6.20519 5.94679 6.30025C5.91177 6.39531 5.8605 6.48162 5.79592 6.55422Z" fill="white" fillOpacity="0.65"/>
                                    </svg>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div variants={fadeIn} className="mt-[0.6rem] flex flex-col gap-3">
                            <div className=" relative backdrop:blur-[50px] rounded-[0.625rem] w-[28.063rem] h-[19.688rem] border border-[#FFFFFF0A] bg-[#FFFFFF0A]">
                                <div className=" absolute top-[1.7rem] left-[1.6rem] flex flex-row items-center justify-center gap-3">
                                    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M16.4032 4.08504C16.3742 4.01209 16.3437 3.93914 16.3125 3.86619C15.8442 2.78077 15.0864 1.84665 14.1227 1.16715H15.6774C15.8314 1.16715 15.9791 1.10567 16.088 0.996227C16.1969 0.886785 16.2581 0.738351 16.2581 0.583577C16.2581 0.428802 16.1969 0.280367 16.088 0.170925C15.9791 0.0614836 15.8314 0 15.6774 0H8.12903C6.52362 0.00204877 4.97768 0.610826 3.7982 1.70545C2.61873 2.80007 1.89197 4.30047 1.76226 5.90871C1.2607 6.03402 0.815051 6.32388 0.495862 6.73241C0.176673 7.14095 0.00217852 7.64481 0 8.16424C0 8.31901 0.0611749 8.46744 0.170067 8.57689C0.278959 8.68633 0.426648 8.74781 0.580645 8.74781C0.734642 8.74781 0.882331 8.68633 0.991223 8.57689C1.10012 8.46744 1.16129 8.31901 1.16129 8.16424C1.16143 7.95143 1.21945 7.74271 1.32908 7.56065C1.43871 7.37859 1.59578 7.23013 1.78331 7.1313C1.92783 8.4406 2.47104 9.67312 3.33871 10.6605L4.25032 13.2253C4.33091 13.4522 4.47937 13.6484 4.67534 13.7871C4.8713 13.9258 5.10516 14.0002 5.34484 14H6.26806C6.50762 14 6.74132 13.9256 6.93714 13.7869C7.13295 13.6482 7.2813 13.452 7.36185 13.2253L7.50121 12.8328H11.6601L11.7994 13.2253C11.88 13.452 12.0283 13.6482 12.2242 13.7869C12.42 13.9256 12.6537 14 12.8932 14H13.8165C14.056 14 14.2897 13.9256 14.4855 13.7869C14.6813 13.6482 14.8297 13.452 14.9102 13.2253L16.0868 9.91496H16.2581C16.7201 9.91496 17.1631 9.73051 17.4898 9.40219C17.8165 9.07386 18 8.62856 18 8.16424V5.82993C18.0001 5.39082 17.8359 4.96772 17.5402 4.64452C17.2444 4.32132 16.8386 4.12163 16.4032 4.08504ZM11.0323 2.91205H8.12903C7.97504 2.91205 7.82735 2.85056 7.71845 2.74112C7.60956 2.63168 7.54839 2.48324 7.54839 2.32847C7.54839 2.1737 7.60956 2.02526 7.71845 1.91582C7.82735 1.80638 7.97504 1.74489 8.12903 1.74489H11.0323C11.1863 1.74489 11.3339 1.80638 11.4428 1.91582C11.5517 2.02526 11.6129 2.1737 11.6129 2.32847C11.6129 2.48324 11.5517 2.63168 11.4428 2.74112C11.3339 2.85056 11.1863 2.91205 11.0323 2.91205ZM13.0645 6.99708C12.8923 6.99708 12.7239 6.94574 12.5806 6.84956C12.4374 6.75337 12.3258 6.61666 12.2598 6.45671C12.1939 6.29675 12.1767 6.12075 12.2103 5.95094C12.2439 5.78114 12.3268 5.62516 12.4486 5.50274C12.5705 5.38032 12.7256 5.29695 12.8946 5.26317C13.0635 5.2294 13.2387 5.24673 13.3978 5.31299C13.557 5.37924 13.693 5.49144 13.7887 5.63539C13.8844 5.77934 13.9355 5.94859 13.9355 6.12172C13.9355 6.35388 13.8437 6.57653 13.6804 6.74069C13.517 6.90486 13.2955 6.99708 13.0645 6.99708Z" fill={primaryColor}/>
                                    </svg>
                                    
                                    <div className="text-[1.125rem] text-white font-medium"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 500,
                                            lineHeight: '140%',
                                        }}
                                    >
                                        {locale.money_Actions}
                                    </div>
                                </div>

                                <div className="flex mt-[2.8rem] flex-row items-center justify-center gap-3">
                                    <div className={`w-[7.688rem] h-[2.25rem] rounded-[0.5rem] mt-[1.2rem] flex items-center justify-center border  cursor-pointer`}
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 500,
                                            lineHeight: '140%',
                                            fontSize: '0.875rem',
                                            borderColor: selectedAction === 'deposit' ? `${primaryColor}0A` : '#FFFFFF0A',
                                            color: selectedAction === 'deposit' ? `${primaryColor}` : '#FFFFFFA6',
                                            backgroundColor: selectedAction === 'deposit' ? `${primaryColor}14` : '#FFFFFF0A',
                                        }}

                                        onClick={() => setSelectedAction('deposit')}
                                    >
                                        {locale.deposit}
                                    </div>

                                    <div className={`w-[7.688rem] h-[2.25rem] rounded-[0.5rem] mt-[1.2rem] flex items-center justify-center border cursor-pointer`}
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 400,
                                            lineHeight: '140%',
                                            fontSize: '0.875rem',
                                            borderColor: selectedAction === 'withdraw' ? `${primaryColor}0A` : '#FFFFFF0A',
                                            color: selectedAction === 'withdraw' ? `${primaryColor}` : '#FFFFFFA6',
                                            backgroundColor: selectedAction === 'withdraw' ? `${primaryColor}14` : '#FFFFFF0A',
                                        }}
                                        onClick={() => setSelectedAction('withdraw')}
                                    >
                                        {locale.withdraw}
                                    </div>

                                    <div className={`w-[7.688rem] h-[2.25rem] rounded-[0.5rem] ${(isAtmMode || selectedAccount?.isSociety || selectedAccount?.isNomineeAccount) && 'cursor-not-allowed pointer-events-none opacity-50' } mt-[1.2rem] flex items-center justify-center border cursor-pointer `}
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 400,
                                            lineHeight: '140%',
                                            fontSize: '0.875rem',
                                            borderColor: selectedAction === 'transfer' ? `${primaryColor}0A` : '#FFFFFF0A',
                                            color: selectedAction === 'transfer' ? `${primaryColor}` : '#FFFFFFA6',
                                            backgroundColor: selectedAction === 'transfer' ? `${primaryColor}14` : '#FFFFFF0A',
                                        }}
                                        onClick={() => !selectedAccount?.isSociety && !selectedAccount?.isNomineeAccount && setSelectedAction('transfer')}

                                    >
                                        {locale.transfer}
                                    </div>
                                </div>

                                <div className="flex mt-[1rem] flex-row items-center justify-center gap-3">
                                    <div className="relative w-[16.125rem] h-[4.063rem] rounded-[0.5rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] backdrop:blur-[50px] flex items-center justify-center">
                                        <svg className="absolute top-1/2 left-6 -translate-x-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8 0C6.41775 0 4.87103 0.469192 3.55544 1.34824C2.23985 2.22729 1.21447 3.47672 0.608967 4.93853C0.00346628 6.40034 -0.15496 8.00887 0.153721 9.56072C0.462403 11.1126 1.22433 12.538 2.34315 13.6569C3.46197 14.7757 4.88743 15.5376 6.43928 15.8463C7.99113 16.155 9.59966 15.9965 11.0615 15.391C12.5233 14.7855 13.7727 13.7602 14.6518 12.4446C15.5308 11.129 16 9.58225 16 8C15.9978 5.87895 15.1542 3.84542 13.6544 2.34562C12.1546 0.845814 10.121 0.00223986 8 0ZM9.23077 12.3077H8.61539V12.9231C8.61539 13.0863 8.55055 13.2428 8.43514 13.3582C8.31974 13.4736 8.16321 13.5385 8 13.5385C7.83679 13.5385 7.68027 13.4736 7.56486 13.3582C7.44945 13.2428 7.38462 13.0863 7.38462 12.9231V12.3077H6.76923C6.11639 12.3077 5.49029 12.0483 5.02866 11.5867C4.56703 11.1251 4.30769 10.499 4.30769 9.84615C4.30769 9.68294 4.37253 9.52641 4.48794 9.41101C4.60334 9.2956 4.75987 9.23077 4.92308 9.23077C5.08629 9.23077 5.24281 9.2956 5.35822 9.41101C5.47363 9.52641 5.53846 9.68294 5.53846 9.84615C5.53846 10.1726 5.66813 10.4856 5.89895 10.7164C6.12976 10.9473 6.44281 11.0769 6.76923 11.0769H9.23077C9.55719 11.0769 9.87024 10.9473 10.1011 10.7164C10.3319 10.4856 10.4615 10.1726 10.4615 9.84615C10.4615 9.51973 10.3319 9.20668 10.1011 8.97587C9.87024 8.74505 9.55719 8.61538 9.23077 8.61538H7.07692C6.42408 8.61538 5.79798 8.35604 5.33635 7.89441C4.87473 7.43279 4.61539 6.80668 4.61539 6.15384C4.61539 5.501 4.87473 4.8749 5.33635 4.41327C5.79798 3.95165 6.42408 3.69231 7.07692 3.69231H7.38462V3.07692C7.38462 2.91371 7.44945 2.75719 7.56486 2.64178C7.68027 2.52637 7.83679 2.46154 8 2.46154C8.16321 2.46154 8.31974 2.52637 8.43514 2.64178C8.55055 2.75719 8.61539 2.91371 8.61539 3.07692V3.69231H8.92308C9.57592 3.69231 10.202 3.95165 10.6636 4.41327C11.1253 4.8749 11.3846 5.501 11.3846 6.15384C11.3846 6.31705 11.3198 6.47358 11.2044 6.58899C11.089 6.70439 10.9324 6.76923 10.7692 6.76923C10.606 6.76923 10.4495 6.70439 10.3341 6.58899C10.2187 6.47358 10.1538 6.31705 10.1538 6.15384C10.1538 5.82742 10.0242 5.51437 9.79336 5.28356C9.56255 5.05275 9.2495 4.92308 8.92308 4.92308H7.07692C6.7505 4.92308 6.43745 5.05275 6.20664 5.28356C5.97583 5.51437 5.84616 5.82742 5.84616 6.15384C5.84616 6.48026 5.97583 6.79332 6.20664 7.02413C6.43745 7.25494 6.7505 7.38461 7.07692 7.38461H9.23077C9.88361 7.38461 10.5097 7.64395 10.9713 8.10558C11.433 8.56721 11.6923 9.19331 11.6923 9.84615C11.6923 10.499 11.433 11.1251 10.9713 11.5867C10.5097 12.0483 9.88361 12.3077 9.23077 12.3077Z" fill={primaryColor}/>
                                        </svg>

                                        <div className="flex mb-5 flex-col items-start justify-start">
                                            <div className="text-white"
                                                style={{
                                                    fontFamily: 'Roboto, sans-serif',
                                                    fontWeight: 400,
                                                    lineHeight: '140%',
                                                    fontSize: '0.875rem',
                                                }}
                                            >
                                                {locale.amount}
                                            </div>

                                            <div className="relative w-[10rem]">
                                                <span 
                                                    className="absolute left-0 top-[0.8rem] -translate-y-1/2 text-[#FFFFFFA6] pointer-events-none"
                                                    style={{ fontSize: '0.875rem', lineHeight: '140%', fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}
                                                >
                                                    {locale.currencySign}
                                                </span>
                                                <Input
                                                    className="w-full h-[1.5rem] pl-[0.9rem] absolute right-1 rounded-[0.5rem] bg-transparent !border-0 !ring-0 focus-visible:!ring-0 focus-visible:!outline-none text-[#FFFFFFA6]"
                                                    style={{
                                                        fontFamily: 'Roboto, sans-serif',
                                                        fontWeight: 400,
                                                        lineHeight: '140%',
                                                        fontSize: '0.875rem',
                                                    }}
                                                    placeholder="0"
                                                    type="number"
                                                    value={inputValue}
                                                    onFocus={() => setIsInputFocused(true)}
                                                    onBlur={() => setIsInputFocused(false)}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative w-[7.688rem] h-[4.063rem] rounded-[0.5rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] backdrop:blur-[50px] flex items-center justify-center">
                                        <svg className="absolute top-1/2 left-6 -translate-x-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15.9179 15.68C15.8639 15.7773 15.7862 15.8581 15.6926 15.9143C15.599 15.9705 15.4929 16 15.3848 16H0.614787C0.506812 15.9999 0.400767 15.9702 0.307299 15.914C0.213832 15.8578 0.136232 15.777 0.0822927 15.6798C0.0283531 15.5825 -2.77002e-05 15.4722 2.02871e-08 15.3599C2.77407e-05 15.2477 0.028463 15.1374 0.0824506 15.0401C1.25405 12.934 3.05954 11.4238 5.16657 10.7079C4.12434 10.0628 3.31459 9.07972 2.86167 7.90974C2.40875 6.73975 2.33772 5.44752 2.65947 4.23149C2.98122 3.01546 3.67797 1.94287 4.64272 1.17844C5.60747 0.414005 6.78687 0 7.99981 0C9.21274 0 10.3921 0.414005 11.3569 1.17844C12.3216 1.94287 13.0184 3.01546 13.3401 4.23149C13.6619 5.44752 13.5909 6.73975 13.1379 7.90974C12.685 9.07972 11.8753 10.0628 10.833 10.7079C12.9401 11.4238 14.7456 12.934 15.9172 15.0401C15.9713 15.1373 15.9999 15.2477 16 15.36C16.0001 15.4723 15.9718 15.5827 15.9179 15.68Z" fill={primaryColor}/>
                                        </svg>

                                        <div className="flex mb-4 ml-2 flex-col items-start justify-start">
                                            <div className="text-white"
                                                style={{
                                                    fontFamily: 'Roboto, sans-serif',
                                                    fontWeight: 400,
                                                    lineHeight: '140%',
                                                    fontSize: '0.875rem',
                                                }}
                                            >
                                                {locale.userId}
                                            </div>

                                            <Input
                                                className="w-[5rem] h-[1.5rem] pl-[0.9rem] absolute left-7 top-8 rounded-[0.5rem] bg-transparent !border-0 !ring-0 focus-visible:!ring-0 focus-visible:!outline-none text-[#FFFFFFA6]"
                                                style={{
                                                    fontFamily: 'Roboto, sans-serif',
                                                    fontWeight: 500,
                                                    lineHeight: '140%',
                                                    fontSize: '0.875rem',
                                                }}
                                                placeholder="000"
                                                type="number"
                                                value={userId}
                                                onChange={(e) => setUserId(e.target.value)}
                                                disabled= {isAtmMode || selectedAction !== 'transfer'}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex mt-5 items-center justify-center">
                                    <Slider
                                        value={value}
                                        onValueChange={(newValue) => {
                                            setValue(newValue);
                                            setIsSliderChanging(true);
                                        }}
                                        max={100}
                                        step={1}
                                        disabled={selectedAction === 'deposit'}
                                        trackColor={primaryColor}
                                        className={`w-[24.563rem] [&_[role=slider]]:h-[1.125rem] [&_[role=slider]]:w-[1.125rem] [&_[role=slider]]:border-none [&_[role=slider]]:bg-white [&_[role=slider]]:rounded-[3px] [&>span:first-child]:h-3 [&>span:first-child]:bg-[#FFFFFF0A] [&>span:first-child]:border-[1px] [&>span:first-child]:border-[#FFFFFF0A]  [&>span:first-child]:rounded-[3px] ${selectedAction === 'deposit' ? 'opacity-50 cursor-not-allowed [&_[role=slider]]:cursor-not-allowed' : '[&_[role=slider]]:cursor-pointer'}`}
                                    />
                                </div>

                                <div className="flex mt-7 items-center justify-center">
                                    <button
                                        className={`w-[24.563rem] h-[3rem] rounded-[0.5rem] text-black flex items-center justify-center gap-2 transition-all duration-200 ${
                                            isProcessing
                                                ? 'opacity-70 cursor-not-allowed'
                                                : 'cursor-pointer'
                                        }`}
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 600,
                                            lineHeight: '140%',
                                            fontSize: '1rem',
                                            backgroundColor: primaryColor,
                                            boxShadow: !isProcessing ? `0px 0px 20px 0px ${primaryColor}33` : 'none'
                                        }}
                                        onClick={handleTransaction}
                                        disabled={isProcessing}
                                        onMouseEnter={(e) => {
                                            if (!isProcessing) {
                                                e.currentTarget.style.boxShadow = `0px 0px 20px 0px ${primaryColor}33`;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isProcessing) {
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        {isProcessing && (
                                            <svg
                                                className="animate-spin h-5 w-5"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                        )}
                                        {isProcessing ? locale.processing || 'Processing...' : locale.confirm}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

                <motion.div variants={fadeIn} className="flex items-center justify-center mt-5">
                    <SpendingChart
                        datasets={chartDatasets}
                        locale={locale}
                        primaryColor={primaryColor}
                    />
                </motion.div>
            </motion.div>
        </>
    )
}

export default AccountPage;