-- ProcessID = fZnoaLqIP1zk3C1AZ9s546MmOdE-ujjOaGtMzj431cw
local json = require("json")

UserProcessMap = UserProcessMap or {}

Handlers.add('AddUser',
    Handlers.utils.hasMatchingTag('Action', 'AddUser'),
    function(msg)
        print("AddUser handler called")

        local processId = msg.Tags["ProcessID"]
        local walletAddress = msg.From

        if not processId then
            print("Error: Missing ProcessID")
            ao.send({
                Target = msg.From,
                Tags = { ["Action"] = "AddUser" },
                Data = json.encode({ error = "Missing ProcessID" })
            })
            return
        end

        -- Check if the user already exists
        if UserProcessMap[walletAddress] then
            print("User already exists: " .. walletAddress)
            ao.send({
                Target = msg.From,
                Tags = { ["Action"] = "AddUser" },
                Data = json.encode({
                    success = false,
                    error = "User already exists",
                    existingProcessId = UserProcessMap[walletAddress]
                })
            })
            return
        end

        -- Associate the wallet address with the ProcessID
        UserProcessMap[walletAddress] = processId

        print("User added: Wallet " .. walletAddress .. " associated with ProcessID " .. processId)
        ao.send({
            Target = msg.From,
            Tags = { ["Action"] = "AddUser" },
            Data = json.encode({
                success = true,
                walletAddress = walletAddress,
                processId = processId
            })
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
            print("ProcessID found for wallet " .. walletAddress .. ": " .. processId)
            ao.send({
                Target = msg.From,
                Tags = { ["Action"] = "GetUserResponse" },
                Data = json.encode({
                    success = true,
                    walletAddress = walletAddress,
                    processId = processId
                })
            })
        else
            print("No ProcessID found for wallet " .. walletAddress)
            ao.send({
                Target = msg.From,
                Tags = { ["Action"] = "GetUserResponse" },
                Data = json.encode({
                    success = false,
                })
            })
        end
    end
)

print("User Mapping Handlers Script completed")
