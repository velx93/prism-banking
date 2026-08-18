RegisterNuiCallback('closeBanking', function(data, cb)
    IsUiOpened = false
    SetNuiFocus(false, false)
    cb({})
end)

RegisterNuiCallback('InitializeTransaction', function (data, cb)
    local result = AwaitServerCallback('prism-banking:server:InitializeTransaction', data.selectedAccount, data.transactionType, data.amount, data.userId)

    if result.success then
        if result.data then
            SendNUIMessage({
                action = 'updateBankingData',
                data = result.data
            })
        end
        cb({success = true, data = result.data})
    else
        cb({success = false})
    end
end)

RegisterNuiCallback('createAccount', function(data, cb)
    local data = AwaitServerCallback('prism-banking:server:createAccount', data.pin, data.type, data.isNew)

    if data.success then
        cb(data)
    end
end)

RegisterNuiCallback('toggleSetting', function(data, cb)
    local result = AwaitServerCallback('prism-banking:server:toggleSetting', data.settingName)

    if result.success and result.data then
        SendNUIMessage({
            action = 'updateBankingData',
            data = result.data
        })
        cb({success = true, data = result.data})
    else
        cb({success = false})
    end
end)

RegisterNuiCallback('changePin', function(data, cb)
    local result = AwaitServerCallback('prism-banking:server:changePin', data.accountNumber, data.oldPin, data.newPin)

    if result.success and result.data then
        SendNUIMessage({
            action = 'updateBankingData',
            data = result.data
        })
        cb({success = true, message = result.message, data = result.data})
    else
        cb({success = false, message = result.message})
    end
end)

RegisterNuiCallback('upgradeWithdrawalLevel', function(data, cb)
    local result = AwaitServerCallback('prism-banking:server:upgradeWithdrawalLevel')

    if result.success and result.data then
        SendNUIMessage({
            action = 'updateBankingData',
            data = result.data
        })
        cb({success = true, message = result.message, data = result.data})
    else
        cb({success = false, message = result.message})
    end
end)

RegisterNuiCallback('upgradeAccountLevel', function(data, cb)
    local result = AwaitServerCallback('prism-banking:server:upgradeAccountLevel')
    if result.success and result.data then
        SendNUIMessage({
            action = 'updateBankingData',
            data = result.data
        })
        cb({success = true, message = result.message, data = result.data})
    else
        cb({success = false, message = result.message})
    end
end)

RegisterNuiCallback('allowedtoCreateAccount', function(data, cb)
    local result = AwaitServerCallback('prism-banking:server:allowedtoCreateAccount')
    cb({success = result})
end)

RegisterNuiCallback('reIssueCard', function(data, cb)
    local result = AwaitServerCallback('prism-banking:server:reIssueCard', data.accountNumber)
    cb({success = result})
end)

RegisterNuiCallback('bankingshowNotification', function(data, cb)
    TriggerNotification(data.title, data.message)
    cb({success = true})
end)

RegisterNuiCallback('getNominees', function(data, cb)
    local result = AwaitServerCallback('prism-banking:server:getNominees', data.accountNumber)
    cb(result)
end)

RegisterNuiCallback('addNominee', function(data, cb)
    local result = AwaitServerCallback('prism-banking:server:addNominee', data.accountNumber, data.targetServerId)
    cb(result)
end)

RegisterNuiCallback('removeNominee', function(data, cb)
    local result = AwaitServerCallback('prism-banking:server:removeNominee', data.accountNumber, data.nomineeId)
    cb(result)
end)

RegisterNetEvent('prism-banking:client:refreshBankingData', function()
    if IsUiOpened then
        local data = AwaitServerCallback('prism-banking:server:getAccounts')
        if data then
            SendNUIMessage({
                action = 'updateBankingData',
                data = data
            })
        end
    end
end)
