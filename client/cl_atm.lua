local nearbyAtms = {}
local isAtmUIOpen = false
local lastAtmOpenAttempt = 0

function FindNearbyATMs()
    if not Config.ATMs.enabled then return {} end

    local playerPed = PlayerPedId()
    local playerCoords = GetEntityCoords(playerPed)
    local atms = {}

    for _, propHash in ipairs(Config.ATMs.props) do
        local atm = GetClosestObjectOfType(playerCoords.x, playerCoords.y, playerCoords.z, Config.ATMs.interactionDistance, propHash, false, false, false)
        if atm ~= 0 then
            local atmCoords = GetEntityCoords(atm)
            table.insert(atms, atmCoords)
        end
    end

    return atms
end

function InteractionThreadATM()
    CreateThread(function ()
        while Config.ATMs.enabled and not Config.CardItemConfig.cardAsItem do
            local sleep = 1000
            local playerPed = PlayerPedId()
            local playerCoords = GetEntityCoords(playerPed)

            if not isAtmUIOpen and not IsUiOpened then
                nearbyAtms = FindNearbyATMs()

                if #nearbyAtms > 0 then
                    sleep = 0
                    local nearestAtm = nearbyAtms[1]

                    if Config.Interaction == 'textui' then
                        if not isTextUIOpen then
                            isTextUIOpen = true
                            lib.showTextUI(Locale.client.open_atm or '[E] Access ATM')
                        end
                        if IsControlJustReleased(0, 38) then
                            OpenATM()
                        end
                    elseif Config.Interaction == 'drawtext' then
                        Draw3DText(nearestAtm, Locale.client.open_atm or '[E] Access ATM')
                        if IsControlJustReleased(0, 38) then
                            OpenATM()
                        end
                    end
                else
                    if isTextUIOpen and Config.Interaction == 'textui' then
                        isTextUIOpen = false
                        lib.hideTextUI()
                    end
                end
            else
                if isTextUIOpen and Config.Interaction == 'textui' then
                    isTextUIOpen = false
                    lib.hideTextUI()
                end
            end

            Wait(sleep)
        end
    end)
end

function OpenATM(accountNumbers)
    if Config.RestartLockdown.preventSpam then
        local currentTime = GetGameTimer()
        if currentTime - lastAtmOpenAttempt < Config.RestartLockdown.spamCooldown then
            TriggerNotification(Locale.client.banking, "Please wait before opening the ATM again")
            return
        end
        lastAtmOpenAttempt = currentTime
    end

    if isRestartLockdown then
        TriggerNotification(Locale.client.banking, Locale.client.atm_servers_down)
        return
    end

    local isRestartImminent = AwaitServerCallback('prism-banking:server:isServerRestartImminent')

    if isRestartImminent then
        TriggerNotification(Locale.client.banking, Locale.client.atm_servers_down)
        return
    end

    isAtmUIOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'openAtmPinVerification',
        data = {
            accountNumbers = accountNumbers or {},
            primaryColor = Config.PrimaryColor,
            logo = Config.Logo
        }
    })
end

RegisterNuiCallback('closeBanking', function(data, cb)
    isAtmUIOpen = false
    IsUiOpened = false
    SetNuiFocus(false, false)
    cb({})
end)

RegisterNuiCallback('verifyAtmPin', function(data, cb)
    local enteredPin = data.pin
    local accountNumbers = data.accountNumbers
    local targetAccount = nil

    if #accountNumbers == 1 then
        targetAccount = accountNumbers[1]
    end

    local result = AwaitServerCallback('prism-banking:server:verifyAtmPin', enteredPin, targetAccount)
    if result.success then
        local atmData = AwaitServerCallback('prism-banking:server:getAtmAccounts', accountNumbers or {})

        if atmData.success then
            OpenAtmUI(atmData.accounts, atmData.main)
            cb({success = true})
        else
            cb({success = false, message = Locale.server.failed_to_load_account})
        end
    else
        cb({success = false, message = result.message or Locale.server.incorrect_pin})
    end
end)
