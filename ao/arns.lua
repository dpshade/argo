local json = require("json")

-- Initialize arnsDomains table
arnsDomains = arnsDomains or {}

-- Helper functions
local function clearTable(t)
    for k in pairs(t) do t[k] = nil end
end

local function extractNames(jsonString)
    clearTable(arnsDomains)
    local data = json.decode(jsonString)
    if data.items and type(data.items) == "table" then
        for _, item in ipairs(data.items) do
            if item.name then
                table.insert(arnsDomains, item.name)
            end
        end
    end
end

local function sendErrorResponse(msg, errorMessage)
    msg.reply({
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
ao.send({
    Target = "agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA",
    Action = "Paginated-Records",
    ["Limit"] = "10000"
})

local res = Receive({ Action = "Records-Notice" })
extractNames(res.Data)
print(#arnsDomains)

-- Handlers
Handlers.add('ArnsExists',
    Handlers.utils.hasMatchingTag('Action', 'ArnsExists'),
    function(msg)
        print("ArnsExists handler called")
        local nameToCheck = msg.Tags["Name"]
        local userAddress = msg.Tags["UserAddress"]

        if not nameToCheck then
            return sendErrorResponse(msg, "Missing name to check")
        end

        if not userAddress then
            return sendErrorResponse(msg, "Missing user address")
        end

        print("Name to check: " .. nameToCheck)
        print("User address: " .. userAddress)

        ao.send({
            Target = "fZnoaLqIP1zk3C1AZ9s546MmOdE-ujjOaGtMzj431cw",
            Action = "GetUser",
            ["UserAddress"] =
                userAddress
        })

        local res = Receive({ Action = "GetUserResponse" })
        if not res or not res.Data then
            return sendErrorResponse(msg, "Invalid response from GetUser")
        end

        local userData = json.decode(res.Data)
        if not userData or not userData.processId then
            return sendErrorResponse(msg, "Invalid user data")
        end

        local userPid = userData.processId
        print("User PID found: " .. userPid)

        if not arnsDomains then
            return sendErrorResponse(msg, "arnsDomains is not defined")
        end

        local nameExists = checkNameExists(nameToCheck)

        print("Name " .. nameToCheck .. " exists: " .. tostring(nameExists))
        print("User address: " .. userAddress)
        print("User PID: " .. userPid)

        msg.reply({
            Target = userPid,
            Action = "ArnsExistsResponse",
            Data = json.encode({
                success = true,
                name = nameToCheck,
                exists = nameExists
            })
        })
    end
)
print("ArnsExists Updated")

Handlers.add('AllArns',
    Handlers.utils.hasMatchingTag('Action', 'AllArns'),
    function(msg)
        print("AllArnsCalled")
        msg.reply({
            Target = msg.From,
            Action = "AllArnsResponse",
            Data = json.encode({
                success = true,
                domains = arnsDomains
            })
        })
    end
)
