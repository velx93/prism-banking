import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useMemo, useEffect } from "react";
import { fetchNui } from "@/lib/fetchNui";
import NotificationBell from "@/components/ui/Notificationbell";
import { type LocaleStrings } from "@/lib/locale";



const SettingsPage = ({basicData, onClose, onCreateAccountClick, locale, primaryColor}: {basicData: any, onClose: () => void, onCreateAccountClick: () => void, locale: LocaleStrings, primaryColor: string}) => {
    const [newPin, setNewPin] = useState('');
    const [selectedAccountChangePin, setSelectedAccountChangePin] = useState(basicData.accounts[0]);
    const [accountIndexChangePin, setAccountIndexChangePin] = useState(0);
    const [selectedAccountReissue, setSelectedAccountReissue] = useState(basicData.accounts[0]);
    const [accountIndexReissue, setAccountIndexReissue] = useState(0);

    useEffect(() => {
        if (basicData?.accounts && basicData.accounts.length > accountIndexChangePin) {
            setSelectedAccountChangePin(basicData.accounts[accountIndexChangePin]);
        }
    }, [basicData, accountIndexChangePin]);

    useEffect(() => {
        if (basicData?.accounts && basicData.accounts.length > accountIndexReissue) {
            setSelectedAccountReissue(basicData.accounts[accountIndexReissue]);
        }
    }, [basicData, accountIndexReissue]);

    const handlePreviousAccountChangePin = () => {
        if (accountIndexChangePin === 0) return;
        const newIndex = accountIndexChangePin - 1;
        setAccountIndexChangePin(newIndex);
        setSelectedAccountChangePin(basicData.accounts[newIndex]);
        setNewPin('');
    }

    const handleNextAccountChangePin = () => {
        if (accountIndexChangePin === basicData.accounts.length - 1) return;
        const newIndex = accountIndexChangePin + 1;
        setAccountIndexChangePin(newIndex);
        setSelectedAccountChangePin(basicData.accounts[newIndex]);
        setNewPin('');
    }

    const handlePreviousAccountReissue = () => {
        if (accountIndexReissue === 0) return;
        const newIndex = accountIndexReissue - 1;
        setAccountIndexReissue(newIndex);
        setSelectedAccountReissue(basicData.accounts[newIndex]);
    }

    const handleNextAccountReissue = () => {
        if (accountIndexReissue === basicData.accounts.length - 1) return;
        const newIndex = accountIndexReissue + 1;
        setAccountIndexReissue(newIndex);
        setSelectedAccountReissue(basicData.accounts[newIndex]);
    }

    const fadeIn = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.6 } }
    };

    const settings = basicData?.settings || {};
    const withdrawalLevel = settings?.wit_level || 1;
    const accountLevel = settings?.mcard_level || 1;

    const currentWithdrawalInfo = basicData.bankingLevels.WithDrawLevel[withdrawalLevel - 1];
    const nextWithdrawalInfo = basicData.bankingLevels.WithDrawLevel[withdrawalLevel];
    const canUpgradeWithdrawal = !!nextWithdrawalInfo;

    const currentAccountInfo = basicData.bankingLevels.AccountsLevel[accountLevel - 1];
    const nextAccountInfo = basicData.bankingLevels.AccountsLevel[accountLevel];
    const canUpgradeAccount = !!nextAccountInfo;

    const handleToggleSetting = useCallback((settingName: string) => {
        fetchNui('toggleSetting', { settingName }).then((res: any) => {
            if (res.success && res.data) {
                // Data will be updated via updateBankingData event
            }
        });
    }, []);

    const handleReIssueCard = useCallback(() => {
        if (!selectedAccountReissue) return;

        fetchNui('reIssueCard', {
            accountNumber: selectedAccountReissue.accountNumber
        })
    }, [selectedAccountReissue]);

    const handleChangePin = useCallback(() => {
        if (!newPin || newPin.length !== 5) {
            return;
        }

        const primaryAccount = basicData?.accounts?.find((acc: any) => acc.primary);
        if (!primaryAccount) return;

        const targetAccount = basicData?.IsCardEnabled ? selectedAccountChangePin : primaryAccount;

        fetchNui('changePin', {
            accountNumber: targetAccount.accountNumber,
            oldPin: targetAccount.pin,
            newPin: newPin
        }).then((res: any) => {
            if (res.success) {
                setNewPin('');
            }
        });
    }, [newPin, basicData, selectedAccountChangePin]);

    const handleUpgradeWithdrawal = useCallback(() => {
        if (!canUpgradeWithdrawal) return;

        fetchNui('upgradeWithdrawalLevel', {}).then((res: any) => {
            if (res.success && res.data) {

            }
        });
    }, [canUpgradeWithdrawal]);

    const handleUpgradeAccount = useCallback(() => {
        if (!canUpgradeAccount) return;

        fetchNui('upgradeAccountLevel', {}).then((res: any) => {
            if (res.success && res.data) {
            }
        });
    }, [canUpgradeAccount]);

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

                    <div className="w-12 h-12 flex items-center cursor-pointer justify-center bg-[#FFFFFF14] rounded-[0.625rem] mt-[2rem] ml-1 group" onClick={onCreateAccountClick}>
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
                        {locale.settings}
                    </div>
                </motion.div>

                {/* Settings Cards */}

                <motion.div variants={fadeIn} className="flex flex-col gap-4 mt-[0.7rem] items-center justify-center">
                    <Card className="w-[57.313rem] h-[5rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] rounded-[0.625rem] backdrop-blur-[50px] flex flex-row gap-4 items-center justify-start">
                        <div className="w-[3rem] h-[3rem] ml-4 rounded-[0.5rem] flex items-center justify-center" style={{ backgroundColor: `${primaryColor}14` }}>
                            <svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.853 6.00068C15.8371 5.91946 15.804 5.84265 15.7561 5.77547C15.7081 5.70829 15.6464 5.65232 15.5751 5.61136L13.4446 4.38571L13.436 1.96181C13.4357 1.87833 13.4175 1.7959 13.3826 1.72022C13.3477 1.64454 13.297 1.5774 13.2339 1.52346C12.461 0.863551 11.571 0.357839 10.6112 0.0332109C10.5356 0.00738567 10.4555 -0.00217158 10.376 0.00515475C10.2966 0.0124811 10.2195 0.0365286 10.1498 0.0757482L8.00068 1.28842L5.8494 0.0735852C5.77966 0.0341447 5.70249 0.00991567 5.62289 0.00246428C5.54329 -0.0049871 5.46303 0.00450499 5.38729 0.030327C4.42805 0.35704 3.53903 0.86471 2.76748 1.52634C2.70446 1.58021 2.65376 1.64723 2.61887 1.72278C2.58397 1.79833 2.56572 1.88061 2.56535 1.96397L2.55464 4.39003L0.424079 5.61568C0.352799 5.65665 0.291091 5.71262 0.24315 5.7798C0.195208 5.84698 0.162157 5.92379 0.146242 6.00501C-0.0487472 6.9941 -0.0487472 8.01227 0.146242 9.00136C0.162157 9.08258 0.195208 9.15939 0.24315 9.22657C0.291091 9.29375 0.352799 9.34972 0.424079 9.39069L2.55464 10.6163L2.56321 13.041C2.56347 13.1244 2.58168 13.2069 2.61657 13.2825C2.65147 13.3582 2.70223 13.4254 2.76534 13.4793C3.53819 14.1392 4.42819 14.6449 5.38801 14.9696C5.46359 14.9954 5.5437 15.0049 5.62317 14.9976C5.70264 14.9903 5.7797 14.9662 5.8494 14.927L8.00068 13.7107L10.1519 14.9256C10.2371 14.9735 10.333 14.9983 10.4305 14.9977C10.4929 14.9977 10.5549 14.9874 10.6141 14.9674C11.5731 14.6408 12.462 14.1337 13.2339 13.4728C13.2969 13.419 13.3476 13.3519 13.3825 13.2764C13.4174 13.2008 13.4356 13.1185 13.436 13.0352L13.4467 10.6091L15.5773 9.38348C15.6486 9.34251 15.7103 9.28654 15.7582 9.21936C15.8061 9.15218 15.8392 9.07537 15.8551 8.99415C16.049 8.00585 16.0483 6.98869 15.853 6.00068ZM8.00068 10.3835C7.43563 10.3835 6.88327 10.2143 6.41345 9.89744C5.94363 9.58055 5.57745 9.13015 5.36121 8.60319C5.14498 8.07623 5.0884 7.49638 5.19863 6.93696C5.30887 6.37754 5.58097 5.86369 5.98052 5.46037C6.38007 5.05705 6.88912 4.78239 7.44332 4.67111C7.99751 4.55984 8.57194 4.61695 9.09398 4.83522C9.61602 5.05349 10.0622 5.42313 10.3761 5.89738C10.6901 6.37163 10.8576 6.9292 10.8576 7.49958C10.8576 8.26443 10.5566 8.99796 10.0208 9.53879C9.48506 10.0796 8.75838 10.3835 8.00068 10.3835Z" fill={primaryColor}/>
                            </svg>
                        </div>

                        <div className='flex flex-col gap-[0.35rem] text-left'>
                            <div className='text-[1rem]'
                                style= {{
                                    color: 'white',
                                    fontWeight: 500,
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.allow_transfer}
                            </div>
                            <div className='text-[0.875rem]'
                                style= {{
                                    color: '#FFFFFFA6',
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                    fontWeight: 300
                                }}
                            >
                                {locale.allow_transfer_desc}
                            </div>
                        </div>

                        <div className="absolute flex right-4 items-center justify-end">
                            <div style={{
                                '--switch-checked-bg': `${primaryColor}14`,
                                '--switch-checked-border': `${primaryColor}0A`,
                                '--switch-thumb-checked': primaryColor
                            } as React.CSSProperties & { '--switch-checked-bg': string; '--switch-checked-border': string; '--switch-thumb-checked': string }}>
                                <Switch
                                    checked={settings.allow_transfer === 1}
                                    onCheckedChange={() => handleToggleSetting('allow_transfer')}
                                    className="h-[1.75rem] w-[3.25rem] data-[state=checked]:bg-[var(--switch-checked-bg)] data-[state=checked]:border data-[state=checked]:backdrop:blur-[50px] data-[state=checked]:border-[var(--switch-checked-border)] data-[state=unchecked]:bg-[#FFFFFF0A] data-[state=unchecked]:border data-[state=unchecked]:border-[#FFFFFF0A] [&>span]:data-[state=checked]:bg-[var(--switch-thumb-checked)] [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-7 [&>span]:data-[state=unchecked]:translate-x-[0.25rem]"
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="w-[57.313rem] h-[5rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] rounded-[0.625rem] backdrop-blur-[50px] flex flex-row gap-4 items-center justify-start">
                        <div className="w-[3rem] h-[3rem] ml-4 rounded-[0.5rem] flex items-center justify-center" style={{ backgroundColor: `${primaryColor}14` }}>
                            <svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.853 6.00068C15.8371 5.91946 15.804 5.84265 15.7561 5.77547C15.7081 5.70829 15.6464 5.65232 15.5751 5.61136L13.4446 4.38571L13.436 1.96181C13.4357 1.87833 13.4175 1.7959 13.3826 1.72022C13.3477 1.64454 13.297 1.5774 13.2339 1.52346C12.461 0.863551 11.571 0.357839 10.6112 0.0332109C10.5356 0.00738567 10.4555 -0.00217158 10.376 0.00515475C10.2966 0.0124811 10.2195 0.0365286 10.1498 0.0757482L8.00068 1.28842L5.8494 0.0735852C5.77966 0.0341447 5.70249 0.00991567 5.62289 0.00246428C5.54329 -0.0049871 5.46303 0.00450499 5.38729 0.030327C4.42805 0.35704 3.53903 0.86471 2.76748 1.52634C2.70446 1.58021 2.65376 1.64723 2.61887 1.72278C2.58397 1.79833 2.56572 1.88061 2.56535 1.96397L2.55464 4.39003L0.424079 5.61568C0.352799 5.65665 0.291091 5.71262 0.24315 5.7798C0.195208 5.84698 0.162157 5.92379 0.146242 6.00501C-0.0487472 6.9941 -0.0487472 8.01227 0.146242 9.00136C0.162157 9.08258 0.195208 9.15939 0.24315 9.22657C0.291091 9.29375 0.352799 9.34972 0.424079 9.39069L2.55464 10.6163L2.56321 13.041C2.56347 13.1244 2.58168 13.2069 2.61657 13.2825C2.65147 13.3582 2.70223 13.4254 2.76534 13.4793C3.53819 14.1392 4.42819 14.6449 5.38801 14.9696C5.46359 14.9954 5.5437 15.0049 5.62317 14.9976C5.70264 14.9903 5.7797 14.9662 5.8494 14.927L8.00068 13.7107L10.1519 14.9256C10.2371 14.9735 10.333 14.9983 10.4305 14.9977C10.4929 14.9977 10.5549 14.9874 10.6141 14.9674C11.5731 14.6408 12.462 14.1337 13.2339 13.4728C13.2969 13.419 13.3476 13.3519 13.3825 13.2764C13.4174 13.2008 13.4356 13.1185 13.436 13.0352L13.4467 10.6091L15.5773 9.38348C15.6486 9.34251 15.7103 9.28654 15.7582 9.21936C15.8061 9.15218 15.8392 9.07537 15.8551 8.99415C16.049 8.00585 16.0483 6.98869 15.853 6.00068ZM8.00068 10.3835C7.43563 10.3835 6.88327 10.2143 6.41345 9.89744C5.94363 9.58055 5.57745 9.13015 5.36121 8.60319C5.14498 8.07623 5.0884 7.49638 5.19863 6.93696C5.30887 6.37754 5.58097 5.86369 5.98052 5.46037C6.38007 5.05705 6.88912 4.78239 7.44332 4.67111C7.99751 4.55984 8.57194 4.61695 9.09398 4.83522C9.61602 5.05349 10.0622 5.42313 10.3761 5.89738C10.6901 6.37163 10.8576 6.9292 10.8576 7.49958C10.8576 8.26443 10.5566 8.99796 10.0208 9.53879C9.48506 10.0796 8.75838 10.3835 8.00068 10.3835Z" fill={primaryColor}/>
                            </svg>
                        </div>

                        <div className='flex flex-col gap-[0.35rem] text-left'>
                            <div className='text-[1rem]'
                                style= {{
                                    color: 'white',
                                    fontWeight: 500,
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.optimize_history}
                            </div>
                            <div className='text-[0.875rem]'
                                style= {{
                                    color: '#FFFFFFA6',
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                    fontWeight: 300
                                }}
                            >
                                {locale.optimize_history_desc}
                            </div>
                        </div>

                        <div className="absolute flex right-4 items-center justify-end">
                            <div style={{
                                '--switch-checked-bg': `${primaryColor}14`,
                                '--switch-checked-border': `${primaryColor}0A`,
                                '--switch-thumb-checked': primaryColor
                            } as React.CSSProperties & { '--switch-checked-bg': string; '--switch-checked-border': string; '--switch-thumb-checked': string }}>
                                <Switch
                                    checked={settings.is_optimized === 1}
                                    onCheckedChange={() => handleToggleSetting('is_optimized')}
                                    className="h-[1.75rem] w-[3.25rem] data-[state=checked]:bg-[var(--switch-checked-bg)] data-[state=checked]:border data-[state=checked]:backdrop:blur-[50px] data-[state=checked]:border-[var(--switch-checked-border)] data-[state=unchecked]:bg-[#FFFFFF0A] data-[state=unchecked]:border data-[state=unchecked]:border-[#FFFFFF0A] [&>span]:data-[state=checked]:bg-[var(--switch-thumb-checked)] [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-7 [&>span]:data-[state=unchecked]:translate-x-[0.25rem]"
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="w-[57.313rem] h-[5rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] rounded-[0.625rem] backdrop-blur-[50px] flex flex-row gap-4 items-center justify-start">
                        <div className="w-[3rem] h-[3rem] ml-4 rounded-[0.5rem] flex items-center justify-center" style={{ backgroundColor: `${primaryColor}14` }}>
                            <svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.853 6.00068C15.8371 5.91946 15.804 5.84265 15.7561 5.77547C15.7081 5.70829 15.6464 5.65232 15.5751 5.61136L13.4446 4.38571L13.436 1.96181C13.4357 1.87833 13.4175 1.7959 13.3826 1.72022C13.3477 1.64454 13.297 1.5774 13.2339 1.52346C12.461 0.863551 11.571 0.357839 10.6112 0.0332109C10.5356 0.00738567 10.4555 -0.00217158 10.376 0.00515475C10.2966 0.0124811 10.2195 0.0365286 10.1498 0.0757482L8.00068 1.28842L5.8494 0.0735852C5.77966 0.0341447 5.70249 0.00991567 5.62289 0.00246428C5.54329 -0.0049871 5.46303 0.00450499 5.38729 0.030327C4.42805 0.35704 3.53903 0.86471 2.76748 1.52634C2.70446 1.58021 2.65376 1.64723 2.61887 1.72278C2.58397 1.79833 2.56572 1.88061 2.56535 1.96397L2.55464 4.39003L0.424079 5.61568C0.352799 5.65665 0.291091 5.71262 0.24315 5.7798C0.195208 5.84698 0.162157 5.92379 0.146242 6.00501C-0.0487472 6.9941 -0.0487472 8.01227 0.146242 9.00136C0.162157 9.08258 0.195208 9.15939 0.24315 9.22657C0.291091 9.29375 0.352799 9.34972 0.424079 9.39069L2.55464 10.6163L2.56321 13.041C2.56347 13.1244 2.58168 13.2069 2.61657 13.2825C2.65147 13.3582 2.70223 13.4254 2.76534 13.4793C3.53819 14.1392 4.42819 14.6449 5.38801 14.9696C5.46359 14.9954 5.5437 15.0049 5.62317 14.9976C5.70264 14.9903 5.7797 14.9662 5.8494 14.927L8.00068 13.7107L10.1519 14.9256C10.2371 14.9735 10.333 14.9983 10.4305 14.9977C10.4929 14.9977 10.5549 14.9874 10.6141 14.9674C11.5731 14.6408 12.462 14.1337 13.2339 13.4728C13.2969 13.419 13.3476 13.3519 13.3825 13.2764C13.4174 13.2008 13.4356 13.1185 13.436 13.0352L13.4467 10.6091L15.5773 9.38348C15.6486 9.34251 15.7103 9.28654 15.7582 9.21936C15.8061 9.15218 15.8392 9.07537 15.8551 8.99415C16.049 8.00585 16.0483 6.98869 15.853 6.00068ZM8.00068 10.3835C7.43563 10.3835 6.88327 10.2143 6.41345 9.89744C5.94363 9.58055 5.57745 9.13015 5.36121 8.60319C5.14498 8.07623 5.0884 7.49638 5.19863 6.93696C5.30887 6.37754 5.58097 5.86369 5.98052 5.46037C6.38007 5.05705 6.88912 4.78239 7.44332 4.67111C7.99751 4.55984 8.57194 4.61695 9.09398 4.83522C9.61602 5.05349 10.0622 5.42313 10.3761 5.89738C10.6901 6.37163 10.8576 6.9292 10.8576 7.49958C10.8576 8.26443 10.5566 8.99796 10.0208 9.53879C9.48506 10.0796 8.75838 10.3835 8.00068 10.3835Z" fill={primaryColor}/>
                            </svg>
                        </div>

                        <div className='flex flex-col gap-[0.35rem] text-left'>
                            <div className='text-[1rem]'
                                style= {{
                                    color: 'white',
                                    fontWeight: 500,
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.change_pin}
                            </div>
                            <div className='text-[0.875rem]'
                                style= {{
                                    color: '#FFFFFFA6',
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                    fontWeight: 300
                                }}
                            >
                                {locale.change_pin_desc}
                            </div>
                        </div>

                        <div className="absolute right-4 flex items-center gap-3 justify-center flex-row">
                            <div className="flex item-center px-2 justify-center w-[6.5rem] gap-1 h-[2.25rem]  border rounded-[0.625rem] " style={{ backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}0A` }}>
                                <svg className="flex items-center justify-center mt-[0.6rem]" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 0C5.61553 0 4.26216 0.410543 3.11101 1.17971C1.95987 1.94888 1.06266 3.04213 0.532846 4.32122C0.00303299 5.6003 -0.13559 7.00776 0.134506 8.36563C0.404603 9.7235 1.07129 10.9708 2.05026 11.9497C3.02922 12.9287 4.2765 13.5954 5.63437 13.8655C6.99224 14.1356 8.3997 13.997 9.67879 13.4672C10.9579 12.9373 12.0511 12.0401 12.8203 10.889C13.5895 9.73785 14 8.38447 14 7C13.998 5.14409 13.2599 3.36475 11.9476 2.05242C10.6353 0.740087 8.85592 0.00195988 7 0ZM8.07692 10.7692H7.53846V11.3077C7.53846 11.4505 7.48173 11.5875 7.38075 11.6884C7.27977 11.7894 7.14281 11.8462 7 11.8462C6.85719 11.8462 6.72023 11.7894 6.61925 11.6884C6.51827 11.5875 6.46154 11.4505 6.46154 11.3077V10.7692H5.92308C5.35184 10.7692 4.804 10.5423 4.40008 10.1384C3.99616 9.73446 3.76923 9.18662 3.76923 8.61538C3.76923 8.47257 3.82596 8.33561 3.92694 8.23463C4.02793 8.13365 4.16489 8.07692 4.30769 8.07692C4.4505 8.07692 4.58746 8.13365 4.68844 8.23463C4.78943 8.33561 4.84616 8.47257 4.84616 8.61538C4.84616 8.901 4.95962 9.17492 5.16158 9.37688C5.36354 9.57885 5.63746 9.69231 5.92308 9.69231H8.07692C8.36254 9.69231 8.63646 9.57885 8.83842 9.37688C9.04039 9.17492 9.15385 8.901 9.15385 8.61538C9.15385 8.32977 9.04039 8.05585 8.83842 7.85388C8.63646 7.65192 8.36254 7.53846 8.07692 7.53846H6.19231C5.62107 7.53846 5.07324 7.31154 4.66931 6.90761C4.26539 6.50369 4.03846 5.95585 4.03846 5.38461C4.03846 4.81338 4.26539 4.26554 4.66931 3.86162C5.07324 3.45769 5.62107 3.23077 6.19231 3.23077H6.46154V2.69231C6.46154 2.5495 6.51827 2.41254 6.61925 2.31156C6.72023 2.21058 6.85719 2.15385 7 2.15385C7.14281 2.15385 7.27977 2.21058 7.38075 2.31156C7.48173 2.41254 7.53846 2.5495 7.53846 2.69231V3.23077H7.80769C8.37893 3.23077 8.92677 3.45769 9.33069 3.86162C9.73462 4.26554 9.96154 4.81338 9.96154 5.38461C9.96154 5.52742 9.90481 5.66438 9.80383 5.76536C9.70285 5.86635 9.56589 5.92308 9.42308 5.92308C9.28027 5.92308 9.14331 5.86635 9.04233 5.76536C8.94135 5.66438 8.88462 5.52742 8.88462 5.38461C8.88462 5.099 8.77116 4.82508 8.56919 4.62312C8.36723 4.42115 8.09331 4.30769 7.80769 4.30769H6.19231C5.90669 4.30769 5.63277 4.42115 5.43081 4.62312C5.22885 4.82508 5.11539 5.099 5.11539 5.38461C5.11539 5.67023 5.22885 5.94415 5.43081 6.14611C5.63277 6.34808 5.90669 6.46154 6.19231 6.46154H8.07692C8.64816 6.46154 9.196 6.68846 9.59992 7.09238C10.0038 7.49631 10.2308 8.04415 10.2308 8.61538C10.2308 9.18662 10.0038 9.73446 9.59992 10.1384C9.196 10.5423 8.64816 10.7692 8.07692 10.7692Z" fill={primaryColor}/>
                                </svg>

                                <div className=" text-[0.875rem] mt-[0.01rem] flex items-center justify-center"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        fontWeight: 500,
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                        color: primaryColor
                                    }}
                                >
                                    {locale.currencySign} {basicData.pinChangeCost.toLocaleString()}
                                </div>
                            </div>

                            <div className="flex item-center px-1 justify-center w-[12rem] gap-1 h-[2.25rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] rounded-[0.625rem] ">
                                <div className="flex w-full items-center justify-between">
                                    <div className="w-[1.75rem] flex items-center justify-center h-[1.75rem] border border-[#FFFFFF1F] hover:bg-[#ffffff0c] rounded-[0.5rem]"
                                         onClick={() => handlePreviousAccountChangePin()}
                                    >
                                        <svg width="6" height="12" viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M0.204082 6.55422L4.81679 11.7704C4.94678 11.9174 5.12307 12 5.30689 12C5.49072 12 5.66701 11.9174 5.79699 11.7704C5.92698 11.6234 6 11.4241 6 11.2162C6 11.0083 5.92698 10.809 5.79699 10.662L1.67381 6.00065L5.79584 1.33801C5.8602 1.26523 5.91126 1.17883 5.94609 1.08373C5.98092 0.988638 5.99885 0.886718 5.99885 0.783789C5.99885 0.68086 5.98092 0.578939 5.94609 0.483846C5.91126 0.388752 5.8602 0.302348 5.79584 0.229567C5.73148 0.156785 5.65507 0.0990515 5.57098 0.0596625C5.48689 0.0202734 5.39676 -7.66878e-10 5.30574 0C5.21472 7.66879e-10 5.12459 0.0202734 5.0405 0.0596625C4.95641 0.0990515 4.88 0.156785 4.81564 0.229567L0.202929 5.44578C0.138501 5.51855 0.0874095 5.605 0.0525861 5.70015C0.0177631 5.7953 -0.000106812 5.89729 4.76837e-07 6.00027C0.000107288 6.10325 0.0181899 6.20519 0.0532107 6.30025C0.088232 6.39531 0.139502 6.48162 0.204082 6.55422Z" fill="white" fillOpacity="0.65"/>
                                        </svg>
                                    </div>

                                    <div className="flex flex-row ">
                                        <div className="w-[1.125rem] h-[1.125rem] ">
                                            <img 
                                                src="./essential/logo.svg" 
                                                alt="Logo"
                                                className=""
                                            />
                                        </div>

                                        <span className="text-[0.875rem] ml-3"
                                            style={{
                                                fontFamily: 'Roboto, sans-serif',
                                                fontWeight: 400,
                                                lineHeight: '140%',
                                                color: primaryColor
                                            }}
                                        >
                                            ****
                                        </span>

                                        <div className="text-[0.875rem] text-white ml-1"
                                            style={{
                                                fontFamily: 'Roboto, sans-serif',
                                                fontWeight: 400,
                                                lineHeight: '140%',
                                            }}
                                        >
                                            {selectedAccountChangePin.accountNumber?.toString().slice(-4)}
                                        </div>
                                    </div>

                                    <div className="w-[1.75rem] flex items-center justify-center h-[1.75rem] border border-[#FFFFFF1F] hover:bg-[#ffffff0c] rounded-[0.5rem]"
                                         onClick={() => handleNextAccountChangePin()}
                                    >
                                        <svg width="6" height="12" viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M5.79592 6.55422L1.18321 11.7704C1.05322 11.9174 0.87693 12 0.693107 12C0.509283 12 0.332989 11.9174 0.203006 11.7704C0.0730234 11.6234 1.36959e-09 11.4241 0 11.2162C-1.36959e-09 11.0083 0.0730234 10.809 0.203006 10.662L4.32619 6.00065L0.20416 1.33801C0.139799 1.26523 0.0887446 1.17883 0.0539127 1.08373C0.0190808 0.988638 0.00115298 0.886718 0.00115298 0.783789C0.00115298 0.68086 0.0190808 0.578939 0.0539127 0.483846C0.0887446 0.388752 0.139799 0.302348 0.20416 0.229567C0.268521 0.156785 0.344928 0.0990515 0.42902 0.0596625C0.513111 0.0202734 0.60324 -7.66878e-10 0.69426 0C0.78528 7.66879e-10 0.875409 0.0202734 0.959501 0.0596625C1.04359 0.0990515 1.12 0.156785 1.18436 0.229567L5.79707 5.44578C5.8615 5.51855 5.91259 5.605 5.94741 5.70015C5.98224 5.7953 6.00011 5.89729 6 6.00027C5.99989 6.10325 5.98181 6.20519 5.94679 6.30025C5.91177 6.39531 5.8605 6.48162 5.79592 6.55422Z" fill="white" fillOpacity="0.65"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <Input
                                type="number"
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value)}
                                className="bg-[#FFFFFF0A] w-[6rem] h-[2.25rem] focus-visible:ring-0 rounded-[0.625rem] text-[#FFFFFF66] text-center text-[0.875rem] flex items-center justify-center border border-[#FFFFFF0A]"
                                placeholder="00000"
                                maxLength={5}
                                minLength={5}
                                style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    letterSpacing: '-0.85%',
                                    lineHeight: '140%',
                                    fontWeight: 500,
                                }}
                            />

                            <div
                                className={`flex item-center px-2 justify-center w-[7.25rem] gap-1 h-[2.25rem] rounded-[0.625rem] transition-shadow ${
                                    (selectedAccountChangePin?.isSociety || selectedAccountChangePin?.isNomineeAccount)
                                        ? 'bg-[#FFFFFF1A] cursor-not-allowed text-[#FFFFFF40]'
                                        : 'cursor-pointer text-black'
                                }`}
                                style={
                                    !(selectedAccountChangePin?.isSociety || selectedAccountChangePin?.isNomineeAccount)
                                        ? {
                                            backgroundColor: primaryColor
                                          }
                                        : undefined
                                }
                                onMouseEnter={(e) => {
                                    if (!(selectedAccountChangePin?.isSociety || selectedAccountChangePin?.isNomineeAccount)) {
                                        (e.currentTarget as HTMLDivElement).style.boxShadow = `0px 0px 20px 0px ${primaryColor}33`;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!(selectedAccountChangePin?.isSociety || selectedAccountChangePin?.isNomineeAccount)) {
                                        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                    }
                                }}
                                onClick={(selectedAccountChangePin?.isSociety || selectedAccountChangePin?.isNomineeAccount) ? undefined : handleChangePin}
                            >
                                <div className="text-[0.875rem] flex items-center justify-center"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        fontWeight: 600,
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                    }}
                                >
                                    {locale.change}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="w-[57.313rem] h-[5rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] rounded-[0.625rem] backdrop-blur-[50px] flex flex-row gap-4 items-center justify-start">
                        <div className="w-[3rem] h-[3rem] ml-4 rounded-[0.5rem] flex items-center justify-center" style={{backgroundColor: `${primaryColor}14` }}>
                            <svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.853 6.00068C15.8371 5.91946 15.804 5.84265 15.7561 5.77547C15.7081 5.70829 15.6464 5.65232 15.5751 5.61136L13.4446 4.38571L13.436 1.96181C13.4357 1.87833 13.4175 1.7959 13.3826 1.72022C13.3477 1.64454 13.297 1.5774 13.2339 1.52346C12.461 0.863551 11.571 0.357839 10.6112 0.0332109C10.5356 0.00738567 10.4555 -0.00217158 10.376 0.00515475C10.2966 0.0124811 10.2195 0.0365286 10.1498 0.0757482L8.00068 1.28842L5.8494 0.0735852C5.77966 0.0341447 5.70249 0.00991567 5.62289 0.00246428C5.54329 -0.0049871 5.46303 0.00450499 5.38729 0.030327C4.42805 0.35704 3.53903 0.86471 2.76748 1.52634C2.70446 1.58021 2.65376 1.64723 2.61887 1.72278C2.58397 1.79833 2.56572 1.88061 2.56535 1.96397L2.55464 4.39003L0.424079 5.61568C0.352799 5.65665 0.291091 5.71262 0.24315 5.7798C0.195208 5.84698 0.162157 5.92379 0.146242 6.00501C-0.0487472 6.9941 -0.0487472 8.01227 0.146242 9.00136C0.162157 9.08258 0.195208 9.15939 0.24315 9.22657C0.291091 9.29375 0.352799 9.34972 0.424079 9.39069L2.55464 10.6163L2.56321 13.041C2.56347 13.1244 2.58168 13.2069 2.61657 13.2825C2.65147 13.3582 2.70223 13.4254 2.76534 13.4793C3.53819 14.1392 4.42819 14.6449 5.38801 14.9696C5.46359 14.9954 5.5437 15.0049 5.62317 14.9976C5.70264 14.9903 5.7797 14.9662 5.8494 14.927L8.00068 13.7107L10.1519 14.9256C10.2371 14.9735 10.333 14.9983 10.4305 14.9977C10.4929 14.9977 10.5549 14.9874 10.6141 14.9674C11.5731 14.6408 12.462 14.1337 13.2339 13.4728C13.2969 13.419 13.3476 13.3519 13.3825 13.2764C13.4174 13.2008 13.4356 13.1185 13.436 13.0352L13.4467 10.6091L15.5773 9.38348C15.6486 9.34251 15.7103 9.28654 15.7582 9.21936C15.8061 9.15218 15.8392 9.07537 15.8551 8.99415C16.049 8.00585 16.0483 6.98869 15.853 6.00068ZM8.00068 10.3835C7.43563 10.3835 6.88327 10.2143 6.41345 9.89744C5.94363 9.58055 5.57745 9.13015 5.36121 8.60319C5.14498 8.07623 5.0884 7.49638 5.19863 6.93696C5.30887 6.37754 5.58097 5.86369 5.98052 5.46037C6.38007 5.05705 6.88912 4.78239 7.44332 4.67111C7.99751 4.55984 8.57194 4.61695 9.09398 4.83522C9.61602 5.05349 10.0622 5.42313 10.3761 5.89738C10.6901 6.37163 10.8576 6.9292 10.8576 7.49958C10.8576 8.26443 10.5566 8.99796 10.0208 9.53879C9.48506 10.0796 8.75838 10.3835 8.00068 10.3835Z" fill={primaryColor}/>
                            </svg>
                        </div>

                        <div className='flex flex-col gap-[0.35rem] text-left'>
                            <div className='text-[1rem]'
                                style= {{
                                    color: 'white',
                                    fontWeight: 500,
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.reIssueCard}
                            </div>
                            <div className='text-[0.875rem]'
                                style= {{
                                    color: '#FFFFFFA6',
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                    fontWeight: 300
                                }}
                            >
                                {locale.reIssueCardDesc}
                            </div>
                        </div>

                        <div className="absolute right-4 flex items-center gap-3 justify-center flex-row">
                            <div className="flex item-center px-2 justify-center w-[6.5rem] gap-1 h-[2.25rem]  border  rounded-[0.625rem] "style={{ backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}0A` }}>
                                <svg className="flex items-center justify-center mt-[0.6rem]" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 0C5.61553 0 4.26216 0.410543 3.11101 1.17971C1.95987 1.94888 1.06266 3.04213 0.532846 4.32122C0.00303299 5.6003 -0.13559 7.00776 0.134506 8.36563C0.404603 9.7235 1.07129 10.9708 2.05026 11.9497C3.02922 12.9287 4.2765 13.5954 5.63437 13.8655C6.99224 14.1356 8.3997 13.997 9.67879 13.4672C10.9579 12.9373 12.0511 12.0401 12.8203 10.889C13.5895 9.73785 14 8.38447 14 7C13.998 5.14409 13.2599 3.36475 11.9476 2.05242C10.6353 0.740087 8.85592 0.00195988 7 0ZM8.07692 10.7692H7.53846V11.3077C7.53846 11.4505 7.48173 11.5875 7.38075 11.6884C7.27977 11.7894 7.14281 11.8462 7 11.8462C6.85719 11.8462 6.72023 11.7894 6.61925 11.6884C6.51827 11.5875 6.46154 11.4505 6.46154 11.3077V10.7692H5.92308C5.35184 10.7692 4.804 10.5423 4.40008 10.1384C3.99616 9.73446 3.76923 9.18662 3.76923 8.61538C3.76923 8.47257 3.82596 8.33561 3.92694 8.23463C4.02793 8.13365 4.16489 8.07692 4.30769 8.07692C4.4505 8.07692 4.58746 8.13365 4.68844 8.23463C4.78943 8.33561 4.84616 8.47257 4.84616 8.61538C4.84616 8.901 4.95962 9.17492 5.16158 9.37688C5.36354 9.57885 5.63746 9.69231 5.92308 9.69231H8.07692C8.36254 9.69231 8.63646 9.57885 8.83842 9.37688C9.04039 9.17492 9.15385 8.901 9.15385 8.61538C9.15385 8.32977 9.04039 8.05585 8.83842 7.85388C8.63646 7.65192 8.36254 7.53846 8.07692 7.53846H6.19231C5.62107 7.53846 5.07324 7.31154 4.66931 6.90761C4.26539 6.50369 4.03846 5.95585 4.03846 5.38461C4.03846 4.81338 4.26539 4.26554 4.66931 3.86162C5.07324 3.45769 5.62107 3.23077 6.19231 3.23077H6.46154V2.69231C6.46154 2.5495 6.51827 2.41254 6.61925 2.31156C6.72023 2.21058 6.85719 2.15385 7 2.15385C7.14281 2.15385 7.27977 2.21058 7.38075 2.31156C7.48173 2.41254 7.53846 2.5495 7.53846 2.69231V3.23077H7.80769C8.37893 3.23077 8.92677 3.45769 9.33069 3.86162C9.73462 4.26554 9.96154 4.81338 9.96154 5.38461C9.96154 5.52742 9.90481 5.66438 9.80383 5.76536C9.70285 5.86635 9.56589 5.92308 9.42308 5.92308C9.28027 5.92308 9.14331 5.86635 9.04233 5.76536C8.94135 5.66438 8.88462 5.52742 8.88462 5.38461C8.88462 5.099 8.77116 4.82508 8.56919 4.62312C8.36723 4.42115 8.09331 4.30769 7.80769 4.30769H6.19231C5.90669 4.30769 5.63277 4.42115 5.43081 4.62312C5.22885 4.82508 5.11539 5.099 5.11539 5.38461C5.11539 5.67023 5.22885 5.94415 5.43081 6.14611C5.63277 6.34808 5.90669 6.46154 6.19231 6.46154H8.07692C8.64816 6.46154 9.196 6.68846 9.59992 7.09238C10.0038 7.49631 10.2308 8.04415 10.2308 8.61538C10.2308 9.18662 10.0038 9.73446 9.59992 10.1384C9.196 10.5423 8.64816 10.7692 8.07692 10.7692Z" fill={primaryColor}/>
                                </svg>

                                <div className=" text-[0.875rem] mt-[0.01rem] flex items-center justify-center"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        fontWeight: 500,
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                        color: primaryColor
                                    }}
                                >
                                    {locale.currencySign} {basicData.reIssueCardCost.toLocaleString()}
                                </div>
                            </div>

                            <div className="flex item-center px-1 justify-center w-[12rem] gap-1 h-[2.25rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] rounded-[0.625rem] ">
                                <div className="flex w-full items-center justify-between">
                                    <div className="w-[1.75rem] flex items-center justify-center h-[1.75rem] border border-[#FFFFFF1F] hover:bg-[#ffffff0c] rounded-[0.5rem]"
                                         onClick={() => handlePreviousAccountReissue()}
                                    >
                                        <svg width="6" height="12" viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M0.204082 6.55422L4.81679 11.7704C4.94678 11.9174 5.12307 12 5.30689 12C5.49072 12 5.66701 11.9174 5.79699 11.7704C5.92698 11.6234 6 11.4241 6 11.2162C6 11.0083 5.92698 10.809 5.79699 10.662L1.67381 6.00065L5.79584 1.33801C5.8602 1.26523 5.91126 1.17883 5.94609 1.08373C5.98092 0.988638 5.99885 0.886718 5.99885 0.783789C5.99885 0.68086 5.98092 0.578939 5.94609 0.483846C5.91126 0.388752 5.8602 0.302348 5.79584 0.229567C5.73148 0.156785 5.65507 0.0990515 5.57098 0.0596625C5.48689 0.0202734 5.39676 -7.66878e-10 5.30574 0C5.21472 7.66879e-10 5.12459 0.0202734 5.0405 0.0596625C4.95641 0.0990515 4.88 0.156785 4.81564 0.229567L0.202929 5.44578C0.138501 5.51855 0.0874095 5.605 0.0525861 5.70015C0.0177631 5.7953 -0.000106812 5.89729 4.76837e-07 6.00027C0.000107288 6.10325 0.0181899 6.20519 0.0532107 6.30025C0.088232 6.39531 0.139502 6.48162 0.204082 6.55422Z" fill="white" fillOpacity="0.65"/>
                                        </svg>
                                    </div>

                                    <div className="flex flex-row ">
                                        <div className="w-[1.125rem] h-[1.125rem] ">
                                            <img
                                                src="./essential/logo.svg"
                                                alt="Logo"
                                                className=""
                                            />
                                        </div>

                                        <span className="text-[0.875rem]  ml-3"
                                            style={{
                                                fontFamily: 'Roboto, sans-serif',
                                                fontWeight: 400,
                                                lineHeight: '140%',
                                                color: primaryColor
                                            }}
                                        >
                                            ****
                                        </span>

                                        <div className="text-[0.875rem] text-white ml-1"
                                            style={{
                                                fontFamily: 'Roboto, sans-serif',
                                                fontWeight: 400,
                                                lineHeight: '140%',
                                            }}
                                        >
                                            {selectedAccountReissue.accountNumber?.toString().slice(-4)}
                                        </div>
                                    </div>

                                    <div className="w-[1.75rem] flex items-center justify-center h-[1.75rem] border border-[#FFFFFF1F] hover:bg-[#ffffff0c] rounded-[0.5rem]"
                                         onClick={() => handleNextAccountReissue()}
                                    >
                                        <svg width="6" height="12" viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M5.79592 6.55422L1.18321 11.7704C1.05322 11.9174 0.87693 12 0.693107 12C0.509283 12 0.332989 11.9174 0.203006 11.7704C0.0730234 11.6234 1.36959e-09 11.4241 0 11.2162C-1.36959e-09 11.0083 0.0730234 10.809 0.203006 10.662L4.32619 6.00065L0.20416 1.33801C0.139799 1.26523 0.0887446 1.17883 0.0539127 1.08373C0.0190808 0.988638 0.00115298 0.886718 0.00115298 0.783789C0.00115298 0.68086 0.0190808 0.578939 0.0539127 0.483846C0.0887446 0.388752 0.139799 0.302348 0.20416 0.229567C0.268521 0.156785 0.344928 0.0990515 0.42902 0.0596625C0.513111 0.0202734 0.60324 -7.66878e-10 0.69426 0C0.78528 7.66879e-10 0.875409 0.0202734 0.959501 0.0596625C1.04359 0.0990515 1.12 0.156785 1.18436 0.229567L5.79707 5.44578C5.8615 5.51855 5.91259 5.605 5.94741 5.70015C5.98224 5.7953 6.00011 5.89729 6 6.00027C5.99989 6.10325 5.98181 6.20519 5.94679 6.30025C5.91177 6.39531 5.8605 6.48162 5.79592 6.55422Z" fill="white" fillOpacity="0.65"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div
                                className={`flex item-center px-2 justify-center w-[7.25rem] gap-1 h-[2.25rem] rounded-[0.625rem] transition-shadow ${
                                    basicData?.IsCardEnabled && !selectedAccountReissue?.isSociety && !selectedAccountReissue?.isNomineeAccount
                                        ? 'cursor-pointer text-black'
                                        : 'bg-[#FFFFFF1A] cursor-not-allowed text-[#FFFFFF40]'
                                }`}
                                style={
                                    basicData?.IsCardEnabled && !selectedAccountReissue?.isSociety && !selectedAccountReissue?.isNomineeAccount
                                        ? { backgroundColor: primaryColor }
                                        : undefined
                                }
                                onMouseEnter={(e) => {
                                    if (basicData?.IsCardEnabled && !selectedAccountReissue?.isSociety && !selectedAccountReissue?.isNomineeAccount) {
                                        (e.currentTarget as HTMLDivElement).style.boxShadow = `0px 0px 20px 0px ${primaryColor}33`;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (basicData?.IsCardEnabled && !selectedAccountReissue?.isSociety && !selectedAccountReissue?.isNomineeAccount) {
                                        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                    }
                                }}
                                onClick={basicData?.IsCardEnabled && !selectedAccountReissue?.isSociety && !selectedAccountReissue?.isNomineeAccount ? handleReIssueCard : undefined}
                            >
                                <div className="text-[0.875rem] flex items-center justify-center"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        fontWeight: 600,
                                        lineHeight: '140%',
                                        letterSpacing: '-0.85%',
                                    }}
                                >
                                    {locale.reIssue}
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                <motion.div variants={fadeIn} className="flex flex-col gap-1 mt-[1rem] ml-[2.2rem]">
                    <div className="text-white text-[1.375rem] text-left"
                        style={{
                            fontFamily: 'Roboto, sans-serif',
                            fontWeight: 600,
                            lineHeight: '140%',
                            letterSpacing: '-0.85%',
                        }}
                    >
                        {locale.upgrades}
                    </div>
                </motion.div>
                <motion.div variants={fadeIn} className="flex flex-col gap-4 mt-[0.7rem] items-center justify-center">
                    <Card className="w-[57.313rem] h-[5rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] rounded-[0.625rem] backdrop-blur-[50px] flex flex-row gap-4 items-center justify-start">
                        <div className="w-[3rem] h-[3rem] ml-4 rounded-[0.5rem] flex items-center justify-center" style={{ backgroundColor: `${primaryColor}14` }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12.3074 15.3846C12.3074 15.5478 12.2426 15.7044 12.1272 15.8198C12.0118 15.9352 11.8553 16 11.6921 16H4.30792C4.14472 16 3.9882 15.9352 3.8728 15.8198C3.7574 15.7044 3.69257 15.5478 3.69257 15.3846C3.69257 15.2214 3.7574 15.0649 3.8728 14.9495C3.9882 14.8341 4.14472 14.7693 4.30792 14.7693H11.6921C11.8553 14.7693 12.0118 14.8341 12.1272 14.9495C12.2426 15.0649 12.3074 15.2214 12.3074 15.3846ZM15.8195 7.56487L8.43536 0.180479C8.37821 0.123264 8.31034 0.0778753 8.23564 0.0469074C8.16094 0.0159395 8.08087 0 8 0C7.91913 0 7.83906 0.0159395 7.76436 0.0469074C7.68966 0.0778753 7.62179 0.123264 7.56464 0.180479L0.180474 7.56487C0.0943181 7.65093 0.0356339 7.76062 0.0118505 7.88006C-0.0119329 7.99949 0.000253827 8.1233 0.0468679 8.2358C0.093482 8.3483 0.172427 8.44444 0.27371 8.51206C0.374992 8.57967 0.494057 8.6157 0.615832 8.61561H3.69257V10.4617C3.69257 10.6249 3.7574 10.7814 3.8728 10.8968C3.9882 11.0122 4.14472 11.0771 4.30792 11.0771H11.6921C11.8553 11.0771 12.0118 11.0122 12.1272 10.8968C12.2426 10.7814 12.3074 10.6249 12.3074 10.4617V8.61561H15.3842C15.5059 8.6157 15.625 8.57967 15.7263 8.51206C15.8276 8.44444 15.9065 8.3483 15.9531 8.2358C15.9997 8.1233 16.0119 7.99949 15.9881 7.88006C15.9644 7.76062 15.9057 7.65093 15.8195 7.56487ZM11.6921 12.3078H4.30792C4.14472 12.3078 3.9882 12.3726 3.8728 12.488C3.7574 12.6034 3.69257 12.76 3.69257 12.9232C3.69257 13.0864 3.7574 13.2429 3.8728 13.3583C3.9882 13.4737 4.14472 13.5385 4.30792 13.5385H11.6921C11.8553 13.5385 12.0118 13.4737 12.1272 13.3583C12.2426 13.2429 12.3074 13.0864 12.3074 12.9232C12.3074 12.76 12.2426 12.6034 12.1272 12.488C12.0118 12.3726 11.8553 12.3078 11.6921 12.3078Z" fill={primaryColor}/>
                            </svg>
                        </div>

                        <div className='flex flex-col gap-[0.35rem] text-left'>
                            <div className='text-[1rem]'
                                style= {{
                                    color: 'white',
                                    fontWeight: 500,
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.withdrawalLevel} {withdrawalLevel}
                            </div>
                            <div className='text-[0.875rem]'
                                style= {{
                                    color: '#FFFFFFA6',
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                    fontWeight: 300
                                }}
                            >
                                {canUpgradeWithdrawal
                                    ? `${locale.upgradeatmlevel} ${locale.currencySign} ${(nextWithdrawalInfo.maxWithdraw / 1000)}k`
                                    : `Max withdraw: ${locale.currencySign} ${(currentWithdrawalInfo.maxWithdraw / 1000)}k (MAX)`}
                            </div>
                        </div>

                        <div className="absolute right-4 flex items-center gap-3 justify-center flex-row">
                            {canUpgradeWithdrawal && (
                                <>
                                    <div className="flex item-center px-2 justify-center w-[6.5rem] gap-1 h-[2.25rem] rounded-[0.625rem] " style={{ backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}0A` }}>
                                        <svg className="flex items-center justify-center mt-[0.6rem]" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M7 0C5.61553 0 4.26216 0.410543 3.11101 1.17971C1.95987 1.94888 1.06266 3.04213 0.532846 4.32122C0.00303299 5.6003 -0.13559 7.00776 0.134506 8.36563C0.404603 9.7235 1.07129 10.9708 2.05026 11.9497C3.02922 12.9287 4.2765 13.5954 5.63437 13.8655C6.99224 14.1356 8.3997 13.997 9.67879 13.4672C10.9579 12.9373 12.0511 12.0401 12.8203 10.889C13.5895 9.73785 14 8.38447 14 7C13.998 5.14409 13.2599 3.36475 11.9476 2.05242C10.6353 0.740087 8.85592 0.00195988 7 0ZM8.07692 10.7692H7.53846V11.3077C7.53846 11.4505 7.48173 11.5875 7.38075 11.6884C7.27977 11.7894 7.14281 11.8462 7 11.8462C6.85719 11.8462 6.72023 11.7894 6.61925 11.6884C6.51827 11.5875 6.46154 11.4505 6.46154 11.3077V10.7692H5.92308C5.35184 10.7692 4.804 10.5423 4.40008 10.1384C3.99616 9.73446 3.76923 9.18662 3.76923 8.61538C3.76923 8.47257 3.82596 8.33561 3.92694 8.23463C4.02793 8.13365 4.16489 8.07692 4.30769 8.07692C4.4505 8.07692 4.58746 8.13365 4.68844 8.23463C4.78943 8.33561 4.84616 8.47257 4.84616 8.61538C4.84616 8.901 4.95962 9.17492 5.16158 9.37688C5.36354 9.57885 5.63746 9.69231 5.92308 9.69231H8.07692C8.36254 9.69231 8.63646 9.57885 8.83842 9.37688C9.04039 9.17492 9.15385 8.901 9.15385 8.61538C9.15385 8.32977 9.04039 8.05585 8.83842 7.85388C8.63646 7.65192 8.36254 7.53846 8.07692 7.53846H6.19231C5.62107 7.53846 5.07324 7.31154 4.66931 6.90761C4.26539 6.50369 4.03846 5.95585 4.03846 5.38461C4.03846 4.81338 4.26539 4.26554 4.66931 3.86162C5.07324 3.45769 5.62107 3.23077 6.19231 3.23077H6.46154V2.69231C6.46154 2.5495 6.51827 2.41254 6.61925 2.31156C6.72023 2.21058 6.85719 2.15385 7 2.15385C7.14281 2.15385 7.27977 2.21058 7.38075 2.31156C7.48173 2.41254 7.53846 2.5495 7.53846 2.69231V3.23077H7.80769C8.37893 3.23077 8.92677 3.45769 9.33069 3.86162C9.73462 4.26554 9.96154 4.81338 9.96154 5.38461C9.96154 5.52742 9.90481 5.66438 9.80383 5.76536C9.70285 5.86635 9.56589 5.92308 9.42308 5.92308C9.28027 5.92308 9.14331 5.86635 9.04233 5.76536C8.94135 5.66438 8.88462 5.52742 8.88462 5.38461C8.88462 5.099 8.77116 4.82508 8.56919 4.62312C8.36723 4.42115 8.09331 4.30769 7.80769 4.30769H6.19231C5.90669 4.30769 5.63277 4.42115 5.43081 4.62312C5.22885 4.82508 5.11539 5.099 5.11539 5.38461C5.11539 5.67023 5.22885 5.94415 5.43081 6.14611C5.63277 6.34808 5.90669 6.46154 6.19231 6.46154H8.07692C8.64816 6.46154 9.196 6.68846 9.59992 7.09238C10.0038 7.49631 10.2308 8.04415 10.2308 8.61538C10.2308 9.18662 10.0038 9.73446 9.59992 10.1384C9.196 10.5423 8.64816 10.7692 8.07692 10.7692Z" fill={primaryColor}/>
                                        </svg>

                                        <div className=" text-[0.875rem] mt-[0.01rem] flex items-center justify-center"
                                            style={{
                                                fontFamily: 'Roboto, sans-serif',
                                                fontWeight: 500,
                                                lineHeight: '140%',
                                                letterSpacing: '-0.85%',
                                                color: primaryColor
                                            }}
                                        >
                                            {locale.currencySign} {nextWithdrawalInfo.price.toLocaleString()}
                                        </div>
                                    </div>

                                    <div
                                        className="flex item-center px-2 justify-center w-[7.25rem] gap-1 h-[2.25rem] cursor-pointer text-black rounded-[0.625rem] transition-shadow"
                                        style={{ backgroundColor: primaryColor }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = `0px 0px 20px 0px ${primaryColor}33`;
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                        }}
                                        onClick={handleUpgradeWithdrawal}
                                    >
                                        <div className="text-[0.875rem] flex items-center justify-center"
                                            style={{
                                                fontFamily: 'Roboto, sans-serif',
                                                fontWeight: 600,
                                                lineHeight: '140%',
                                                letterSpacing: '-0.85%',
                                            }}
                                        >
                                            {locale.upgrade}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>

                    <Card className="w-[57.313rem] h-[5rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] rounded-[0.625rem] backdrop-blur-[50px] flex flex-row gap-4 items-center justify-start">
                        <div className="w-[3rem] h-[3rem] ml-4 rounded-[0.5rem] flex items-center justify-center" style={{ backgroundColor: `${primaryColor}14` }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12.3074 15.3846C12.3074 15.5478 12.2426 15.7044 12.1272 15.8198C12.0118 15.9352 11.8553 16 11.6921 16H4.30792C4.14472 16 3.9882 15.9352 3.8728 15.8198C3.7574 15.7044 3.69257 15.5478 3.69257 15.3846C3.69257 15.2214 3.7574 15.0649 3.8728 14.9495C3.9882 14.8341 4.14472 14.7693 4.30792 14.7693H11.6921C11.8553 14.7693 12.0118 14.8341 12.1272 14.9495C12.2426 15.0649 12.3074 15.2214 12.3074 15.3846ZM15.8195 7.56487L8.43536 0.180479C8.37821 0.123264 8.31034 0.0778753 8.23564 0.0469074C8.16094 0.0159395 8.08087 0 8 0C7.91913 0 7.83906 0.0159395 7.76436 0.0469074C7.68966 0.0778753 7.62179 0.123264 7.56464 0.180479L0.180474 7.56487C0.0943181 7.65093 0.0356339 7.76062 0.0118505 7.88006C-0.0119329 7.99949 0.000253827 8.1233 0.0468679 8.2358C0.093482 8.3483 0.172427 8.44444 0.27371 8.51206C0.374992 8.57967 0.494057 8.6157 0.615832 8.61561H3.69257V10.4617C3.69257 10.6249 3.7574 10.7814 3.8728 10.8968C3.9882 11.0122 4.14472 11.0771 4.30792 11.0771H11.6921C11.8553 11.0771 12.0118 11.0122 12.1272 10.8968C12.2426 10.7814 12.3074 10.6249 12.3074 10.4617V8.61561H15.3842C15.5059 8.6157 15.625 8.57967 15.7263 8.51206C15.8276 8.44444 15.9065 8.3483 15.9531 8.2358C15.9997 8.1233 16.0119 7.99949 15.9881 7.88006C15.9644 7.76062 15.9057 7.65093 15.8195 7.56487ZM11.6921 12.3078H4.30792C4.14472 12.3078 3.9882 12.3726 3.8728 12.488C3.7574 12.6034 3.69257 12.76 3.69257 12.9232C3.69257 13.0864 3.7574 13.2429 3.8728 13.3583C3.9882 13.4737 4.14472 13.5385 4.30792 13.5385H11.6921C11.8553 13.5385 12.0118 13.4737 12.1272 13.3583C12.2426 13.2429 12.3074 13.0864 12.3074 12.9232C12.3074 12.76 12.2426 12.6034 12.1272 12.488C12.0118 12.3726 11.8553 12.3078 11.6921 12.3078Z" fill={primaryColor}/>
                            </svg>
                        </div>

                        <div className='flex flex-col gap-[0.35rem] text-left'>
                            <div className='text-[1rem]'
                                style= {{
                                    color: 'white',
                                    fontWeight: 500,
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                }}
                            >
                                {locale.accountLevel} {accountLevel}
                            </div>
                            <div className='text-[0.875rem]'
                                style= {{
                                    color: '#FFFFFFA6',
                                    fontFamily: 'Roboto, sans-serif',
                                    lineHeight: '140%',
                                    letterSpacing: '-0.85%',
                                    fontWeight: 300
                                }}
                            >
                                {canUpgradeAccount
                                    ? `Unlock access to ${nextAccountInfo.maxAccounts} cards`
                                    : `Max accounts: ${currentAccountInfo.maxAccounts} (MAX)`}
                            </div>
                        </div>

                        <div className="absolute right-4 flex items-center gap-3 justify-center flex-row">
                            {canUpgradeAccount && (
                                <>
                                    <div className="flex item-center px-2 justify-center w-[6.5rem] gap-1 h-[2.25rem] border  rounded-[0.625rem] " style={{backgroundColor: `${primaryColor}14` , borderColor: `${primaryColor}0A`}} >
                                        <svg className="flex items-center justify-center mt-[0.6rem]" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M7 0C5.61553 0 4.26216 0.410543 3.11101 1.17971C1.95987 1.94888 1.06266 3.04213 0.532846 4.32122C0.00303299 5.6003 -0.13559 7.00776 0.134506 8.36563C0.404603 9.7235 1.07129 10.9708 2.05026 11.9497C3.02922 12.9287 4.2765 13.5954 5.63437 13.8655C6.99224 14.1356 8.3997 13.997 9.67879 13.4672C10.9579 12.9373 12.0511 12.0401 12.8203 10.889C13.5895 9.73785 14 8.38447 14 7C13.998 5.14409 13.2599 3.36475 11.9476 2.05242C10.6353 0.740087 8.85592 0.00195988 7 0ZM8.07692 10.7692H7.53846V11.3077C7.53846 11.4505 7.48173 11.5875 7.38075 11.6884C7.27977 11.7894 7.14281 11.8462 7 11.8462C6.85719 11.8462 6.72023 11.7894 6.61925 11.6884C6.51827 11.5875 6.46154 11.4505 6.46154 11.3077V10.7692H5.92308C5.35184 10.7692 4.804 10.5423 4.40008 10.1384C3.99616 9.73446 3.76923 9.18662 3.76923 8.61538C3.76923 8.47257 3.82596 8.33561 3.92694 8.23463C4.02793 8.13365 4.16489 8.07692 4.30769 8.07692C4.4505 8.07692 4.58746 8.13365 4.68844 8.23463C4.78943 8.33561 4.84616 8.47257 4.84616 8.61538C4.84616 8.901 4.95962 9.17492 5.16158 9.37688C5.36354 9.57885 5.63746 9.69231 5.92308 9.69231H8.07692C8.36254 9.69231 8.63646 9.57885 8.83842 9.37688C9.04039 9.17492 9.15385 8.901 9.15385 8.61538C9.15385 8.32977 9.04039 8.05585 8.83842 7.85388C8.63646 7.65192 8.36254 7.53846 8.07692 7.53846H6.19231C5.62107 7.53846 5.07324 7.31154 4.66931 6.90761C4.26539 6.50369 4.03846 5.95585 4.03846 5.38461C4.03846 4.81338 4.26539 4.26554 4.66931 3.86162C5.07324 3.45769 5.62107 3.23077 6.19231 3.23077H6.46154V2.69231C6.46154 2.5495 6.51827 2.41254 6.61925 2.31156C6.72023 2.21058 6.85719 2.15385 7 2.15385C7.14281 2.15385 7.27977 2.21058 7.38075 2.31156C7.48173 2.41254 7.53846 2.5495 7.53846 2.69231V3.23077H7.80769C8.37893 3.23077 8.92677 3.45769 9.33069 3.86162C9.73462 4.26554 9.96154 4.81338 9.96154 5.38461C9.96154 5.52742 9.90481 5.66438 9.80383 5.76536C9.70285 5.86635 9.56589 5.92308 9.42308 5.92308C9.28027 5.92308 9.14331 5.86635 9.04233 5.76536C8.94135 5.66438 8.88462 5.52742 8.88462 5.38461C8.88462 5.099 8.77116 4.82508 8.56919 4.62312C8.36723 4.42115 8.09331 4.30769 7.80769 4.30769H6.19231C5.90669 4.30769 5.63277 4.42115 5.43081 4.62312C5.22885 4.82508 5.11539 5.099 5.11539 5.38461C5.11539 5.67023 5.22885 5.94415 5.43081 6.14611C5.63277 6.34808 5.90669 6.46154 6.19231 6.46154H8.07692C8.64816 6.46154 9.196 6.68846 9.59992 7.09238C10.0038 7.49631 10.2308 8.04415 10.2308 8.61538C10.2308 9.18662 10.0038 9.73446 9.59992 10.1384C9.196 10.5423 8.64816 10.7692 8.07692 10.7692Z" fill={primaryColor}/>
                                        </svg>

                                        <div className=" text-[0.875rem] mt-[0.01rem] flex items-center justify-center"
                                            style={{
                                                fontFamily: 'Roboto, sans-serif',
                                                fontWeight: 500,
                                                lineHeight: '140%',
                                                letterSpacing: '-0.85%',
                                                color: primaryColor
                                            }}
                                        >
                                            {locale.currencySign} {nextAccountInfo.price.toLocaleString()}
                                        </div>
                                    </div>

                                    <div
                                        className="flex item-center px-2 justify-center w-[7.25rem] gap-1 h-[2.25rem] cursor-pointer text-black rounded-[0.625rem] transition-shadow"
                                        style={{ backgroundColor: primaryColor }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = `0px 0px 20px 0px ${primaryColor}33`;
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                        }}
                                        onClick={handleUpgradeAccount}
                                    >
                                        <div className="text-[0.875rem] flex items-center justify-center"
                                            style={{
                                                fontFamily: 'Roboto, sans-serif',
                                                fontWeight: 600,
                                                lineHeight: '140%',
                                                letterSpacing: '-0.85%',
                                            }}
                                        >
                                            {locale.upgrade}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                </motion.div>
            </motion.div>
        </>
    )
}

export default SettingsPage;
