import { useState, useCallback, useMemo } from 'react';
import HomePage from './SubPage/Banking/HomePage';
import SpendingPage from './SubPage/Banking/SpendingPage';
import AccountPage from './SubPage/Banking/AccountPage';
import StatisticsPage from './SubPage/Banking/StatisticsPage';
import SettingsPage from './SubPage/Banking/SettingsPage';
import NomineeModal from '@/components/NomineeModal';
import { type LocaleStrings } from '@/lib/locale';

const BankingMain = ({ basicData, onClose, onCreateAccountClick, locale, isAtmMode, primaryColor, logo }: { basicData: any, onClose: () => void, onCreateAccountClick: () => void, locale: LocaleStrings, isAtmMode: boolean, primaryColor: string, logo: { width: string, height: string } }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'account' | 'statistics' | 'settings'>('home');
  const [showMenu, setShowMenu] = useState(false);
  const [showNomineeModal, setShowNomineeModal] = useState(false);

  const handleTabChange = useCallback((tab: 'home' | 'history' | 'account' | 'statistics' | 'settings') => {
    setActiveTab(tab);
  }, []);

  const handleMenuClick = () => {
    setShowMenu(!showMenu);
  };

  const handleMenuItemClick = (action: string) => {
    if (action === 'logout') {
      setShowMenu(false)
      onClose();
      return;
    }
    if (action === 'add-account') {
      setShowMenu(false)
      onCreateAccountClick();
      return;
    }
    if (action === 'manage-nominee') {
      setShowMenu(false)
      setShowNomineeModal(true);
      return;
    }
  };

  const handlePageState = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage onClose={onClose} basicData={basicData} onCreateAccountClick={onCreateAccountClick} locale={locale} primaryColor={primaryColor} />;
      case 'history':
        return <SpendingPage basicData={basicData} onClose={onClose} onCreateAccountClick={onCreateAccountClick} locale={locale} primaryColor={primaryColor} />;
      case 'account':
        return <AccountPage basicData={basicData} onClose={onClose} onCreateAccountClick={onCreateAccountClick} locale={locale} isAtmMode={isAtmMode} primaryColor={primaryColor} />;
      case 'statistics':
        return <StatisticsPage basicData={basicData} onClose={onClose} onCreateAccountClick={onCreateAccountClick} locale={locale} primaryColor={primaryColor} />;
      case 'settings':
        return <SettingsPage basicData={basicData} onClose={onClose} onCreateAccountClick={onCreateAccountClick} locale={locale} primaryColor={primaryColor} />;
      default:
        return null;
    }
  }

  return (
    <>
        <div className="fixed inset-0 flex items-center justify-center">
            <div className="relative w-[69.75rem] h-[50.063rem] rounded-3xl" style={{
                background: `radial-gradient(50% 50% at 50% 50%, #0C0A10 0%, #0A090E 100%), radial-gradient(64.25% 73.85% at 73.7% 0%, ${primaryColor}08 0%, ${primaryColor}00 100%)`,
                border: '4px solid #12121285'
            }}>

              <div className="absolute top-0 left-[7.438rem] w-[61.8rem] h-full rounded-r-[1.5rem]">
                {handlePageState()}
              </div>

              <div className="absolute left-0 top-0 h-full "
                  style={{
                    background: 'linear-gradient(270deg, rgba(255, 255, 255, 0.04) 0%, rgba(153, 153, 153, 0.04) 100%)',
                    borderTopLeftRadius: '24px',
                    borderBottomLeftRadius: '24px',
                    width: '7.438rem',
                  }}
              >

                <div className="flex flex-col items-center">
                  <img
                    src="./essential/logo.svg"
                    alt="Logo"
                    className="mt-[2.3rem] -ml-1"
                    style={{ width: logo.width, height: logo.height }}
                  />
                  <div className="w-[2.5rem] h-[0.063rem] bg-[#FFFFFF29] mt-5"></div>
                </div>

                <div className="absolute w-full top-[7.6rem] transition-all duration-200">
                  <div className="flex flex-col items-center gap-5">
                    <div>
                      <div className={`w-12 h-12 rounded-[0.625rem] flex items-center justify-center cursor-pointer transition-all duration-300`}
                        onClick={() => handleTabChange('home')}
                        style={{ backgroundColor: activeTab === 'home' ? `${primaryColor}14` : 'transparent' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 7.67969V15.36C16 15.5297 15.9298 15.6925 15.8047 15.8125C15.6797 15.9326 15.5101 16 15.3333 16H10.6667C10.4899 16 10.3203 15.9326 10.1953 15.8125C10.0702 15.6925 10 15.5297 10 15.36V11.1998C10 11.1149 9.96488 11.0336 9.90237 10.9735C9.83986 10.9135 9.75507 10.8798 9.66667 10.8798H6.33333C6.24493 10.8798 6.16014 10.9135 6.09763 10.9735C6.03512 11.0336 6 11.1149 6 11.1998V15.36C6 15.5297 5.92976 15.6925 5.80474 15.8125C5.67971 15.9326 5.51014 16 5.33333 16H0.666667C0.489856 16 0.320287 15.9326 0.195262 15.8125C0.070238 15.6925 0 15.5297 0 15.36V7.67969C0.000163908 7.34026 0.140747 7.01479 0.390833 6.77486L7.0575 0.374621C7.30752 0.134747 7.64653 0 8 0C8.35347 0 8.69248 0.134747 8.9425 0.374621L15.6092 6.77486C15.8593 7.01479 15.9998 7.34026 16 7.67969Z" fill={activeTab === 'home' ? primaryColor : '#FFFFFFA6'}/>
                        </svg>

                      </div>
                      {activeTab === 'home' && <div className="absolute w-[0.125rem] h-12 -mt-12 ml-20" style={{ backgroundColor: primaryColor }}></div>}
                    </div>
                    <div>
                      <div className={`w-12 h-12 rounded-[0.625rem] flex items-center justify-center cursor-pointer transition-all duration-300`}
                        onClick={() => handleTabChange('history')}
                        style={{ backgroundColor: activeTab === 'history' ? `${primaryColor}14` : 'transparent' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 15.3043C18 15.4888 17.9271 15.6658 17.7972 15.7962C17.6674 15.9267 17.4913 16 17.3077 16H0.692308C0.508696 16 0.332605 15.9267 0.202772 15.7962C0.0729393 15.6658 0 15.4888 0 15.3043C0 15.1198 0.0729393 14.9429 0.202772 14.8124C0.332605 14.682 0.508696 14.6087 0.692308 14.6087H1.38462V9.04348C1.38462 8.85898 1.45755 8.68204 1.58739 8.55158C1.71722 8.42112 1.89331 8.34783 2.07692 8.34783H4.15385C4.33746 8.34783 4.51355 8.42112 4.64338 8.55158C4.77321 8.68204 4.84615 8.85898 4.84615 9.04348V14.6087H6.23077V4.86957C6.23077 4.68507 6.30371 4.50813 6.43354 4.37767C6.56337 4.2472 6.73947 4.17391 6.92308 4.17391H9.69231C9.87592 4.17391 10.052 4.2472 10.1818 4.37767C10.3117 4.50813 10.3846 4.68507 10.3846 4.86957V14.6087H11.7692V0.695652C11.7692 0.511154 11.8422 0.334212 11.972 0.203752C12.1018 0.0732919 12.2779 0 12.4615 0H15.9231C16.1067 0 16.2828 0.0732919 16.4126 0.203752C16.5424 0.334212 16.6154 0.511154 16.6154 0.695652V14.6087H17.3077C17.4913 14.6087 17.6674 14.682 17.7972 14.8124C17.9271 14.9429 18 15.1198 18 15.3043Z" fill={activeTab === 'history' ? primaryColor : '#FFFFFFA6'}/>
                        </svg>

                      </div>
                      {activeTab === 'history' && <div className="absolute w-[0.125rem] h-12 -mt-12 ml-20" style={{ backgroundColor: primaryColor }}></div>}
                    </div>
                    <div>
                      <div className={`w-12 h-12 rounded-[0.625rem] flex items-center justify-center cursor-pointer transition-all duration-300`}
                        onClick={() => handleTabChange('account')}
                        style={{ backgroundColor: activeTab === 'account' ? `${primaryColor}14` : 'transparent' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16.56 2.90909H2.16C1.96904 2.90909 1.78591 2.83247 1.65088 2.69608C1.51586 2.55969 1.44 2.3747 1.44 2.18182C1.44 1.98893 1.51586 1.80395 1.65088 1.66756C1.78591 1.53117 1.96904 1.45455 2.16 1.45455H14.4C14.591 1.45455 14.7741 1.37792 14.9091 1.24153C15.0441 1.10514 15.12 0.920157 15.12 0.727273C15.12 0.534388 15.0441 0.349404 14.9091 0.213013C14.7741 0.0766233 14.591 0 14.4 0H2.16C1.58713 0 1.03773 0.22987 0.632649 0.63904C0.227571 1.04821 0 1.60316 0 2.18182V13.8182C0 14.3968 0.227571 14.9518 0.632649 15.361C1.03773 15.7701 1.58713 16 2.16 16H16.56C16.9419 16 17.3082 15.8468 17.5782 15.574C17.8483 15.3012 18 14.9312 18 14.5455V4.36364C18 3.97787 17.8483 3.6079 17.5782 3.33512C17.3082 3.06234 16.9419 2.90909 16.56 2.90909ZM13.32 10.1818C13.1064 10.1818 12.8976 10.1178 12.72 9.99797C12.5424 9.8781 12.404 9.70772 12.3222 9.50838C12.2405 9.30904 12.2191 9.0897 12.2608 8.87808C12.3024 8.66647 12.4053 8.47209 12.5563 8.31952C12.7074 8.16695 12.8998 8.06306 13.1093 8.02096C13.3188 7.97887 13.536 8.00047 13.7333 8.08304C13.9306 8.16561 14.0993 8.30543 14.218 8.48483C14.3367 8.66423 14.4 8.87515 14.4 9.09091C14.4 9.38024 14.2862 9.65771 14.0837 9.8623C13.8811 10.0669 13.6064 10.1818 13.32 10.1818Z" fill={activeTab === 'account' ? primaryColor : '#FFFFFFA6'}/>
                        </svg>

                      </div>
                      {activeTab === 'account' && <div className="absolute w-[0.125rem] h-12 -mt-12 ml-20" style={{ backgroundColor: primaryColor }}></div>}

                      <div className="w-[2.5rem] h-[0.063rem] bg-[#FFFFFF29] mt-5 ml-1"></div>
                    </div>
                    <div>
                      <div className={`w-12 h-12 rounded-[0.625rem] flex items-center justify-center cursor-pointer transition-all duration-300`}
                        onClick={() => handleTabChange('statistics')}
                        style={{ backgroundColor: activeTab === 'statistics' ? `${primaryColor}14` : 'transparent' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13.8139 4.48769L9.35932 0.18C9.30018 0.122871 9.22997 0.0775705 9.15272 0.0466855C9.07547 0.0158005 8.99268 -6.33759e-05 8.90909 1.90276e-07H1.27273C0.935179 1.90276e-07 0.611456 0.12967 0.372773 0.360484C0.13409 0.591298 0 0.904349 0 1.23077V14.7692C0 15.0957 0.13409 15.4087 0.372773 15.6395C0.611456 15.8703 0.935179 16 1.27273 16H12.7273C13.0648 16 13.3885 15.8703 13.6272 15.6395C13.8659 15.4087 14 15.0957 14 14.7692V4.92308C14.0001 4.84224 13.9837 4.76218 13.9517 4.68748C13.9198 4.61277 13.8729 4.54488 13.8139 4.48769ZM9.35932 10.8969L7.45023 12.7431C7.39113 12.8003 7.32094 12.8457 7.24369 12.8767C7.16644 12.9076 7.08363 12.9236 7 12.9236C6.91637 12.9236 6.83356 12.9076 6.75631 12.8767C6.67906 12.8457 6.60887 12.8003 6.54977 12.7431L4.64068 10.8969C4.52127 10.7815 4.45419 10.6248 4.45419 10.4615C4.45419 10.2982 4.52127 10.1416 4.64068 10.0262C4.76009 9.91068 4.92204 9.84581 5.09091 9.84581C5.25978 9.84581 5.42173 9.91068 5.54114 10.0262L6.36364 10.8223V7.38462C6.36364 7.22141 6.43068 7.06488 6.55002 6.94947C6.66936 6.83407 6.83123 6.76923 7 6.76923C7.16877 6.76923 7.33064 6.83407 7.44998 6.94947C7.56932 7.06488 7.63636 7.22141 7.63636 7.38462V10.8223L8.45886 10.0262C8.57827 9.91068 8.74022 9.84581 8.90909 9.84581C9.07796 9.84581 9.23991 9.91068 9.35932 10.0262C9.47873 10.1416 9.54581 10.2982 9.54581 10.4615C9.54581 10.6248 9.47873 10.7815 9.35932 10.8969ZM8.90909 4.92308V1.53846L12.4091 4.92308H8.90909Z" fill={activeTab === 'statistics' ? primaryColor : '#FFFFFFA6'}/>
                        </svg>

                      </div>
                      {activeTab === 'statistics' && <div className="absolute w-[0.125rem] h-12 -mt-12 ml-20" style={{ backgroundColor: primaryColor }}></div>}
                    </div>
                    <div>
                      <div className={`w-12 h-12 rounded-[0.625rem] flex items-center justify-center cursor-pointer transition-all duration-300`}
                        onClick={() => handleTabChange('settings')}
                        style={{ backgroundColor: activeTab === 'settings' ? `${primaryColor}14` : 'transparent' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14.7256 8.16397C14.7287 8.05389 14.7287 7.94382 14.7256 7.83374L15.8661 6.40888C15.9259 6.33407 15.9673 6.24626 15.987 6.15252C16.0066 6.05878 16.004 5.96174 15.9793 5.86921C15.792 5.16653 15.5123 4.49179 15.1476 3.86264C15.0998 3.78033 15.0335 3.71031 14.9538 3.65815C14.8742 3.606 14.7835 3.57315 14.689 3.56223L12.8758 3.36042C12.8004 3.28092 12.7239 3.20448 12.6465 3.1311L12.4324 1.31334C12.4214 1.21871 12.3885 1.12797 12.3362 1.04834C12.2839 0.96871 12.2137 0.902399 12.1312 0.854691C11.5021 0.490259 10.8274 0.211096 10.1247 0.0245438C10.0321 -0.000177089 9.9351 -0.00281874 9.84136 0.0168317C9.74762 0.0364821 9.65981 0.0778752 9.585 0.137676L8.16397 1.27206C8.05389 1.27206 7.94382 1.27206 7.83374 1.27206L6.40888 0.133854C6.33407 0.0740532 6.24626 0.0326602 6.15252 0.0130097C6.05878 -0.00664072 5.96174 -0.00399922 5.86921 0.0207216C5.16653 0.208022 4.49179 0.487686 3.86264 0.852398C3.78033 0.900193 3.71031 0.966544 3.65815 1.04617C3.606 1.12579 3.57315 1.21649 3.56223 1.31104L3.36042 3.12728C3.28092 3.20321 3.20448 3.27965 3.1311 3.3566L1.31334 3.56528C1.21871 3.57629 1.12797 3.60926 1.04834 3.66155C0.96871 3.71384 0.902399 3.78401 0.854691 3.86646C0.490334 4.49569 0.210933 5.17042 0.0237793 5.87303C-0.000836977 5.96562 -0.00335472 6.0627 0.016429 6.15644C0.0362127 6.25018 0.0777444 6.33796 0.137676 6.41271L1.27206 7.83374C1.27206 7.94382 1.27206 8.05389 1.27206 8.16397L0.133854 9.58882C0.0740532 9.66363 0.0326602 9.75145 0.0130097 9.84518C-0.00664072 9.93892 -0.00399922 10.036 0.0207216 10.1285C0.208022 10.8312 0.487686 11.5059 0.852398 12.1351C0.900193 12.2174 0.966544 12.2874 1.04617 12.3396C1.12579 12.3917 1.21649 12.4246 1.31104 12.4355L3.12422 12.6373C3.20015 12.7168 3.27659 12.7932 3.35354 12.8666L3.56528 14.6844C3.57629 14.779 3.60926 14.8697 3.66155 14.9494C3.71384 15.029 3.78401 15.0953 3.86646 15.143C4.49569 15.5074 5.17042 15.7868 5.87303 15.9739C5.96562 15.9985 6.0627 16.0011 6.15644 15.9813C6.25018 15.9615 6.33796 15.92 6.41271 15.86L7.83374 14.7256C7.94382 14.7287 8.05389 14.7287 8.16397 14.7256L9.58882 15.8661C9.66363 15.9259 9.75145 15.9673 9.84518 15.987C9.93892 16.0066 10.036 16.004 10.1285 15.9793C10.8313 15.7923 11.5061 15.5126 12.1351 15.1476C12.2174 15.0998 12.2874 15.0335 12.3396 14.9538C12.3917 14.8742 12.4246 14.7835 12.4355 14.689L12.6373 12.8758C12.7168 12.8004 12.7932 12.7239 12.8666 12.6465L14.6844 12.4324C14.779 12.4214 14.8697 12.3885 14.9494 12.3362C15.029 12.2839 15.0953 12.2137 15.143 12.1312C15.5074 11.502 15.7868 10.8273 15.9739 10.1247C15.9985 10.0321 16.0011 9.93501 15.9813 9.84127C15.9615 9.74753 15.92 9.65975 15.86 9.585L14.7256 8.16397ZM7.99885 11.0565C7.39411 11.0565 6.80295 10.8772 6.30012 10.5412C5.7973 10.2052 5.40539 9.72767 5.17397 9.16896C4.94254 8.61025 4.88199 7.99546 4.99997 7.40234C5.11795 6.80922 5.40916 6.2644 5.83678 5.83678C6.2644 5.40916 6.80922 5.11795 7.40234 4.99997C7.99546 4.88199 8.61025 4.94254 9.16896 5.17397C9.72767 5.40539 10.2052 5.7973 10.5412 6.30012C10.8772 6.80295 11.0565 7.39411 11.0565 7.99885C11.0565 8.80979 10.7343 9.58751 10.1609 10.1609C9.58751 10.7343 8.80979 11.0565 7.99885 11.0565Z" fill={activeTab === 'settings' ? primaryColor : '#FFFFFFA6'}/>
                        </svg>

                      </div>
                      {activeTab === 'settings' && <div className="absolute w-[0.125rem] h-12 -mt-12 ml-20" style={{ backgroundColor: primaryColor }}></div>}
                    </div>
                  </div>
                </div>
                
                {/* Menu Button with Popup */}
                <div className='absolute bottom-10 left-1/2 transform -translate-x-1/2'>
                  <div className="relative">
                    <div 
                      className="w-12 h-12 rounded-[0.625rem] flex items-center justify-center cursor-pointer border border-[#FFFFFF29] hover:border-[#ffffff3d] transition-all duration-200"
                      onClick={handleMenuClick}
                    >
                      <svg width="16" height="4" viewBox="0 0 16 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.0741 2C10.0741 2.39556 9.95243 2.78224 9.72453 3.11114C9.49663 3.44004 9.1727 3.69638 8.79371 3.84776C8.41473 3.99913 7.9977 4.03874 7.59537 3.96157C7.19304 3.8844 6.82347 3.69392 6.53341 3.41421C6.24334 3.13451 6.04581 2.77814 5.96578 2.39018C5.88575 2.00222 5.92682 1.60009 6.08381 1.23463C6.24079 0.869181 6.50663 0.556823 6.84771 0.337061C7.18879 0.117298 7.58979 0 8 0C8.55008 0 9.07763 0.210714 9.46659 0.585786C9.85556 0.960859 10.0741 1.46957 10.0741 2ZM2.07407 0C1.66386 0 1.26286 0.117298 0.921781 0.337061C0.580702 0.556823 0.314862 0.869181 0.15788 1.23463C0.000898661 1.60009 -0.0401749 2.00222 0.0398537 2.39018C0.119882 2.77814 0.317419 3.13451 0.607483 3.41421C0.897548 3.69392 1.26711 3.8844 1.66944 3.96157C2.07177 4.03874 2.4888 3.99913 2.86779 3.84776C3.24678 3.69638 3.5707 3.44004 3.7986 3.11114C4.02651 2.78224 4.14815 2.39556 4.14815 2C4.14815 1.46957 3.92963 0.960859 3.54067 0.585786C3.1517 0.210714 2.62415 0 2.07407 0ZM13.9259 0C13.5157 0 13.1147 0.117298 12.7736 0.337061C12.4326 0.556823 12.1667 0.869181 12.0097 1.23463C11.8527 1.60009 11.8117 2.00222 11.8917 2.39018C11.9717 2.77814 12.1693 3.13451 12.4593 3.41421C12.7494 3.69392 13.119 3.8844 13.5213 3.96157C13.9236 4.03874 14.3407 3.99913 14.7196 3.84776C15.0986 3.69638 15.4226 3.44004 15.6505 3.11114C15.8784 2.78224 16 2.39556 16 2C16 1.73736 15.9464 1.47728 15.8421 1.23463C15.7379 0.991982 15.5851 0.771504 15.3925 0.585786C15.1999 0.400069 14.9713 0.25275 14.7196 0.152241C14.468 0.0517313 14.1983 0 13.9259 0Z" fill="white" fillOpacity="0.65"/>
                      </svg>
                    </div>

                    {/* Popup Menu */}
                    {showMenu && (
                      <>
                        <div className='w-[15.271rem] h-[8.25rem] rounded-[0.625rem] absolute overflow-hidden bottom-14 z-[9999]'
                          style={{
                            background: '#FFFFFF14',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <div className="">
                            <button
                              onClick={() => handleMenuItemClick('add-account')}
                              className="w-full px-4 py-3 text-left text-[#FFFFFFA6] hover:text-white hover:bg-[#ffffff0a] transition-colors"
                              style={{
                                fontSize: '0.875rem',
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 500,
                                lineHeight: '140%',
                              }}
                            >
                              {locale.add_account}
                            </button>
                            <button
                              onClick={() => handleMenuItemClick('manage-nominee')}
                              className="w-full px-4 py-3 text-left text-[#FFFFFFA6] hover:text-white hover:bg-[#ffffff0a] transition-colors"
                              style={{
                                fontSize: '0.875rem',
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 500,
                                lineHeight: '140%',
                              }}
                            >
                              {locale.manage_nominee || "Manage Nominee"}
                            </button>
                            <button
                              onClick={() => handleMenuItemClick('logout')}
                              className="w-full px-4 py-3 text-left text-[#FFFFFFA6] hover:text-white hover:bg-[#ffffff0a] transition-colors"
                              style={{
                                fontSize: '0.875rem',
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 500,
                                lineHeight: '140%',
                              }}
                            >
                              {locale.logout}
                            </button>
                          </div>
                        </div>

                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* Nominee Modal */}
        <NomineeModal
          isOpen={showNomineeModal}
          onClose={() => setShowNomineeModal(false)}
          basicData={basicData}
          locale={locale}
          primaryColor={primaryColor}
        />
    </>
  );
};

export default BankingMain;