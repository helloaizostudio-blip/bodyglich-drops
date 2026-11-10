-- Creates every RemoteEvent / RemoteFunction and owns the single client -> server
-- entry point ("Action"). Services register named handlers:
--
--   Remotes.register("BuyUpgrade", function(player, upgradeId) ... return true, "Bought!" end)
--
-- Every call is rate limited and wrapped in pcall, and handlers must validate their
-- own arguments - nothing a client sends is trusted.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Modules.Net)

local Remotes = {
	Events = {} :: { [string]: RemoteEvent },
	Functions = {} :: { [string]: RemoteFunction },
}

local handlers: { [string]: (player: Player, ...any) -> (boolean, string?) } = {}
local lastCall: { [Player]: { [string]: number } } = {}
local callBudget: { [Player]: { count: number, windowStart: number } } = {}

local MIN_INTERVAL = 0.12 -- seconds between two calls of the same action
local MAX_CALLS_PER_WINDOW = 40 -- total calls allowed per WINDOW seconds
local WINDOW = 5

function Remotes.register(name: string, handler)
	assert(handlers[name] == nil, "Action registered twice: " .. name)
	handlers[name] = handler
end

function Remotes.notify(player: Player, kind: string, data: any?)
	Remotes.Events.Notify:FireClient(player, kind, data)
end

function Remotes.notifyAll(kind: string, data: any?)
	Remotes.Events.Notify:FireAllClients(kind, data)
end

local function allowed(player: Player, name: string): boolean
	local now = os.clock()

	local budget = callBudget[player]
	if not budget or now - budget.windowStart > WINDOW then
		budget = { count = 0, windowStart = now }
		callBudget[player] = budget
	end
	budget.count += 1
	if budget.count > MAX_CALLS_PER_WINDOW then
		return false
	end

	local calls = lastCall[player]
	if not calls then
		calls = {}
		lastCall[player] = calls
	end
	if calls[name] and now - calls[name] < MIN_INTERVAL then
		return false
	end
	calls[name] = now
	return true
end

function Remotes.Init()
	local folder = Instance.new("Folder")
	folder.Name = Net.FolderName
	for _, name in Net.Events do
		local remote = Instance.new("RemoteEvent")
		remote.Name = name
		remote.Parent = folder
		Remotes.Events[name] = remote
	end
	for _, name in Net.Functions do
		local remote = Instance.new("RemoteFunction")
		remote.Name = name
		remote.Parent = folder
		Remotes.Functions[name] = remote
	end
	folder.Parent = ReplicatedStorage

	Remotes.Functions.Action.OnServerInvoke = function(player: Player, name: any, ...: any)
		if typeof(name) ~= "string" then
			return false, "Bad request"
		end
		local handler = handlers[name]
		if not handler then
			return false, "Unknown action"
		end
		if not allowed(player, name) then
			return false, "Slow down!"
		end
		local ok, success, message = pcall(handler, player, ...)
		if not ok then
			warn(`[Remotes] Action {name} failed for {player.Name}: {success}`)
			return false, "Something went wrong"
		end
		return success == true, if typeof(message) == "string" then message else nil
	end

	Players.PlayerRemoving:Connect(function(player)
		lastCall[player] = nil
		callBudget[player] = nil
	end)
end

function Remotes.Start() end

return Remotes
