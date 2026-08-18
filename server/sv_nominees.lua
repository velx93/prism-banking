
local function GetAccountNominees(accountNumber)
    local result = exports.oxmysql:executeSync('SELECT id, account_number, owner_identifier, nominee_identifier, added_date, added_by FROM prism_banking_nominees WHERE account_number = ?', {accountNumber})

    if not result then return {} end

    local nominees = {}
    for _, row in ipairs(result) do
        local nomineeName = "Unknown Player"

        if Config.Framework == 'esx' then
            local playerData = exports.oxmysql:executeSync('SELECT firstname, lastname FROM users WHERE identifier = ? LIMIT 1', {
                row.nominee_identifier
            })

            if playerData and playerData[1] then
                nomineeName = (playerData[1].firstname or "Unknown") .. " " .. (playerData[1].lastname or "Player")
            end
        else
            local playerData = exports.oxmysql:executeSync('SELECT charinfo FROM players WHERE citizenid = ? LIMIT 1', {
                row.nominee_identifier
            })

            if playerData and playerData[1] and playerData[1].charinfo then
                local charinfo = json.decode(playerData[1].charinfo)
                if charinfo and charinfo.firstname and charinfo.lastname then
                    nomineeName = charinfo.firstname .. " " .. charinfo.lastname
                end
            end
        end

        table.insert(nominees, {
            id = row.id,
            nominee_identifier = row.nominee_identifier,
            nominee_name = nomineeName,
            added_date = row.added_date,
            added_by = row.added_by
        })
    end

    return nominees
end

local function IsNominee(identifier, accountNumber)
    local result = exports.oxmysql:executeSync([[
        SELECT id FROM prism_banking_nominees
        WHERE account_number = ? AND nominee_identifier = ?
    ]], {accountNumber, identifier})

    return result and #result > 0
end

local function IsAccountOwner(identifier, accountNumber)
    local result = exports.oxmysql:executeSync([[
        SELECT identifier FROM prism_banking_accounts
        WHERE accno = ? AND identifier = ? AND (is_society = 0 OR is_society IS NULL)
    ]], {accountNumber, identifier})

    return result and #result > 0
end

AddNominee = function(source, accountNumber, targetServerId)
    local Player = GetPlayer(source)
    if not Player then
        return {success = false, message = Locale.server.player_not_found}
    end

    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid

    if not IsAccountOwner(identifier, accountNumber) then
        DebugPrint("[NOMINEES] Player " .. source .. " attempted to add nominee to account they don't own: " .. accountNumber)
        return {success = false, message = Locale.server.you_dont_own}
    end

    local accountCheck = exports.oxmysql:executeSync('SELECT is_society FROM prism_banking_accounts WHERE accno = ?', {accountNumber})
    if accountCheck and accountCheck[1] and accountCheck[1].is_society == 1 then
        return {success = false, message = Locale.server.cannot_add_nominee_society}
    end

    local TargetPlayer = GetPlayer(targetServerId)
    if not TargetPlayer then
        return {success = false, message = Locale.server.target_not_online}
    end

    local targetIdentifier = Config.Framework == 'esx' and TargetPlayer.identifier or TargetPlayer.PlayerData.citizenid

    if targetIdentifier == identifier then
        return {success = false, message = Locale.server.cannot_add_self_nominee}
    end

    if IsNominee(targetIdentifier, accountNumber) then
        return {success = false, message = Locale.server.already_nominee}
    end

    DebugPrint("[NOMINEES] Attempting to add nominee - Account: " .. accountNumber .. ", Owner: " .. identifier .. ", Nominee: " .. targetIdentifier)

    local insertResult = exports.oxmysql:executeSync([[
        INSERT INTO prism_banking_nominees (account_number, owner_identifier, nominee_identifier, added_by)
        VALUES (?, ?, ?, ?)
    ]], {accountNumber, identifier, targetIdentifier, identifier})

    local verifyResult = exports.oxmysql:executeSync([[
        SELECT id FROM prism_banking_nominees
        WHERE account_number = ? AND nominee_identifier = ?
    ]], {accountNumber, targetIdentifier})

    if verifyResult and #verifyResult > 0 then
        local targetName = Config.Framework == 'esx' and TargetPlayer.getName() or (TargetPlayer.PlayerData.charinfo.firstname .. ' ' .. TargetPlayer.PlayerData.charinfo.lastname)
        DebugPrint("[NOMINEES] Successfully added " .. targetName .. " (ID: " .. targetIdentifier .. ") as nominee to account " .. accountNumber)
        TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, string.format(Locale.server.nominee_added, targetName))
        TriggerClientEvent('prism-banking:client:sendNotification', targetServerId, Locale.server.bank_activity, Locale.server.nominee_added_notification)

        TriggerClientEvent('prism-banking:client:refreshBankingData', targetServerId)

        if Config.Webhooks and Config.Webhooks.enabled then
            LogNomineeAdded(source, accountNumber, targetServerId, targetName)
        end

        return {success = true, message = Locale.server.nominee_added}
    else
        DebugPrint("[NOMINEES] Failed to add nominee to account " .. accountNumber .. " - Database insertion failed")
        return {success = false, message = Locale.server.failed_add_nominee}
    end
end

