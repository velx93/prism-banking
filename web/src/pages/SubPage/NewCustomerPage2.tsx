import { useState, useRef, useMemo, useEffect } from 'react';
import {ProtectionLevel} from '../../components/main/ProtectionLevel';
import { type LocaleStrings } from '@/lib/locale';

interface NewCustomerPage2Props {
    onPinSubmit: (pin: string) => void;
    onClose: () => void;
}

const NewCustomerPage2 = ({ onPinSubmit, onClose, locale, primaryColor }: NewCustomerPage2Props & { locale: LocaleStrings, primaryColor: string }) => {
    const [pin, setPin] = useState<string[]>(Array(5).fill(''));
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Reset loading state when component mounts
    useEffect(() => {
        setIsLoading(false);
        setPin(Array(5).fill(''));
    }, []);

    const calculateProtectionLevel = (pinArray: string[]) => {
        const pinString = pinArray.join('');
        if (pinString.length < 5) {
            return { level: 1, percentage: 1 };
        }

        let score = 0;
        const digits = pinString.split('').map(Number);

        const isSequential = digits.every((digit, index) => 
            index === 0 || digit === digits[index - 1] + 1
        );
        const isReverseSequential = digits.every((digit, index) => 
            index === 0 || digit === digits[index - 1] - 1
        );
        const isAllSame = digits.every(digit => digit === digits[0]);
        const isCommonPattern = [
            '12345', '54321', '11111', '22222', '33333', '44444', 
            '55555', '66666', '77777', '88888', '99999', '00000',
            '12321', '13579', '24680'
        ].includes(pinString);

        const uniqueDigits = new Set(digits).size;
        score += uniqueDigits * 10;

        if (isAllSame) {
            score -= 30;
        } else if (isSequential || isReverseSequential) {
            score -= 20;
        } else if (isCommonPattern) {
            score -= 15;
        }

        if (uniqueDigits === 5) {
            score += 15;
        }

        if (digits[0] !== 1 && digits[0] !== 0) {
            score += 5;
        }

        let level: number;
        let percentage: number;

        if (score <= 20) {
            level = 1;
            percentage = Math.max(10, Math.min(35, score + 10));
        } else if (score <= 45) {
            level = 2;
            percentage = Math.max(40, Math.min(70, score + 10));
        } else {
            level = 3;
            percentage = Math.max(100, Math.min(100, score + 10));
        }

        return { level, percentage };
    };

    const protectionData = useMemo(() => calculateProtectionLevel(pin), [pin]);

    const handleChange = (index: number, value: string) => {
        if (value && !/^\d$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        if (value && index < 4) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleContinue = async () => {
        const pinString = pin.join('');

        if (pinString.length !== 5) {
            return;
        }

        setIsLoading(true);

        await new Promise(resolve => setTimeout(resolve, 2000));

        onPinSubmit(pinString);

        // Reset loading after 5 seconds in case of error
        setTimeout(() => {
            setIsLoading(false);
        }, 5000);
    };

    const getLevelColor = (level: number) => {
        switch (level) {
            case 1: return '#FF6B6B'; // Red for weak
            case 2: return '#FFB347'; // Orange for medium
            case 3: return '#BEEE11'; // Green for strong
            default: return '#FFFFFF';
        }
    };

    return (
        <>
            <div className="fixed inset-0 flex items-center justify-center">
                <div className="relative w-[69.75rem] h-[50.063rem]">
                    <div className="absolute inset-0" style={{backgroundImage: "url('./essential/shader.svg')", backgroundSize: 'cover', backgroundPosition: 'center'}}/>

                    {/* Loading Overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/70 rounded-[24px] flex items-center justify-center z-50">
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 rounded-full" style={{ borderColor: `${primaryColor}33` }}></div>
                                    <div
                                      className="absolute top-0 left-0 w-16 h-16 border-4 rounded-full animate-spin"
                                      style={{
                                        borderColor: primaryColor,
                                        borderTopColor: 'transparent',
                                        borderRightColor: 'transparent',
                                        borderBottomColor: 'transparent'
                                      }}
                                    ></div>
                                </div>
                                <div className="text-white text-xl font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>
                                    {locale.processing_pin}
                                </div>
                                <div className="text-white/60 text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>
                                    {locale.processing_pin_desc}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className='absolute inset-0'>
                        <div className='absolute top-10 right-10 flex flex-row-reverse gap-5'>
                            <button className="w-9 h-9 flex justify-center items-center rounded-lg bg-white hover:bg-gray-100 transition-colors duration-200 shadow-lg z-10 group"
                                onClick={onClose}
                            >
                                <svg className="group-hover:rotate-90 transition-transform duration-200" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11.8242 10.9752C11.8799 11.031 11.9241 11.0971 11.9543 11.17C11.9845 11.2428 12 11.3209 12 11.3997C12 11.4785 11.9845 11.5566 11.9543 11.6294C11.9241 11.7023 11.8799 11.7684 11.8242 11.8242C11.7684 11.8799 11.7023 11.9241 11.6294 11.9543C11.5566 11.9845 11.4785 12 11.3997 12C11.3209 12 11.2428 11.9845 11.17 11.9543C11.0971 11.9241 11.031 11.8799 10.9752 11.8242L6 6.8482L1.02478 11.8242C0.912198 11.9368 0.75951 12 0.6003 12C0.441091 12 0.288402 11.9368 0.175824 11.8242C0.0632457 11.7116 3.1384e-09 11.5589 0 11.3997C-3.1384e-09 11.2405 0.0632457 11.0878 0.175824 10.9752L5.1518 6L0.175824 1.02478C0.0632457 0.912198 0 0.75951 0 0.6003C0 0.441091 0.0632457 0.288402 0.175824 0.175824C0.288402 0.0632457 0.441091 0 0.6003 0C0.75951 0 0.912198 0.0632457 1.02478 0.175824L6 5.1518L10.9752 0.175824C11.0878 0.0632457 11.2405 -3.1384e-09 11.3997 0C11.5589 3.1384e-09 11.7116 0.0632457 11.8242 0.175824C11.9368 0.288402 12 0.441091 12 0.6003C12 0.75951 11.9368 0.912198 11.8242 1.02478L6.8482 6L11.8242 10.9752Z" fill="#121212"/>
                                </svg>
                            </button>

                            <div className='flex flex-col gap-[0.18rem] text-right'>
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
                    </div>

                    <div className='absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
                        <div className='relative top-[12.5rem] flex flex-col  items-center justify-center'>
                            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M44 1.83333V11C44 11.4862 43.8068 11.9525 43.463 12.2964C43.1192 12.6402 42.6529 12.8333 42.1667 12.8333C41.6804 12.8333 41.2141 12.6402 40.8703 12.2964C40.5265 11.9525 40.3333 11.4862 40.3333 11V3.66667H33C32.5138 3.66667 32.0475 3.47351 31.7036 3.1297C31.3598 2.78588 31.1667 2.31956 31.1667 1.83333C31.1667 1.3471 31.3598 0.880788 31.7036 0.536971C32.0475 0.193155 32.5138 0 33 0H42.1667C42.6529 0 43.1192 0.193155 43.463 0.536971C43.8068 0.880788 44 1.3471 44 1.83333ZM11 40.3333H3.66667V33C3.66667 32.5138 3.47351 32.0475 3.1297 31.7036C2.78588 31.3598 2.31956 31.1667 1.83333 31.1667C1.3471 31.1667 0.880788 31.3598 0.536971 31.7036C0.193155 32.0475 0 32.5138 0 33V42.1667C0 42.6529 0.193155 43.1192 0.536971 43.463C0.880788 43.8068 1.3471 44 1.83333 44H11C11.4862 44 11.9525 43.8068 12.2964 43.463C12.6402 43.1192 12.8333 42.6529 12.8333 42.1667C12.8333 41.6804 12.6402 41.2141 12.2964 40.8703C11.9525 40.5265 11.4862 40.3333 11 40.3333ZM42.1667 31.1667C41.6804 31.1667 41.2141 31.3598 40.8703 31.7036C40.5265 32.0475 40.3333 32.5138 40.3333 33V40.3333H33C32.5138 40.3333 32.0475 40.5265 31.7036 40.8703C31.3598 41.2141 31.1667 41.6804 31.1667 42.1667C31.1667 42.6529 31.3598 43.1192 31.7036 43.463C32.0475 43.8068 32.5138 44 33 44H42.1667C42.6529 44 43.1192 43.8068 43.463 43.463C43.8068 43.1192 44 42.6529 44 42.1667V33C44 32.5138 43.8068 32.0475 43.463 31.7036C43.1192 31.3598 42.6529 31.1667 42.1667 31.1667ZM1.83333 12.8333C2.31956 12.8333 2.78588 12.6402 3.1297 12.2964C3.47351 11.9525 3.66667 11.4862 3.66667 11V3.66667H11C11.4862 3.66667 11.9525 3.47351 12.2964 3.1297C12.6402 2.78588 12.8333 2.31956 12.8333 1.83333C12.8333 1.3471 12.6402 0.880788 12.2964 0.536971C11.9525 0.193155 11.4862 0 11 0H1.83333C1.3471 0 0.880788 0.193155 0.536971 0.536971C0.193155 0.880788 0 1.3471 0 1.83333V11C0 11.4862 0.193155 11.9525 0.536971 12.2964C0.880788 12.6402 1.3471 12.8333 1.83333 12.8333ZM9.16667 11V33C9.16667 33.4862 9.35982 33.9525 9.70364 34.2964C10.0475 34.6402 10.5138 34.8333 11 34.8333H33C33.4862 34.8333 33.9525 34.6402 34.2964 34.2964C34.6402 33.9525 34.8333 33.4862 34.8333 33V11C34.8333 10.5138 34.6402 10.0475 34.2964 9.70364C33.9525 9.35982 33.4862 9.16667 33 9.16667H11C10.5138 9.16667 10.0475 9.35982 9.70364 9.70364C9.35982 10.0475 9.16667 10.5138 9.16667 11Z" fill={primaryColor}/>
                            </svg>

                            <div className='text-[2.25rem] mt-[1.9rem] text-white text-center'
                                style={{
                                    lineHeight: '124%',
                                    fontWeight: 700,
                                    fontFamily: 'Roboto, sans-serif',
                                }}
                            >
                                {locale.setup_pin} <br/>
                                {locale.setup_pin_2}
                            </div>

                            <div className='text-[1rem] mt-[1rem] text-[#FFFFFFA6] text-center'
                                style={{
                                    lineHeight: '140%',
                                    fontWeight: 300,
                                    fontFamily: 'Roboto, sans-serif',
                                }}
                            >
                                {locale.setup_pin_desc}
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-[24rem] left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex justify-center gap-4">
                        {pin.map((digit, index) => (
                            <div key={index}
                                className={`w-[5.625rem] h-[5.625rem] flex items-center justify-center transition-all rounded-[1.25rem] border`}
                                style={{
                                    borderColor: focusedIndex === index ? primaryColor : 'transparent',
                                }}
                            >
                                <div className='w-[5rem] h-[5rem] rounded-[1rem]'
                                    style={{
                                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 36.48%, rgba(153, 153, 153, 0) 100%)',
                                        border: '1px solid #FFFFFF14'
                                    }}
                                >
                                    <input
                                        ref={(el) => { inputRefs.current[index] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onFocus={() => setFocusedIndex(index)}
                                        onBlur={() => setFocusedIndex(null)}
                                        className="w-full h-full bg-transparent text-center text-3xl font-medium text-white focus:outline-none caret-transparent"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className='absolute top-[29.6rem] left-1/2 transform -translate-x-1/2 '>
                        <div className='w-[9rem] h-[9rem] flex items-center justify-center' style={{
                            border: '1px solid #FFFFFF0A',
                            backdropFilter: 'blur(50px)',
                            borderRadius: '50%',
                            background: '#FFFFFF0A'
                        }}>
                            <div className='w-[7.25rem] h-[7.25rem] flex items-center justify-center' style={{
                                border: '1px solid #FFFFFF0A',
                                borderRadius: '50%',
                                background: '#FFFFFF0A'
                            }}>
                                <div className='absolute top-[2.3rem] text-center w-[4.125rem]' style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    fontWeight: 400,
                                    fontSize: '0.875rem',
                                    lineHeight: '140%',
                                    color: '#FFFFFFA6',
                                }}>
                                    {locale.protection_level}
                                </div>

                                <div className='absolute top-[5.2rem] text-center w-[4.125rem] transition-colors duration-300' style={{
                                    fontFamily: 'Roboto, sans-serif',
                                    fontWeight: 700,
                                    fontSize: '1.5rem',
                                    lineHeight: '124%',
                                    color: getLevelColor(protectionData.level),
                                }}>
                                    {protectionData.level}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='absolute top-[27.55rem] left-1/2 transform -translate-x-1/2 rotate-[-145deg] transition-all duration-300'>
                        <ProtectionLevel size={210} level={protectionData.level} percentage={protectionData.percentage} primaryColor={primaryColor} />
                    </div>

                    <div className='absolute top-[43.5rem] w-[32.25rem] left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex justify-between'>
                        <div className='w-[15.5rem] h-[3rem] flex items-center justify-center rounded-[0.625rem] hover:scale-[1.03] cursor-pointer transition-all duration-300' style={{
                            border: '1px solid #FFFFFF0A',
                            background: '#FFFFFF0A',
                            backdropFilter: 'blur(50px)',

                        }}
                            onClick={onClose}
                        >
                            <span className='text-[1rem]' style={{
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 400,
                                lineHeight: '140%',
                                color: '#FFFFFFA6',
                            }}>
                                {locale.cancel}
                            </span>
                        </div>

                        <button 
                            onClick={handleContinue}
                            disabled={isLoading || pin.join('').length !== 5}
                            className={`w-[15.5rem] h-[3rem] flex items-center justify-center rounded-[0.625rem] transition-all duration-300 ${
                                isLoading || pin.join('').length !== 5 
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : 'hover:scale-[1.03] cursor-pointer'
                            }`}
                            style={{
                                background: primaryColor,
                                boxShadow: `0px 0px 20px 0px ${primaryColor}33`,
                            }}
                        >
                            <span className='text-[1rem]' style={{
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 500,
                                lineHeight: '140%',
                                color: '#000000',
                            }}>
                                {isLoading ? locale.processing : locale.continue}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default NewCustomerPage2