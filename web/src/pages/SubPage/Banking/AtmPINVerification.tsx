import { useState, useRef, useEffect } from 'react';
import { fetchNui } from '@/lib/fetchNui';

interface AtmPinVerificationProps {
    accountNumbers?: string[];
    onClose?: () => void;
    primaryColor?: string;
}

const AtmPinVerification = ({ accountNumbers = [], onClose, primaryColor }: AtmPinVerificationProps) => {
    const [pin, setPin] = useState<string[]>(Array(5).fill(''));
    const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string>('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const firstEmptyIndex = pin.findIndex(digit => digit === '');
        if (firstEmptyIndex !== -1 && inputRefs.current[firstEmptyIndex]) {
            inputRefs.current[firstEmptyIndex]?.focus();
        }
    }, []);

    const handleNumberClick = (num: string) => {
        const firstEmptyIndex = pin.findIndex(digit => digit === '');
        
        if (firstEmptyIndex !== -1) {
            const newPin = [...pin];
            newPin[firstEmptyIndex] = num;
            setPin(newPin);
            
            if (firstEmptyIndex < 4 && inputRefs.current[firstEmptyIndex + 1]) {
                inputRefs.current[firstEmptyIndex + 1]?.focus();
                setFocusedIndex(firstEmptyIndex + 1);
            }
        }
    };

    const handleClear = () => {
        let lastFilledIndex = -1;
        for (let i = pin.length - 1; i >= 0; i--) {
            if (pin[i] !== '') {
                lastFilledIndex = i;
                break;
            }
        }
        
        if (lastFilledIndex !== -1) {
            const newPin = [...pin];
            newPin[lastFilledIndex] = '';
            setPin(newPin);

            if (inputRefs.current[lastFilledIndex]) {
                inputRefs.current[lastFilledIndex]?.focus();
                setFocusedIndex(lastFilledIndex);
            }
        }
    };

    const handleSubmit = async () => {
        const isComplete = pin.every(digit => digit !== '');
        if (isComplete && !isVerifying) {
            setIsVerifying(true);
            setError('');

            try {
                fetchNui('verifyAtmPin', {
                    pin: pin.join(''),
                    accountNumbers: accountNumbers
                }).then((result: any) => {
                    if (result.success) {
                        setPin(Array(5).fill(''));
                    } else {
                        setError(result.message || 'Incorrect PIN');
                        setPin(Array(5).fill(''));
                        
                        if (inputRefs.current[0]) {
                            inputRefs.current[0]?.focus();
                        }
                    }
                })

                
            } catch (error) {
                console.error('PIN verification error:', error);
                setError('Failed to verify PIN');
                setPin(Array(5).fill(''));
            } finally {
                setIsVerifying(false);
            }
        }
    };

    const handleInputChange = (index: number, value: string) => {
        if (value.length <= 1 && /^\d*$/.test(value)) {
            const newPin = [...pin];
            newPin[index] = value;
            setPin(newPin);
            
            if (value && index < 4 && inputRefs.current[index + 1]) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            if (pin[index]) {
                const newPin = [...pin];
                newPin[index] = '';
                setPin(newPin);
            } else if (index > 0) {
                const newPin = [...pin];
                newPin[index - 1] = '';
                setPin(newPin);
                inputRefs.current[index - 1]?.focus();
            }
        }
    };

    return (
        <>
            <div className="relative w-full h-full flex items-center justify-center">
                <div className="relative w-[22.5rem] h-[32rem] rounded-[1.7rem] border-4 border-[#12121285]">
                    <div className="w-full h-full rounded-[1.5rem] border border-[#1D1C20] flex flex-col items-center"
                        style={{
                            background: 'radial-gradient(50% 50% at 50% 50%, #0C0A10 0%, #0A090E 100%), radial-gradient(64.25% 73.85% at 73.7% 0%, rgba(190, 238, 17, 0.03) 0%, rgba(190, 238, 17, 0) 100%)'
                        }}
                    >
                        <div className='absolute top-[1.5rem] right-[1.5rem] cursor-pointer hover:rotate-90 transition-all duration-300'
                            onClick={onClose}
                        >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.8242 10.9752C11.8799 11.031 11.9241 11.0971 11.9543 11.17C11.9845 11.2428 12 11.3209 12 11.3997C12 11.4785 11.9845 11.5566 11.9543 11.6294C11.9241 11.7023 11.8799 11.7684 11.8242 11.8242C11.7684 11.8799 11.7023 11.9241 11.6294 11.9543C11.5566 11.9845 11.4785 12 11.3997 12C11.3209 12 11.2428 11.9845 11.17 11.9543C11.0971 11.9241 11.031 11.8799 10.9752 11.8242L6 6.8482L1.02478 11.8242C0.912198 11.9368 0.75951 12 0.6003 12C0.441091 12 0.288402 11.9368 0.175824 11.8242C0.0632457 11.7116 3.1384e-09 11.5589 0 11.3997C-3.1384e-09 11.2405 0.0632457 11.0878 0.175824 10.9752L5.1518 6L0.175824 1.02478C0.0632457 0.912198 0 0.75951 0 0.6003C0 0.441091 0.0632457 0.288402 0.175824 0.175824C0.288402 0.0632457 0.441091 0 0.6003 0C0.75951 0 0.912198 0.0632457 1.02478 0.175824L6 5.1518L10.9752 0.175824C11.0878 0.0632457 11.2405 -3.1384e-09 11.3997 0C11.5589 3.1384e-09 11.7116 0.0632457 11.8242 0.175824C11.9368 0.288402 12 0.441091 12 0.6003C12 0.75951 11.9368 0.912198 11.8242 1.02478L6.8482 6L11.8242 10.9752Z" fill="white"/>
                            </svg>
                        </div>

                        <div className="flex flex-col">
                            <img 
                                src="./essential/logo.svg" 
                                alt="Logo"
                                className="w-[2.75rem] h-[2.75rem] mt-[2rem]"
                            />
                        </div>
                        <div className="w-full h-[0.063rem] bg-[#FFFFFF29] mt-[2rem]"></div>

                        <div className='flex items-center gap-[0.2rem] mt-[2rem]'>
                            {pin.map((digit, index) => (
                                <div key={index}
                                    className={`w-[3.5rem] h-[3.5rem] flex items-center justify-center transition-all rounded-[0.875rem] relative border
                                        ${focusedIndex === index ? 'border' : 'border-transparent'}
                                    `}
                                    style={focusedIndex === index && primaryColor ? { borderColor: primaryColor } : {}}
                                >
                                    <div className='w-[3rem] h-[3rem] rounded-[0.625rem] flex items-center justify-center'
                                        style={{
                                            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 36.48%, rgba(153, 153, 153, 0) 100%)',
                                            border: '1px solid #FFFFFF14'
                                        }}
                                    >
                                        {digit ? (
                                            <div className="w-3 h-3 bg-white rounded-full"></div>
                                        ) : null}
                                        <input
                                            ref={(el) => { inputRefs.current[index] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleInputChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            onFocus={() => setFocusedIndex(index)}
                                            onBlur={() => setFocusedIndex(null)}
                                            className="w-full h-full bg-transparent text-center text-3xl font-medium text-transparent focus:outline-none caret-transparent absolute inset-0"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col items-center mt-[1.5rem] gap-2">
                            <div className="text-[0.875rem] text-[#FFFFFFA6]"
                                style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    fontWeight: 300,
                                    lineHeight: '140%',
                                    letterSpacing: '0.85%',
                                }}
                            >
                                Enter your accounts PIN code
                            </div>
                            <div className="h-[1.05rem] flex items-center justify-center">
                                {error && (
                                    <div className="text-[0.75rem] text-red-500"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 400,
                                            lineHeight: '140%',
                                        }}
                                    >
                                        {error}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid items-center grid-cols-4 gap-4">
                            {['1', '2', '3', '4', '5', '6', '7', '8'].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleNumberClick(num)}
                                    className={`w-[3.531rem] active:scale-95 transition-all text-[1.125rem] text-white h-[3.531rem] rounded-[0.625rem] border border-[#FFFFFF14]`}
                                    style={{
                                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 36.48%, rgba(153, 153, 153, 0) 100%)',
                                        backdropFilter: 'blur(20px)',
                                        fontFamily: 'Roboto, sans-serif',
                                        fontWeight: 600,
                                        lineHeight: '140%',
                                        letterSpacing: '0.85%',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (primaryColor) {
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = primaryColor;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#FFFFFF14';
                                    }}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <button
                                onClick={() => handleNumberClick('9')}
                                className="w-[3.531rem] active:scale-95 transition-all text-[1.125rem] text-white h-[3.531rem] rounded-[0.625rem] border border-[#FFFFFF14]"
                                style={{
                                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 36.48%, rgba(153, 153, 153, 0) 100%)',
                                    backdropFilter: 'blur(20px)',
                                    fontFamily: 'Roboto, sans-serif',
                                    fontWeight: 600,
                                    lineHeight: '140%',
                                    letterSpacing: '0.85%',
                                }}
                                onMouseEnter={(e) => {
                                    if (primaryColor) {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = primaryColor;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#FFFFFF14';
                                }}
                            >
                                9
                            </button>

                            <button
                                onClick={() => handleNumberClick('0')}
                                className="w-[3.531rem] active:scale-95 transition-all text-[1.125rem] text-white h-[3.531rem] rounded-[0.625rem] border border-[#FFFFFF14]"
                                style={{
                                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 36.48%, rgba(153, 153, 153, 0) 100%)',
                                    backdropFilter: 'blur(20px)',
                                    fontFamily: 'Roboto, sans-serif',
                                    fontWeight: 600,
                                    lineHeight: '140%',
                                    letterSpacing: '0.85%',
                                }}
                                onMouseEnter={(e) => {
                                    if (primaryColor) {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = primaryColor;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#FFFFFF14';
                                }}
                            >
                                0
                            </button>

                            <button
                                onClick={handleClear}
                                className="w-[3.531rem] active:scale-95 transition-all text-[1.125rem] text-white h-[3.531rem] rounded-[0.625rem] border border-[#FFFFFF14]"
                                style={{
                                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 36.48%, rgba(153, 153, 153, 0) 100%)',
                                    backdropFilter: 'blur(20px)',
                                    fontFamily: 'Roboto, sans-serif',
                                    fontWeight: 600,
                                    lineHeight: '140%',
                                    letterSpacing: '0.85%',
                                }}
                                onMouseEnter={(e) => {
                                    if (primaryColor) {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = primaryColor;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#FFFFFF14';
                                }}
                            >
                                C
                            </button>

                            <button
                                onClick={handleSubmit}
                                disabled={isVerifying}
                                className={`w-[3.531rem] items-center justify-center flex text-[1.125rem] text-black h-[3.531rem] rounded-[0.625rem] transition-all ${
                                    isVerifying ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
                                }`}
                                style={{
                                    background: primaryColor || '#BEEE11',
                                    fontFamily: 'Roboto, sans-serif',
                                    fontWeight: 600,
                                    lineHeight: '140%',
                                    letterSpacing: '0.85%',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isVerifying && primaryColor) {
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0px 0px 20px 0px ${primaryColor}33`;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isVerifying) {
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                                    }
                                }}
                            >
                                {isVerifying ? (
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 0C7.21997 0 5.47991 0.527841 3.99987 1.51677C2.51983 2.50571 1.36628 3.91131 0.685088 5.55585C0.00389956 7.20038 -0.17433 9.00998 0.172936 10.7558C0.520203 12.5016 1.37737 14.1053 2.63604 15.364C3.89471 16.6226 5.49836 17.4798 7.24419 17.8271C8.99002 18.1743 10.7996 17.9961 12.4442 17.3149C14.0887 16.6337 15.4943 15.4802 16.4832 14.0001C17.4722 12.5201 18 10.78 18 9C17.9975 6.61382 17.0485 4.3261 15.3612 2.63882C13.6739 0.95154 11.3862 0.00251984 9 0ZM12.9513 7.41288L8.1052 12.259C8.0409 12.3234 7.96454 12.3745 7.8805 12.4093C7.79645 12.4441 7.70637 12.4621 7.61539 12.4621C7.52441 12.4621 7.43432 12.4441 7.35027 12.4093C7.26623 12.3745 7.18988 12.3234 7.12558 12.259L5.04866 10.1821C4.91875 10.0522 4.84577 9.87602 4.84577 9.69231C4.84577 9.50859 4.91875 9.3324 5.04866 9.2025C5.17856 9.07259 5.35475 8.99961 5.53846 8.99961C5.72218 8.99961 5.89837 9.07259 6.02827 9.2025L7.61539 10.7905L11.9717 6.43327C12.0361 6.36895 12.1124 6.31792 12.1965 6.28311C12.2805 6.2483 12.3706 6.23038 12.4615 6.23038C12.5525 6.23038 12.6426 6.2483 12.7266 6.28311C12.8107 6.31792 12.887 6.36895 12.9513 6.43327C13.0157 6.49759 13.0667 6.57395 13.1015 6.65799C13.1363 6.74203 13.1542 6.83211 13.1542 6.92308C13.1542 7.01404 13.1363 7.10412 13.1015 7.18816C13.0667 7.2722 13.0157 7.34856 12.9513 7.41288Z" fill="#121212"/>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default AtmPinVerification