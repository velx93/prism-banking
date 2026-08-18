local function generateRandomAccountNumber()
    local min = 1000000000
    local max = 9999999999
    return math.random(min, max)
end
local function checkAccountNumberExists(accountNumber, callback)
    exports.oxmysql:execute('SELECT 1 FROM prism_banking_accounts WHERE accno = ? LIMIT 1', {accountNumber}, function(result)
        callback(result and #result > 0)
    end)
end
function GenerateUniqueAccountNumber(callback)
    local maxAttempts = 100
    local attempts = 0
    local function tryGenerate()
        if attempts >= maxAttempts then
            callback(nil)
            return
        end
        local accountNumber = generateRandomAccountNumber()
        attempts = attempts + 1
        checkAccountNumberExists(accountNumber, function(exists)
            if not exists then
                callback(accountNumber)
            else
                tryGenerate()
            end
        end)
    end
    tryGenerate()
end
GetPlayer = function(source)
    if Config.Framework == 'qb' or Config.Framework == 'qbx' then
        return QBCore.Functions.GetPlayer(source)
    elseif Config.Framework == 'esx' then
        return ESX.GetPlayerFromId(source)
    end
end
GetPlayerJobInfo = function(source)
    local Player = GetPlayer(source)
    if not Player then return nil, nil end
    if Config.Framework == 'esx' then
        return Player.job.name, Player.job.grade
    else
        return Player.PlayerData.job.name, Player.PlayerData.job.grade.level
    end
end
IsPlayerEligibleForSociety = function(source, cardType)
    local cardConfig = Config.CardSettings[cardType]
    if not cardConfig or not cardConfig.isSociety then
        return false
    end
    local jobName, jobGrade = GetPlayerJobInfo(source)
    if not jobName or not jobGrade then
        return false
    end
    if not cardConfig.jobGrades or not cardConfig.jobGrades[jobName] then
        return false
    end
    local requiredGrade = cardConfig.jobGrades[jobName]
    if jobGrade < requiredGrade then
        return false
    end
    return true
end
DoesSocietyAccountExist = function(jobName, cardType)
    local result = exports.oxmysql:executeSync('SELECT 1 FROM prism_banking_accounts WHERE is_society = 1 AND society_job = ? AND type = ? LIMIT 1',
        {jobName, cardType}
    )
    return result and #result > 0
end
GetSocietyAccountsForPlayer = function(source)
    local jobName, jobGrade = GetPlayerJobInfo(source)
    if not jobName or not jobGrade then
        return {}
    end
    local data = promise.new()
    local accounts = {}
    for cardType, cardConfig in pairs(Config.CardSettings) do
        if cardConfig.isSociety then
            if cardConfig.jobGrades and cardConfig.jobGrades[jobName] then
                local requiredGrade = cardConfig.jobGrades[jobName]
                if jobGrade >= requiredGrade then
                    exports.oxmysql:execute('SELECT pin, type, balance, accno, identifier, `primary`, society_job FROM prism_banking_accounts WHERE is_society = 1 AND society_job = ? AND type = ?',
                        {jobName, cardType},
                        function(result)
                            if result and #result > 0 then
                                for _, v in pairs(result) do
                                    local balance = v.balance or 0
                                    if Config.SocietySync and Config.SocietySync.enabled and Config.SocietySync.twoWaySync then
                                        local frameworkBalance = SyncFrameworkToBankingSociety(jobName)
                                        if frameworkBalance then
                                            balance = frameworkBalance
                                            exports.oxmysql:execute('UPDATE prism_banking_accounts SET balance = ? WHERE accno = ?', {balance, v.accno})
                                        end
                                    end
                                    accounts[#accounts+1] = {
                                        pin = v.pin,
                                        type = v.type,
                                        balance = balance,
                                        accountNumber = v.accno,
                                        identifier = v.identifier,
                                        primary = false,
                                        isSociety = true,
                                        societyJob = v.society_job
                                    }
                                end
                            end
                            data:resolve(accounts)
                        end
                    )
                    return Citizen.Await(data)
                end
            end
        end
    end
    data:resolve(accounts)
    return Citizen.Await(data)
end
GetBankAccounts = function(source)
    local Player = GetPlayer(source)
    local data = promise.new()
    if not Player then
        data:resolve({})
        return Citizen.Await(data)
    end

    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid

    local personalAccounts = exports.oxmysql:executeSync('SELECT pin, type, balance, accno, identifier, `primary` FROM prism_banking_accounts WHERE identifier = @identifier AND (is_society = 0 OR is_society IS NULL)', {
        ['@identifier'] = identifier
    })

    local accounts = {}

    if personalAccounts then
        for _, v in pairs(personalAccounts) do
            accounts[#accounts+1] = {
                pin = v.pin,
                type = v.type,
                balance = v.balance or 0,
                accountNumber = v.accno,
                identifier = identifier,
                primary = v.primary == 1,
                isSociety = false,
                isNomineeAccount = false
            }
        end
    end

    local nomineeResult = exports.oxmysql:executeSync([[
        SELECT a.pin, a.type, a.balance, a.accno, a.identifier, a.primary
        FROM prism_banking_nominees n
        INNER JOIN prism_banking_accounts a ON n.account_number = a.accno
        WHERE n.nominee_identifier = ? AND a.is_society = 0
    ]], {identifier})

    if nomineeResult and #nomineeResult > 0 then
        local ownerIdentifiers = {}
        local seen = {}
        for _, v in ipairs(nomineeResult) do
            if not seen[v.identifier] then
                ownerIdentifiers[#ownerIdentifiers+1] = v.identifier
                seen[v.identifier] = true
            end
        end

        local ownerNames = {}
        if #ownerIdentifiers > 0 then
            local placeholders = string.rep('?,', #ownerIdentifiers):sub(1, -2)
            if Config.Framework == 'esx' then
                local ownerData = exports.oxmysql:executeSync(
                    'SELECT identifier, firstname, lastname FROM users WHERE identifier IN (' .. placeholders .. ')',
                    ownerIdentifiers
                )
                if ownerData then
                    for _, row in ipairs(ownerData) do
                        ownerNames[row.identifier] = (row.firstname or "Unknown") .. " " .. (row.lastname or "Owner")
                    end
                end
            else
                local ownerData = exports.oxmysql:executeSync(
                    'SELECT citizenid, charinfo FROM players WHERE citizenid IN (' .. placeholders .. ')',
                    ownerIdentifiers
                )
                if ownerData then
                    for _, row in ipairs(ownerData) do
                        if row.charinfo then
                            local charinfo = json.decode(row.charinfo)
                            if charinfo and charinfo.firstname and charinfo.lastname then
                                ownerNames[row.citizenid] = charinfo.firstname .. " " .. charinfo.lastname
                            end
                        end
                    end
                end
            end
        end

        for _, v in ipairs(nomineeResult) do
            accounts[#accounts+1] = {
                pin = v.pin,
                type = v.type,
                balance = v.balance or 0,
                accountNumber = v.accno,
                identifier = v.identifier,
                primary = false,
                isSociety = false,
                isNomineeAccount = true,
                ownerName = ownerNames[v.identifier] or "Unknown Owner"
            }
        end
    end

    local societyAccounts = GetSocietyAccountsForPlayer(source)
    if societyAccounts then
        for _, societyAccount in ipairs(societyAccounts) do
            if societyAccount.isSociety and societyAccount.societyJob then
                local jobLabel = societyAccount.societyJob

                if Config.Framework == 'esx' then
                    local jobData = exports.oxmysql:executeSync('SELECT label FROM jobs WHERE name = ? LIMIT 1', {societyAccount.societyJob})
                    if jobData and jobData[1] and jobData[1].label then
                        jobLabel = jobData[1].label
                    end
                elseif Config.Framework == 'qb' or Config.Framework == 'qbx' then
                    local QBCore = exports['qb-core']:GetCoreObject()
                    if QBCore and QBCore.Shared and QBCore.Shared.Jobs and QBCore.Shared.Jobs[societyAccount.societyJob] then
                        jobLabel = QBCore.Shared.Jobs[societyAccount.societyJob].label
                    end
                end

                societyAccount.societyJobLabel = jobLabel
            end
            accounts[#accounts+1] = societyAccount
        end
    end

    data:resolve(accounts)
    return Citizen.Await(data)
end
exports('GetBankAccounts', GetBankAccounts)

GetBankAccountByAccountNumber = function(accountNumber)
    local data = promise.new()
    exports.oxmysql:execute('SELECT pin, type, balance, accno, identifier, `primary`, is_society, society_job FROM prism_banking_accounts WHERE accno = ?', {accountNumber}, function(result)
        if result and #result > 0 then
            local v = result[1]
            local account = {
                pin = v.pin,
                type = v.type,
                balance = v.balance or 0,
                accountNumber = v.accno,
                identifier = v.identifier,
                primary = v.primary == 1,
                isSociety = v.is_society == 1,
                isNomineeAccount = false
            }

            if account.isSociety and v.society_job then
                local jobLabel = v.society_job
                if Config.Framework == 'esx' then
                    local jobData = exports.oxmysql:executeSync('SELECT label FROM jobs WHERE name = ? LIMIT 1', {v.society_job})
                    if jobData and jobData[1] and jobData[1].label then
                        jobLabel = jobData[1].label
                    end
                elseif Config.Framework == 'qb' or Config.Framework == 'qbx' then
                    local QBCore = exports['qb-core']:GetCoreObject()
                    if QBCore and QBCore.Shared and QBCore.Shared.Jobs and QBCore.Shared.Jobs[v.society_job] then
                        jobLabel = QBCore.Shared.Jobs[v.society_job].label
                    end
                end
                account.societyJob = v.society_job
                account.societyJobLabel = jobLabel
            end

            data:resolve(account)
        else
            data:resolve(nil)
        end
    end)
    return Citizen.Await(data)
end

GetTransactionHistory = function(source)
    local Player = GetPlayer(source)
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    local sevenDaysAgo = os.time() - (7 * 24 * 60 * 60)
    local results = exports.oxmysql:executeSync(
        'SELECT spend_type as Spendtype, amount, transaction_type as transactionType, name, description, `timestamp` FROM prism_banking_transactions WHERE identifier = ? AND `timestamp` >= ? ORDER BY `timestamp` DESC',
        {identifier, sevenDaysAgo}
    )
    return results or {}
end
exports('GetTransactionHistory', GetTransactionHistory)
ReIssueCard = function (src, accno)
    local Player = GetPlayer(src)
    if not Player then return end

    if not HasAccountAccess(src, accno, true) then
        DebugPrint("[BANKING] Card reissue denied for player " .. src .. " - not account owner (possibly nominee)")
        TriggerClientEvent('prism-banking:client:sendNotification', src, Locale.server.bank_activity, "Only account owners can reissue cards. Nominees cannot reissue cards.")
        return
    end

    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    local success = promise.new()
    local ownershipCheck = exports.oxmysql:executeSync('SELECT 1 FROM prism_banking_accounts WHERE accno = ? AND identifier = ? AND (is_society = 0 OR is_society IS NULL)', {
        accno,
        identifier
    })
    if not ownershipCheck or #ownershipCheck == 0 then
        DebugPrint("[BANKING] ReIssue denied - player " .. src .. " doesn't own account " .. accno)
        TriggerClientEvent('prism-banking:client:sendNotification', src, Locale.server.bank_activity, "You don't own this account")
        return
    end
    local pinChangeCost = Config.ReIssueCardCost
    local playerMoney = GetPlayerMoney(src)
    if playerMoney < pinChangeCost then
        TriggerClientEvent('prism-banking:client:sendNotification', src, Locale.server.bank_activity, Locale.server.insufficient_fund)
        return
    end
    RemovePlayerMoney(src, 'cash', pinChangeCost)
    GenerateUniqueAccountNumber(function(newAccno)
        exports.oxmysql:execute(
            'UPDATE prism_banking_accounts SET accno = @newAccno WHERE accno = @accno',
            {
                ['@newAccno'] = newAccno,
                ['@accno'] = accno
            }
        )
        TriggerClientEvent('prism-banking:client:sendNotification', src, Locale.server.bank_activity, Locale.server.card_reissued)
        AddItemToInventory(src, newAccno)

        LogCardReissued(src, accno, newAccno, pinChangeCost)

        success:resolve({
            success = true,
            message = "Card reissued successfully",
            newAccno = newAccno
        })
    end)
end
CreateBankAccount = function (pin, type, src, isNew)
    local Player = GetPlayer(src)
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    local currenBalance = Config.Framework == 'esx' and Player.getAccount('bank').money or Player.PlayerData.money['bank']
    local success = promise.new()
    local cardConfig = Config.CardSettings[type]
    local isSociety = cardConfig and cardConfig.isSociety or false
    local societyJob = nil
    if isSociety then
        if not IsPlayerEligibleForSociety(src, type) then
            success:resolve({success = false, message = "You are not eligible to create this society account"})
            return Citizen.Await(success)
        end
        local jobName, jobGrade = GetPlayerJobInfo(src)
        societyJob = jobName
        if DoesSocietyAccountExist(jobName, type) then
            success:resolve({success = false, message = "A society account already exists for your job"})
            return Citizen.Await(success)
        end
    end

    local shouldBePrimary = false
    if not isSociety then
        local ownedPersonalAccounts = exports.oxmysql:executeSync([[
            SELECT accno FROM prism_banking_accounts
            WHERE identifier = ? AND (is_society = 0 OR is_society IS NULL)
        ]], {identifier})

        if not ownedPersonalAccounts or #ownedPersonalAccounts == 0 then
            shouldBePrimary = true
            DebugPrint("[BANKING] Creating first owned personal account for player " .. src .. " - setting as primary")
        end
    end

    GenerateUniqueAccountNumber(function(accno)
        local query = 'INSERT INTO prism_banking_accounts (identifier, pin, type, accno, balance, `primary`, is_society, society_job) VALUES (@identifier, @pin, @type, @accno, @balance, @primary, @is_society, @society_job)'
        exports.oxmysql:execute(
            query,
            {
                ['@identifier'] = identifier,
                ['@pin'] = pin,
                ['@type'] = type,
                ['@accno'] = accno,
                ['@balance'] = (shouldBePrimary) and currenBalance or 0,
                ['@primary'] = shouldBePrimary and 1 or 0,
                ['@is_society'] = isSociety and 1 or 0,
                ['@society_job'] = societyJob
            },
            function(result)
                if shouldBePrimary and currenBalance > 0 then
                    exports.oxmysql:execute(
                        'INSERT INTO prism_banking_transactions (identifier, spend_type, amount, transaction_type, name, description, `timestamp`) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        {identifier, 'cash', currenBalance, 'deposit', 'Account Created', 'Initial deposit when creating bank account', os.time()}
                    )
                end
                if Config.CardItemConfig.cardAsItem and not isSociety then
                    AddItemToInventory(src, accno)
                end
                if isSociety and Config.SocietySync and Config.SocietySync.enabled then
                    local existingBalance = GetFrameworkSocietyBalance(societyJob)
                    if existingBalance and existingBalance > 0 then
                        exports.oxmysql:execute('UPDATE prism_banking_accounts SET balance = ? WHERE accno = ?', {existingBalance, accno})
                        DebugPrint("[SOCIETY SYNC] Pulled existing framework balance for: " .. societyJob .. " = $" .. existingBalance)
                    else
                        SetFrameworkSocietyBalance(societyJob, 0)
                        DebugPrint("[SOCIETY SYNC] Created framework society account for: " .. societyJob)
                    end
                end

                local initialBalance = (isNew and not isSociety) and currenBalance or 0
                LogAccountCreated(src, accno, type, initialBalance)

                Wait(50)
                success:resolve({success = true, accountNumber = accno})
            end
        )
    end)
    return Citizen.Await(success)
end
GetCreditScore = function(source)
    local Player = GetPlayer(source)
    if not Player then return Config.DefaultCreditScore end
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    local result = exports.oxmysql:executeSync('SELECT creditscore FROM prism_banking_settings WHERE identifier = ?', {
        identifier
    })
    if result and result[1] and result[1].creditscore then
        return result[1].creditscore
    else
        exports.oxmysql:execute('INSERT IGNORE INTO prism_banking_settings (identifier, creditscore, allow_transfer, is_optimized, wit_level, mcard_level) VALUES (?, ?, ?, ?, ?, ?)', {
            identifier,
            Config.DefaultCreditScore,
            1,
            1,
            1,
            1
        })
        return Config.DefaultCreditScore
    end
end
exports('GetCreditScore', GetCreditScore)

AddCreditScore = function(source, amount)
    if not amount or amount <= 0 then return false end
    local currentScore = GetCreditScore(source)
    local maxScore = Config.CreditScoreSystem and Config.CreditScoreSystem.maxScore or 850
    local newScore = math.min(currentScore + amount, maxScore)
    return UpdateCreditScore(source, newScore)
end
exports('AddCreditScore', AddCreditScore)

RemoveCreditScore = function(source, amount)
    if not amount or amount <= 0 then return false end
    local currentScore = GetCreditScore(source)
    local minScore = Config.CreditScoreSystem and Config.CreditScoreSystem.minScore or 300
    local newScore = math.max(currentScore - amount, minScore)
    return UpdateCreditScore(source, newScore)
end
exports('RemoveCreditScore', RemoveCreditScore)

SetCreditScore = function(source, score)
    if not score then return false end
    local minScore = Config.CreditScoreSystem and Config.CreditScoreSystem.minScore or 300
    local maxScore = Config.CreditScoreSystem and Config.CreditScoreSystem.maxScore or 850
    local newScore = math.max(minScore, math.min(score, maxScore))
    return UpdateCreditScore(source, newScore)
end
exports('SetCreditScore', SetCreditScore)

UpdateCreditScore = function(source, newScore)
    local Player = GetPlayer(source)
    if not Player then return false end
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    exports.oxmysql:execute(
        'INSERT INTO prism_banking_settings (identifier, creditscore, allow_transfer, is_optimized, wit_level, mcard_level) VALUES (?, ?, 1, 1, 1, 1) ON DUPLICATE KEY UPDATE creditscore = VALUES(creditscore)',
        {identifier, newScore}
    )
    return true
end
exports('UpdateCreditScore', UpdateCreditScore)

CalculateCreditScore = function(source)
    local Player = GetPlayer(source)
    if not Player then return Config.DefaultCreditScore end

    local currentScore = GetCreditScore(source)

    if Config.CreditScoreSystem and not Config.CreditScoreSystem.useInbuilt then
        return currentScore
    end

    local balanceThreshold = Config.CreditScoreSystem and Config.CreditScoreSystem.balanceThreshold or 10000
    local balanceThresholdPenalty = Config.CreditScoreSystem and Config.CreditScoreSystem.balanceThresholdPenalty or 3
    local minScore = Config.CreditScoreSystem and Config.CreditScoreSystem.minScore or 300
    local maxScore = Config.CreditScoreSystem and Config.CreditScoreSystem.maxScore or 850
    local maxChangePerCalc = Config.CreditScoreSystem and Config.CreditScoreSystem.maxChangePerCalculation or 15

    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    local transactions = GetTransactionHistory(source)
    local transactionCount = #transactions
    local accounts = GetBankAccounts(source)
    local totalBalance = 0
    for _, account in ipairs(accounts) do
        if not account.isSociety then
            totalBalance = totalBalance + account.balance
        end
    end
    local balanceBonus = math.min(math.floor(totalBalance / 25000), 50)
    local recentDeposits = 0
    local recentWithdrawals = 0
    local recentTransactionCount = math.min(10, transactionCount)
    if recentTransactionCount > 0 then
        local startIndex = math.max(1, transactionCount - 9)
        for i = startIndex, transactionCount do
            local transaction = transactions[i]
            if transaction then
                if transaction.transactionType == "deposit" then
                    recentDeposits = recentDeposits + transaction.amount
                elseif transaction.transactionType == "withdraw" then
                    recentWithdrawals = recentWithdrawals + transaction.amount
                end
            end
        end
    end
    local scoreChange = 0
    if totalBalance < balanceThreshold then
        scoreChange = scoreChange - balanceThresholdPenalty
    end
    if recentDeposits > recentWithdrawals then
        local netDeposits = recentDeposits - recentWithdrawals
        scoreChange = scoreChange + math.min(10, math.floor(netDeposits / 50000))
    elseif recentWithdrawals > recentDeposits then
        local netWithdrawals = recentWithdrawals - recentDeposits
        scoreChange = scoreChange - math.min(10, math.floor(netWithdrawals / 50000))
    end
    if transactionCount > 0 then
        scoreChange = scoreChange + math.min(2, math.floor(transactionCount / 15))
    end
    scoreChange = scoreChange + math.floor(balanceBonus * 0.05)
    scoreChange = math.max(-maxChangePerCalc, math.min(maxChangePerCalc, scoreChange))
    local newScore = currentScore + scoreChange
    newScore = math.max(minScore, math.min(maxScore, newScore))
    UpdateCreditScore(source, newScore)
    return newScore
end
exports('CalculateCreditScore', CalculateCreditScore)

GetCreditScoreAsync = function(source, callback)
    local Player = GetPlayer(source)
    if not Player then
        callback(Config.DefaultCreditScore)
        return
    end
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    exports.oxmysql:execute('SELECT creditscore FROM prism_banking_settings WHERE identifier = ?', {
        identifier
    }, function(result)
        if result and result[1] and result[1].creditscore then
            callback(result[1].creditscore)
        else
            exports.oxmysql:execute('INSERT IGNORE INTO prism_banking_settings (identifier, creditscore, allow_transfer, is_optimized, wit_level, mcard_level) VALUES (?, ?, ?, ?, ?, ?)', {
                identifier,
                Config.DefaultCreditScore,
                1, 1, 1, 1
            }, function()
                callback(Config.DefaultCreditScore)
            end)
        end
    end)
end
GetBankingSettings = function(source)
    local Player = GetPlayer(source)
    if not Player then return nil end
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    local result = exports.oxmysql:executeSync('SELECT identifier, creditscore, allow_transfer, is_optimized, wit_level, mcard_level FROM prism_banking_settings WHERE identifier = ?', {
        identifier
    })
    if result and result[1] then
        return result[1]
    else
        exports.oxmysql:execute('INSERT IGNORE INTO prism_banking_settings (identifier, creditscore, allow_transfer, is_optimized, wit_level, mcard_level) VALUES (?, ?, ?, ?, ?, ?)', {
            identifier,
            Config.DefaultCreditScore,
            1, 1, 1, 1
        })
        return {
            identifier = identifier,
            creditscore = Config.DefaultCreditScore,
            allow_transfer = 1,
            is_optimized = 1,
            wit_level = 1,
            mcard_level = 1
        }
    end
end
exports('GetBankingSettings', GetBankingSettings)

GetBankingSettingsByIdentifier = function(identifier)
    local result = exports.oxmysql:executeSync('SELECT identifier, creditscore, allow_transfer, is_optimized, wit_level, mcard_level FROM prism_banking_settings WHERE identifier = ?', {
        identifier
    })
    if result and result[1] then
        return result[1]
    else
        exports.oxmysql:execute('INSERT IGNORE INTO prism_banking_settings (identifier, creditscore, allow_transfer, is_optimized, wit_level, mcard_level) VALUES (?, ?, ?, ?, ?, ?)', {
            identifier,
            Config.DefaultCreditScore,
            1, 1, 1, 1
        })
        return {
            identifier = identifier,
            creditscore = Config.DefaultCreditScore,
            allow_transfer = 1,
            is_optimized = 1,
            wit_level = 1,
            mcard_level = 1
        }
    end
end

GetPlayerWithdrawalLevel = function(source)
    local settings = GetBankingSettings(source)
    return settings and settings.wit_level or 1
end
exports('GetPlayerWithdrawalLevel', GetPlayerWithdrawalLevel)
GetPlayerAccountLevel = function(source)
    local settings = GetBankingSettings(source)
    return settings and settings.mcard_level or 1
end
exports('GetPlayerAccountLevel', GetPlayerAccountLevel)
GetMaxWithdrawal = function(source)
    local level = GetPlayerWithdrawalLevel(source)
    return Config.BankingLevels.WithDrawLevel[level].maxWithdraw
end
GetMaxAccounts = function(source)
    local level = GetPlayerAccountLevel(source)
    return Config.BankingLevels.AccountsLevel[level].maxAccounts
end
UpgradeWithdrawalLevel = function(source)
    local Player = GetPlayer(source)
    if not Player then return false end
    local currentLevel = GetPlayerWithdrawalLevel(source)
    local nextLevel = currentLevel + 1
    if not Config.BankingLevels.WithDrawLevel[nextLevel] then
        return false, Locale.server.already_maxLevel
    end
    local upgradeCost = Config.BankingLevels.WithDrawLevel[nextLevel].price
    local playerMoney = GetPlayerMoney(source)
    if playerMoney < upgradeCost then
        return false, Locale.server.insuff_fund
    end
    RemovePlayerMoney(source, 'cash', upgradeCost)
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    exports.oxmysql:execute('UPDATE prism_banking_settings SET wit_level = ? WHERE identifier = ?', {
        nextLevel,
        identifier
    })

    LogUpgradePurchased(source, "Withdrawal Level", nextLevel, upgradeCost)

    return true, string.format(Locale.server.withdrawal_lvl_upgraded, nextLevel)
end
UpgradeAccountLevel = function(source)
    local Player = GetPlayer(source)
    if not Player then return false end
    local currentLevel = GetPlayerAccountLevel(source)
    local nextLevel = currentLevel + 1
    if not Config.BankingLevels.AccountsLevel[nextLevel] then
        return false, Locale.server.already_maxAccount
    end
    local upgradeCost = Config.BankingLevels.AccountsLevel[nextLevel].price
    local playerMoney = GetPlayerMoney(source)
    if playerMoney < upgradeCost then
        return false, Locale.server.insuff_fund
    end
    RemovePlayerMoney(source, 'cash', upgradeCost)
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    exports.oxmysql:execute('UPDATE prism_banking_settings SET mcard_level = ? WHERE identifier = ?', {
        nextLevel,
        identifier
    })

    LogUpgradePurchased(source, "Account Level", nextLevel, upgradeCost)

    return true, string.format(Locale.server.account_lvl_upgraded, nextLevel)
end
AddMoneyBankToAccount = function(source, selectedAccount, amount)
    local success = promise.new()
    local Player = GetPlayer(source)
    if not Player then
        success:resolve(false)
        return
    end
    if selectedAccount.primary then
        AddPlayerMoney(source, 'bank', amount)
    end
    exports.oxmysql:execute('UPDATE prism_banking_accounts SET balance = balance + ? WHERE accno = ?', {
        amount,
        selectedAccount.accountNumber
    }, function(result)
        if result.affectedRows > 0 then
            if selectedAccount.isSociety and selectedAccount.societyJob and Config.SocietySync and Config.SocietySync.enabled then
                AddFrameworkSocietyMoney(selectedAccount.societyJob, amount)
            end
            success:resolve(true)
        else
            success:resolve(false)
        end
    end)
    return Citizen.Await(success)
end
RemoveMoneyBankFromAccount = function(source, selectedAccount, amount)
    local success = promise.new()
    local Player = GetPlayer(source)
    if not Player then
        DebugPrint("[BANKING] RemoveMoneyBankFromAccount failed: Player not found")
        success:resolve(false)
        return Citizen.Await(success)
    end

    exports.oxmysql:execute('UPDATE prism_banking_accounts SET balance = balance - ? WHERE accno = ? AND balance >= ?', {
        amount,
        selectedAccount.accountNumber,
        amount
    }, function(result)
        if result.affectedRows > 0 then
            DebugPrint("[BANKING] Successfully removed $" .. amount .. " from account " .. selectedAccount.accountNumber)
            if selectedAccount.primary then
                RemovePlayerMoney(source, 'bank', amount)
                DebugPrint("[BANKING] Successfully removed $" .. amount .. " from framework bank")
            end
            if selectedAccount.isSociety and selectedAccount.societyJob and Config.SocietySync and Config.SocietySync.enabled then
                RemoveFrameworkSocietyMoney(selectedAccount.societyJob, amount)
            end
            success:resolve(true)
        else
            DebugPrint("[BANKING] Failed to remove money from account " .. selectedAccount.accountNumber .. " - insufficient balance or account not found (race condition prevented)")
            success:resolve(false)
        end
    end)
    return Citizen.Await(success)
end
AddTransactionToHistory = function(source, transactionType, amount, spendType, transactionName, transactionDescription, account)
    local Player = GetPlayer(source)
    if not Player then return false end

    local identifier
    if account and account.isNomineeAccount and account.identifier then
        identifier = account.identifier
        DebugPrint("[TRANSACTION HISTORY] Adding transaction to owner's history (nominee transaction)")
    else
        identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    end

    if not transactionName then
        if transactionType == 'deposit' then
            transactionName = 'Bank Deposit'
        elseif transactionType == 'withdraw' then
            transactionName = 'Bank Withdrawal'
        elseif transactionType == 'transfer' then
            transactionName = 'Bank Transfer'
        else
            transactionName = 'Transaction'
        end
    end
    if not transactionDescription then
        if transactionType == 'deposit' then
            transactionDescription = spendType == 'cash' and 'Cash deposited to bank account' or ('Deposit from ' .. spendType)
        elseif transactionType == 'withdraw' then
            transactionDescription = 'Cash withdrawn from bank account'
        elseif transactionType == 'transfer' then
            transactionDescription = 'Money transferred to another account'
        else
            transactionDescription = 'Banking transaction'
        end
    end
    exports.oxmysql:execute(
        'INSERT INTO prism_banking_transactions (identifier, spend_type, amount, transaction_type, name, description, `timestamp`) VALUES (?, ?, ?, ?, ?, ?, ?)',
        {identifier, spendType, amount, transactionType, transactionName, transactionDescription, os.time()}
    )
    return true
end
SyncPrimaryAccountWithFramework = function(source)
    local Player = GetPlayer(source)
    if not Player then return false end
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    local frameworkBankBalance = Config.Framework == 'esx' and Player.getAccount('bank').money or Player.PlayerData.money['bank']
    local result = exports.oxmysql:executeSync('SELECT balance FROM prism_banking_accounts WHERE identifier = ? AND `primary` = 1 LIMIT 1', {
        identifier
    })
    if result and result[1] then
        local accountBalance = result[1].balance
        if accountBalance ~= frameworkBankBalance then
            exports.oxmysql:execute('UPDATE prism_banking_accounts SET balance = ? WHERE identifier = ? AND `primary` = 1', {
                frameworkBankBalance,
                identifier
            })
            return true
        end
    end
    return false
end
InitializeTransaction = function(source, selectedAccount, transactionType, amount, userId)
    local Player = GetPlayer(source)
    if not Player then return false end
    if type(amount) ~= "number" or amount <= 0 or amount ~= math.floor(amount) or amount > 999999999 then
        DebugPrint("[BANKING] Invalid amount: " .. tostring(amount))
        TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.invalid_amount)
        return false
    end
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    local accountOwned = false
    local acctResult = exports.oxmysql:executeSync(
        'SELECT identifier, type, is_society FROM prism_banking_accounts WHERE accno = ? LIMIT 1',
        {selectedAccount.accountNumber}
    )
    if acctResult and #acctResult > 0 then
        local row = acctResult[1]
        if row.is_society == 1 then
            accountOwned = IsPlayerEligibleForSociety(source, row.type)
        elseif Config.CardItemConfig.cardStealingEnabled and Config.CardItemConfig.cardAsItem then
            accountOwned = true
            if row.identifier ~= identifier then
                DebugPrint("[BANKING] Player " .. source .. " using stolen card for account " .. selectedAccount.accountNumber)
            end
        else
            accountOwned = (row.identifier == identifier)
        end
    end
    if not accountOwned then
        local nomineeResult = exports.oxmysql:executeSync(
            'SELECT 1 FROM prism_banking_nominees WHERE account_number = ? AND nominee_identifier = ? LIMIT 1',
            {selectedAccount.accountNumber, identifier}
        )
        if nomineeResult and #nomineeResult > 0 then
            accountOwned = true
            DebugPrint("[BANKING] Player " .. source .. " accessing nominee account " .. selectedAccount.accountNumber)
        end
    end
    if not accountOwned then
        DebugPrint("[BANKING] Player " .. source .. " attempted to access account they don't own: " .. tostring(selectedAccount.accountNumber))
        TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.you_dont_own)
        return false
    end
    local success = false
    local updatedData = nil
    if transactionType == 'deposit' then
        local playerMoney = GetPlayerMoney(source)
        if playerMoney < amount then
            DebugPrint("[BANKING] Player " .. source .. " attempted to deposit $" .. amount .. " but only has $" .. playerMoney .. " in cash")
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.you_dont_have_enough_cash)
            return false
        end
        local moneyRemoved = RemovePlayerMoney(source, 'cash', amount)
        if moneyRemoved then
            local netAmount, taxAmount, taxInfo = ApplyTransactionTax(source, amount, transactionType, selectedAccount.type)
            local oldBalance = selectedAccount.balance or 0
            success = AddMoneyBankToAccount(source, selectedAccount, netAmount)
            if success then
                TriggerPhoneNotification(source, amount..'$ added to your bank account')
                AddTransactionToHistory(source, 'deposit', netAmount, 'cash', 'Bank Deposit', 'Cash deposited to bank account', selectedAccount)

                if selectedAccount.isSociety then
                    LogSocietyDeposit(source, selectedAccount.type or "Unknown", selectedAccount.accountNumber, netAmount, oldBalance + netAmount, oldBalance)
                else
                    LogDeposit(source, selectedAccount.accountNumber, netAmount, oldBalance + netAmount, oldBalance)
                end

                if taxAmount > 0 then
                    DebugPrint("[TAX] Deposit tax applied: $" .. taxAmount .. " | Net deposit: $" .. netAmount .. " | " .. taxInfo)
                    LogTaxCollected(source, selectedAccount.accountNumber, taxAmount, amount, taxInfo, 'deposit')
                end
            end
        end
    elseif transactionType == 'withdraw' then
        local settings
        if selectedAccount.isNomineeAccount and selectedAccount.identifier then
            settings = GetBankingSettingsByIdentifier(selectedAccount.identifier)
            DebugPrint("[BANKING] Nominee withdrawal - using owner's withdrawal level")
        else
            settings = GetBankingSettings(source)
        end

        local withdrawalLevel = settings.wit_level or 1
        local maxWithdraw = Config.BankingLevels.WithDrawLevel[withdrawalLevel].maxWithdraw
        if amount > maxWithdraw then
            DebugPrint("[BANKING] Withdrawal denied: Amount $" .. amount .. " exceeds level " .. withdrawalLevel .. " limit of $" .. maxWithdraw)
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.withdraw_denied)
            return false
        end

        local result = exports.oxmysql:executeSync('SELECT balance FROM prism_banking_accounts WHERE accno = ? LIMIT 1', {selectedAccount.accountNumber})
        local oldBalance = result and result[1] and result[1].balance or 0


        success = RemoveMoneyBankFromAccount(source, selectedAccount, amount)

        if not success then
            DebugPrint("[BANKING] Player " .. source .. " withdrawal of $" .. amount .. " failed - insufficient balance")
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.not_enough_money_in_account)
            return false
        end
        if success then
            AddPlayerMoney(source, 'cash', amount)
            TriggerPhoneNotification(source, amount..'$ withdrawn from your bank account')
            AddTransactionToHistory(source, 'withdraw', amount, 'cash', 'Bank Withdrawal', 'Cash withdrawn from bank account', selectedAccount)

            if selectedAccount.isSociety then
                LogSocietyWithdraw(source, selectedAccount.type or "Unknown", selectedAccount.accountNumber, amount, oldBalance - amount, oldBalance)
            else
                LogWithdraw(source, selectedAccount.accountNumber, amount, oldBalance - amount, oldBalance)
            end
        end
    elseif transactionType == 'transfer' then
        if selectedAccount.isSociety then
            DebugPrint("[BANKING] Player " .. source .. " attempted to transfer from society account")
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, "Transfers are not allowed from society accounts")
            return false
        end

        if selectedAccount.isNomineeAccount then
            DebugPrint("[BANKING] Player " .. source .. " attempted to transfer from nominee account")
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, "Nominees cannot transfer money")
            return false
        end

        if not userId or userId == '' then
            DebugPrint("[BANKING] Player " .. source .. " attempted to transfer $" .. amount .. " but no target player was specified")
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.no_target_player)
            return false
        end

        if tonumber(userId) == source then
            DebugPrint("[BANKING] Player " .. source .. " attempted to transfer money to themselves")
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, "You cannot transfer money to yourself")
            return false
        end

        local targetPlayer = GetPlayer(tonumber(userId))
        if not targetPlayer then
            DebugPrint("[BANKING] Player " .. source .. " attempted to transfer $" .. amount .. " but target player " .. userId .. " was not found")
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.target_player_not_found)
            return false
        end
        local targetIdentifier = Config.Framework == 'esx' and targetPlayer.identifier or targetPlayer.PlayerData.citizenid
        local targetSettings = exports.oxmysql:executeSync('SELECT allow_transfer FROM prism_banking_settings WHERE identifier = ?', {
            targetIdentifier
        })
        if not targetSettings or not targetSettings[1] or targetSettings[1].allow_transfer == 0 then
            DebugPrint("[BANKING] Transfer denied: Target player has transfers disabled")
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.transfer_denied)
            return false
        end
        local targetResult = exports.oxmysql:executeSync('SELECT accno, `primary` FROM prism_banking_accounts WHERE identifier = ? AND `primary` = 1 LIMIT 1', {
            targetIdentifier
        })
        if not targetResult or not targetResult[1] then
            DebugPrint("[BANKING] Transfer denied: Target player " .. userId .. " does not have a primary bank account")
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.transfer_denied_no_bank_account)
            return false
        end
        local targetAccountNumber = targetResult[1].accno
        local balances = exports.oxmysql:executeSync('SELECT accno, balance FROM prism_banking_accounts WHERE accno IN (?, ?)', {selectedAccount.accountNumber, targetAccountNumber})
        local senderBalanceBefore = 0
        local receiverBalanceBefore = 0
        if balances then
            for _, row in ipairs(balances) do
                if row.accno == selectedAccount.accountNumber then
                    senderBalanceBefore = row.balance or 0
                elseif row.accno == targetAccountNumber then
                    receiverBalanceBefore = row.balance or 0
                end
            end
        end

        success = RemoveMoneyBankFromAccount(source, selectedAccount, amount)

        if not success then
            DebugPrint("[BANKING] Player " .. source .. " transfer of $" .. amount .. " failed - insufficient balance")
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.not_enough_money_in_account)
            return false
        end

        if success then
            exports.oxmysql:execute('UPDATE prism_banking_accounts SET balance = balance + ? WHERE accno = ?', {
                amount,
                targetAccountNumber
            })
            if targetResult[1].primary == 1 then
                AddPlayerMoney(tonumber(userId), 'bank', amount)
            end
            local targetPlayerName = Config.Framework == 'esx' and targetPlayer.getName() or (targetPlayer.PlayerData.charinfo.firstname .. ' ' .. targetPlayer.PlayerData.charinfo.lastname)
            AddTransactionToHistory(source, 'transfer', amount, 'bank', 'Bank Transfer', 'Money transferred to ' .. targetPlayerName, selectedAccount)
            TriggerPhoneNotification(source, amount..'$ transferred to '..targetPlayerName)

            LogTransfer(source, tonumber(userId), selectedAccount.accountNumber, targetAccountNumber, amount, senderBalanceBefore - amount, receiverBalanceBefore + amount)
        end
    end
    if success then
        if selectedAccount.isSociety then
            Wait(100)
        end
        local creditScore
        if selectedAccount.isSociety then
            creditScore = GetCreditScore(source)
        else
            creditScore = CalculateCreditScore(source)
        end
        updatedData = BuildPlayerData(source, {creditScore = creditScore})
        if transactionType == 'transfer' then
            DebugPrint("[BANKING] Player " .. source .. " successfully transferred $" .. amount .. " to player " .. userId)
        elseif transactionType == 'withdraw' then
            DebugPrint("[BANKING] Player " .. source .. " successfully withdrew $" .. amount)
        elseif transactionType == 'deposit' then
            DebugPrint("[BANKING] Player " .. source .. " successfully deposited $" .. amount)
        end
        TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.transaction_successful)
    end
    return success, updatedData
