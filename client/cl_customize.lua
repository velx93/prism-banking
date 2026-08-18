if Config.Framework == 'qb' or Config.Framework == 'qbx' then
    QBCore = exports['qb-core']:GetCoreObject()
elseif Config.Framework == 'esx' then
    ESX = exports['es_extended']:getSharedObject()
end

AddEventHandler('QBCore:Client:OnPlayerLoaded', function()
    TriggerEvent('prism-banking:client:OnPlayerLoaded')
    TriggerServerEvent('prism-banking:server:onPlayerLoaded')
end)

RegisterNetEvent('esx:playerLoaded', function()
    TriggerEvent('prism-banking:client:OnPlayerLoaded')
    TriggerServerEvent('prism-banking:server:onPlayerLoaded')
end)

local bankZoneIds = {}
local atmTargetsRegistered = false

RemoveAllTargets = function()
    if GetResourceState('ox_target') == 'started' then
        for _, zoneId in ipairs(bankZoneIds) do
            exports.ox_target:removeZone(zoneId)
        end
    end

    if GetResourceState('qb-target') == 'started' then
        for i = 1, #bankZoneIds do
            exports['qb-target']:RemoveZone('prism-banking-' .. i)
        end
    end

    bankZoneIds = {}

    if atmTargetsRegistered then
        if GetResourceState('ox_target') == 'started' then
            for _, prop in ipairs(Config.ATMs.props) do
                exports.ox_target:removeModel(prop, 'prism-banking-atm')
            end
        end
        if GetResourceState('qb-target') == 'started' then
            exports['qb-target']:RemoveTargetModel(Config.ATMs.props, 'prism-banking-atm')
        end
        atmTargetsRegistered = false
    end
end

RegisterBankTarget = function (coords, index)
    CreateThread(function ()
        if GetResourceState('ox_target') == 'started' then
            local zoneId = exports.ox_target:addBoxZone({
                name = 'prism-banking-' .. index,
                coords = coords,
                size = vector3(1, 1, 1),
                rotation = 0,
                debug = Config.Debug,
                options = {
                    {
                        event = 'prism-banking:client:openBank',
                        icon = 'fas fa-bank',
                        label = Locale.client.openBank,
                    }
                }
            })
            bankZoneIds[#bankZoneIds + 1] = zoneId
        end

        if GetResourceState('qb-target') == 'started' then
            exports['qb-target']:AddBoxZone('prism-banking-' .. index, coords, 2.0, 2.0, {
                name = 'prism-banking-' .. index,
                heading = 0,
                debugPoly = Config.Debug,
                minZ = coords.z - 1,
                maxZ = coords.z + 1,
            }, {
                options = {
                    {
                        event = 'prism-banking:client:openBank',
                        icon = 'fas fa-bank',
                        label = Locale.client.openBank,
                    }
                }
            })
            bankZoneIds[#bankZoneIds + 1] = 'prism-banking-' .. index
        end
    end)
end

RegisterATMTargets = function ()
    if not Config.ATMs.enabled or Config.CardItemConfig.cardAsItem then return end

    CreateThread(function ()
        if GetResourceState('ox_target') == 'started' then
            exports.ox_target:addModel(Config.ATMs.props, {
                {
                    name = 'prism-banking-atm',
                    icon = 'fas fa-credit-card',
                    label = Locale.client.useAtmCard,
                    onSelect = function (data)
                        OpenATM()
                    end
                }
            })
        end

        if GetResourceState('qb-target') == 'started' then
            exports['qb-target']:AddTargetModel(Config.ATMs.props, {
                options = {
                    {
                        icon = "fas fa-credit-card",
                        label = Locale.client.useAtmCard,
                        targeticon = "fas fa-dollar-sign",
                        action = function(entity)
                            OpenATM()
                        end
                    }
                },
                distance = 1.5
            })
        end

        atmTargetsRegistered = true
    end)
end

Draw3DText = function (coords, text)
    local x, y, z = table.unpack(coords)
    local onScreen, _x, _y = World3dToScreen2d(x, y, z)
    local pX, pY, pZ = table.unpack(GetGameplayCamCoords())

    SetTextScale(0.35, 0.35)
    SetTextFont(4)
    SetTextProportional(1)
    SetTextColour(255, 255, 255, 215)
    SetTextEntry("STRING")
    SetTextCentre(true)
    AddTextComponentString(text)
    DrawText(_x, _y)
end

function UseAtmCard(data, slot)
    if Config.CardItemConfig.cardAsItem then
        local metadata = slot.metadata or {}
        local cardNumber = metadata.card_no
        if not cardNumber then
            TriggerNotification(Locale.client.error, Locale.client.card_not_valid)
            return
        end

        local nearbyAtms = FindNearbyATMs()

        if #nearbyAtms == 0 then
            TriggerNotification(Locale.client.error, Locale.client.no_nearby_atms)
            return
        end

        OpenATM({cardNumber})
    end
end

exports('UseAtmCard', UseAtmCard)

TriggerNotification = function (title, message)
    if Config.Framework == 'esx' then
        ESX.ShowNotification(message, 'info', 5000, title)
    elseif Config.Framework == 'qb' or Config.Framework == 'qbx'  then
        QBCore.Functions.Notify(message, 'info', 5000)
    end
end

TriggerServerCallback = function (name, cb, ...)
    if Config.Framework == 'qb' or Config.Framework == 'qbx' then
        QBCore.Functions.TriggerCallback(name, cb, ...)
    elseif Config.Framework == 'esx' then
        ESX.TriggerServerCallback(name, cb, ...)
    end
end

AwaitServerCallback = function(name, ...)
    local args = { ... }
    local promise = promise.new()

    local function handleCallback(...)
        promise:resolve(...)
    end

    if Config.Framework == 'esx' then
        ESX.TriggerServerCallback(name, handleCallback, table.unpack(args))
    elseif Config.Framework == 'qb' or Config.Framework == 'qbx' then
        QBCore.Functions.TriggerCallback(name, handleCallback, table.unpack(args))
    else
        print("^1[ERROR] No framework detected (ESX or QBCore)^0")
        promise:resolve(nil)
    end

    return table.unpack({ Citizen.Await(promise) })
end
