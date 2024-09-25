-- ProcessID = ihs9ILgtonyPraKmOOEXhS4JwXU2k_EgMJz1ZdL8Umo
local json = require("json")

-- Initialize arnsDomains table
local arnsDomains = {}

-- Helper functions
local function clearTable(t)
    for k in pairs(t) do t[k] = nil end
end

local function extractNames(jsonString)
    clearTable(arnsDomains)
    local success, data = pcall(json.decode, jsonString)
    if not success then
        print("Error decoding JSON: " .. data)
        return
    end
    if data.items and type(data.items) == "table" then
        for _, item in ipairs(data.items) do
            if item.name then
                table.insert(arnsDomains, item.name)
            end
        end
    end
end

local function sendErrorResponse(msg, errorMessage)
    ao.send({
        Target = msg.From,
        Tags = { ["Action"] = "ArnsExistsResponse" },
        Data = json.encode({ error = errorMessage })
    })
end

local function checkNameExists(nameToCheck)
    for _, name in ipairs(arnsDomains) do
        if name == nameToCheck then
            return true
        end
    end
    return false
end

-- Initialize arnsDomains
local function initializeArnsDomains()
    ao.send({
        Target = "agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA",
        Action = "Paginated-Records",
        ["Limit"] = "10000"
    })

    local res, err = Receive({ Action = "Records-Notice" })
    if not res then
        print("Error: Failed to receive Records-Notice. Error: " .. (err or "Unknown"))
        return
    end
    extractNames(res.Data)
    print(string.format("Initialized %d ArNS domains", #arnsDomains))
end

initializeArnsDomains()

-- Handlers
Handlers.add('ArnsExists',
    Handlers.utils.hasMatchingTag('Action', 'ArnsExists'),
    function(msg)
        print("ArnsExists handler called")
        local nameToCheck = msg.Tags["Name"]

        if not nameToCheck then
            return sendErrorResponse(msg, "Missing name to check")
        end

        local nameExists = checkNameExists(nameToCheck)

        print(string.format("Name %s exists: %s", nameToCheck, tostring(nameExists)))
        -- print(string.format("User address: %s", userAddress))
        -- print(string.format("User PID: %s", userPid))

        print("Trying to send back to: " .. msg.From)
        msg.reply({
            Data = json.encode({
                success = "true",
                name = nameToCheck,
                exists = tostring(nameExists)
            })
        })
    end
)
print("ArnsExists Updated")

Handlers.add('AllArns',
    Handlers.utils.hasMatchingTag('Action', 'AllArns'),
    function(msg)
        print("AllArns Called")
        ao.send({
            Target = msg.From,
            Action = "AllArnsResponse",
            Data = json.encode({
                success = true,
                domains = arnsDomains
            })
        })
    end
)
