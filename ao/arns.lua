local json = require("json")

-- Initialize ArnsDomains table
ArnsDomains = ArnsDomains or {}

-- Helper functions
local function clearTable(t)
    print("Clearing table")
    for k in pairs(t) do t[k] = nil end
    print("Table cleared")
end

local function extractNames(jsonString)
    print("Extracting names from JSON")
    -- clearTable(ArnsDomains)
    local data = json.decode(jsonString)
    arns = data
    print("JSON decoded, items count: " .. (data.items and #data.items or "nil"))
    if data.items and type(data.items) == "table" then
        for _, item in ipairs(data.items) do
            table.insert(ArnsDomains, item)
            print("Added domain: " .. item.name)
        end
    end
    print("Extraction complete, ArnsDomains count: " .. #ArnsDomains)
end

local function sendErrorResponse(msg, errorMessage)
    print("Sending error response: " .. errorMessage)
    msg.reply({
        Target = msg.From,
        Tags = { ["Action"] = "ArnsExistsResponse" },
        Data = json.encode({ error = errorMessage })
    })
    print("Error response sent")
end

local function checkNameExists(nameToCheck)
    print("Checking if name exists: " .. nameToCheck)
    for _, domain in ipairs(ArnsDomains) do
        if domain.name == nameToCheck then
            print("Name found")
            return true
        end
    end
    print("Name not found")
    return false
end

local function updateArnsDomains()
    print("Updating ArNS domains...")
    ao.send({
        Target = "agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA",
        Action = "Paginated-Records",
        ["Limit"] = "10000"
    })
    print("Sent request for Paginated-Records")

    local res, err = Receive({ Action = "Records-Notice" })
    if not res then
        print("Error: Failed to receive Records-Notice. Error: " .. (err or "Unknown"))
        return
    end
    print("Received Records-Notice")
    extractNames(res.Data)
    print(string.format("Updated ArNS domains, now have %d domains", #ArnsDomains))
end

-- Initialize ArnsDomains
-- print("Calling for all records")
-- updateArnsDomains()
-- print("Received all records")

-- Handlers
Handlers.add('ArnsExists',
    Handlers.utils.hasMatchingTag('Action', 'ArnsExists'),
    function(msg)
        print("ArnsExists handler called")
        local nameToCheck = msg.Tags["Name"]

        if not nameToCheck then
            print("Error: Missing name to check")
            return sendErrorResponse(msg, "Missing name to check")
        end

        print("Name to check: " .. nameToCheck)

        if not ArnsDomains then
            print("Error: ArnsDomains is not defined")
            return sendErrorResponse(msg, "ArnsDomains is not defined")
        end

        local nameExists = false
        local domainProcessId = nil
        local domainKeys = {}

        for _, domain in ipairs(ArnsDomains) do
            if domain.name == nameToCheck then
                nameExists = true
                domainProcessId = domain.processId
                print("Found matching domain")
                break
            end
        end

        print("Name " .. nameToCheck .. " exists: " .. tostring(nameExists))

        if nameExists and domainProcessId then
            print("Domain processId found: " .. domainProcessId)
            local res = ao.send({
                Target = domainProcessId,
                Action = "Records"
            }).receive()
            print("Sent Records request")

            -- local res = Receive({ Action = "Records-Notice" })
            print("Received Records-Notice")
            print("Result from Records send:")
            print(res)
            local recordsData = json.decode(res.Data)
            print(json.encode(recordsData))

            for key, _ in pairs(recordsData) do
                table.insert(domainKeys, key)
                print("Added key: " .. key)
            end
        end

        print("Sending ArnsExistsResponse")
        ao.send({
            Target = msg.From,
            Action = "ArnsDomainsResponse",
            Data = json.encode({
                success = true,
                name = nameToCheck,
                exists = nameExists,
                keys = domainKeys
            })
        })
        print("ArnsExistsResponse sent")
    end
)

Handlers.add('AllArns',
    Handlers.utils.hasMatchingTag('Action', 'AllArns'),
    function(msg)
        print("AllArns Called")
        print("Sending AllArnsResponse")
        msg.reply({
            Target = msg.From,
            Action = "AllArnsResponse",
            Data = json.encode({
                success = true,
                domains = ArnsDomains
            })
        })
        print("AllArnsResponse sent")
    end
)

-- New handler for checking if a query is a substring of domain names

Handlers.add('ArnsSubstrCheck',
    Handlers.utils.hasMatchingTag('Action', 'ArnsSubstrCheck'),
    function(msg)
        print("ArnsSubstrCheck handler called")
        local queryToCheck = msg.Tags["Query"]

        if not queryToCheck then
            print("Error: Missing query to check")
            return sendErrorResponse(msg, "Missing query to check")
        end

        print("Query to check: " .. queryToCheck)

        if not ArnsDomains then
            print("Error: ArnsDomains is not defined")
            return sendErrorResponse(msg, "ArnsDomains is not defined")
        end

        local startMatches = {}
        local otherMatches = {}
        local queryLower = string.lower(queryToCheck)

        for _, domain in ipairs(ArnsDomains) do
            local domainLower = string.lower(domain.name)
            if string.find(domainLower, "^" .. queryLower) then
                table.insert(startMatches, domain.name)
                print("Found matching domain from start: " .. domain.name)
            elseif string.find(domainLower, queryLower, 1, true) then
                table.insert(otherMatches, domain.name)
                print("Found matching domain elsewhere: " .. domain.name)
            end
        end

        -- Combine matches, with startMatches taking priority
        local allMatches = {}
        for _, match in ipairs(startMatches) do
            table.insert(allMatches, match)
        end
        for _, match in ipairs(otherMatches) do
            table.insert(allMatches, match)
        end

        print("Sending ArnsSubstrCheckResponse")
        msg.reply({
            Data = json.encode({
                success = true,
                query = queryToCheck,
                matches = allMatches
            })
        })
        print("ArnsSubstrCheckResponse sent")
    end
)

-- New Cron handler to update domains
Handlers.add(
    "CronTick",
    Handlers.utils.hasMatchingTag("Action", "Cron"),
    function()
        print("Cron handler triggered")
        -- Update ArnsDomains
        updateArnsDomains()
    end
)

print("ArnsExists Updated with Cron handler and ArnsSubstrCheck")
