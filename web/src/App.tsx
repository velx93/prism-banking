import { useState, useCallback, useEffect } from 'react'
import NewCustomer from './pages/NewCustomer'
import NewCustomerPage2 from './pages/SubPage/NewCustomerPage2';
import BankingMain from './pages/BankingMain';
import AccountPage from './pages/SubPage/Banking/AccountPage';
import { useNuiEvent } from './lib/useNuiEvent';
import { fetchNui } from './lib/fetchNui';
import { NotificationProvider, useNotifications } from './components/ui/Notificationcontext';
import NotificationToast from './components/ui/NotificationToast';
import type { LocaleStrings } from './lib/locale';
import AtmPinVerification from './pages/SubPage/Banking/AtmPINVerification';
import './App.css'

function AppContent() {
  const [state, setState] = useState('bankingMain');
  const [selectedCardType, setSelectedCardType] = useState('');
  const [userPin, setUserPin] = useState('');
  const [ isVisible, setIsVisible ] = useState(false);
  const [isNewPlayer, setIsNewPlayer] = useState(false);
  const [basicData, setBasicData] = useState<any>([]);
  const [isAtmMode, setIsAtmMode] = useState(false);
  const [atmAccounts, setAtmAccounts] = useState<any[]>([]);
  const [atmAccountNumbers, setAtmAccountNumbers] = useState<string[]>([]);
  const [locale, setLocale] = useState<LocaleStrings>({
    currencySign: '$ ',
    close: 'Close',
    banking: 'Banking',
    create_your : 'Create Your ',
    bank_account : 'Bank Account',
    newPlayer_desc : 'Lorem ipsum dolor sit amet consectetur. Lectus sit id urna pharetra ut viverra ante tristique non.',
    card_type : 'Card Type',
    business : 'Business',
    interest : 'Interest',
    express : 'Express',
    business_card : 'Business Card',
    express_card : 'Express Card',
    cancel : "Cancel",
    continue : "Continue",
    processing_req : "Processing Your Request",
    add_account : "Add Account",
    logout : "Logout",
    processing_pin : "Processing PIN...",
    processing_pin_desc : "Please wait while we secure your account",
    setup_pin : "Setup Your",
    setup_pin_2 : "Account PIN",
    setup_pin_desc : "Enter a secure 5-digit PIN. Avoid sequential numbers and repeating digits for better security.",
    protection_level : "Protection Level",
    processing : "Processing...",
    hour_1 : "1 Hour",
    hour_6 : "6 Hours",
    hour_12 : "12 Hours",
    welcome_back : "Welcome Back, ",
    homepage_desc : "Welcome back to Prism Banking. Manage your accounts, view transactions, and secure your finances with ease.",
    active_spending : "Active Spending",
    cash : "Cash",
    spending : "Spending",
    amount_spent : "Amount Spent",
    bank : "Bank",
    credit_score : "Credit Score",
    your_score : "Your Score",
    credit_desc : "Your average personal credit score rating",
    points : " Points",
    bank_withdraw : "Bank Withdraw",
    bank_deposit : "Bank Deposit",
    invoice_pay : "Invoice Payment",
    search_spending : "Search Spending...",
    recent: "Recent",
    all: "All",
    invoices: "Invoices",
    transaction_not_found : "Transaction Not Found",
    transaction_details : "Transaction Details",
    dataAndTime : "Date & Time",
    txn_id : "Transaction ID",
    description : "Description",
    status : "Status",
    completed : "Completed",
    cash_balance : "Cash Balance",
    currencyText : "USD",
    card_owner : "Card Owner",
    expires : "Expires",
    card_ends_in : "Card Ends In",
    money_Actions : "Money Actions",
    deposit : "Deposit",
    withdraw : "Withdraw",
    transfer : "Transfer",
    amount : "Amount",
    userId : "User ID",
    confirm : "Confirm",
    spent : "Spent",
    recent_spending : "Recent Spending",
    past : "Past ",
    insights : "Insights",
    excellent : "Excellent",
    good : "Good",
    fair : "Fair",
    poor : "Poor",
    account_data : "Account Data",
    income_activity : "Income Activity",
    daily_income : "Daily Income",
    credit : "Credit",
    credit_history : "Credit History",
    income : "Income",
    statistics : "Statistics",
    total_amount : "Total Amount",
    bank_balance : "Bank Balance",
    settings : "Settings",
    allow_transfer : "Allow Transfer",
    allow_transfer_desc : "Allow other players to send money to you",
    optimize_history : "Optimize History",
    optimize_history_desc : "Allow history up to 3 months",
    change_pin : "Change PIN",
    change_pin_desc : "Confirm your ATM Pin",
    change : "Change",
    upgrades : "Upgrades",
    withdrawalLevel : "Withdraw amount - Level ",
    upgradeatmlevel : "Upgrade your ATM withdraw to",
    upgrade : "Upgrade",
    accountLevel : "Multiple Cards - Level",
    reIssueCard : "Reissue Card",
    reIssueCardDesc : "Reissue a new card for your account",
    reIssue : "Reissue",
    manage_nominee : "Manage Nominee",
    select_account : "Select Account",
    add_nominee : "Add Nominee",
    player_server_id : "Player Server ID",
    add : "Add",
    current_nominees : "Current Nominees",
    no_nominees : "No nominees added yet",
    added_on : "Added on",
    no_eligible_accounts : "You don't have any eligible accounts to manage nominees."
  });
  const { addNotification } = useNotifications();
  const [primaryColor, setPrimaryColor] = useState('#EE1111');
  const [logo, setLogo] = useState({ width: '2.75rem', height: '2.75rem' });

  const handleContinue = useCallback((cardType: string) => {
    setSelectedCardType(cardType);
    setState('next-page-newcustomer');
  }, []);

  const handleNotification = useCallback((title: string, message: string) => {
    addNotification({
      title: title,
      message: message,
      count: 1
    });
  }, [addNotification]);

  const handlePinSubmit = useCallback((pin: string) => {
    setUserPin(pin);

    fetchNui('createAccount', {pin: pin, type: selectedCardType, isNew: isNewPlayer})
    .then((res:any) => {
      if (res.success) {
        setBasicData(res.main);
        setState('bankingMain');
        setUserPin('');
      } else {
        // Handle failure - go back to card selection page
        handleNotification("Error", res.message || "Failed to create account");
        setState('new-customer');
        setUserPin('');
      }
    })
    .catch((error) => {
      // Handle any fetch errors
      handleNotification("Error", "An error occurred while creating the account");
      setState('new-customer');
      setUserPin('');
    })
  }, [selectedCardType, isNewPlayer]);

  const handleCreateAccountClick = () => {
    fetchNui('allowedtoCreateAccount'). then((res:any) => {
      if (res.success) {
        setIsNewPlayer(false);
        setState('new-customer');
      } else {
        handleNotification("Error", "You are not eligible to create an account");
      }
    })
  }

  const handleCloseBanking = useCallback(() => {
    setIsVisible(false);
    setState('bankingMain');
    setIsAtmMode(false);
    setAtmAccounts([]);
    setAtmAccountNumbers([]);
    fetchNui('closeBanking', {});
  }, []);

  const updateBasicData = useCallback((newData: any) => {
    setBasicData(newData);
  }, []);

  useNuiEvent('closeBanking', (data:any) => {
    handleCloseBanking();
  })

  useNuiEvent('openBanking', (data:any) => {
    if (data.isNew) {
      setIsNewPlayer(true);
      setState('new-customer');
    } else {
      setIsNewPlayer(false);
      setState('bankingMain');
    }
    // Ensure accounts array exists
    const sanitizedData = {
      ...data.main,
      accounts: data.main?.accounts && Array.isArray(data.main.accounts) ? data.main.accounts : []
    };
    setBasicData(sanitizedData);
    setLocale(data.Locale);
    setPrimaryColor(data.main.primaryColor || '#EE1111');
    setLogo(data.main.logo || { width: '2.75rem', height: '2.75rem' });
    setIsVisible(true)
  })

  useNuiEvent('sendNotification', (data:any) => {
    handleNotification(data.title, data.msg);
  })

  useNuiEvent('updateBankingData', (data:any) => {
    // Ensure accounts array exists
    const sanitizedData = {
      ...data,
      accounts: data?.accounts && Array.isArray(data.accounts) ? data.accounts : []
    };
    setBasicData(sanitizedData);
    setPrimaryColor(data.primaryColor || '#EE1111');
    setLogo(data.logo || { width: '2.75rem', height: '2.75rem' });
    if (isAtmMode && sanitizedData.accounts && Array.isArray(sanitizedData.accounts)) {
      setAtmAccounts(prevAtmAccounts => {
        return prevAtmAccounts.map(atmAccount => {
          const updatedAccount = sanitizedData.accounts.find((acc: any) => acc.accountNumber === atmAccount.accountNumber);
          return updatedAccount || atmAccount;
        });
      });
    }
  })

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        handleCloseBanking();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, handleCloseBanking]);

  useNuiEvent('openAtm', (data:any) => {
    setAtmAccounts(data.accounts && Array.isArray(data.accounts) ? data.accounts : []);
    setBasicData(data.main);
    setLocale(data.Locale);
    setPrimaryColor(data.primaryColor || '#EE1111');
    setLogo(data.logo || { width: '2.75rem', height: '2.75rem' });
    setState('accountPage');
    setIsAtmMode(true);
    setIsVisible(true);
  })

  useNuiEvent('openAtmPinVerification', (data:any) => {
    setAtmAccountNumbers(data.accountNumbers || []);
    setPrimaryColor(data.primaryColor || '#EE1111');
    setLogo(data.logo || { width: '2.75rem', height: '2.75rem' });
    setState('atmPinVerification');
    setIsAtmMode(true);
    setIsVisible(true);
  })

  const HandleBankState = () => {
    switch (state) {
      case 'new-customer':
        return <NewCustomer onContinue={handleContinue} onClose={handleCloseBanking} basicData={basicData} locale={locale} primaryColor={primaryColor} />;
      case 'next-page-newcustomer':
        return <NewCustomerPage2 key={Date.now()} onPinSubmit={handlePinSubmit} onClose={handleCloseBanking} locale={locale} primaryColor={primaryColor} />;
      case 'bankingMain':
        return <BankingMain basicData={basicData} onClose={handleCloseBanking} onCreateAccountClick={handleCreateAccountClick} locale={locale} isAtmMode={isAtmMode} primaryColor={primaryColor} logo={logo} />
      case 'atmPinVerification':
        return <AtmPinVerification accountNumbers={atmAccountNumbers} onClose={handleCloseBanking} primaryColor={primaryColor} />
      case 'accountPage':
        return (
          <div className="relative rounded-3xl" style={{
            width: isAtmMode ? '62rem' : '69.75rem',
            height: '50.063rem',
            background: 'radial-gradient(50% 50% at 50% 50%, #0C0A10 0%, #0A090E 100%), radial-gradient(64.25% 73.85% at 73.7% 0%, rgba(190, 238, 17, 0.03) 0%, rgba(190, 238, 17, 0) 100%)',
            border: '4px solid #12121285',
          }}>
            <AccountPage
              basicData={{
                ...basicData,
                accounts: atmAccounts
              }}
              onClose={handleCloseBanking}
              onCreateAccountClick={() => {}}
              locale={locale}
              isAtmMode={isAtmMode}
              primaryColor={primaryColor}
            />
          </div>
      )
      default:
        return null;
    }
  };

  return (
    <>
      <NotificationToast primaryColor={primaryColor} />
      <div className="relative w-full h-screen bg-cover bg-center bg-no-repeat bg-transparent">
        {isVisible && (
          <div className="fixed inset-0 flex items-center justify-center">
            {HandleBankState()}
          </div>
        )}
      </div>
    </>
  );
}

export default function App() {
  return  (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}