local function GetPlayerNameFromDb(identifier)
    if Config.Framework == 'esx' then
        local result = exports.oxmysql:executeSync('SELECT firstname, lastname FROM users WHERE identifier = ? LIMIT 1', {identifier})
        if result and #result > 0 then
            return result[1].firstname .. ' ' .. result[1].lastname
        else
            return "Unknown Player"
        end
    elseif Config.Framework == 'qbx' or Config.Framework == 'qb' then
        local result = exports.oxmysql:executeSync('SELECT charinfo FROM players WHERE citizenid = ? LIMIT 1', {identifier})
        if result and #result > 0 and result[1].charinfo then
            local charinfo = json.decode(result[1].charinfo)
            if charinfo and charinfo.firstname and charinfo.lastname then
                return charinfo.firstname .. ' ' .. charinfo.lastname
            else
                return "Unknown Player"
            end
        else
            return "Unknown Player"
        end
    end
end

local function GetFilteredCardSettings(source)
    local filteredCardSettings = {}
    local filteredCardOrder = {}
    for cardType, cardConfig in pairs(Config.CardSettings) do
        if cardConfig.isSociety then
            if IsPlayerEligibleForSociety(source, cardType) then
                filteredCardSettings[cardType] = cardConfig
                table.insert(filteredCardOrder, cardType)
            end
        else
            filteredCardSettings[cardType] = cardConfig
            table.insert(filteredCardOrder, cardType)
        end
    end
    return filteredCardSettings, filteredCardOrder
end

RegisterServerCallback('prism-banking:server:getAccounts', function(source, cb)
    local Player = GetPlayer(source)
    SyncPrimaryAccountWithFramework(source)
    local data = BuildPlayerData(source)
    if not data then
        cb({accounts = {}})
        return
    end
    local filteredCardSettings, filteredCardOrder = GetFilteredCardSettings(source)
    data.cardSettings = filteredCardSettings
    data.cardOrder = filteredCardOrder
    cb(data)
end)

RegisterServerCallback('prism-banking:server:isServerRestartImminent', function(source, cb)
    cb(IsRestartImminent())
end)

RegisterServerCallback('prism-banking:server:createAccount', function(source, cb, pin, cardType, isNew)
    local Player = GetPlayer(source)
    local cardConfig = Config.CardSettings[cardType]
    local isSocietyType = cardConfig and cardConfig.isSociety or false

    local currentAccounts = GetBankAccounts(source)

    if isSocietyType then
        local hasPrimaryAccount = false
        for _, account in ipairs(currentAccounts) do
            if account.primary and not account.isSociety and not account.isNomineeAccount then
                hasPrimaryAccount = true
                break
            end
        end
        if not hasPrimaryAccount then
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.need_primary_before_society)
            cb({
                success = false,
                message = Locale.server.need_primary_before_society,
                main = nil
            })
            return
        end
    end
    if not isNew then
        local settings = GetBankingSettings(source)
        local accountLevel = settings and settings.mcard_level or 1
        local maxAccounts = Config.BankingLevels.AccountsLevel[accountLevel].maxAccounts
        local personalAccountCount = 0
        for _, account in ipairs(currentAccounts) do
            if not account.isSociety and not account.isNomineeAccount then
                personalAccountCount = personalAccountCount + 1
            end
        end
        if personalAccountCount >= maxAccounts and not isSocietyType then
            DebugPrint("[BANKING] Account creation denied: Player has " .. personalAccountCount .. " accounts, max is " .. maxAccounts .. " at level " .. accountLevel)
            TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.max_account_alert)
            cb({
                success = false,
                message = Locale.server.max_account_alert,
                main = nil
            })
            return
        end
    end
    local result = CreateBankAccount(pin, cardType, source, isNew)
    if type(result) == 'table' and result.success == false then
        TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, result.message)
        cb({
            success = false,
            message = result.message,
            main = nil
        })
        return
    end
    local data = BuildPlayerData(source)
    if data then
        local filteredCardSettings, filteredCardOrder = GetFilteredCardSettings(source)
        data.cardSettings = filteredCardSettings
        data.cardOrder = filteredCardOrder
    end
    cb({
        success = result.success or result,
        main = data
    })
