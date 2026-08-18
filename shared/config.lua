Config = {}

Config.Debug = false

Config.PrimaryColor = '#BEEE11'

Config.Logo = {
    width = '2.75rem', -- Logo width (e.g., '2.75rem', '44px', '3rem')
    height = '2.75rem', -- Logo height (e.g., '2.75rem', '44px', '3rem')
}

-- Restart Lockdown Configuration
Config.RestartLockdown = {
    enabled = true, -- Enable/disable restart lockdown system
    lockdownTime = 300, -- Time in seconds before restart to lock banking (300 = 5 minutes)
    preventSpam = true, -- Prevent UI spam during normal operation
    spamCooldown = 1000, -- Cooldown in milliseconds between UI open attempts (1000 = 1 second)
}

Config.ProfileType = 'discord'-- ( 'discord', 'steam' )
Config.Framework = 'qbx' -- qbx or qb or esx
Config.Interaction = 'textui' --  or 'target' or 'textui' or 'drawtext'
Config.InteractionDistance = 2.0 -- Distance to check for interaction
-- Framework Society Integration
Config.SocietySync = {
    enabled = true, -- Enable/disable framework society system integration

    -- Manually configure which society system to use:
    -- 'esx_society' - Uses ESX society system (addon_account & addon_account_data tables)
    -- 'qb-management' - Uses QB management system (management_funds table)
    -- 'standalone' - No framework society integration (default for QBX)
    frameworkType = 'standalone',

    twoWaySync = true, -- If true, syncs both ways (framework ↔ banking). If false, only banking → framework
    autoCreateAccounts = true, -- If true, automatically creates business accounts for all configured jobs on server start
}

Config.DefaultCreditScore = 600 -- Default credit score for new players

-- Credit Score System Configuration
Config.CreditScoreSystem = {
    useInbuilt = true, -- Set to false to disable inbuilt credit score calculation (use AddCreditScore/RemoveCreditScore exports instead)
    balanceThreshold = 10000, -- Balance below this amount triggers a penalty (default: $10,000)
    balanceThresholdPenalty = 3, -- Points deducted when balance is below threshold
    minScore = 300, -- Minimum credit score
    maxScore = 850, -- Maximum credit score
    maxChangePerCalculation = 15, -- Maximum score change per calculation (positive or negative)
}

Config.PinChangeCost = 500 -- Cost to change PIN
Config.ReIssueCardCost = 500 -- Cost to reissue a card

Config.CardItemConfig = { -- ( Need to configure in sv_customize.lua )
    cardAsItem = true, -- Set to true to use card as item, false to use card as money ( only supports inventory system with metadata )
    cardItemName = 'bank_card', -- Item name for the bank card

    -- Card Stealing Configuration
    cardStealingEnabled = true, -- Set to true to enable card stealing feature (if cardAsItem is true)
    -- When enabled: Players who have a stolen card can attempt to access ATM with PIN guessing
    -- When disabled: Only card owner can access ATM with card
}

Config.phoneNotification = {
    enabled = false, -- Enable/disable phone notifications
    phone_resourcename = 'lb_phone'
}

-- Interest System Configuration
Config.InterestSystem = {
    enabled = true, -- Enable/disable interest system
    intervalType = 'hour', -- 'day', 'hour', or 'month'
    intervalAmount = 1, -- Check every X days/hours/months
    minBalance = 1000, -- Minimum balance required to earn interest
    maxInterest = 50000 -- Maximum interest that can be earned per interval
}

Config.EnableBlips = true
Config.BlipConfig = {color = 69, sprite = 108, size = 0.7}

-- Tax System Configuration
Config.TaxSystem = {
    enabled = true, -- Enable/disable tax system globally

    -- Tax Brackets - Progressive tax system (higher income = higher tax rate)
    -- Tax is calculated based on transaction amount
    brackets = {
        {
            min = 0,           -- Minimum transaction amount
            max = 10000,       -- Maximum transaction amount
            rate = 0,          -- Tax rate percentage (0% = no tax)
            description = "Tax-Free Bracket"
        },
        {
            min = 10001,
            max = 50000,
            rate = 5,          -- 5% tax
            description = "Low Income Bracket"
        },
        {
            min = 50001,
            max = 100000,
            rate = 10,         -- 10% tax
            description = "Medium Income Bracket"
        },
        {
            min = 100001,
            max = 250000,
            rate = 15,         -- 15% tax
            description = "High Income Bracket"
        },
        {
            min = 250001,
            max = 999999999,   -- Unlimited
            rate = 20,         -- 20% tax
            description = "Ultra High Income Bracket"
        }
    },

    -- Transaction Types that trigger tax
    taxableTransactions = {
        deposit = true,        -- Tax on deposits
        withdraw = false,      -- No tax on withdrawals (already taxed)
        transfer = false,      -- No tax on transfers (internal movement)
        interest = true,       -- Tax on interest earned
    },

    -- Tax Collection Settings
    collection = {
        notification = true,   -- Notify player when tax is deducted
    },

    exemptions = {
        enabled = true,

        -- Jobs that are tax exempt
            jobs = {
            -- 'police',
            -- 'ambulance',
            -- 'government',
        },

        -- Specific player Identifier IDs that are tax exempt (for VIPs, etc.)
            citizens = {
            -- 'ABC12345',
            -- 'XYZ98765',
        },
    },

    -- Daily/Weekly/Monthly Tax Limits
    limits = {
        enabled = false,        -- Enable tax limits
        daily = 100000,        -- Max tax per day per player
        weekly = 500000,       -- Max tax per week per player
        monthly = 2000000,     -- Max tax per month per player
    },

    -- Tax Holidays - Specific dates with reduced/no tax
    holidays = {
        enabled = false,
        dates = {
            -- Format: {month, day, taxRate}
            -- {12, 25, 0},     -- Christmas - 0% tax
            -- {1, 1, 50},      -- New Year - 50% discount on normal tax
        }
    },

    -- Advanced Settings
    advanced = {
        minTaxAmount = 1,          -- Minimum tax amount to collect (ignore smaller amounts)

        -- Progressive calculation: Apply different rates to different portions
        -- If false, uses flat rate for entire amount based on bracket
        progressive = true,

        -- Logging
        logTransactions = true,    -- Log all tax transactions to file
        logPath = 'data/tax_logs.json', -- Legacy: only used for migration. Tax logs are now stored in prism_banking_tax_logs table.
    }
}

