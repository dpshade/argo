local json = require("json")

print("tinyNav Handlers Script started")

Bangs = Bangs or {}
FallbackSearchEngine = FallbackSearchEngine or "https://google.com/search?q=%s"
ArweaveExplorer = ArweaveExplorer or "https://ao.link/#/message/%s"
DefaultArweaveGateway = DefaultArweaveGateway or "https://arweave.net/%s"
DefaultsSet = DefaultsSet or false

local function addDefaultBangs()
    if DefaultsSet then return end

    local defaultBangs = {
        { "yt",   "https://www.youtube.com/results?search_query=%s" },
        { "gh",   "https://github.com/search?q=%s" },
        { "a",    "https://www.amazon.com/s?k=%s" },
        { "aos2", "https://hackmd.io/OoOsMsd9RNazNrrfiJcqEw" },
    }
    for _, bang in ipairs(defaultBangs) do
        if not Bangs[bang[1]] then
            Bangs[bang[1]] = { name = bang[1], url = bang[2] }
            print(string.format("Default bang added: %s -> %s", bang[1], bang[2]))
        end
    end
    DefaultsSet = true
end

local function arnsExists(name)
    local arnsProcessId = "ihs9ILgtonyPraKmOOEXhS4JwXU2k_EgMJz1ZdL8Umo"
    local res = ao.send({
        Target = arnsProcessId,
        Action = "ArnsExists",
        Name = name
    }).receive()

    if res.Data then
        local success, data = pcall(json.decode, res.Data)
        if success and data and not data.error then
            return data.exists == "true"
        end
    end
    return false
end

local function getField(msg, field)
    return msg.Tags and msg.Tags[field] or msg[field]
end

local function getDataField(msg, field)
    if msg.Data then
        local success, data = pcall(json.decode, msg.Data)
        if success and type(data) == "table" then
            return data[field]
        end
    end
    return nil
end

local function encodeURIComponent(str)
    return str:gsub("[^%w%-_%.%!%~%*%'%(%)]", function(c)
        return string.format("%%%02X", string.byte(c))
    end)
end

local function formatUrl(url, term)
    return url:find("%%s") and string.format(url, encodeURIComponent(term)) or url
end

local function ensureProtocol(url)
    return url:match("^https?://") and url or "https://" .. url
end

local function handleSearch(query)
    local trimmedQuery = query:gsub("^%s*(.-)%s*$", "%1")

    for name, bang in pairs(Bangs) do
        local pattern = "^" .. name .. "%s"
        if trimmedQuery:match(pattern) or trimmedQuery:match("%s" .. name .. "$") then
            local searchTerm = trimmedQuery:gsub(pattern, ""):gsub("%s*" .. name .. "$", "")
            return formatUrl(bang.url, searchTerm)
        end
    end

    if #trimmedQuery == 43 and trimmedQuery:match("^[a-zA-Z0-9_-]+$") then
        return formatUrl(ArweaveExplorer, trimmedQuery)
    elseif #trimmedQuery == 44 and (trimmedQuery:match("^![a-zA-Z0-9_-]+$") or trimmedQuery:match("^[a-zA-Z0-9_-]+!$")) then
        local txId = trimmedQuery:sub(2, -1):gsub("!$", "")
        return formatUrl(DefaultArweaveGateway, txId)
    end

    if not trimmedQuery:find("%s") and arnsExists(trimmedQuery) then
        return trimmedQuery .. ".arweave.net"
    end

    return formatUrl(FallbackSearchEngine, trimmedQuery)
end

local actions = {
    UpdateFallbackSearchEngine = function(msg)
        FallbackSearchEngine = ensureProtocol(getField(msg, "URL"))
        return { success = true, url = FallbackSearchEngine }
    end,
    UpdateArweaveExplorer = function(msg)
        ArweaveExplorer = ensureProtocol(getField(msg, "URL"))
        return { success = true, url = ArweaveExplorer }
    end,
    CreateBang = function(msg)
        local name = getField(msg, "Name")
        local url = ensureProtocol(getField(msg, "URL"))
        Bangs[name] = { name = name, url = url }
        return { success = true, name = name, url = url }
    end,
    ReadBang = function(msg)
        local name = getField(msg, "Name")
        local bang = Bangs[name]
        return bang and { success = true, name = name, url = bang.url } or { error = "Bang not found" }
    end,
    UpdateBang = function(msg)
        local oldName = getField(msg, "OldName")
        local newName = getField(msg, "NewName")
        local url = ensureProtocol(getField(msg, "URL"))
        if not Bangs[oldName] then return { error = "Bang not found" } end
        Bangs[oldName] = nil
        Bangs[newName] = { name = newName, url = url }
        return { success = true, oldName = oldName, newName = newName, url = url }
    end,
    DeleteBang = function(msg)
        local name = getField(msg, "Name")
        if not Bangs[name] then return { error = "Bang not found" } end
        Bangs[name] = nil
        return { success = true, name = name }
    end,
    GetState = function()
        local bangList = {}
        for name, bang in pairs(Bangs) do
            table.insert(bangList, { name = name, url = bang.url })
        end
        return {
            success = true,
            Bangs = bangList,
            FallbackSearchEngine = FallbackSearchEngine,
            ArweaveExplorer = ArweaveExplorer
        }
    end,
    Search = function(msg)
        local query = getDataField(msg, "Query") or getField(msg, "Query")
        if not query then return { error = "Missing or invalid Query" } end
        return { result = handleSearch(query) }
    end,
    Info = function()
        return {
            success = true,
            summary = {
                bangCount = #Bangs,
                fallbackSearchEngine = FallbackSearchEngine,
                arweaveExplorer = ArweaveExplorer,
                defaultArweaveGateway = DefaultArweaveGateway,
                defaultsSet = DefaultsSet
            }
        }
    end
}

local function handleAction(msg)
    local action = getField(msg, "Action")
    if not action or not actions[action] then
        return { error = "Unknown or missing action" }
    end
    return actions[action](msg)
end

for action, handler in pairs(actions) do
    Handlers.add(action,
        Handlers.utils.hasMatchingTag('Action', action),
        function(msg)
            ao.send({
                Target = msg.From,
                Tags = { Action = action .. "Response" },
                Data = json.encode(handleAction(msg))
            })
        end
    )
end

if not DefaultsSet then
    addDefaultBangs()
end

print("tinyNav Handlers Script completed")
