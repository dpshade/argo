-- aos tinyNav

local json = require("json")

print("Bang CRUD Handlers Script started")

-- Initialize the data storage table
Bangs = Bangs or {}
FallbackSearchEngine = "https://google.com/search?q=%s" or FallbackSearchEngine
ArweaveExplorer = "https://viewblock.io/arweave/tx/%s" or ArweaveExplorer

-- Handler to update fallback search engine
Handlers.add('UpdateFallbackSearchEngine',
    Handlers.utils.hasMatchingTag('Action', 'UpdateFallbackSearchEngine'),
    function(msg)
        print("UpdateFallbackSearchEngine handler called")
        local url = msg.Tags["URL"]
        if not url then
            print("Error: Missing URL")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "UpdateFallbackSearchEngine" },
                Data = json.encode({ error = "Missing URL" })
            })
            return
        end

        -- Update the fallback search engine
        FallbackSearchEngine = url

        print("Fallback search engine updated: " .. url)
        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "UpdateFallbackSearchEngine" },
            Data = json.encode({ success = true, url = url })
        })
    end
)

-- Handler to get fallback search engine
Handlers.add('GetFallbackSearchEngine',
    Handlers.utils.hasMatchingTag('Action', 'GetFallbackSearchEngine'),
    function(msg)
        print("GetFallbackSearchEngine handler called")
        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "GetFallbackSearchEngine" },
            Data = json.encode({ success = true, url = FallbackSearchEngine })
        })
    end
)

-- Handler to update Arweave explorer
Handlers.add('UpdateArweaveExplorer',
    Handlers.utils.hasMatchingTag('Action', 'UpdateArweaveExplorer'),
    function(msg)
        print("UpdateArweaveExplorer handler called")
        local url = msg.Tags["URL"]
        if not url then
            print("Error: Missing URL")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "UpdateArweaveExplorer" },
                Data = json.encode({ error = "Missing URL" })
            })
            return
        end

        -- Update the Arweave explorer
        ArweaveExplorer = url

        print("Arweave explorer updated: " .. url)
        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "UpdateArweaveExplorer" },
            Data = json.encode({ success = true, url = url })
        })
    end
)

-- Handler to get Arweave explorer
Handlers.add('GetArweaveExplorer',
    Handlers.utils.hasMatchingTag('Action', 'GetArweaveExplorer'),
    function(msg)
        print("GetArweaveExplorer handler called")
        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "GetArweaveExplorer" },
            Data = json.encode({ success = true, url = ArweaveExplorer })
        })
    end
)

-- Handler to create a new bang
Handlers.add('CreateBang',
    Handlers.utils.hasMatchingTag('Action', 'CreateBang'),
    function(msg)
        print("CreateBang handler called")
        local name = msg.Tags["Name"]
        local url = msg.Tags["URL"]
        if not name or not url then
            print("Error: Missing Name or URL")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "CreateBang" },
                Data = json.encode({ error = "Missing Name or URL" })
            })
            return
        end

        -- Store the new bang
        Bangs[name] = url

        print("Bang created: " .. name .. " -> " .. url)
        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "CreateBang" },
            Data = json.encode({ success = true, name = name, url = url })
        })
    end
)

-- Handler to read a bang
Handlers.add('ReadBang',
    Handlers.utils.hasMatchingTag('Action', 'ReadBang'),
    function(msg)
        print("ReadBang handler called")
        local name = msg.Tags["Name"]
        if not name then
            print("Error: Missing Name")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "ReadBang" },
                Data = json.encode({ error = "Missing Name" })
            })
            return
        end

        local url = Bangs[name]
        if not url then
            print("Error: Bang not found")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "ReadBang" },
                Data = json.encode({ error = "Bang not found" })
            })
            return
        end

        print("Bang retrieved: " .. name .. " -> " .. url)
        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "ReadBang" },
            Data = json.encode({ success = true, name = name, url = url })
        })
    end
)

-- Handler to update a bang
Handlers.add('UpdateBang',
    Handlers.utils.hasMatchingTag('Action', 'UpdateBang'),
    function(msg)
        print("UpdateBang handler called")
        local oldName = msg.Tags["OldName"]
        local newName = msg.Tags["NewName"]
        local url = msg.Tags["URL"]
        if not oldName or not newName or not url then
            print("Error: Missing OldName, NewName, or URL")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "UpdateBang" },
                Data = json.encode({ error = "Missing OldName, NewName, or URL" })
            })
            return
        end

        if not Bangs[oldName] then
            print("Error: Bang not found")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "UpdateBang" },
                Data = json.encode({ error = "Bang not found" })
            })
            return
        end

        -- Update the bang
        Bangs[oldName] = nil -- Remove the old entry
        Bangs[newName] = url -- Add the new entry

        print("Bang updated: " .. oldName .. " -> " .. newName .. " : " .. url)
        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "UpdateBang" },
            Data = json.encode({ success = true, oldName = oldName, newName = newName, url = url })
        })
    end
)

-- Handler to delete a bang
Handlers.add('DeleteBang',
    Handlers.utils.hasMatchingTag('Action', 'DeleteBang'),
    function(msg)
        print("DeleteBang handler called")
        local name = msg.Tags["Name"]
        if not name then
            print("Error: Missing Name")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "DeleteBang" },
                Data = json.encode({ error = "Missing Name" })
            })
            return
        end

        if not Bangs[name] then
            print("Error: Bang not found")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "DeleteBang" },
                Data = json.encode({ error = "Bang not found" })
            })
            return
        end

        -- Delete the bang
        Bangs[name] = nil

        print("Bang deleted: " .. name)
        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "DeleteBang" },
            Data = json.encode({ success = true, name = name })
        })
    end
)

-- Handler to list all Bangs
Handlers.add('ListBangs',
    Handlers.utils.hasMatchingTag('Action', 'ListBangs'),
    function(msg)
        print("ListBangs handler called")
        local bangList = {}
        for name, url in pairs(Bangs) do
            table.insert(bangList, { name = name, url = url })
        end

        print("Bangs listed, count: " .. #bangList)
        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "ListBangs" },
            Data = json.encode({ success = true, Bangs = bangList })
        })
    end
)

print("Bang CRUD Handlers Script completed")
