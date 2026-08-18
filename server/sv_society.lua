local function IsSocietySyncEnabled()
    return Config.SocietySync and Config.SocietySync.enabled
end

local function GetSocietyAccountName(jobName)
    if Config.SocietySync.frameworkType == 'esx_society' then
        return 'society_' .. jobName
    else
        return jobName
    end
end

local function GetESXSocietyBalance(jobName)
    if not IsSocietySyncEnabled() then return nil end
    local accountName = GetSocietyAccountName(jobName)
    local promise = promise.new()

    exports.oxmysql:execute('SELECT money FROM addon_account_data WHERE account_name = ?', {accountName}, function(result)
        if result and #result > 0 then
            promise:resolve(result[1].money or 0)
        else
            promise:resolve(0)
        end
    end)

    return Citizen.Await(promise)
end

local function SetESXSocietyBalance(jobName, amount)
    if not IsSocietySyncEnabled() then return false end
    local accountName = GetSocietyAccountName(jobName)
    local exists = exports.oxmysql:executeSync('SELECT account_name FROM addon_account_data WHERE account_name = ?', {accountName})

    if exists and #exists > 0 then
        exports.oxmysql:execute('UPDATE addon_account_data SET money = ? WHERE account_name = ?', {amount, accountName})
    else
        exports.oxmysql:execute('INSERT INTO addon_account_data (account_name, money) VALUES (?, ?)', {accountName, amount})
    end

    return true
end

local function AddESXSocietyMoney(jobName, amount)
    if not IsSocietySyncEnabled() then return false end
    local accountName = GetSocietyAccountName(jobName)
    local currentBalance = GetESXSocietyBalance(jobName) or 0
    local newBalance = currentBalance + amount
    return SetESXSocietyBalance(jobName, newBalance)
end

local function RemoveESXSocietyMoney(jobName, amount)
    if not IsSocietySyncEnabled() then return false end
    local accountName = GetSocietyAccountName(jobName)
    local currentBalance = GetESXSocietyBalance(jobName) or 0
    local newBalance = math.max(0, currentBalance - amount)
    return SetESXSocietyBalance(jobName, newBalance)
end

local function GetQBSocietyBalance(jobName)
    if not IsSocietySyncEnabled() then return nil end
    local promise = promise.new()

    exports.oxmysql:execute('SELECT amount FROM management_funds WHERE job_name = ?', {jobName}, function(result)
        if result and #result > 0 then
            promise:resolve(result[1].amount or 0)
        else
            promise:resolve(0)
        end
    end)

    return Citizen.Await(promise)
end

local function SetQBSocietyBalance(jobName, amount)
    if not IsSocietySyncEnabled() then return false end
    local exists = exports.oxmysql:executeSync('SELECT job_name FROM management_funds WHERE job_name = ?', {jobName})

    if exists and #exists > 0 then
        exports.oxmysql:execute('UPDATE management_funds SET amount = ? WHERE job_name = ?', {amount, jobName})
    else
        exports.oxmysql:execute('INSERT INTO management_funds (job_name, amount, type) VALUES (?, ?, ?)', {jobName, amount, 'boss'})
    end

    return true
end

local function AddQBSocietyMoney(jobName, amount)
    if not IsSocietySyncEnabled() then return false end
    local currentBalance = GetQBSocietyBalance(jobName) or 0
    local newBalance = currentBalance + amount
    return SetQBSocietyBalance(jobName, newBalance)
end

local function RemoveQBSocietyMoney(jobName, amount)
    if not IsSocietySyncEnabled() then return false end
    local currentBalance = GetQBSocietyBalance(jobName) or 0
    local newBalance = math.max(0, currentBalance - amount)
    return SetQBSocietyBalance(jobName, newBalance)
end

GetFrameworkSocietyBalance = function(jobName)
    if not IsSocietySyncEnabled() then return nil end

    if Config.SocietySync.frameworkType == 'esx_society' then
        return GetESXSocietyBalance(jobName)
    elseif Config.SocietySync.frameworkType == 'qb-management' then
        return GetQBSocietyBalance(jobName)
    else
        return nil
    end
end

SetFrameworkSocietyBalance = function(jobName, amount)
    if not IsSocietySyncEnabled() then return false end

    if Config.SocietySync.frameworkType == 'esx_society' then
        return SetESXSocietyBalance(jobName, amount)
    elseif Config.SocietySync.frameworkType == 'qb-management' then
        return SetQBSocietyBalance(jobName, amount)
    else
        return false
    end
end

AddFrameworkSocietyMoney = function(jobName, amount)
    if not IsSocietySyncEnabled() then return false end

    if Config.SocietySync.frameworkType == 'esx_society' then
        return AddESXSocietyMoney(jobName, amount)
    elseif Config.SocietySync.frameworkType == 'qb-management' then
        return AddQBSocietyMoney(jobName, amount)
    else
        return false
    end
end

RemoveFrameworkSocietyMoney = function(jobName, amount)
    if not IsSocietySyncEnabled() then return false end

    if Config.SocietySync.frameworkType == 'esx_society' then
        return RemoveESXSocietyMoney(jobName, amount)
    elseif Config.SocietySync.frameworkType == 'qb-management' then
        return RemoveQBSocietyMoney(jobName, amount)
    else
        return false
    end
