local IsRestarting = false

function DebugPrint(msg)
    if Config.Debug then
        print(msg)
    end
end

AddEventHandler('txAdmin:events:scheduledRestart', function(eventData)
    local lockdownTime = Config.RestartLockdown.enabled and Config.RestartLockdown.lockdownTime or 60
    if eventData.secondsRemaining <= lockdownTime then
        IsRestarting = true
        TriggerClientEvent('prism-banking:client:restartLockdown', -1)
    else
        IsRestarting = false
        TriggerClientEvent('prism-banking:client:restartLockdowntogglefalse', -1)
    end
end)

AddEventHandler('txAdmin:events:scheduledRestartSkipped', function(eventData)
    IsRestarting = false
end)

function IsRestartImminent()
    return IsRestarting
end

RegisterNetEvent('prism-banking:server:onPlayerLoaded', function ()
    local src = source
    local Player = GetPlayer(src)
    if not Player then return end
    if Config.InterestSystem and Config.InterestSystem.enabled then
        local success, amount = CalculateInterest(src)
        if success and amount > 0 then
            TriggerClientEvent('prism-bannking:client:notify', tonumber(src), Locale.server.bank_interest, string.format(Locale.server.bank_interest_earned, amount))
        end
    end

    if IsRestarting then
        TriggerClientEvent('prism-banking:client:restartLockdown', tonumber(src))
    end
end)
CreateThread(function()
    Wait(1000)
    local accountsTable = [[
        CREATE TABLE IF NOT EXISTS `prism_banking_accounts` (
            `accno` BIGINT(20) NOT NULL,
            `identifier` VARCHAR(255) NOT NULL,
            `balance` BIGINT(20) NOT NULL DEFAULT 0,
            `type` VARCHAR(50) NOT NULL DEFAULT 'debit',
            `pin` INT(11) DEFAULT NULL,
            `primary` INT(11) NOT NULL DEFAULT 0,
            `last_interest_date` BIGINT(20) DEFAULT NULL COMMENT 'Unix timestamp of last interest calculation for this account',
            `is_society` INT(11) NOT NULL DEFAULT 0 COMMENT '1 if society account, 0 if personal',
            `society_job` VARCHAR(50) DEFAULT NULL COMMENT 'Job name for society accounts',
            UNIQUE KEY `idx_accno` (`accno`),
            KEY `idx_identifier` (`identifier`),
            KEY `idx_identifier_primary` (`identifier`, `primary`),
            KEY `idx_identifier_society` (`identifier`, `is_society`),
            KEY `idx_society_job_type` (`is_society`, `society_job`, `type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]]
    local settingsTable = [[
        CREATE TABLE IF NOT EXISTS `prism_banking_settings` (
            `identifier` VARCHAR(255) NOT NULL,
            `creditscore` INT(11) DEFAULT NULL,
            `allow_transfer` INT(11) DEFAULT 1,
            `is_optimized` INT(11) DEFAULT 1,
            `wit_level` INT(11) DEFAULT 1,
            `mcard_level` INT(11) DEFAULT 1,
            `last_interest_date` BIGINT(20) DEFAULT NULL COMMENT 'Unix timestamp of last interest calculation',
            PRIMARY KEY (`identifier`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
    ]]
    local nomineesTable = [[
        CREATE TABLE IF NOT EXISTS `prism_banking_nominees` (
            `id` INT(11) NOT NULL AUTO_INCREMENT,
            `account_number` BIGINT(20) NOT NULL COMMENT 'Account number from prism_banking_accounts',
            `owner_identifier` VARCHAR(50) NOT NULL COMMENT 'Owner/creator identifier',
            `nominee_identifier` VARCHAR(50) NOT NULL COMMENT 'Nominee identifier who has access',
            `added_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `added_by` VARCHAR(50) NOT NULL COMMENT 'Who added this nominee',
            PRIMARY KEY (`id`),
            UNIQUE KEY `unique_nominee` (`account_number`, `nominee_identifier`),
            KEY `account_number` (`account_number`),
            KEY `nominee_identifier` (`nominee_identifier`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]]
    local transactionsTable = [[
        CREATE TABLE IF NOT EXISTS `prism_banking_transactions` (
            `id` INT(11) NOT NULL AUTO_INCREMENT,
            `identifier` VARCHAR(255) NOT NULL COMMENT 'Player identifier',
            `spend_type` VARCHAR(50) DEFAULT NULL COMMENT 'cash, bank, etc.',
            `amount` BIGINT(20) NOT NULL DEFAULT 0,
            `transaction_type` VARCHAR(50) NOT NULL COMMENT 'deposit, withdraw, transfer, interest',
            `name` VARCHAR(255) DEFAULT NULL COMMENT 'Display name',
            `description` TEXT DEFAULT NULL,
            `timestamp` BIGINT(20) NOT NULL COMMENT 'Unix timestamp',
            PRIMARY KEY (`id`),
            KEY `idx_identifier_timestamp` (`identifier`, `timestamp`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]]
    local taxLogsTable = [[
        CREATE TABLE IF NOT EXISTS `prism_banking_tax_logs` (
            `id` INT(11) NOT NULL AUTO_INCREMENT,
            `identifier` VARCHAR(255) NOT NULL,
            `amount` BIGINT(20) NOT NULL COMMENT 'Original transaction amount',
            `tax_amount` BIGINT(20) NOT NULL COMMENT 'Tax deducted',
            `transaction_type` VARCHAR(50) NOT NULL,
            `timestamp` BIGINT(20) NOT NULL,
            `date` VARCHAR(50) DEFAULT NULL,
            PRIMARY KEY (`id`),
            KEY `idx_identifier` (`identifier`),
            KEY `idx_timestamp` (`timestamp`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]]
    exports.oxmysql:query(accountsTable, {}, function(result)
        print("^2[Prism Banking]^0 ✅  ensured prism_banking_accounts table .")
    end)
    exports.oxmysql:query(settingsTable, {}, function(result)
        print("^2[Prism Banking]^0 ✅  ensured prism_banking_settings table .")
    end)
    exports.oxmysql:query(nomineesTable, {}, function(result)
        print("^2[Prism Banking]^0 ✅  ensured prism_banking_nominees table .")
    end)
    exports.oxmysql:query(transactionsTable, {}, function(result)
        print("^2[Prism Banking]^0 ✅  ensured prism_banking_transactions table .")
    end)
    exports.oxmysql:query(taxLogsTable, {}, function(result)
        print("^2[Prism Banking]^0 ✅  ensured prism_banking_tax_logs table .")
    end)

    Wait(1500)
    OptimizeExistingTables()

    Wait(500)
    MigrateJsonToDatabase()

    CleanupOldTransactions()
end)

function OptimizeExistingTables()
    local alterQueries = {
        "ALTER TABLE `prism_banking_accounts` MODIFY `identifier` VARCHAR(255) NOT NULL",
        "ALTER TABLE `prism_banking_accounts` MODIFY `type` VARCHAR(50) NOT NULL DEFAULT 'debit'",
        "ALTER TABLE `prism_banking_accounts` MODIFY `accno` BIGINT(20) NOT NULL",
        "ALTER TABLE `prism_banking_accounts` MODIFY `balance` BIGINT(20) NOT NULL DEFAULT 0",
    }
    local indexQueries = {
        {check = "idx_accno", sql = "ALTER TABLE `prism_banking_accounts` ADD UNIQUE KEY `idx_accno` (`accno`)"},
        {check = "idx_identifier", sql = "ALTER TABLE `prism_banking_accounts` ADD KEY `idx_identifier` (`identifier`)"},
        {check = "idx_identifier_primary", sql = "ALTER TABLE `prism_banking_accounts` ADD KEY `idx_identifier_primary` (`identifier`, `primary`)"},
        {check = "idx_identifier_society", sql = "ALTER TABLE `prism_banking_accounts` ADD KEY `idx_identifier_society` (`identifier`, `is_society`)"},
        {check = "idx_society_job_type", sql = "ALTER TABLE `prism_banking_accounts` ADD KEY `idx_society_job_type` (`is_society`, `society_job`, `type`)"},
    }

    for _, query in ipairs(alterQueries) do
        local ok, err = pcall(function()
            exports.oxmysql:executeSync(query, {})
        end)
        if not ok then
            DebugPrint("[Prism Banking] Column alter skipped (may already be correct): " .. tostring(err))
        end
    end

    local existingIndexes = exports.oxmysql:executeSync("SHOW INDEX FROM `prism_banking_accounts`", {})
    local indexExists = {}
    if existingIndexes then
        for _, idx in ipairs(existingIndexes) do
            indexExists[idx.Key_name] = true
        end
    end

    for _, idx in ipairs(indexQueries) do
        if not indexExists[idx.check] then
            local ok, err = pcall(function()
                exports.oxmysql:executeSync(idx.sql, {})
            end)
            if ok then
                print("^2[Prism Banking]^0 ✅ Added index: " .. idx.check)
            else
                DebugPrint("[Prism Banking] Index " .. idx.check .. " skipped: " .. tostring(err))
            end
        end
    end

    print("^2[Prism Banking]^0 ✅ Table optimization complete.")
end

function MigrateJsonToDatabase()
    local rawTransactionData = LoadResourceFile(GetCurrentResourceName(), 'data/data.json')
    if rawTransactionData and rawTransactionData ~= '' and rawTransactionData ~= '{}' and rawTransactionData ~= '[]' then
        local TransactionData = json.decode(rawTransactionData)
        if TransactionData and next(TransactionData) then
            local existingCount = exports.oxmysql:executeSync('SELECT COUNT(*) as cnt FROM prism_banking_transactions', {})
            if existingCount and existingCount[1] and existingCount[1].cnt == 0 then
                print("^3[Prism Banking]^0 ⏳ Migrating transaction history from JSON to database...")
                local totalMigrated = 0
                for identifier, playerData in pairs(TransactionData) do
                    if playerData.transactions then
                        for _, tx in ipairs(playerData.transactions) do
                            exports.oxmysql:executeSync(
                                'INSERT INTO prism_banking_transactions (identifier, spend_type, amount, transaction_type, name, description, `timestamp`) VALUES (?, ?, ?, ?, ?, ?, ?)',
                                {
                                    identifier,
                                    tx.Spendtype or tx.spendType or 'unknown',
                                    tx.amount or 0,
                                    tx.transactionType or 'unknown',
                                    tx.name or 'Transaction',
                                    tx.description or '',
                                    tx.timestamp or 0
                                }
                            )
                            totalMigrated = totalMigrated + 1
                        end
                    end
                end
                SaveResourceFile(GetCurrentResourceName(), 'data/data.json', '{}', -1)
                print("^2[Prism Banking]^0 ✅ Migrated " .. totalMigrated .. " transactions to database. JSON file cleared.")
            else
                print("^2[Prism Banking]^0 ✅ Transaction table already has data, skipping JSON migration.")
            end
        end
    end

    local logPath = (Config.TaxSystem and Config.TaxSystem.advanced and Config.TaxSystem.advanced.logPath) or 'data/tax_logs.json'
    local rawTaxData = LoadResourceFile(GetCurrentResourceName(), logPath)
    if rawTaxData and rawTaxData ~= '' and rawTaxData ~= '{}' and rawTaxData ~= '[]' then
        local taxLogs = json.decode(rawTaxData)
        if taxLogs and #taxLogs > 0 then
            local existingTaxCount = exports.oxmysql:executeSync('SELECT COUNT(*) as cnt FROM prism_banking_tax_logs', {})
            if existingTaxCount and existingTaxCount[1] and existingTaxCount[1].cnt == 0 then
                print("^3[Prism Banking]^0 ⏳ Migrating tax logs from JSON to database...")
                local totalTaxMigrated = 0
                for _, log in ipairs(taxLogs) do
                    exports.oxmysql:executeSync(
                        'INSERT INTO prism_banking_tax_logs (identifier, amount, tax_amount, transaction_type, `timestamp`, `date`) VALUES (?, ?, ?, ?, ?, ?)',
                        {
                            log.identifier or 'unknown',
                            log.amount or 0,
                            log.taxAmount or 0,
                            log.transactionType or 'unknown',
                            log.timestamp or 0,
                            log.date or ''
                        }
                    )
                    totalTaxMigrated = totalTaxMigrated + 1
                end
                SaveResourceFile(GetCurrentResourceName(), logPath, '[]', -1)
                print("^2[Prism Banking]^0 ✅ Migrated " .. totalTaxMigrated .. " tax logs to database. JSON file cleared.")
            else
                print("^2[Prism Banking]^0 ✅ Tax logs table already has data, skipping JSON migration.")
            end
        end
    end
end

function CleanupOldTransactions()
    local thirtyDaysAgo = os.time() - (30 * 24 * 60 * 60)
    local result = exports.oxmysql:executeSync(
        'DELETE FROM prism_banking_transactions WHERE `timestamp` < ?',
        {thirtyDaysAgo}
    )
    if result and result.affectedRows and result.affectedRows > 0 then
        print("^2[Prism Banking]^0 ✅ Cleaned up " .. result.affectedRows .. " transactions older than 30 days.")
    end
end
