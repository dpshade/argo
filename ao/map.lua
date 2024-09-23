-- ProcessID = fZnoaLqIP1zk3C1AZ9s546MmOdE-ujjOaGtMzj431cw
local json = require("json")

local UserProcessMap = {}

local function sendResponse(target, action, data)
    ao.send({
        Target = target,
        Tags = { ["Action"] = action },
        Data = json.encode(data)
    })
end

Handlers.add('AddUser',
    Handlers.utils.hasMatchingTag('Action', 'AddUser'),
    function(msg)
        print("AddUser handler called")

        local processId = msg.Tags["ProcessID"]
        local walletAddress = msg.From

        if not processId then
            print("Error: Missing ProcessID")
            sendResponse(msg.From, "AddUser", { error = "Missing ProcessID" })
            return
        end

        -- Check if the user already exists
        if UserProcessMap[walletAddress] then
            print(string.format("User already exists: %s", walletAddress))
            sendResponse(msg.From, "AddUser", {
                success = false,
                error = "User already exists",
                existingProcessId = UserProcessMap[walletAddress]
            })
            return
        end

        -- Associate the wallet address with the ProcessID
        UserProcessMap[walletAddress] = processId

        print(string.format("User added: Wallet %s associated with ProcessID %s", walletAddress, processId))
        sendResponse(msg.From, "AddUser", {
            success = true,
            walletAddress = walletAddress,
            processId = processId
        })
    end
)

Handlers.add('GetUser',
    Handlers.utils.hasMatchingTag('Action', 'GetUser'),
    function(msg)
        print("GetUser handler called")

        local walletAddress = msg.Tags["UserAddress"] or msg.From
        local processId = UserProcessMap[walletAddress]

        if processId then
            print(string.format("ProcessID found for wallet %s: %s", walletAddress, processId))
            sendResponse(msg.From, "GetUserResponse", {
                success = true,
                walletAddress = walletAddress,
                processId = processId
            })
        else
            print(string.format("No ProcessID found for wallet %s", walletAddress))
            sendResponse(msg.From, "GetUserResponse", {
                success = false,
            })
        end
    end
)

print("User Mapping Handlers Script completed")