end

SyncBankingToFrameworkSociety = function(jobName, bankingBalance)
    if not IsSocietySyncEnabled() then return end
    SetFrameworkSocietyBalance(jobName, bankingBalance)
    DebugPrint("[SOCIETY SYNC] Synced banking → framework: " .. jobName .. " = $" .. bankingBalance)
end

SyncFrameworkToBankingSociety = function(jobName)
    if not IsSocietySyncEnabled() or not Config.SocietySync.twoWaySync then return nil end
    local frameworkBalance = GetFrameworkSocietyBalance(jobName)

    if frameworkBalance then
        DebugPrint("[SOCIETY SYNC] Synced framework → banking: " .. jobName .. " = $" .. frameworkBalance)
        return frameworkBalance
    end

    return nil
end

exports('GetSocietyBalance', function(jobName)
    local result = exports.oxmysql:executeSync('SELECT balance FROM prism_banking_accounts WHERE is_society = 1 AND society_job = ?', {jobName})

    if result and #result > 0 then
        return result[1].balance or 0
    end

    if IsSocietySyncEnabled() and Config.SocietySync.twoWaySync then
        return GetFrameworkSocietyBalance(jobName) or 0
    end

    return 0
end)

exports('AddSocietyMoney', function(jobName, amount)
    if not jobName or type(jobName) ~= "string" then return false end
    if not amount or type(amount) ~= "number" or amount <= 0 or amount > 999999999 or amount ~= math.floor(amount) then return false end

    local result = exports.oxmysql:executeSync('SELECT accno, balance FROM prism_banking_accounts WHERE is_society = 1 AND society_job = ?', {jobName})

    if result and #result > 0 then
        local newBalance = result[1].balance + amount
        exports.oxmysql:execute('UPDATE prism_banking_accounts SET balance = ? WHERE accno = ?', {newBalance, result[1].accno})

        if IsSocietySyncEnabled() then
            AddFrameworkSocietyMoney(jobName, amount)
        end

        return true
    end

    return false
end)

exports('RemoveSocietyMoney', function(jobName, amount)
    if not jobName or type(jobName) ~= "string" then return false end
    if not amount or type(amount) ~= "number" or amount <= 0 or amount > 999999999 or amount ~= math.floor(amount) then return false end

    local result = exports.oxmysql:executeSync('SELECT accno, balance FROM prism_banking_accounts WHERE is_society = 1 AND society_job = ?', {jobName})

    if result and #result > 0 then
        local newBalance = math.max(0, result[1].balance - amount)
        exports.oxmysql:execute('UPDATE prism_banking_accounts SET balance = ? WHERE accno = ?', {newBalance, result[1].accno})

        if IsSocietySyncEnabled() then
            RemoveFrameworkSocietyMoney(jobName, amount)
        end

        return true
    end

    return false
end)

local function AutoCreateSocietyAccounts()
    if not Config.SocietySync or not Config.SocietySync.autoCreateAccounts then
        DebugPrint("[SOCIETY SYNC] Auto-creation skipped: disabled in config")
        return
    end

    for cardType, cardConfig in pairs(Config.CardSettings) do
        if cardConfig.isSociety and cardConfig.jobGrades then
            for jobName, _ in pairs(cardConfig.jobGrades) do
                if not DoesSocietyAccountExist(jobName, cardType) then
                    local existingBalance = GetFrameworkSocietyBalance(jobName) or 0

                    local accno = nil
                    local attempts = 0
                    while not accno and attempts < 100 do
                        local candidate = math.random(1000000000, 9999999999)
                        local exists = exports.oxmysql:executeSync('SELECT 1 FROM prism_banking_accounts WHERE accno = ? LIMIT 1', {candidate})
                        if not exists or #exists == 0 then
                            accno = candidate
                        end
                        attempts = attempts + 1
                    end

                    if accno then
                        local pin = math.random(1000, 9999)
                        exports.oxmysql:executeSync(
                            'INSERT INTO prism_banking_accounts (identifier, pin, type, accno, balance, `primary`, is_society, society_job) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            {'system', pin, cardType, accno, existingBalance, 0, 1, jobName}
                        )
                        print("^2[Prism Banking]^0 Auto-created ^5" .. cardType .. "^0 account for ^5" .. jobName .. "^0 (Balance: $" .. existingBalance .. ")")
                    else
                        print("^1[Prism Banking]^0 Failed to generate account number for: " .. jobName)
                    end
                else
                    DebugPrint("[SOCIETY SYNC] Society account already exists for: " .. jobName .. " (" .. cardType .. ")")
                end
            end
        end
    end
end

CreateThread(function()
    Wait(5000)
    AutoCreateSocietyAccounts()
end)

local syncStatus = IsSocietySyncEnabled() and "^2ENABLED^0" or "^3DISABLED^0"
local frameworkType = Config.SocietySync.frameworkType or "standalone"
print("^2[Prism Banking]^0 Society sync system loaded. Status: " .. syncStatus .. " | Framework Type: ^5" .. frameworkType .. "^0")
