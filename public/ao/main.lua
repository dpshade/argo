local json = require("json")

print("tinyNav Handlers Script started")

-- Initialize the data storage table
Bangs = Bangs or {}
FallbackSearchEngine = FallbackSearchEngine or "https://google.com/search?q=%s"
ArweaveExplorer = ArweaveExplorer or "https://viewblock.io/arweave/tx/%s"
DefaultArweaveGateway = DefaultArweaveGateway or "https://arweave.net/"

-- Helper function to send response
local function sendResponse(target, action, data)
    ao.send({
        Target = target,
        Tags = { Action = action .. "Response" },
        Data = json.encode(data)
    })
end

-- Helper function to get a field from a message, supporting both structures
local function getField(msg, field)
    if msg.Tags and msg.Tags[field] then
        return msg.Tags[field]
    elseif msg[field] then
        return msg[field]
    end
    return nil
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
    print("Searching: " .. trimmedQuery)
    local words = {}
    for word in trimmedQuery:gmatch("%S+") do
        table.insert(words, word)
    end

    -- Check all bangs first
    for name, bang in pairs(Bangs) do
        if words[1]:lower() == name:lower() then
            local searchTerm = table.concat(words, " ", 2)
            local redirectUrl = formatUrl(bang.url, searchTerm)
            return redirectUrl
        end
    end

    -- Check for bang anywhere in the query
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
                local redirectUrl = formatUrl(bang.url, searchTerm)
                return redirectUrl
            end
        end
    end

    -- Check if it's an Arweave transaction ID (with or without '!' at the start or end)
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
        print("Found Tx: " .. txId)
        if hasBang then
            -- Use default gateway (arweave.net)
            return DefaultArweaveGateway .. txId
        else
            -- Use configured ArweaveExplorer
            return formatUrl(ArweaveExplorer, txId)
        end
    end

    -- Use fallback search engine
    local searchUrl = formatUrl(FallbackSearchEngine, trimmedQuery)
    return searchUrl
end

-- Define actions
local actions = {
    UpdateFallbackSearchEngine = {
        fields = { "URL" },
        handler = function(msg)
            local url = ensureProtocol(getField(msg, "URL"))
            FallbackSearchEngine = url
            print("FallbackSearchEngine updated: " .. url)
            return { success = true, url = url }
        end
    },
    UpdateArweaveExplorer = {
        fields = { "URL" },
        handler = function(msg)
            local url = ensureProtocol(getField(msg, "URL"))
            ArweaveExplorer = url
            print("ArweaveExplorer updated: " .. url)
            return { success = true, url = url }
        end
    },
    CreateBang = {
        fields = { "Name", "URL" },
        handler = function(msg)
            local name = getField(msg, "Name")
            local url = ensureProtocol(getField(msg, "URL"))
            Bangs[name] = { name = name, url = url }
            print("Bang created: " .. name .. " -> " .. url)
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
            print("Bang retrieved: " .. name .. " -> " .. bang.url)
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
            print("Bang updated: " .. oldName .. " -> " .. newName .. " : " .. url)
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
            print("Bang deleted: " .. name)
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
            print("State retrieved, bang count: " .. #bangList)
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
                    fallbackSearchEngine = FallbackSearchEngine,
                    arweaveExplorer = ArweaveExplorer,
                    defaultArweaveGateway = DefaultArweaveGateway
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
        sendResponse(msg.From, "Error", { error = "Missing Action" })
        return
    end
    print("Received action: " .. action)
    local actionData = actions[action]
    if not actionData then
        print("Error: Unknown action " .. action)
        sendResponse(msg.From, action .. "Response", { error = "Unknown action" })
        return
    end
    local fieldsOk, missingFields = checkRequiredFields(msg, actionData.fields)
    if not fieldsOk then
        local errorMsg = "Missing fields: " .. table.concat(missingFields, ", ")
        print("Error: " .. errorMsg)
        sendResponse(msg.From, action .. "Response", { error = errorMsg })
        return
    end
    print(action .. " handler called")
    local success, result = pcall(function()
        return actionData.handler(msg)
    end)
    if not success then
        print("Error in " .. action .. " handler: " .. tostring(result))
        sendResponse(msg.From, action .. "Response", { error = "Internal error: " .. tostring(result) })
    else
        sendResponse(msg.From, action .. "Response", result)
    end
end

-- Register handlers
for action, _ in pairs(actions) do
    Handlers.add(action,
        Handlers.utils.hasMatchingTag('Action', action),
        handleAction
    )
end

print("tinyNav Handlers Script completed")
