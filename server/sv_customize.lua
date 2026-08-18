if Config.Framework == 'qb' or Config.Framework == 'qbx' then
    QBCore = exports['qb-core']:GetCoreObject()
elseif Config.Framework == 'esx' then
    ESX = exports['es_extended']:getSharedObject()
end
local SteamApiKey = ''
local DiscordBotToken = ''
GetPlayerProfile = function (source)
    local result = promise.new()
	if Config.ProfileType == 'discord' then
		local discordId = GetPlayerIdentifierByType(source, 'discord')
		if discordId then
			discordId = discordId:gsub('discord:', '')
		end
		local url = string.format("https://discord.com/api/v10/users/%s", discordId)
		PerformHttpRequest(url, function(statusCode, response, headers)
			if statusCode == 200 then
				local data = json.decode(response)
				if data and data.avatar then
					local baseUrl = "https://cdn.discordapp.com/avatars/" .. discordId .. "/" .. data.avatar .. ".png"
					result:resolve(baseUrl)
				else
					result:resolve('')
				end
			else
				result:resolve('')
			end
		end, "GET", "", {
			["Authorization"] = "Bot " .. DiscordBotToken,
			["Content-Type"] = "application/json"
		})
	elseif Config.ProfileType == 'steam' then
		local steamId = GetPlayerIdentifierByType(source, 'steam')
		if steamId then
			steamId = steamId:gsub('steam:', '')
		end
		local steamId64 = tonumber(steamId)
		if not steamId64 then
			result:resolve('')
			return
		end
		local url = string.format("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=%s&steamids=%s", SteamApiKey, steamId64)
		PerformHttpRequest(url, function(statusCode, response, headers)
			if statusCode == 200 then
				local data = json.decode(response)
				if data and data.response and data.response.players and data.response.players[1] and data.response.players[1].avatarfull then
					result:resolve(data.response.players[1].avatarfull)
				else
					result:resolve('')
				end
			else
				result:resolve('')
			end
		end, "GET", "", {["Content-Type"] = "application/json"})
	end
	return Citizen.Await(result)
end
function GetJobLabel (job)
    local p = promise.new()
    if Config.Framework == 'esx' then
        exports.oxmysql:execute('SELECT * FROM jobs WHERE name = ? ', { job }, function(result)
            if result and result[1] then
                label = result[1].label
                p:resolve(label)
            end
        end)
    elseif Config.Framework == 'qb' or Config.Framework == 'qbx' then
        p:resolve(job.label)
    end
    local result = Citizen.Await(p)
    return result
end
RegisterServerCallback = function (name, cb)
    if Config.Framework == 'qb' or Config.Framework == 'qbx' then
        QBCore.Functions.CreateCallback(name, cb)
    elseif Config.Framework == 'esx' then
        ESX.RegisterServerCallback(name, cb)
    end
end
function GetPlayerMoney(src)
	local Player = GetPlayer(src)
	if not Player then return false end
	local money = Config.Framework == 'esx' and Player.getMoney() or Player.PlayerData.money['cash']
	return money
end
function TriggerPhoneNotification(src, message)
    if not Config.phoneNotification.enabled then return end
    if Config.phoneNotification.phone_resourcename == 'lb_phone' then
        return exports["lb-phone"]:EmergencyNotification(src, {
            title = "Transaction Alert",
            content = message,
            icon = "warning",
        })
    end
end
function RemovePlayerMoney(src, moneyType, amount)
    local Player = GetPlayer(src)
    if not Player or not moneyType or not amount then return false end
    local reason = Locale.server.bank_transaction
    if Config.Framework == 'esx' then
        if moneyType == 'cash' then
            Player.removeMoney(amount, reason)
        elseif moneyType == 'bank' then
            Player.removeAccountMoney('bank', amount, reason)
        else
            DebugPrint(('[^3WARN^7] Unknown money type "%s" for ESX'):format(moneyType))
            return false
        end
    elseif Config.Framework == 'qb' or Config.Framework == 'qbx' then
        Player.Functions.RemoveMoney(moneyType, amount, reason)
    else
        DebugPrint('[^1ERROR^7] Unsupported framework in RemovePlayerMoney')
        return false
    end
    return true
end
function AddPlayerMoney(src, moneyType, amount)
	local Player = GetPlayer(src)
    if not Player or not moneyType or not amount then return false end
    local reason = Locale.server.bank_transaction
    if Config.Framework == 'esx' then
        if moneyType == 'cash' then
            Player.addMoney(amount, reason)
        elseif moneyType == 'bank' then
            Player.addAccountMoney('bank', amount, reason)
        else
            DebugPrint(('[^3WARN^7] Unknown money type "%s" for ESX'):format(moneyType))
            return false
        end
    elseif Config.Framework == 'qb' or Config.Framework == 'qbx' then
        Player.Functions.AddMoney(moneyType, amount, reason)
    else
        DebugPrint('[^1ERROR^7] Unsupported framework in RemovePlayerMoney')
        return false
    end
    return true
end
function AddTaxToSociety(amount)
end
function AddItemToInventory(src, ccno)
    if Config.CardItemConfig.cardAsItem then
        exports.ox_inventory:AddItem(src, Config.CardItemConfig.cardItemName, 1, {card_no = ccno}, nil)
    end
end
function RegisterUsableItem(item, cb)
    if Config.Framework == 'esx' then
        ESX.RegisterUsableItem(item, cb)
    elseif Config.Framework == 'qb' or Config.Framework == 'qbx' then
        QBCore.Functions.CreateUseableItem(item, cb)
    end
end