end
ToggleBankingSetting = function(source, settingName)
    local Player = GetPlayer(source)
    if not Player then return false, nil end
    local allowedSettings = {
        allow_transfer = true,
        is_optimized = true
    }
    if not allowedSettings[settingName] then
        DebugPrint("[BANKING] Attempted to toggle invalid setting: " .. tostring(settingName))
        return false, nil
    end
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    local settings = GetBankingSettings(source)
    if not settings then return false, nil end
    local newValue = (settings[settingName] == 1) and 0 or 1
    if settingName == 'allow_transfer' then
        exports.oxmysql:execute('UPDATE prism_banking_settings SET allow_transfer = ? WHERE identifier = ?', {
            newValue,
            identifier
        })
    elseif settingName == 'is_optimized' then
        exports.oxmysql:execute('UPDATE prism_banking_settings SET is_optimized = ? WHERE identifier = ?', {
            newValue,
            identifier
        })
    end
    local updatedData = BuildPlayerData(source)
    return true, updatedData
end
ChangeAccountPin = function(source, accountNumber, oldPin, newPin)
    local Player = GetPlayer(source)
    if not Player then return false, "Player not found", nil end

    if not HasAccountAccess(source, accountNumber, true) then
        DebugPrint("[BANKING] PIN change denied for player " .. source .. " - not account owner (possibly nominee)")
        return false, Locale.server.only_owner_can_change_pin, nil
    end

    if type(newPin) ~= "string" or #newPin ~= 5 or not tonumber(newPin) then
        DebugPrint("[BANKING] Invalid PIN format from player " .. source)
        return false, Locale.server.invalid_pin_format, nil
    end
    oldPin = tostring(oldPin)
    if type(oldPin) ~= "string" or #oldPin ~= 5 or not tonumber(oldPin) then
        DebugPrint("[BANKING] Invalid old PIN format from player " .. source)
        return false, Locale.server.invalid_pin_format, nil
    end
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    local result = exports.oxmysql:executeSync('SELECT 1 FROM prism_banking_accounts WHERE identifier = ? AND accno = ? AND pin = ? AND (is_society = 0 OR is_society IS NULL) LIMIT 1', {
        identifier,
        accountNumber,
        oldPin
    })
    if not result or #result == 0 then
        DebugPrint("[BANKING] PIN change denied for player " .. source .. " - account not found or wrong PIN")
        return false, Locale.server.invalid_pin_account, nil
    end
    local pinChangeCost = Config.PinChangeCost
    local playerMoney = GetPlayerMoney(source)
    if playerMoney < pinChangeCost then
        return false, Locale.server.insuff_fund_pin, nil
    end
    RemovePlayerMoney(source, 'cash', pinChangeCost)
    exports.oxmysql:execute('UPDATE prism_banking_accounts SET pin = ? WHERE identifier = ? AND accno = ?', {
        newPin,
        identifier,
        accountNumber
    })

    LogPinChanged(source, accountNumber)

    local updatedData = BuildPlayerData(source)
    return true, Locale.server.pin_changed, updatedData
