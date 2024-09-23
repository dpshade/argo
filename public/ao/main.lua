-- ProcessID = created by client
local json = require("json")

print("tinyNav Handlers Script started")

-- Initialize the data storage table
local Bangs = {}
local FallbackSearchEngine = "https://google.com/search?q=%s"
local ArweaveExplorer = "https://ao.link/#/message/%s"
local DefaultArweaveGateway = "https://arweave.net/%s"
local DefaultAdded = false

local function addDefaultBangs()
    if DefaultAdded then return end

    local defaultBangs = {
        { "!yt",   "https://www.youtube.com/results?search_query=%s" },
        { "!gh",   "https://github.com/search?q=%s" },
        { "!a",    "https://www.amazon.com/s?k=%s" },
        { "!aos2", "https://hackmd.io/OoOsMsd9RNazNrrfiJcqEw" },
    }

    for _, bang in ipairs(defaultBangs) do
        if not Bangs[bang[1]] then
            Bangs[bang[1]] = { name = bang[1], url = bang[2] }
            print(string.format("Default bang added: %s -> %s", bang[1], bang[2]))
        end
    end
    DefaultAdded = true
end

local function arnsExists(name)
    local arnsProcessId = "ihs9ILgtonyPraKmOOEXhS4JwXU2k_EgMJz1ZdL8Umo"
    print(string.format("Sending ArnsExists request to: %s", arnsProcessId))

    local request = {
        Target = arnsProcessId,
        Action = "ArnsExists",
        Tags = {
            ["Name"] = name
        }
    }
    print("Request: " .. json.encode(request))

    local res = ao.send(request).receive(arnsProcessId)

    print("Received ArnsExists response: " .. json.encode(res))

    if not res.Data then
        print("Error: Invalid response from ArnsExists (no Data field)")
        return false
    end

    local success, data = pcall(json.decode, res.Data)
    if not success then
        print("Error: Failed to decode JSON response from ArnsExists: " .. data)
        return false
    end

    if data.error then
        print("Error in ArnsExists response: " .. data.error)
        return false
    end

    print(string.format("ArnsExists result for %s: %s", name, tostring(data.exists)))
    return data.exists
end

-- Helper function to get a field from a message, supporting both structures
local function getField(msg, field)
    return msg.Tags and msg.Tags[field] or msg[field]
end

-- Helper function to check required fields
local function checkRequiredFields(msg, fields)
    local missingFields = {}
    for _, field in ipairs(fields) do
        if not getField(msg, field) then
            table.insert(missingFields, field)
        end
    end
    return #missingFields == 0, missingFields
end

-- Helper function to encode URI component
local function encodeURIComponent(str)
    return str:gsub("[^%w%-_%.%!%~%*%'%(%)]", function(c)
        return string.format("%%%02X", string.byte(c))
    end)
end

-- Helper function to format URL with or without %s
local function formatUrl(url, term)
    if url:find("%%s") then
        return string.format(url, encodeURIComponent(term))
    else
        return url
    end
end

-- Helper function to ensure URL has a protocol
local function ensureProtocol(url)
    if not url:match("^https?://") then
        return "https://" .. url
    end
    return url
end

-- Search function
local function handleSearch(query)
    local trimmedQuery = query:gsub("^%s*(.-)%s*$", "%1")
    print(string.format("Searching: %s", trimmedQuery))
    local words = {}
    for word in trimmedQuery:gmatch("%S+") do
        table.insert(words, word)
    end

    local resultUrl = nil

    -- If not an Arns name, proceed with other checks
    if not resultUrl then
        -- Check all bangs first
        for name, bang in pairs(Bangs) do
            if words[1]:lower() == name:lower() then
                local searchTerm = table.concat(words, " ", 2)
                resultUrl = bang.url
                trimmedQuery = searchTerm
                break
            end
        end
    end

    -- If still no result, check for bang anywhere in the query
    if not resultUrl then
        for i, word in ipairs(words) do
            for name, bang in pairs(Bangs) do
                if word:lower() == name:lower() then
                    local searchTermWords = {}
                    for j, w in ipairs(words) do
                        if j ~= i then
                            table.insert(searchTermWords, w)
                        end
                    end
                    local searchTerm = table.concat(searchTermWords, " ")
                    resultUrl = bang.url
                    trimmedQuery = searchTerm
                    break
                end
            end
            if resultUrl then break end
        end
    end

    -- If still no result, check if it's an Arweave transaction ID
    if not resultUrl then
        local txId, hasBang
        if #trimmedQuery == 43 and trimmedQuery:match("^[a-zA-Z0-9_-]+$") then
            txId = trimmedQuery
            hasBang = false
        elseif #trimmedQuery == 44 and trimmedQuery:match("^![a-zA-Z0-9_-]+$") then
            txId = trimmedQuery:sub(2) -- Remove leading '!'
            hasBang = true
        elseif #trimmedQuery == 44 and trimmedQuery:match("^[a-zA-Z0-9_-]+!$") then
            txId = trimmedQuery:sub(1, -2) -- Remove trailing '!'
            hasBang = true
        end

        if txId then
            print(string.format("Found Tx: %s", txId))
            if hasBang then
                resultUrl = DefaultArweaveGateway
            else
                resultUrl = ArweaveExplorer
            end
            trimmedQuery = txId
        end
    end

    -- If still no result, use fallback search engine
    if not resultUrl then
        resultUrl = FallbackSearchEngine
    end

    -- Format and return the final URL
    return formatUrl(resultUrl, trimmedQuery)
end

