IsUiOpened = false
isTextUIOpen = false
local lastBankOpenAttempt = 0
local isRestartLockdown = false
local hasInitialized = false

local SpawnPeds = function ()
    if Config.Peds.enabled then
        RequestModel(Config.Peds.pedModel)
        while not HasModelLoaded(Config.Peds.pedModel) do
            Wait(100)
        end
        for _, bank in pairs(Config.Banks) do
            local ped = CreatePed(4, Config.Peds.pedModel, bank.pedCoords.x, bank.pedCoords.y, bank.pedCoords.z, bank.pedCoords.w, false, true)
            SetEntityAsMissionEntity(ped, true, true)
            FreezeEntityPosition(ped, true)
            SetEntityInvincible(ped, true)
            SetBlockingOfNonTemporaryEvents(ped, true)
        end
    end
end

local BlipThread = function ()
    if not Config.EnableBlips then return end

    for _, bank in pairs(Config.Banks) do
        local blip = AddBlipForCoord(bank.InteractionCoords)
        SetBlipSprite(blip, Config.BlipConfig.sprite)
        SetBlipColour(blip, Config.BlipConfig.color)
        SetBlipScale(blip, Config.BlipConfig.size)
        BeginTextCommandSetBlipName('STRING')
        AddTextComponentSubstringPlayerName(bank.bankName)
        EndTextCommandSetBlipName(blip)
        SetBlipAsShortRange(blip, true)
    end
end

InteractionThread = function (data)
    CreateThread(function ()
        while true do
            local sleep = 1000
            local ped = PlayerPedId()
            local coords = GetEntityCoords(ped)
            local nearBank = false

            if not IsUiOpened then
                for _, bank in pairs(Config.Banks) do
                    local dist = #(coords - bank.InteractionCoords)

                    if dist <= Config.InteractionDistance then
                        nearBank = true
                        sleep = 0

                        if Config.Interaction == 'textui' then
                            if not isTextUIOpen then
                                isTextUIOpen = true
                                lib.showTextUI(Locale.client.open_bank)
                            end
                            if IsControlJustReleased(0, 38) then
                                TriggerEvent('prism-banking:client:openBank')
                            end
                        elseif Config.Interaction == 'drawtext' then
                            Draw3DText(bank.InteractionCoords, Locale.client.open_bank)
                            if IsControlJustReleased(0, 38) then
                                TriggerEvent('prism-banking:client:openBank')
                            end
                        end
                        break
                    end
                end

                if not nearBank and isTextUIOpen then
                    isTextUIOpen = false
                    lib.hideTextUI()
                end
            else
                if isTextUIOpen then
                    isTextUIOpen = false
                    lib.hideTextUI()
                end
            end
            Wait(sleep)
        end
    end)
end

OpenBankUI = function (isNew, data)
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'openBanking',
        data = {
            isNew = isNew,
            main = data,
            Locale = Locale.UI
        }
    })
end

OpenAtmUI = function (accounts, data)
    IsUiOpened = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'openAtm',
        data = {
            accounts = accounts,
            main = data,
            isAtm = true,
            Locale = Locale.UI,
            primaryColor = Config.PrimaryColor,
            logo = Config.Logo
        }
    })
end

SendNuiNotification = function (title, msg)
    SendNUIMessage({
        action = 'sendNotification',
        data = {
            title = title,
            msg = msg
        }
    })
end

RegisterNetEvent('prism-banking:client:sendNotification', function(title, msg)
    SendNuiNotification(title, msg)
end)

RegisterNetEvent('prism-bannking:client:notify', function(title, message)
    TriggerNotification(title, message)
end)

RegisterNetEvent('prism-banking:client:OnPlayerLoaded', function()
    if hasInitialized then return end
    hasInitialized = true

    CreateThread(function ()
        RemoveAllTargets()

        if Config.Interaction == 'target' then
            for i, bank in pairs(Config.Banks) do
                RegisterBankTarget(bank.InteractionCoords, i)
            end
            RegisterATMTargets()
        else
            InteractionThread(Config.Banks)
            InteractionThreadATM()
        end

        SpawnPeds()
        BlipThread()
    end)
end)

RegisterNetEvent('prism-banking:client:openBank', function()
    if Config.RestartLockdown.preventSpam then
        local currentTime = GetGameTimer()
        if currentTime - lastBankOpenAttempt < Config.RestartLockdown.spamCooldown then
            TriggerNotification(Locale.client.banking, "Please wait before opening the bank again")
            return
        end
        lastBankOpenAttempt = currentTime
    end

    if isRestartLockdown then
        TriggerNotification(Locale.client.banking, Locale.client.banking_servers_down)
        return
    end

    local isRestartImminent = AwaitServerCallback('prism-banking:server:isServerRestartImminent')

    if isRestartImminent then
        TriggerNotification(Locale.client.banking, Locale.client.banking_servers_down)
        return
    end

    local data = AwaitServerCallback('prism-banking:server:getAccounts')
    local isNew = #data.accounts == 0

    IsUiOpened = true
    OpenBankUI(isNew, data)
end)

AddEventHandler('onResourceStart', function(resource)
    if resource == GetCurrentResourceName() then
        TriggerEvent('prism-banking:client:OnPlayerLoaded')
        TriggerServerEvent('prism-banking:server:onPlayerLoaded')
    end
end)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then
        hasInitialized = false
        RemoveAllTargets()
    end
end)

RegisterNetEvent('prism-banking:client:restartLockdown', function()
    isRestartLockdown = true

    if IsUiOpened then
        IsUiOpened = false
        SendNUIMessage({
            action = 'closeBanking'
        })
        TriggerNotification(Locale.client.banking, Locale.client.banking_servers_down)
    end

    if isAtmUIOpen then
        isAtmUIOpen = false
        SendNUIMessage({
            action = 'closeBanking'
        })
        TriggerNotification(Locale.client.banking, Locale.client.atm_servers_down)
    end
end)

RegisterNetEvent('prism-banking:client:restartLockdowntogglefalse', function()
    isRestartLockdown = false
end)

CreateThread(function()
    while true do
        Wait(5000)

        if Config.RestartLockdown.enabled and (IsUiOpened or isAtmUIOpen) then
            local isRestartImminent = AwaitServerCallback('prism-banking:server:isServerRestartImminent')

            if isRestartImminent or isRestartLockdown then
                if IsUiOpened then
                    IsUiOpened = false
                    SendNUIMessage({
                        action = 'closeBanking'
                    })
                    TriggerNotification(Locale.client.banking, Locale.client.banking_servers_down)
                end

                if isAtmUIOpen then
                    isAtmUIOpen = false
                    SendNUIMessage({
                        action = 'closeBanking'
                    })
                    TriggerNotification(Locale.client.banking, Locale.client.atm_servers_down)
                end
            end
        end
    end
end)
