import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { fetchNui } from "@/lib/fetchNui";
import { motion, AnimatePresence } from "framer-motion";
import type { LocaleStrings } from '@/lib/locale';

interface Nominee {
    id: number;
    nominee_identifier: string;
    nominee_name: string;
    added_date: string;
}

interface Account {
    accountNumber: number;
    type: string;
    balance: number;
    isSociety: boolean;
    isNomineeAccount?: boolean;
}

interface NomineeModalProps {
    isOpen: boolean;
    onClose: () => void;
    basicData: any;
    locale: LocaleStrings;
    primaryColor: string;
}

const NomineeModal = ({ isOpen, onClose, basicData, locale, primaryColor }: NomineeModalProps ) => {
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [accountIndex, setAccountIndex] = useState(0);
    const [playerServerId, setPlayerServerId] = useState('');
    const [nominees, setNominees] = useState<Nominee[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter out society accounts and nominee accounts (only show owned accounts)
    const eligibleAccounts = basicData?.accounts?.filter((acc: Account) =>
        !acc.isSociety && !acc.isNomineeAccount
    ) || [];

    useEffect(() => {
        if (eligibleAccounts.length > 0 && accountIndex < eligibleAccounts.length) {
            setSelectedAccount(eligibleAccounts[accountIndex]);
            loadNominees(eligibleAccounts[accountIndex].accountNumber);
        }
    }, [accountIndex, basicData]);

    const loadNominees = (accountNumber: number) => {
        setIsLoading(true);
        fetchNui('getNominees', { accountNumber })
            .then((response: any) => {
                if (response.success) {
                    setNominees(response.nominees || []);
                }
            })
            .catch((error) => {
                console.error('Failed to load nominees:', error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handlePreviousAccount = () => {
        if (accountIndex === 0) return;
        setAccountIndex(accountIndex - 1);
    };

    const handleNextAccount = () => {
        if (accountIndex === eligibleAccounts.length - 1) return;
        setAccountIndex(accountIndex + 1);
    };

    const handleAddNominee = () => {
        if (!selectedAccount || !playerServerId) return;

        const serverId = parseInt(playerServerId);
        if (isNaN(serverId) || serverId <= 0) {
            return;
        }

        setIsLoading(true);
        fetchNui('addNominee', {
            accountNumber: selectedAccount.accountNumber,
            targetServerId: serverId
        })
            .then((response: any) => {
                if (response.success) {
                    setPlayerServerId('');
                    loadNominees(selectedAccount.accountNumber);
                }
            })
            .catch((error) => {
                console.error('Failed to add nominee:', error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleRemoveNominee = (nomineeId: number) => {
        if (!selectedAccount) return;

        setIsLoading(true);
        fetchNui('removeNominee', {
            accountNumber: selectedAccount.accountNumber,
            nomineeId: nomineeId
        })
            .then((response: any) => {
                if (response.success) {
                    loadNominees(selectedAccount.accountNumber);
                }
            })
            .catch((error) => {
                console.error('Failed to remove nominee:', error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-[35rem] rounded-[1rem] p-6"
                    style={{
                        background: 'radial-gradient(50% 50% at 50% 50%, #0C0A10 0%, #0A090E 100%)',
                        border: '2px solid #12121285',
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-[1.5rem] text-white font-semibold"
                            style={{
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 600,
                            }}
                        >
                            {locale.manage_nominee || "Manage Nominee"}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-white transition-colors"
                            style={{ '--hover-color': primaryColor } as React.CSSProperties}
                            onMouseEnter={(e) => e.currentTarget.style.color = primaryColor}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>

                    {eligibleAccounts.length === 0 ? (
                        <div className="text-center py-8 text-[#FFFFFFA6]">
                            <p style={{ fontFamily: 'Roboto, sans-serif' }}>
                                {locale.no_eligible_accounts || "You don't have any eligible accounts to manage nominees."}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Account Selector */}
                            <div className="mb-6">
                                <p className="text-[#FFFFFFA6] text-[0.875rem] mb-2"
                                    style={{ fontFamily: 'Roboto, sans-serif' }}
                                >
                                    {locale.select_account || "Select Account"}
                                </p>
                                <div className="flex item-center px-1 justify-center w-full gap-1 h-[2.25rem] bg-[#FFFFFF0A] border border-[#FFFFFF0A] rounded-[0.625rem]">
                                    <div className="flex w-full items-center justify-between">
                                        <div
                                            className={`w-[1.75rem] flex items-center justify-center h-[1.75rem] border border-[#FFFFFF1F] rounded-[0.5rem] ${
                                                accountIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#ffffff0c] cursor-pointer'
                                            }`}
                                            onClick={() => accountIndex > 0 && handlePreviousAccount()}
                                        >
                                            <svg width="6" height="12" viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M0.204082 6.55422L4.81679 11.7704C4.94678 11.9174 5.12307 12 5.30689 12C5.49072 12 5.66701 11.9174 5.79699 11.7704C5.92698 11.6234 6 11.4241 6 11.2162C6 11.0083 5.92698 10.809 5.79699 10.662L1.67381 6.00065L5.79584 1.33801C5.8602 1.26523 5.91126 1.17883 5.94609 1.08373C5.98092 0.988638 5.99885 0.886718 5.99885 0.783789C5.99885 0.68086 5.98092 0.578939 5.94609 0.483846C5.91126 0.388752 5.8602 0.302348 5.79584 0.229567C5.73148 0.156785 5.65507 0.0990515 5.57098 0.0596625C5.48689 0.0202734 5.39676 -7.66878e-10 5.30574 0C5.21472 7.66879e-10 5.12459 0.0202734 5.0405 0.0596625C4.95641 0.0990515 4.88 0.156785 4.81564 0.229567L0.202929 5.44578C0.138501 5.51855 0.0874095 5.605 0.0525861 5.70015C0.0177631 5.7953 -0.000106812 5.89729 4.76837e-07 6.00027C0.000107288 6.10325 0.0181899 6.20519 0.0532107 6.30025C0.088232 6.39531 0.139502 6.48162 0.204082 6.55422Z" fill="white" fillOpacity="0.65"/>
                                            </svg>
                                        </div>

                                        <div className="flex flex-row items-center">
                                            <div className="w-[1.125rem] h-[1.125rem]">
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
                                                    color: primaryColor,
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
                                                {selectedAccount?.accountNumber?.toString().slice(-4)}
                                            </div>
                                        </div>

                                        <div
                                            className={`w-[1.75rem] flex items-center justify-center h-[1.75rem] border border-[#FFFFFF1F] rounded-[0.5rem] ${
                                                accountIndex === eligibleAccounts.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#ffffff0c] cursor-pointer'
                                            }`}
                                            onClick={() => accountIndex < eligibleAccounts.length - 1 && handleNextAccount()}
                                        >
                                            <svg width="6" height="12" viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M5.79592 6.55422L1.18321 11.7704C1.05322 11.9174 0.87693 12 0.693107 12C0.509283 12 0.332989 11.9174 0.203006 11.7704C0.0730234 11.6234 1.36959e-09 11.4241 0 11.2162C-1.36959e-09 11.0083 0.0730234 10.809 0.203006 10.662L4.32619 6.00065L0.20416 1.33801C0.139799 1.26523 0.0887446 1.17883 0.0539127 1.08373C0.0190808 0.988638 0.00115298 0.886718 0.00115298 0.783789C0.00115298 0.68086 0.0190808 0.578939 0.0539127 0.483846C0.0887446 0.388752 0.139799 0.302348 0.20416 0.229567C0.268521 0.156785 0.344928 0.0990515 0.42902 0.0596625C0.513111 0.0202734 0.60324 -7.66878e-10 0.69426 0C0.78528 7.66879e-10 0.875409 0.0202734 0.959501 0.0596625C1.04359 0.0990515 1.12 0.156785 1.18436 0.229567L5.79707 5.44578C5.8615 5.51855 5.91259 5.605 5.94741 5.70015C5.98224 5.7953 6.00011 5.89729 6 6.00027C5.99989 6.10325 5.98181 6.20519 5.94679 6.30025C5.91177 6.39531 5.8605 6.48162 5.79592 6.55422Z" fill="white" fillOpacity="0.65"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Add Nominee Section */}
                            <div className="mb-6 bg-[#FFFFFF0A] rounded-[0.625rem] p-4 border border-[#FFFFFF1F]">
                                <p className="text-white text-[0.875rem] mb-3 font-medium"
                                    style={{ fontFamily: 'Roboto, sans-serif' }}
                                >
                                    {locale.add_nominee || "Add Nominee"}
                                </p>
                                <div className="flex gap-3">
                                    <Input
                                        type="number"
                                        placeholder={locale.player_server_id || "Player Server ID"}
                                        value={playerServerId}
                                        onChange={(e) => setPlayerServerId(e.target.value)}
                                        className="flex-1 bg-[#FFFFFF0A] border-[#FFFFFF1F] text-white placeholder:text-[#FFFFFFA6]"
                                        style={{ fontFamily: 'Roboto, sans-serif' }}
                                        disabled={isLoading}
                                    />
                                    <button
                                        onClick={handleAddNominee}
                                        disabled={isLoading || !playerServerId}
                                        className="px-6 py-2 text-black rounded-[0.5rem] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontSize: '0.875rem',
                                            backgroundColor: primaryColor,
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0px 0px 20px 0px ${primaryColor}33`}
                                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                                    >
                                        {locale.add || "Add"}
                                    </button>
                                </div>
                            </div>

                            {/* Current Nominees List */}
                            <div>
                                <p className="text-white text-[0.875rem] mb-3 font-medium"
                                    style={{ fontFamily: 'Roboto, sans-serif' }}
                                >
                                    {locale.current_nominees || "Current Nominees"}
                                </p>
                                <div className="space-y-2 max-h-[15rem] overflow-y-auto">
                                    {isLoading ? (
                                        <div className="text-center py-4 text-[#FFFFFFA6]">
                                            <p style={{ fontFamily: 'Roboto, sans-serif' }}>Loading...</p>
                                        </div>
                                    ) : nominees.length === 0 ? (
                                        <div className="text-center py-4 text-[#FFFFFFA6] bg-[#FFFFFF0A] rounded-[0.625rem] border border-[#FFFFFF1F]">
                                            <p style={{ fontFamily: 'Roboto, sans-serif' }}>
                                                {locale.no_nominees || "No nominees added yet"}
                                            </p>
                                        </div>
                                    ) : (
                                        nominees.map((nominee) => (
                                            <div
                                                key={nominee.id}
                                                className="flex items-center justify-between bg-[#FFFFFF0A] rounded-[0.625rem] p-3 border border-[#FFFFFF1F]"
                                            >
                                                <div>
                                                    <p className="text-white text-[0.875rem]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>
                                                        {nominee.nominee_name}
                                                    </p>
                                                    <p className="text-[#FFFFFFA6] text-[0.75rem]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                                                        {locale.added_on || "Added on"}: {new Date(nominee.added_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveNominee(nominee.id)}
                                                    disabled={isLoading}
                                                    className="text-[#FF4444] hover:text-[#FF6666] transition-colors disabled:opacity-50"
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                        <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default NomineeModal;