RemoveNominee = function(source, accountNumber, nomineeId)
    local Player = GetPlayer(source)
    if not Player then
        return {success = false, message = Locale.server.player_not_found}
    end

    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid

    if not IsAccountOwner(identifier, accountNumber) then
        DebugPrint("[NOMINEES] Player " .. source .. " attempted to remove nominee from account they don't own: " .. accountNumber)
        return {success = false, message = Locale.server.you_dont_own}
    end

    local nomineeInfo = exports.oxmysql:executeSync([[
        SELECT nominee_identifier FROM prism_banking_nominees
        WHERE id = ? AND account_number = ?
    ]], {nomineeId, accountNumber})

    if not nomineeInfo or #nomineeInfo == 0 then
        return {success = false, message = Locale.server.nominee_not_found}
    end

    local deleteResult = exports.oxmysql:executeSync([[
        DELETE FROM prism_banking_nominees
        WHERE id = ? AND account_number = ? AND owner_identifier = ?
    ]], {nomineeId, accountNumber, identifier})

    DebugPrint("[NOMINEES] Delete result type: " .. type(deleteResult) .. ", value: " .. tostring(deleteResult))

    local deletionSuccessful = false
    if type(deleteResult) == "number" and deleteResult > 0 then
        deletionSuccessful = true
    elseif type(deleteResult) == "table" and deleteResult.affectedRows and deleteResult.affectedRows > 0 then
        deletionSuccessful = true
    end

    if deletionSuccessful then
        local nomineeIdentifier = nomineeInfo[1].nominee_identifier
        DebugPrint("[NOMINEES] Player " .. source .. " removed nominee from account " .. accountNumber)
        TriggerClientEvent('prism-banking:client:sendNotification', source, Locale.server.bank_activity, Locale.server.nominee_removed)

        local onlinePlayers = GetPlayers()
        for _, playerId in ipairs(onlinePlayers) do
            local NomineePlayer = GetPlayer(tonumber(playerId))
            if NomineePlayer then
                local nomineeId = Config.Framework == 'esx' and NomineePlayer.identifier or NomineePlayer.PlayerData.citizenid
                if nomineeId == nomineeIdentifier then
                    TriggerClientEvent('prism-banking:client:refreshBankingData', tonumber(playerId))
                    TriggerClientEvent('prism-banking:client:sendNotification', tonumber(playerId), Locale.server.bank_activity, Locale.server.nominee_removed_notification)
                    break
                end
            end
        end

        if Config.Webhooks and Config.Webhooks.enabled then
            LogNomineeRemoved(source, accountNumber, nomineeIdentifier)
        end

        return {success = true, message = Locale.server.nominee_removed}
    else
        return {success = false, message = Locale.server.failed_remove_nominee}
    end
end

GetAccessibleAccounts = function(source)
    local Player = GetPlayer(source)
    if not Player then return {} end

    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid

    local ownedAccounts = GetBankAccounts(source)

    local nomineeAccounts = exports.oxmysql:executeSync([[
        SELECT a.accno as accountNumber, a.type, a.balance, a.pin, a.primary, a.identifier,
               a.is_society as isSociety, a.society_job as societyJob
        FROM prism_banking_nominees n
        INNER JOIN prism_banking_accounts a ON n.account_number = a.accno
        WHERE n.nominee_identifier = ? AND a.is_society = 0
    ]], {identifier})

    if nomineeAccounts then
        for _, account in ipairs(nomineeAccounts) do
            account.isNomineeAccount = true
            account.isSociety = account.isSociety == 1
            account.primary = account.primary == 1
            table.insert(ownedAccounts, account)
        end
    end

    return ownedAccounts
end

HasAccountAccess = function(source, accountNumber, requireOwner)
    local Player = GetPlayer(source)
    if not Player then return false end

    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid

    if IsAccountOwner(identifier, accountNumber) then
        return true
    end

    if requireOwner then
        return false
    end

    return IsNominee(identifier, accountNumber)
end


RegisterServerCallback('prism-banking:server:getNominees', function(source, cb, accountNumber)
    local Player = GetPlayer(source)
    if not Player then
        DebugPrint("[NOMINEES] Player not found for source: " .. source)
        cb({success = false, message = Locale.server.player_not_found})
        return
    end

    local identifier = Config.Framework == 'esx' and Player.identifier or Player.PlayerData.citizenid

    if not IsAccountOwner(identifier, accountNumber) then
        DebugPrint("[NOMINEES] Player " .. source .. " is not owner of account " .. accountNumber)
        cb({success = false, message = Locale.server.you_dont_own})
        return
    end

    local nominees = GetAccountNominees(accountNumber)
    DebugPrint("[NOMINEES] Found " .. #nominees .. " nominees for account " .. accountNumber)
    cb({success = true, nominees = nominees})
end)

RegisterServerCallback('prism-banking:server:addNominee', function(source, cb, accountNumber, targetServerId)
    local result = AddNominee(source, accountNumber, targetServerId)
    cb(result)
end)

RegisterServerCallback('prism-banking:server:removeNominee', function(source, cb, accountNumber, nomineeId)
    local result = RemoveNominee(source, accountNumber, nomineeId)
    cb(result)
end)

print("^2[Prism Banking]^0 Nominee management system loaded")