end)
RegisterServerCallback('prism-banking:server:InitializeTransaction', function(source, cb, selectedAccount, transactionType, amount, userId)
    local success, updatedData = InitializeTransaction(source, selectedAccount, transactionType, amount, userId)
    cb({
        success = success,
        data = updatedData
    })
end)
RegisterServerCallback('prism-banking:server:toggleSetting', function(source, cb, settingName)
    local success, updatedData = ToggleBankingSetting(source, settingName)
    cb({
        success = success,
        data = updatedData
    })
end)
RegisterServerCallback('prism-banking:server:changePin', function(source, cb, accountNumber, oldPin, newPin)
    local success, message, updatedData = ChangeAccountPin(source, accountNumber, oldPin, newPin)
    TriggerClientEvent('prism-banking:client:sendNotification', source, "Bank Activity", message)
    cb({
        success = success,
        message = message,
        data = updatedData
    })
end)
RegisterServerCallback('prism-banking:server:upgradeWithdrawalLevel', function(source, cb)
    local success, message = UpgradeWithdrawalLevel(source)
    if success then
        TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, message)
        cb({
            success = true,
            message = message,
            data = BuildPlayerData(source)
        })
    else
        TriggerClientEvent('prism-banking:client:sendNotification', source, "Bank Activity", message)
        cb({
            success = false,
            message = message
        })
    end
end)
RegisterServerCallback('prism-banking:server:allowedtoCreateAccount', function(source, cb)
    local success = CheckEligibilityToCreateAccount(source)
    cb(success)
end)
RegisterServerCallback('prism-banking:server:upgradeAccountLevel', function(source, cb)
    local success, message = UpgradeAccountLevel(source)
    if success then
        TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, message)
        cb({
            success = true,
            message = message,
            data = BuildPlayerData(source)
        })
    else
        TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, message)
        cb({
            success = false,
            message = message
        })
    end
end)
RegisterServerCallback('prism-banking:server:getAtmAccounts', function(source, cb, accountNumbers)
    local Player = GetPlayer(source)
    if not Player then
        cb({
            success = false,
            accounts = {},
            main = {}
        })
        return
    end

    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
    local isOwner = false
    local filteredAccounts = {}

    if #accountNumbers == 1 then
        local account = GetBankAccountByAccountNumber(accountNumbers)
        isOwner = account and account.identifier == identifier
        if account and not account.isSociety then
            table.insert(filteredAccounts, account)
        end
    else
        local allAccounts = GetBankAccounts(source)
        isOwner = true
        for _, account in ipairs(allAccounts) do
            if not account.isSociety then
                table.insert(filteredAccounts, account)
            end
        end
    end

    SyncPrimaryAccountWithFramework(source)

    local data = BuildPlayerData(source, {accounts = filteredAccounts})
    if data and not isOwner and filteredAccounts[1] then
        data.playerName = GetPlayerNameFromDb(filteredAccounts[1].identifier)
    end

    cb({
        success = true,
        accounts = filteredAccounts,
        main = data
    })
end)
RegisterServerCallback('prism-banking:server:reIssueCard', function(source, cb, accountNumber)
    local result = ReIssueCard(source, accountNumber)
    cb(result)
end)
RegisterServerCallback('prism-banking:server:verifyAtmPin', function(source, cb, enteredPin, accountNumber)
    local Player = GetPlayer(source)
    if not Player then
        cb({
            success = false,
            message = Locale.server.player_not_found
        })
        return
    end

    SyncPrimaryAccountWithFramework(source)

    local targetAccount = nil
    local accountCount = 1

    if accountNumber then
        if not Config.CardItemConfig.cardStealingEnabled and Config.CardItemConfig.cardAsItem then
            local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid
            local ownerCheck = exports.oxmysql:executeSync(
                'SELECT 1 FROM prism_banking_accounts WHERE accno = ? AND identifier = ? LIMIT 1',
                {accountNumber, identifier}
            )
            local nomineeCheck = exports.oxmysql:executeSync(
                'SELECT 1 FROM prism_banking_nominees WHERE account_number = ? AND nominee_identifier = ? LIMIT 1',
                {accountNumber, identifier}
            )
            if (not ownerCheck or #ownerCheck == 0) and (not nomineeCheck or #nomineeCheck == 0) then
                cb({
                    success = false,
                    message = Locale.server.cannot_use_stolen_card
                })
                return
            end
        end
        targetAccount = GetBankAccountByAccountNumber(accountNumber)
    else
        local allAccounts = GetBankAccounts(source)
        accountCount = #allAccounts
        for _, account in ipairs(allAccounts) do
            if account.primary then
                targetAccount = account
                break
            end
        end
    end

    if not targetAccount then
        cb({
            success = false,
            message = Locale.server.no_valid_account
        })
        return
    end
    if targetAccount.pin == tonumber(enteredPin) then
        cb({
            success = true,
            message = Locale.server.pin_verified,
            accountCount = accountCount
        })
    else
        TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.atm_error, Locale.server.incorrect_pin)
        cb({
            success = false,
            message = Locale.server.incorrect_pin
        })
    end
end)