end
exports('AddBankingTransaction', function(source, transactionType, amount, spendType, applyTax, transactionName, transactionDescription)
    if type(source) ~= "number" or source <= 0 then
        DebugPrint("[BANKING] AddBankingTransaction: Invalid source: " .. tostring(source))
        return 0, 0
    end
    if type(amount) ~= "number" or amount <= 0 or amount ~= math.floor(amount) then
        DebugPrint("[BANKING] AddBankingTransaction: Invalid amount: " .. tostring(amount))
        return 0, 0
    end
    local validTransactionTypes = {
        deposit = true,
        withdraw = true,
        transfer = true,
        interest = true
    }
    if not validTransactionTypes[transactionType] then
        DebugPrint("[BANKING] AddBankingTransaction: Invalid transaction type: " .. tostring(transactionType))
        return 0, 0
    end
    if type(spendType) ~= "string" or spendType == "" then
        DebugPrint("[BANKING] AddBankingTransaction: Invalid spend type: " .. tostring(spendType))
        return 0, 0
    end
    local Player = GetPlayer(source)
    if not Player then
        DebugPrint("[BANKING] AddBankingTransaction: Player not found for source: " .. source)
        return 0, 0
    end
    local accounts = GetBankAccounts(source)
    local primaryAccount = nil
    for _, account in ipairs(accounts) do
        if account.primary then
            primaryAccount = account
            break
        end
    end
    if not primaryAccount then
        DebugPrint("[BANKING] AddBankingTransaction: Player has no primary account")
        return 0, 0
    end
    if applyTax == nil then applyTax = true end
    local netAmount = amount
    local taxAmount = 0
    local taxInfo = "No tax applied"
    if applyTax and transactionType == 'deposit' then
        netAmount, taxAmount, taxInfo = ApplyTransactionTax(source, amount, transactionType, primaryAccount.type)
        DebugPrint(string.format("[BANKING] Export transaction tax: $%s -> $%s (tax: $%s) | %s", amount, netAmount, taxAmount, taxInfo))
    end
    if not transactionName or transactionName == "" then
        transactionName = spendType:gsub("_", " "):gsub("(%a)([%w_']*)", function(first, rest)
            return first:upper() .. rest:lower()
        end)
    end
    if not transactionDescription or transactionDescription == "" then
        local readableSpendType = spendType:gsub("_", " ")
        if transactionType == 'deposit' then
            transactionDescription = string.format("Deposit from %s", readableSpendType)
        elseif transactionType == 'withdraw' then
            transactionDescription = string.format("Withdrawal for %s", readableSpendType)
        elseif transactionType == 'transfer' then
            transactionDescription = string.format("Transfer via %s", readableSpendType)
        elseif transactionType == 'interest' then
            transactionDescription = string.format("Interest earned on %s", readableSpendType)
        else
            transactionDescription = string.format("Transaction via %s", readableSpendType)
        end
    end
    AddTransactionToHistory(source, transactionType, netAmount, spendType, transactionName, transactionDescription)
    DebugPrint(string.format("[BANKING] Transaction logged from external resource: %s $%s (%s) | Original: $%s | Tax: $%s | Net to add: $%s",
        transactionType, netAmount, spendType, amount, taxAmount, netAmount))
    return netAmount, taxAmount
end)
CalculateInterest = function(source)
    if not Config.InterestSystem.enabled then
        return false
    end
    local Player = GetPlayer(source)
    if not Player then return false end
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    local currentTime = os.time()
    local accounts = GetBankAccounts(source)
    if not accounts or #accounts == 0 then
        return false
    end
    local accountNumbers = {}
    for _, account in ipairs(accounts) do
        if not account.isSociety then
            accountNumbers[#accountNumbers+1] = account.accountNumber
        end
    end
    local interestDates = {}
    if #accountNumbers > 0 then
        local placeholders = string.rep('?,', #accountNumbers):sub(1, -2)
        local dateResults = exports.oxmysql:executeSync(
            'SELECT accno, last_interest_date FROM prism_banking_accounts WHERE accno IN (' .. placeholders .. ')',
            accountNumbers
        )
        if dateResults then
            for _, row in ipairs(dateResults) do
                interestDates[row.accno] = row.last_interest_date
            end
        end
    end

    local totalInterestEarned = 0
    for _, account in ipairs(accounts) do
        if account.isSociety then
            goto continue
        end
        local lastInterestDate = interestDates[account.accountNumber] or nil
        local shouldPayInterest = false
        if not lastInterestDate then
            shouldPayInterest = true
        else
            local timeDiff = currentTime - lastInterestDate
            if Config.InterestSystem.intervalType == 'hour' then
                local hoursElapsed = timeDiff / 3600
                if hoursElapsed >= Config.InterestSystem.intervalAmount then
                    shouldPayInterest = true
                end
            elseif Config.InterestSystem.intervalType == 'day' then
                local daysElapsed = timeDiff / 86400
                if daysElapsed >= Config.InterestSystem.intervalAmount then
                    shouldPayInterest = true
                end
            elseif Config.InterestSystem.intervalType == 'month' then
                local monthsElapsed = timeDiff / 2592000
                if monthsElapsed >= Config.InterestSystem.intervalAmount then
                    shouldPayInterest = true
                end
            end
        end
        if shouldPayInterest and account.balance >= Config.InterestSystem.minBalance then
            local interestRate = Config.CardSettings[account.type].InterestRate or 0.05
            local interest = math.floor(account.balance * (interestRate / 100))
            interest = math.min(interest, Config.InterestSystem.maxInterest)
            if interest > 0 then
                if Config.TaxSystem.taxableTransactions['interest'] then
                    interest = ApplyTransactionTax(source, interest, 'interest', account.type)
                end
                AddMoneyBankToAccount(source, account, interest)
                exports.oxmysql:execute('UPDATE prism_banking_accounts SET last_interest_date = ? WHERE accno = ?', {
                    currentTime,
                    account.accountNumber
                })
                AddTransactionToHistory(source, 'deposit', interest, 'interest', 'Interest Earned', 'Interest earned on account balance', account)
                totalInterestEarned = totalInterestEarned + interest
                DebugPrint("[BANKING] Interest paid to player " .. source .. " account " .. account.accountNumber .. ": $" .. interest)
            end
        end
        ::continue::
    end
    if totalInterestEarned > 0 then
        return true, totalInterestEarned
    end
    return false, 0
end
CheckEligibilityToCreateAccount = function(source)
    local Player = GetPlayer(source)
    if not Player then return false end
    local accounts = GetBankAccounts(source)
    local accountLevel = GetPlayerAccountLevel(source)
    local personalAccountCount = 0
    for _, account in ipairs(accounts) do
        if not account.isSociety and not account.isNomineeAccount then
            personalAccountCount = personalAccountCount + 1
        end
    end
    if personalAccountCount >= Config.BankingLevels.AccountsLevel[accountLevel].maxAccounts then
        return false
    end
    return true
end
local function IsPlayerTaxExempt(source, accountType)
    if not Config.TaxSystem.enabled or not Config.TaxSystem.exemptions.enabled then
        return false
    end
    local Player = GetPlayer(source)
    if not Player then return false end
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    if Config.TaxSystem.exemptions.citizens then
        for _, exemptId in ipairs(Config.TaxSystem.exemptions.citizens) do
            if identifier == exemptId then
                return true
            end
        end
    end
    if Config.TaxSystem.exemptions.jobs then
        local jobName = Config.Framework == 'esx' and Player.job.name or Player.PlayerData.job.name
        for _, exemptJob in ipairs(Config.TaxSystem.exemptions.jobs) do
            if jobName == exemptJob then
                return true
            end
        end
    end
    return false
end
local function GetTaxHolidayRate()
    if not Config.TaxSystem.holidays.enabled then
        return nil
    end
    local date = os.date("*t")
    for _, holiday in ipairs(Config.TaxSystem.holidays.dates) do
        if holiday[1] == date.month and holiday[2] == date.day then
            return holiday[3]
        end
    end
    return nil
end
CalculateTax = function(amount, transactionType)
    if not Config.TaxSystem.enabled then
        return 0, 0, "System Disabled"
    end
    if not Config.TaxSystem.taxableTransactions[transactionType] then
        return 0, 0, "Transaction Type Exempt"
    end
    local holidayRate = GetTaxHolidayRate()
    local totalTax = 0
    local appliedRate = 0
    local bracketInfo = ""
    if Config.TaxSystem.advanced.progressive then
        local remainingAmount = amount
        for _, bracket in ipairs(Config.TaxSystem.brackets) do
            if remainingAmount <= 0 then break end
            local bracketMin = bracket.min
            local bracketMax = bracket.max
            local bracketRate = bracket.rate
            if holidayRate then
                bracketRate = bracketRate * (holidayRate / 100)
            end
            if amount > bracketMin then
                local taxableInBracket = math.min(remainingAmount, bracketMax - bracketMin)
                if amount >= bracketMax then
                    taxableInBracket = bracketMax - bracketMin
                else
                    taxableInBracket = amount - bracketMin
                end
                local taxInBracket = (taxableInBracket * bracketRate) / 100
                totalTax = totalTax + taxInBracket
                remainingAmount = remainingAmount - taxableInBracket
                if taxInBracket > 0 then
                    bracketInfo = bracket.description
                    appliedRate = bracketRate
                end
            end
        end
    else
        for _, bracket in ipairs(Config.TaxSystem.brackets) do
            if amount >= bracket.min and amount <= bracket.max then
                appliedRate = bracket.rate
                if holidayRate then
                    appliedRate = appliedRate * (holidayRate / 100)
                end
                totalTax = (amount * appliedRate) / 100
                bracketInfo = bracket.description
                break
            end
        end
    end
    totalTax = math.floor(totalTax + 0.5)
    if totalTax < Config.TaxSystem.advanced.minTaxAmount then
        totalTax = 0
        return 0, 0, "Below Minimum Tax Amount"
    end
    return totalTax, appliedRate, bracketInfo
end
ProcessTaxPayment = function(source, taxAmount, transactionType, originalAmount)
    if taxAmount <= 0 then return true end
    local Player = GetPlayer(source)
    if not Player then return false end
    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    if Config.TaxSystem.advanced.logTransactions then
        exports.oxmysql:execute(
            'INSERT INTO prism_banking_tax_logs (identifier, amount, tax_amount, transaction_type, `timestamp`, `date`) VALUES (?, ?, ?, ?, ?, ?)',
            {identifier, originalAmount, taxAmount, transactionType, os.time(), os.date("%Y-%m-%d %H:%M:%S")}
        )
    end
    AddTaxToSociety(taxAmount)
    if Config.TaxSystem.collection.notification then
        local taxRate = (taxAmount / originalAmount) * 100
        local message = string.format("Tax deducted: $%s (%.1f%%)", taxAmount, taxRate)
        TriggerClientEvent('prism-banking:client:sendNotification', source, "Tax Notice", message)
    end
    return true
end
ApplyTransactionTax = function(source, amount, transactionType, accountType)
    if not Config.TaxSystem.enabled then
        return amount, 0, "Tax system disabled"
    end
    if IsPlayerTaxExempt(source, accountType) then
        return amount, 0, "Player is tax exempt"
    end
    local taxAmount, taxRate, bracketInfo = CalculateTax(amount, transactionType)
    if taxAmount > 0 then
        ProcessTaxPayment(source, taxAmount, transactionType, amount)
        local netAmount = amount - taxAmount
        DebugPrint(string.format("[TAX] Transaction: $%s | Tax: $%s (%.1f%%) | Net: $%s | Bracket: %s",
            amount, taxAmount, taxRate, netAmount, bracketInfo))
        return netAmount, taxAmount, bracketInfo
    end
    return amount, 0, "No tax applied"
end

BuildPlayerData = function(source, opts)
    opts = opts or {}
    local Player = GetPlayer(source)
    if not Player then return nil end
    local accounts = opts.accounts or GetBankAccounts(source)
    local cashBalance = Config.Framework == 'esx' and Player.getMoney() or Player.PlayerData.money['cash']
    local playerName = Config.Framework == 'esx' and Player.getName() or Player.PlayerData.charinfo.firstname .. ' ' .. Player.PlayerData.charinfo.lastname
    local playerProfile = opts.playerProfile or GetPlayerProfile(source)
    local TransactionHistory = opts.History or GetTransactionHistory(source)
    local playerJobLabel = Config.Framework == 'esx' and GetJobLabel(Player.job.name) or GetJobLabel(Player.PlayerData.job)
    local creditScore = opts.creditScore or GetCreditScore(source)
    local settings = opts.settings or GetBankingSettings(source)
    return {
        accounts = accounts,
        cashBalance = cashBalance,
        playerName = playerName,
        playerProfile = playerProfile,
        History = TransactionHistory,
        playerJobLabel = playerJobLabel,
        creditScore = creditScore,
        settings = settings,
        bankingLevels = Config.BankingLevels,
        pinChangeCost = Config.PinChangeCost,
        Locale = Locale.UI,
        reIssueCardCost = Config.ReIssueCardCost,
        IsCardEnabled = Config.CardItemConfig.cardAsItem,
        cardSettings = Config.CardSettings,
        cardOrder = Config.CardOrder,
        primaryColor = Config.PrimaryColor,
        logo = Config.Logo,
    }
end
