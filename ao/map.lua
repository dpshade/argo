-- aos tinyNavMap

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
                Action = "Response",
                Tags = { ["Action"] = "AddUser" },
                Data = json.encode({ error = "Missing ProcessID" })
            })
            return
        end

        -- Associate the wallet address with the ProcessID
        UserProcessMap[walletAddress] = processId

        print("User added: Wallet " .. walletAddress .. " associated with ProcessID " .. processId)
        ao.send({
            Target = msg.From,
            Action = "Response",
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

        local walletAddress = msg.From
        local processId = UserProcessMap[walletAddress]

        if processId then
            print("ProcessID found for wallet " .. walletAddress .. ": " .. processId)
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "GetUser" },
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
                Action = "Response",
                Tags = { ["Action"] = "GetUser" },
                Data = json.encode({
                    success = false,
                    error = "No ProcessID found for this wallet address"
                })
            })
        end
    end
)

print("User Mapping Handlers Script completed")