-- Define the order in which cards should be displayed
Config.CardOrder = {'debit', 'business', 'express'}

Config.CardSettings = {
    ['debit'] = {
        InterestRate = 0.1, -- 0.1% interest rate
        creditScoreRequired = 0, -- Credit score required to open a debit account
        image = 'debitcard.svg', -- Image file name for the debit card
        accountLabel = 'Savings Account',
        isSociety = false -- Not a society account
    },
    ['business'] = {
       InterestRate = 0.7, -- 0.7% interest rate
       creditScoreRequired = 0, -- NO credit score required for society accounts
       image = 'businesscard.svg', -- Image file name for the business card
       accountLabel = 'Business Account',
       isSociety = true, -- This is a SOCIETY ONLY account (job-based)
       -- Each job has its own minimum grade requirement
       jobGrades = {
           ['police'] = 4,      -- Police need grade 4 or above
           ['ambulance'] = 3,   -- Ambulance need grade 3 or above
           ['mechanic'] = 2,    -- Mechanic need grade 2 or above
           -- Add more jobs and their minimum grades as needed
       }
    },
    ['express'] = {
       InterestRate = 1.7, -- 1.7% interest rate
       creditScoreRequired = 500, -- Credit score required to open an express account,
       image = 'expresscard.svg', -- Image file name for the express card
       accountLabel = 'Express Account',
       isSociety = false -- Not a society account
    }
}

Config.BankingLevels = {
    WithDrawLevel = {
        [1] = {
            maxWithdraw = 50000, -- Maximum withdrawal per transaction
        },
        [2] = {
            maxWithdraw = 100000, -- Maximum withdrawal per transaction
            price = 5000, -- Price to upgrade to this level
        },
        [3] = {
            maxWithdraw = 200000, -- Maximum withdrawal per transaction
            price = 10000, -- Price to upgrade to this level
        },
    },
    AccountsLevel = {
        [1] = {
            maxAccounts = 2, -- Maximum number of accounts
        },
        [2] = {
            maxAccounts = 3, -- Maximum number of accounts
            price = 10000, -- Price to upgrade to this level
        },
        [3] = {
            maxAccounts = 4, -- Maximum number of accounts
            price = 20000, -- Price to upgrade to this level
        },
    }
}

Config.Peds = {
    enabled = true,
    pedModel = 'U_M_M_BankMan',
}

Config.Banks = {
    {
        pedCoords = vec4(149.3990, -1042.1342, 28.3680, 335.4363),
        InteractionCoords = vector3(150.1159, -1040.7085, 29.3741),
        bankName = "Fleeca Bank",
    },
    {
        pedCoords = vec4(313.6903, -280.4256, 53.1646, 338.0531),
        InteractionCoords = vector3(314.1825, -279.1101, 54.1708),
        bankName = "Fleeca Bank",
    },
    {
        pedCoords = vec4(-351.4219, -51.2421, 48.0364, 342.2108),
        InteractionCoords = vector3(-350.9385, -49.8926, 49.0425),
        bankName = "Fleeca Bank",
    },
    {
        pedCoords = vec4(313-1212.0844, -332.0119, 36.7809, 26.1124),
        InteractionCoords = vector3(-1212.6710, -330.7307, 37.7870),
        bankName = "Fleeca Bank",
    },
    {
        pedCoords = vec4(-2961.1709, 482.8680, 14.6970, 86.0531),
        InteractionCoords = vector3(-2962.4817, 482.9699, 15.7031),
        bankName = "Fleeca Bank",
    }
}

-- ATM Configuration
Config.ATMs = {
    enabled = true, -- Enable/disable ATM system
    interactionDistance = 2.0, -- Distance to interact with ATM
    props = {
        `prop_atm_01`,
        `prop_atm_02`,
        `prop_atm_03`,
        `prop_fleeca_atm`
    },
}