-- Define actions
local actions = {
    UpdateFallbackSearchEngine = {
        fields = { "URL" },
        handler = function(msg)
            local url = ensureProtocol(getField(msg, "URL"))
            FallbackSearchEngine = url
            print(string.format("FallbackSearchEngine updated: %s", url))
            return { success = true, url = url }
        end
    },
    UpdateArweaveExplorer = {
        fields = { "URL" },
        handler = function(msg)
            local url = ensureProtocol(getField(msg, "URL"))
            ArweaveExplorer = url
            print(string.format("ArweaveExplorer updated: %s", url))
            return { success = true, url = url }
        end
    },
    CreateBang = {
        fields = { "Name", "URL" },
        handler = function(msg)
            local name = getField(msg, "Name")
            local url = ensureProtocol(getField(msg, "URL"))
            Bangs[name] = { name = name, url = url }
            print(string.format("Bang created: %s -> %s", name, url))
            return { success = true, name = name, url = url }
        end
    },
    ReadBang = {
        fields = { "Name" },
        handler = function(msg)
            local name = getField(msg, "Name")
            local bang = Bangs[name]
            if not bang then
                return { error = "Bang not found" }
            end
            print(string.format("Bang retrieved: %s -> %s", name, bang.url))
            return { success = true, name = name, url = bang.url }
        end
    },
    UpdateBang = {
        fields = { "OldName", "NewName", "URL" },
        handler = function(msg)
            local oldName = getField(msg, "OldName")
            local newName = getField(msg, "NewName")
            local url = ensureProtocol(getField(msg, "URL"))
            if not Bangs[oldName] then
                return { error = "Bang not found" }
            end
            Bangs[oldName] = nil
            Bangs[newName] = { name = newName, url = url }
            print(string.format("Bang updated: %s -> %s : %s", oldName, newName, url))
            return { success = true, oldName = oldName, newName = newName, url = url }
        end
    },
    DeleteBang = {
        fields = { "Name" },
        handler = function(msg)
            local name = getField(msg, "Name")
            if not Bangs[name] then
                return { error = "Bang not found" }
            end
            Bangs[name] = nil
            print(string.format("Bang deleted: %s", name))
            return { success = true, name = name }
        end
    },
    GetState = {
        fields = {},
        handler = function(msg)
            local bangList = {}
            for name, bang in pairs(Bangs) do
                table.insert(bangList, { name = name, url = bang.url })
            end
            print(string.format("State retrieved, bang count: %d", #bangList))
            return {
                success = true,
                Bangs = bangList,
                FallbackSearchEngine = FallbackSearchEngine,
                ArweaveExplorer = ArweaveExplorer
            }
        end
    },
    Search = {
        fields = { "Query" },
        handler = function(msg)
            local query = getField(msg, "Query")
            print(string.format("Search query: %s", query))

            -- Helper function to check if the query is a transaction ID
            local function isTxId(str)
                return #str == 43 and str:match("^[a-zA-Z0-9_-]+$")
            end

            -- Helper function to check if the query contains a bang
            local function hasBang(str)
                for name, _ in pairs(Bangs) do
                    if str:find(name, 1, true) then
                        return true
                    end
                end
                return false
            end

            -- Check if it's an Arns name only if:
            -- 1. There are no spaces in the query
            -- 2. It's not a transaction ID
            -- 3. It doesn't contain a bang
            -- 4. It's not in the format !<tx>
            if not query:find("%s") and
                not isTxId(query) and
                not hasBang(query) and
                not (query:sub(1, 1) == "!" and isTxId(query:sub(2))) then
                local exists = arnsExists(query)
                if exists then
                    return { result = query .. ".arweave.net" }
                end
            end

            -- Proceed with regular search logic
            local result = handleSearch(query)
            return { result = result }
        end
    },
    Info = {
        fields = {},
        handler = function(msg)
            local bangCount = 0
            for _ in pairs(Bangs) do
                bangCount = bangCount + 1
            end

            return {
                success = true,
                summary = {
                    bangCount = bangCount,
                    fallbackSearchEngine = tostring(FallbackSearchEngine),
                    arweaveExplorer = tostring(ArweaveExplorer),
                    defaultArweaveGateway = tostring(DefaultArweaveGateway)
                }
            }
        end
    }
}

-- Generic handler function
local function handleAction(msg)
    local action = getField(msg, "Action")
    if not action then
        print("Error: Missing Action")
        return { error = "Missing Action" }
    end
    print(string.format("Received action: %s", tostring(action)))

    local actionData = actions[action]
    if not actionData then
        print(string.format("Error: Unknown action %s", action))
        return { error = "Unknown action" }
    end

    local fieldsOk, missingFields = checkRequiredFields(msg, actionData.fields)
    if not fieldsOk then
        local errorMsg = "Missing fields: " .. table.concat(missingFields, ", ")
        print(string.format("Error: %s", errorMsg))
        return { error = errorMsg }
    end

    print(string.format("%s handler called", action))
    local success, result = pcall(function()
        return actionData.handler(msg)
    end)

    if not success then
        print(string.format("Error in %s handler: %s", action, tostring(result)))
        return { error = "Internal error: " .. tostring(result) }
    else
        return result
    end
end

-- Register handlers
for action, _ in pairs(actions) do
    Handlers.add(action,
        Handlers.utils.hasMatchingTag('Action', action),
        function(msg)
            local result = handleAction(msg)
            ao.send({
                Target = msg.From,
                Tags = { Action = action .. "Response" },
                Data = json.encode(result)
            })
        end
    )
end

if not DefaultAdded then
    addDefaultBangs()
end

print("tinyNav Handlers Script completed")
