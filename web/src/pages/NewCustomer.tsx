import { useState, useMemo, useEffect } from 'react';
import { fetchNui } from '@/lib/fetchNui';
import { type LocaleStrings } from '@/lib/locale';

const NewCustomer = ({ onContinue, onClose, basicData, locale, primaryColor }: { onContinue: (cardType: string) => void, onClose: () => void, basicData: any, locale: LocaleStrings, primaryColor: string}) => {
  const cardTypes = useMemo(() => {
    if (!basicData?.cardSettings) return [];
    if (basicData?.cardOrder && Array.isArray(basicData.cardOrder)) {
      return basicData.cardOrder.filter((cardType: string) => basicData.cardSettings[cardType]);
    }

    return Object.keys(basicData.cardSettings);
  }, [basicData]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState(cardTypes[0] || 'business');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right'>('right');
  const [leftArrowHovered, setLeftArrowHovered] = useState(false);
  const [rightArrowHovered, setRightArrowHovered] = useState(false);

  // Get the two visible cards based on current index
  const visibleCards = useMemo(() => {
    if (cardTypes.length === 0) return [];
    if (cardTypes.length === 1) return [cardTypes[0]];

    const firstCard = cardTypes[currentIndex];
    const secondCard = cardTypes[(currentIndex + 1) % cardTypes.length];
    return [firstCard, secondCard];
  }, [cardTypes, currentIndex]);

  const handlePrevious = () => {
    if (isAnimating) return;
    setAnimationDirection('left');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cardTypes.length) % cardTypes.length);
      setIsAnimating(false);
    }, 300);
  };

  const handleNext = () => {
    if (isAnimating) return;
    setAnimationDirection('right');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cardTypes.length);
      setIsAnimating(false);
    }, 300);
  };

  const handleContinue = () => {
    if (basicData?.creditScore >= basicData?.cardSettings[selectedCard].creditScoreRequired) {
        setIsProcessing(true);
        setTimeout(() => {
        onContinue?.(selectedCard);
        }, 2500);
    } else {
        fetchNui('bankingshowNotification', {
            title: 'Insufficient Credit Score',
            message: `Your credit score of ${basicData?.creditScore} is below the required ${basicData?.cardSettings[selectedCard].creditScoreRequired} for ${selectedCard} cards.`,
        });
    }
  };

  // Helper function to get card display name from locale
  const getCardDisplayName = (cardType: string) => {
    return (locale as any)[cardType] || cardType.charAt(0).toUpperCase() + cardType.slice(1);
  };

  // Helper function to get card label from locale
  const getCardLabel = (cardType: string) => {
    return (locale as any)[`${cardType}_card`] || `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} Card`;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="relative w-[69.75rem] h-[50.063rem]">
        <div className="absolute inset-0" style={{backgroundImage: "url('./essential/shader.svg')", backgroundSize: 'cover', backgroundPosition: 'center'}}/>

        <div className={`absolute inset-0 transition-opacity duration-500 ${isProcessing ? 'opacity-0' : 'opacity-100'}`}>
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

          <div className='absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
              <div className='relative top-[11.6rem] flex flex-col  items-center justify-center'>
                  <svg width="51" height="36" viewBox="0 0 51 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M47.3571 0H3.64286C2.67671 0 1.75014 0.379284 1.06697 1.05442C0.3838 1.72955 0 2.64522 0 3.6V32.4C0 33.3548 0.3838 34.2705 1.06697 34.9456C1.75014 35.6207 2.67671 36 3.64286 36H47.3571C48.3233 36 49.2499 35.6207 49.933 34.9456C50.6162 34.2705 51 33.3548 51 32.4V3.6C51 2.64522 50.6162 1.72955 49.933 1.05442C49.2499 0.379284 48.3233 0 47.3571 0ZM27.3214 28.8H23.6786C23.1955 28.8 22.7322 28.6104 22.3906 28.2728C22.049 27.9352 21.8571 27.4774 21.8571 27C21.8571 26.5226 22.049 26.0648 22.3906 25.7272C22.7322 25.3896 23.1955 25.2 23.6786 25.2H27.3214C27.8045 25.2 28.2678 25.3896 28.6094 25.7272C28.951 26.0648 29.1429 26.5226 29.1429 27C29.1429 27.4774 28.951 27.9352 28.6094 28.2728C28.2678 28.6104 27.8045 28.8 27.3214 28.8ZM41.8929 28.8H34.6071C34.1241 28.8 33.6608 28.6104 33.3192 28.2728C32.9776 27.9352 32.7857 27.4774 32.7857 27C32.7857 26.5226 32.9776 26.0648 33.3192 25.7272C33.6608 25.3896 34.1241 25.2 34.6071 25.2H41.8929C42.3759 25.2 42.8392 25.3896 43.1808 25.7272C43.5224 26.0648 43.7143 26.5226 43.7143 27C43.7143 27.4774 43.5224 27.9352 43.1808 28.2728C42.8392 28.6104 42.3759 28.8 41.8929 28.8ZM3.64286 9V3.6H47.3571V9H3.64286Z" fill={primaryColor}/>
                  </svg>

                  <div className='text-[2.25rem] mt-[1.5rem] text-white text-center'
                      style={{
                          lineHeight: '124%',
                          fontWeight: 500,
                          fontFamily: 'Roboto, sans-serif',
                      }}
                  >
                      {locale.create_your} <br/>
                      {locale.bank_account}
                  </div>

                  <div className='text-[1rem] mt-[1.2rem] text-[#FFFFFFA6] text-center'
                      style={{
                          lineHeight: '140%',
                          fontWeight: 300,
                          fontFamily: 'Roboto, sans-serif',
                      }}
                  >
                      {locale.newPlayer_desc}
                  </div>
              </div>
          </div>

          <div className='absolute top-[28.4rem] left-1/2 transform w-[46.313rem] h-[17.125rem] pt-5 pl-5 pr-5 flex flex-row justify-between -translate-x-1/2 -translate-y-1/2 overflow-hidden'
              style={{
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(153, 153, 153, 0) 100%)',
                  border: '1px solid #FFFFFF14',
                  borderRadius: '20px',
              }}
          >
              {visibleCards.map((cardType, index) => {
                const cardSettings = basicData?.cardSettings[cardType];
                if (!cardSettings) return null;

                const getAnimationClass = () => {
                  if (!isAnimating) return 'opacity-100 translate-x-0';

                  if (animationDirection === 'right') {
                    return index === 0
                      ? 'opacity-0 -translate-x-[120%]'
                      : 'opacity-0 translate-x-[20%]';
                  } else {
                    return index === 0
                      ? 'opacity-0 translate-x-[20%]'
                      : 'opacity-0 -translate-x-[120%]';
                  }
                };

                return (
                  <div
                    key={`${cardType}-${index}`}
                    className={`h-[12.5rem] w-[21.286rem] p-3 cursor-pointer transition-all duration-300 ease-in-out ${getAnimationClass()}`}
                    style={{
                        border: `1px solid ${selectedCard === cardType ? primaryColor : '#FFFFFF14'}`,
                        borderRadius: '16px',
                    }}
                    onClick={() => setSelectedCard(cardType)}
                  >
                      <div className='w-full h-full'>
                          <div className="w-full h-full"
                            style={{
                              backgroundImage: `url('./essential/${cardSettings.image}')`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              borderRadius: '10px'
                            }}
                          />
                      </div>

                      <div className='relative flex flex-row justify-between bottom-12 px-5'>
                          <div className='flex flex-col gap-1'>
                              <div className='text-[0.65rem] text-[#FFFFFFA6]'
                                  style={{
                                      lineHeight: '124%',
                                      fontWeight: 300,
                                      fontFamily: 'Roboto, sans-serif',
                                  }}
                              >
                                  {locale.card_type}
                              </div>
                              <div className='text-[0.8rem] text-white'
                                  style={{
                                      lineHeight: '124%',
                                      fontWeight: 500,
                                      fontFamily: 'Roboto, sans-serif',
                                  }}
                              >
                                  {getCardDisplayName(cardType)}
                              </div>
                          </div>

                          <div className='flex flex-col gap-1'>
                              <div className='text-[0.65rem] text-[#FFFFFFA6]'
                                  style={{
                                      lineHeight: '124%',
                                      fontWeight: 300,
                                      fontFamily: 'Roboto, sans-serif',
                                  }}
                              >
                                  {locale.interest}
                              </div>
                              <div className='text-[0.8rem] text-white text-right'
                                  style={{
                                      lineHeight: '124%',
                                      fontWeight: 500,
                                      fontFamily: 'Roboto, sans-serif',
                                  }}
                              >
                                  {cardSettings.InterestRate} %
                              </div>
                          </div>
                      </div>
                  </div>
                );
              })}
          </div>

          {/* Card labels */}

          <div className='absolute flex flex-row justify-between gap-[18rem] top-[35.3rem] left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
              {visibleCards.map((cardType, index) => {
                const getLabelAnimationClass = () => {
                  if (!isAnimating) return 'opacity-100 translate-y-0';

                  if (animationDirection === 'right') {
                    return index === 0
                      ? 'opacity-0 -translate-y-4'
                      : 'opacity-0 translate-y-4';
                  } else {
                    return index === 0
                      ? 'opacity-0 translate-y-4'
                      : 'opacity-0 -translate-y-4';
                  }
                };

                return (
                  <div
                    key={`label-${cardType}-${index}`}
                    className={`text-[0.875rem] text-[#FFFFFFA6] transition-all duration-300 ease-in-out ${getLabelAnimationClass()}`}
                    style={{
                        lineHeight: '124%',
                        fontWeight: 400,
                        fontFamily: 'Roboto, sans-serif',
                    }}
                  >
                    {getCardLabel(cardType)}
                  </div>
                );
              })}
          </div>

          {/* Left Arrow - Previous */}
          {cardTypes.length > 2 && (
            <div
              className={`absolute top-[28.4rem] left-[9rem] transform -translate-x-1/2 -translate-y-1/2 w-[3rem] h-[3rem] rounded-[0.625rem] cursor-pointer flex items-center justify-center transition-colors duration-200`}
              style={{
                border: `1px solid ${leftArrowHovered ? primaryColor : '#FFFFFF1F'}`,
              }}
              onClick={handlePrevious}
              onMouseEnter={() => setLeftArrowHovered(true)}
              onMouseLeave={() => setLeftArrowHovered(false)}
            >
                <svg width="8" height="18" viewBox="0 0 8 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0.272109 9.83133L6.42239 17.6556C6.5957 17.8761 6.83076 18 7.07586 18C7.32096 18 7.55601 17.8761 7.72933 17.6556C7.90264 17.4352 8 17.1361 8 16.8243C8 16.5125 7.90264 16.2135 7.72933 15.993L2.23174 9.00098L7.72779 2.00702C7.8136 1.89784 7.88167 1.76824 7.92812 1.6256C7.97456 1.48296 7.99846 1.33008 7.99846 1.17568C7.99846 1.02129 7.97456 0.868409 7.92812 0.725769C7.88167 0.583128 7.8136 0.453522 7.72779 0.34435C7.64197 0.235178 7.5401 0.148577 7.42797 0.0894937C7.31585 0.0304101 7.19568 -1.15032e-09 7.07432 0C6.95296 1.15032e-09 6.83279 0.0304101 6.72067 0.0894937C6.60854 0.148577 6.50667 0.235178 6.42085 0.34435L0.270572 8.16867C0.184668 8.27783 0.116546 8.40749 0.0701151 8.55022C0.0236845 8.69295 -0.000142097 8.84594 4.76837e-07 9.00041C0.000143528 9.15487 0.0242534 9.30779 0.0709481 9.45038C0.117643 9.59297 0.186003 9.72243 0.272109 9.83133Z" fill="white" fillOpacity="0.65" style={{ fill: leftArrowHovered ? primaryColor : 'white', fillOpacity: leftArrowHovered ? 1 : 0.65, transition: 'all 200ms' }}/>
                </svg>
            </div>
          )}

          {/* Right Arrow - Next */}
          {cardTypes.length > 2 && (
            <div
              className={`absolute top-[28.4rem] right-[6rem] transform -translate-x-1/2 -translate-y-1/2 w-[3rem] h-[3rem] rounded-[0.625rem] cursor-pointer flex items-center justify-center transition-colors duration-200`}
              style={{
                border: `1px solid ${rightArrowHovered ? primaryColor : '#FFFFFF1F'}`,
              }}
              onClick={handleNext}
              onMouseEnter={() => setRightArrowHovered(true)}
              onMouseLeave={() => setRightArrowHovered(false)}
            >
                <svg width="8" height="18" viewBox="0 0 8 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.72789 9.83133L1.57761 17.6556C1.4043 17.8761 1.16924 18 0.924142 18C0.679044 18 0.443985 17.8761 0.270675 17.6556C0.0973645 17.4352 1.82612e-09 17.1361 0 16.8243C-1.82612e-09 16.5125 0.0973645 16.2135 0.270675 15.993L5.76826 9.00098L0.272213 2.00702C0.186398 1.89784 0.118326 1.76824 0.0718836 1.6256C0.0254411 1.48296 0.00153731 1.33008 0.00153731 1.17568C0.00153731 1.02129 0.0254411 0.868409 0.0718836 0.725769C0.118326 0.583128 0.186398 0.453522 0.272213 0.34435C0.358027 0.235178 0.459904 0.148577 0.572026 0.0894937C0.684148 0.0304101 0.80432 -1.15032e-09 0.92568 0C1.04704 1.15032e-09 1.16721 0.0304101 1.27933 0.0894937C1.39146 0.148577 1.49333 0.235178 1.57915 0.34435L7.72943 8.16867C7.81533 8.27783 7.88345 8.40749 7.92988 8.55022C7.97632 8.69295 8.00014 8.84594 8 9.00041C7.99986 9.15487 7.97575 9.30779 7.92905 9.45038C7.88236 9.59297 7.814 9.72243 7.72789 9.83133Z" fill="white" fillOpacity="0.65" style={{ fill: rightArrowHovered ? primaryColor : 'white', fillOpacity: rightArrowHovered ? 1 : 0.65, transition: 'all 200ms' }}/>
                </svg>
            </div>
          )}

            <div className='absolute bottom-[3.6rem] left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-row gap-5'
                
            >
                <div className='w-[15.5rem] h-[3rem] rounded-[0.625rem] bg-[#FFFFFF0A] hover:scale-[1.02] transition-all duration-200 will-change-transform flex items-center cursor-pointer justify-center translate-z-0'
                    style={{
                        border: '1px solid #FFFFFF1F',
                        color: '#FFFFFFA6',
                        lineHeight: '124%',
                        fontWeight: 300,
                        fontFamily: 'Roboto, sans-serif',
                        fontSize: '1rem',
                        backfaceVisibility: 'hidden',
                        WebkitFontSmoothing: 'subpixel-antialiased'
                    }}
                    onClick={onClose}
                >
                    {locale.cancel}
                </div>

                <div className='w-[15.5rem] h-[3rem] rounded-[0.625rem] hover:scale-[1.02] transition-all duration-200 will-change-transform flex items-center cursor-pointer justify-center translate-z-0'
                    onClick={handleContinue}
                    style={{
                        border: '1px solid #FFFFFF1F',
                        boxShadow: `0px 0px 20px 0px ${primaryColor}33`,
                        color: '#000000',
                        lineHeight: '124%',
                        fontWeight: 'bold',
                        fontFamily: 'Roboto, sans-serif',
                        fontSize: '1rem',
                        backfaceVisibility: 'hidden',
                        WebkitFontSmoothing: 'subpixel-antialiased',
                        background: primaryColor
                    }}
                >
                    {locale.continue}
                </div>
            </div>
        </div>

        {/* Processing Animation - Fades in when processing */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center animate-[fadeIn_0.5s_ease-in-out]">
            <div className="flex flex-col items-center gap-8">
              {/* Animated Circles */}
              <div className="relative w-32 h-32">
                <div
                  className="absolute inset-0 border-[6px] rounded-full"
                  style={{ borderColor: `${primaryColor}33` }}
                ></div>
                <div
                  className="absolute inset-0 border-[6px] rounded-full animate-spin"
                  style={{
                    borderColor: primaryColor,
                    borderTopColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderBottomColor: 'transparent'
                  }}
                ></div>
                <div
                  className="absolute inset-4 border-[4px] rounded-full animate-[spin_1.5s_linear_infinite_reverse]"
                  style={{ borderColor: `${primaryColor}66` }}
                ></div>
              </div>
              
              {/* Processing Text */}
              <div className="flex flex-col items-center gap-3">
                <div className="text-white text-2xl font-medium tracking-wide" 
                  style={{ 
                    fontFamily: 'Roboto, sans-serif',
                    fontWeight: 500 
                  }}
                >
                  {locale.processing_req}
                </div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ backgroundColor: primaryColor }}></div>
                  <div className="w-2 h-2 rounded-full animate-[bounce_1s_ease-in-out_0.2s_infinite]" style={{ backgroundColor: primaryColor }}></div>
                  <div className="w-2 h-2 rounded-full animate-[bounce_1s_ease-in-out_0.4s_infinite]" style={{ backgroundColor: primaryColor }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewCustomer;